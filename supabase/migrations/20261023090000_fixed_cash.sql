-- Every personal space has one cash source from sign-up on. It cannot be renamed, retyped or
-- deleted; its opening balance stays editable. Source kinds are now bank, cash and e-money
-- (charged by transfers, paid from directly); savings become bank.

alter table public.sources add column fixed boolean not null default false;
create unique index sources_one_fixed_per_space on public.sources (space_id) where fixed;

update public.sources set kind = 'bank' where kind = 'savings';
alter table public.sources drop constraint sources_kind_check;
alter table public.sources add constraint sources_kind_check check (kind in ('bank', 'cash', 'emoney'));

-- Existing users: take over the cash source "Start with cash" made, or add one.
update public.sources s set fixed = true
from (
  select distinct on (src.space_id) src.id
  from public.sources src join public.spaces sp on sp.id = src.space_id
  where sp.kind = 'personal' and src.kind = 'cash' and not src.archived and src.name in ('現金', 'Cash')
  order by src.space_id, src.created_at
) pick
where s.id = pick.id;

insert into public.sources (space_id, name, kind, fixed)
select sp.id, case when p.locale = 'ja' then '現金' else 'Cash' end, 'cash', true
from public.spaces sp join public.profiles p on p.id = sp.owner_id
where sp.kind = 'personal' and not exists (select 1 from public.sources s where s.space_id = sp.id and s.fixed);

create function public.guard_fixed_source()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.fixed and auth.uid() is not null then raise exception 'only sign-up adds the cash source'; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.fixed <> old.fixed then raise exception 'fixed cannot change'; end if;
    if old.fixed and (new.name <> old.name or new.kind <> old.kind or new.archived or new.space_id <> old.space_id) then
      raise exception 'the cash source cannot be renamed, retyped or deleted';
    end if;
    return new;
  end if;
  if old.fixed and auth.uid() is not null then raise exception 'the cash source cannot be deleted'; end if;
  return old;
end;
$$;

create trigger sources_guard_fixed
  before insert or update or delete on public.sources
  for each row execute function public.guard_fixed_source();

-- Sign-up adds the cash source (otherwise as in 20261023080000_signup_theme).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_locale text := coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en');
  v_theme text := coalesce(new.raw_user_meta_data ->> 'theme', '');
begin
  if v_locale not in ('en', 'ja') then v_locale := 'en'; end if;
  if v_theme not in ('midnight', 'light', 'milky') then v_theme := 'midnight'; end if;
  insert into public.profiles (id, display_name, locale, theme)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    v_locale,
    v_theme
  );
  insert into public.spaces (kind, name, tone, owner_id)
  values ('personal', case when v_locale = 'ja' then '自分' else 'Me' end, 'me', new.id)
  returning id into v_space;
  insert into public.space_members (space_id, user_id, role) values (v_space, new.id, 'owner');
  perform public.seed_categories(v_space, 'personal', v_locale);
  insert into public.sources (space_id, name, kind, fixed)
  values (v_space, case when v_locale = 'ja' then '現金' else 'Cash' end, 'cash', true);
  return new;
end;
$$;
