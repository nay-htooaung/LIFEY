-- Credit cards that share one limit (several cards on one account, family cards).
-- A card either has its own limit or points at the card whose limit it shares. One level only:
-- the card shared with keeps the limit and cannot itself point elsewhere.

alter table public.payment_methods
  add column limit_shared_with uuid references public.payment_methods (id) on delete set null;
create index payment_methods_limit_shared_with_idx on public.payment_methods (limit_shared_with);

create or replace function public.check_payment_method()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.sources s where s.id = new.source_id and s.space_id = new.space_id) then
    raise exception 'payment method and its source must be in the same space';
  end if;

  if new.limit_shared_with is not null then
    if new.kind <> 'credit' or new.limit_shared_with = new.id or not exists (
      select 1 from public.payment_methods p
      where p.id = new.limit_shared_with and p.space_id = new.space_id
        and p.kind = 'credit' and p.limit_shared_with is null
    ) then
      raise exception 'a credit card can only share the limit of another credit card in the same space';
    end if;
    if exists (select 1 from public.payment_methods p where p.limit_shared_with = new.id) then
      raise exception 'other cards share this card''s limit';
    end if;
    -- the limit lives on the card shared with
    new.credit_limit := null;
  elsif tg_op = 'UPDATE' and (new.kind <> 'credit' or new.space_id <> old.space_id) and exists (
    select 1 from public.payment_methods p where p.limit_shared_with = new.id
  ) then
    raise exception 'other cards share this card''s limit';
  end if;
  return new;
end;
$$;
