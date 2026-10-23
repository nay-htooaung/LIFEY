-- E-money is a source now, so the e-money payment method goes. A transfer can also leave from a
-- credit card (method_id) into an e-money source: charging Suica or PayPay with a card. The card is
-- charged amount + fee like any purchase and pays it on its statement; only the fee is spending.

-- An e-money method took each payment from its linked source at once, as a debit card does,
-- so turning it into one keeps every balance as it was.
update public.payment_methods set kind = 'debit' where kind = 'emoney';
alter table public.payment_methods drop constraint payment_methods_kind_check;
alter table public.payment_methods add constraint payment_methods_kind_check check (kind in ('cash', 'debit', 'credit'));

-- As in 20261023070000_transfers, plus transfers from a credit card.
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

-- A transfer shows as two flows: out of source_id or method_id (amount + fee, a charge on a card)
-- and into to_source_id (amount). Each side is visible only to members of its space.
-- Keep in step with flowsOf() in src/domain/money.ts.
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
  where e.kind = 'transfer' and e.method_id is null and public.is_member(s.space_id)
  union all
  select e.method_id, null, 'expense', e.amount + e.fee, e.occurred_on
  from public.entries e join public.payment_methods pm on pm.id = e.method_id
  where e.kind = 'transfer' and public.is_member(pm.space_id)
  union all
  select null, e.to_source_id, 'income', e.amount, e.occurred_on
  from public.entries e join public.sources s on s.id = e.to_source_id
  where e.kind = 'transfer' and public.is_member(s.space_id);
$$;
