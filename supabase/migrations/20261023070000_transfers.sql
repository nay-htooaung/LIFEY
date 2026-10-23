-- Transfers between sources (bank to savings, top up cash, pay into a shared account).
-- A transfer entry has kind 'transfer': source_id is where the money leaves, to_source_id where it lands,
-- and fee an optional charge taken from source_id on top of amount. The fee is real spending; the amount is not.

alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check check (kind in ('expense', 'income', 'transfer'));
alter table public.entries
  add column to_source_id uuid references public.sources (id) on delete set null,
  add column fee bigint not null default 0 check (fee >= 0);
create index entries_to_source_idx on public.entries (to_source_id);

create or replace function public.check_entry()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_to uuid;
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

  if new.kind = 'transfer' then
    new.method_id := null;
    new.category_id := null;
    if new.source_id is null or new.to_source_id is null or new.source_id = new.to_source_id then
      raise exception 'a transfer needs two different sources';
    end if;
    select space_id into v_space from public.sources where id = new.source_id;
    select space_id into v_to from public.sources where id = new.to_source_id;
    -- the mover must belong to both ends
    if v_to is null or not exists (
      select 1 from public.space_members m where m.space_id = v_to and m.user_id = new.created_by and m.left_at is null
    ) then
      raise exception 'you can only move money into your own or a shared source';
    end if;
  else
    new.to_source_id := null;
    new.fee := 0;
    if new.kind = 'expense' and new.method_id is not null then
      new.source_id := null;
      select space_id into v_space from public.payment_methods where id = new.method_id;
    elsif new.kind = 'expense' then
      if new.source_id is null then raise exception 'an expense needs a payment method or a source'; end if;
      select space_id into v_space from public.sources where id = new.source_id;
    else
      new.method_id := null;
      if new.source_id is null then raise exception 'income needs a source'; end if;
      select space_id into v_space from public.sources where id = new.source_id;
    end if;
  end if;

  -- the payer must be a member of the space that owns the method/source
  if v_space is null or not exists (
    select 1 from public.space_members m where m.space_id = v_space and m.user_id = new.created_by and m.left_at is null
  ) then
    raise exception 'you can only pay with your own or a shared method';
  end if;
  return new;
end;
$$;

-- A transfer shows as two flows: out of source_id (amount + fee) and into to_source_id (amount).
-- Each side is visible only to members of that source's space, like every other flow.
create or replace function public.money_flows()
returns table (method_id uuid, source_id uuid, kind text, amount bigint, occurred_on date)
language sql stable security definer set search_path = ''
as $$
  select e.method_id, e.source_id, e.kind, e.amount, e.occurred_on
  from public.entries e
  where e.kind <> 'transfer'
    and ((e.method_id is not null and exists (
          select 1 from public.payment_methods pm
          where pm.id = e.method_id and public.is_member(pm.space_id)))
      or (e.method_id is null and e.source_id is not null and exists (
          select 1 from public.sources s
          where s.id = e.source_id and public.is_member(s.space_id))))
  union all
  select null, e.source_id, 'expense', e.amount + e.fee, e.occurred_on
  from public.entries e join public.sources s on s.id = e.source_id
  where e.kind = 'transfer' and public.is_member(s.space_id)
  union all
  select null, e.to_source_id, 'income', e.amount, e.occurred_on
  from public.entries e join public.sources s on s.id = e.to_source_id
  where e.kind = 'transfer' and public.is_member(s.space_id);
$$;
