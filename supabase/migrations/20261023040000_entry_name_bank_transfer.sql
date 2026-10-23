-- Entries get an optional name (shown as the title; the note stays a memo).
-- An expense can be paid straight from a source (bank transfer, 銀行振込) instead of a payment method.

alter table public.entries
  add column name text not null default '' check (length(name) <= 60);

create or replace function public.check_entry()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif new.created_by <> old.created_by then
    raise exception 'created_by cannot change';
  end if;

  if new.category_id is not null and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.space_id = new.space_id
  ) then
    raise exception 'category belongs to another space';
  end if;

  if new.kind = 'expense' and new.method_id is not null then
    new.source_id := null;
    select space_id into v_space from public.payment_methods where id = new.method_id;
  elsif new.kind = 'expense' then
    -- paid straight from a source (bank transfer)
    if new.source_id is null then raise exception 'an expense needs a payment method or a source'; end if;
    select space_id into v_space from public.sources where id = new.source_id;
  else
    new.method_id := null;
    if new.source_id is null then raise exception 'income needs a source'; end if;
    select space_id into v_space from public.sources where id = new.source_id;
  end if;

  -- the payer must be a member of the space that owns the method/source
  if v_space is null or not exists (
    select 1 from public.space_members m where m.space_id = v_space and m.user_id = new.created_by
  ) then
    raise exception 'you can only pay with your own or a shared method';
  end if;
  return new;
end;
$$;
