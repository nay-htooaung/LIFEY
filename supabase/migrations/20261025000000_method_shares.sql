-- Sharing a personal payment method into a space: the space's members can pay their expenses there with it,
-- but never read or change the method itself. They learn only its name, its kind and whose it is, through
-- shared_methods(). Charges go on the owner's method (money_flows() shows them to the owner only), so the owner
-- pays the card bill; the entries stay in the space like any other.
-- Stopping a share sets stopped_at instead of deleting the row, so past entries keep their label; sharing again
-- clears it.

create table public.method_shares (
  method_id   uuid not null references public.payment_methods (id) on delete cascade,
  space_id    uuid not null references public.spaces (id) on delete cascade,
  created_at  timestamptz not null default now(),
  stopped_at  timestamptz,
  primary key (method_id, space_id)
);
create index method_shares_space_idx on public.method_shares (space_id);

-- Only the method's owner (a member of its personal space) shares it, and only into a shared space they belong to.
create function public.check_method_share()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.method_id <> old.method_id or new.space_id <> old.space_id) then
    raise exception 'a share cannot move';
  end if;
  if not exists (
    select 1 from public.payment_methods pm join public.spaces s on s.id = pm.space_id
    where pm.id = new.method_id and s.kind = 'personal' and public.is_member(s.id)
  ) then
    raise exception 'only your own personal method can be shared';
  end if;
  if not exists (select 1 from public.spaces s where s.id = new.space_id and s.kind = 'household' and s.deleted_at is null)
     or not public.is_member(new.space_id) then
    raise exception 'a method is shared only into a space you belong to';
  end if;
  return new;
end;
$$;
create trigger check_method_share before insert or update on public.method_shares
  for each row execute function public.check_method_share();
revoke execute on function public.check_method_share() from public, anon, authenticated;

alter table public.method_shares enable row level security;

-- The owner manages their shares. Members of the space may read the rows (two ids and dates, nothing about the
-- card), so a new share reaches them live; what they may know of the card comes from shared_methods().
create policy "read" on public.method_shares for select to authenticated using (
  public.is_member(space_id)
  or exists (select 1 from public.payment_methods pm where pm.id = method_id and public.is_member(pm.space_id)));
create policy "owner insert" on public.method_shares for insert to authenticated with check (
  exists (select 1 from public.payment_methods pm where pm.id = method_id and public.is_member(pm.space_id)));
create policy "owner update" on public.method_shares for update to authenticated
  using (exists (select 1 from public.payment_methods pm where pm.id = method_id and public.is_member(pm.space_id)))
  with check (exists (select 1 from public.payment_methods pm where pm.id = method_id and public.is_member(pm.space_id)));

-- Methods shared into spaces I belong to (and my own shares): what a member may know about each one.
create function public.shared_methods()
returns table (method_id uuid, space_id uuid, name text, kind text, owner_id uuid, archived boolean, active boolean)
language sql stable security definer set search_path = ''
as $$
  select ms.method_id, ms.space_id, pm.name, pm.kind, s.owner_id, pm.archived, ms.stopped_at is null
  from public.method_shares ms
  join public.payment_methods pm on pm.id = ms.method_id
  join public.spaces s on s.id = pm.space_id
  where public.is_member(ms.space_id) or public.is_member(pm.space_id);
$$;
revoke execute on function public.shared_methods() from public, anon;
grant execute on function public.shared_methods() to authenticated;

-- As in 20261023100000_card_charge, plus expenses paid with a method shared into the entry's space.
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
    new.category_id := null;
    if new.source_id is null and new.method_id is not null then
      -- charging e-money with a credit card
      select space_id into v_space from public.payment_methods where id = new.method_id and kind = 'credit';
      if v_space is null then raise exception 'only a credit card can charge e-money'; end if;
      if not exists (select 1 from public.sources s where s.id = new.to_source_id and s.kind = 'emoney') then
        raise exception 'a card can only charge an e-money source';
      end if;
    else
      new.method_id := null;
      if new.source_id is null or new.source_id = new.to_source_id then
        raise exception 'a transfer needs two different sources';
      end if;
      select space_id into v_space from public.sources where id = new.source_id;
    end if;
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
      -- a method shared into this space: the payer belongs to the space, not to the method's
      if not exists (
        select 1 from public.space_members m where m.space_id = v_space and m.user_id = new.created_by and m.left_at is null
      ) and exists (
        select 1 from public.method_shares ms where ms.method_id = new.method_id and ms.space_id = new.space_id
          -- an entry already paid with it keeps it after the share stops
          and (ms.stopped_at is null or (tg_op = 'UPDATE' and old.method_id = new.method_id and old.space_id = new.space_id))
      ) then
        v_space := new.space_id;
      end if;
    elsif new.kind = 'expense' then
      if new.source_id is null then raise exception 'an expense needs a payment method or a source'; end if;
      select space_id into v_space from public.sources where id = new.source_id;
    else
      new.method_id := null;
      if new.source_id is null then raise exception 'income needs a source'; end if;
      select space_id into v_space from public.sources where id = new.source_id;
    end if;
  end if;

  -- the payer must be a member of the space that owns the method/source (or that it is shared into)
  if v_space is null or not exists (
    select 1 from public.space_members m where m.space_id = v_space and m.user_id = new.created_by and m.left_at is null
  ) then
    raise exception 'you can only pay with your own or a shared method';
  end if;
  return new;
end;
$$;

-- Live updates, as for the other tables (skipped when the publication does not exist).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.method_shares;
  end if;
end $$;
