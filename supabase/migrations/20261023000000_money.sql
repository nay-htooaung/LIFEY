-- Lifey: spaces + money module.
--
-- Privacy model
--   * Every user has exactly one personal space and can join any number of households.
--   * Every source, payment method, category and entry belongs to exactly one space.
--   * Members of a space can read everything in it. Nobody else can.
--   * An entry may be paid with a method from any space the logger belongs to
--     (a household entry paid with my own card, or a personal entry paid with the family card).
--     Other members then see the entry but cannot read the personal method behind it.
--   * Shared balances stay correct through money_flows(), which exposes only
--     amount, date and method/source for charges against methods and sources the caller can see.

-- ---------------------------------------------------------------- tables

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default '',
  color         text not null default '#5EC4B9',
  locale        text not null default 'en' check (locale in ('en', 'ja')),
  created_at    timestamptz not null default now()
);

create table public.spaces (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('personal', 'household')),
  name         text not null check (length(name) between 1 and 60),
  tone         text not null default 'a' check (tone in ('me', 'a', 'b', 'c', 'd')),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  invite_code  text unique,
  created_at   timestamptz not null default now()
);
create unique index spaces_one_personal_per_user on public.spaces (owner_id) where kind = 'personal';

create table public.space_members (
  space_id   uuid not null references public.spaces (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on public.space_members (user_id);

create table public.sources (
  id               uuid primary key default gen_random_uuid(),
  space_id         uuid not null references public.spaces (id) on delete cascade,
  name             text not null check (length(name) between 1 and 60),
  kind             text not null check (kind in ('bank', 'savings', 'cash')),
  opening_balance  bigint not null default 0,
  archived         boolean not null default false,
  created_at       timestamptz not null default now()
);
create index sources_space_idx on public.sources (space_id);

create table public.payment_methods (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references public.spaces (id) on delete cascade,
  name          text not null check (length(name) between 1 and 60),
  kind          text not null check (kind in ('cash', 'debit', 'credit', 'emoney')),
  source_id     uuid not null references public.sources (id) on delete restrict,
  credit_limit  bigint,
  closing_day   smallint check (closing_day between 1 and 31),
  payment_day   smallint check (payment_day between 1 and 31),
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  check (kind <> 'credit' or (closing_day is not null and payment_day is not null))
);
create index payment_methods_space_idx on public.payment_methods (space_id);

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  space_id        uuid not null references public.spaces (id) on delete cascade,
  name            text not null check (length(name) between 1 and 40),
  color           text not null default '#2F8F7F',
  kind            text not null default 'expense' check (kind in ('expense', 'income')),
  monthly_budget  bigint not null default 0 check (monthly_budget >= 0),
  sort            integer not null default 0,
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index categories_space_idx on public.categories (space_id);

create table public.entries (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces (id) on delete cascade,
  kind         text not null check (kind in ('expense', 'income')),
  amount       bigint not null check (amount > 0),          -- whole yen
  category_id  uuid references public.categories (id) on delete set null,
  method_id    uuid references public.payment_methods (id) on delete set null,  -- expenses
  source_id    uuid references public.sources (id) on delete set null,          -- income
  occurred_on  date not null default current_date,
  note         text not null default '' check (length(note) <= 200),
  tags         text[] not null default '{}',
  repeat       text not null default 'none' check (repeat in ('none', 'weekly', 'biweekly', 'monthly', 'yearly')),
  repeat_of    uuid references public.entries (id) on delete set null,
  created_by   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index entries_space_date_idx on public.entries (space_id, occurred_on desc);
create index entries_method_idx on public.entries (method_id);
create index entries_source_idx on public.entries (source_id);
-- one row per occurrence of a repeating entry (NULL repeat_of never conflicts)
alter table public.entries add constraint entries_one_occurrence unique (repeat_of, occurred_on);

create table public.no_spend_days (
  user_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day      date not null,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------- helpers

create function public.is_member(p_space uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m where m.space_id = p_space and m.user_id = auth.uid()
  );
$$;

create function public.shares_space_with(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members a
    join public.space_members b on b.space_id = a.space_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

create function public.new_invite_code()
returns text
language sql volatile set search_path = ''
as $$
  select 'LFY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

create function public.seed_categories(p_space uuid, p_kind text, p_locale text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  ja boolean := p_locale = 'ja';
begin
  if p_kind = 'personal' then
    insert into public.categories (space_id, name, color, kind, sort) values
      (p_space, case when ja then '食費' else 'Food' end,          '#D0704B', 'expense', 1),
      (p_space, case when ja then 'カフェ' else 'Coffee' end,       '#9C7A50', 'expense', 2),
      (p_space, case when ja then '交通' else 'Transport' end,      '#4A7FC4', 'expense', 3),
      (p_space, case when ja then '趣味' else 'Hobbies' end,        '#B05AAA', 'expense', 4),
      (p_space, case when ja then '買い物' else 'Shopping' end,     '#C2566E', 'expense', 5),
      (p_space, case when ja then 'サブスク' else 'Subscriptions' end, '#8A6AD8', 'expense', 6),
      (p_space, case when ja then '給料' else 'Salary' end,         '#6A9C36', 'income', 7);
  else
    insert into public.categories (space_id, name, color, kind, sort) values
      (p_space, case when ja then '食料品' else 'Groceries' end,    '#6A9C36', 'expense', 1),
      (p_space, case when ja then '家賃' else 'Rent' end,           '#4A7FC4', 'expense', 2),
      (p_space, case when ja then '光熱費' else 'Utilities' end,    '#D3A42A', 'expense', 3),
      (p_space, case when ja then '日用品' else 'Daily goods' end,  '#3F9AB0', 'expense', 4),
      (p_space, case when ja then '外食' else 'Dining out' end,     '#D0704B', 'expense', 5),
      (p_space, case when ja then '生活費の入金' else 'Contributions' end, '#2F8F7F', 'income', 6);
  end if;
end;
$$;

-- ---------------------------------------------------------------- sign-up

create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_locale text := coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en');
begin
  if v_locale not in ('en', 'ja') then v_locale := 'en'; end if;
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    v_locale
  );
  insert into public.spaces (kind, name, tone, owner_id)
  values ('personal', case when v_locale = 'ja' then '自分' else 'Me' end, 'me', new.id)
  returning id into v_space;
  insert into public.space_members (space_id, user_id, role) values (v_space, new.id, 'owner');
  perform public.seed_categories(v_space, 'personal', v_locale);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- household RPCs

create function public.create_household(p_name text, p_tone text default 'a')
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
  v_locale text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select locale into v_locale from public.profiles where id = auth.uid();
  insert into public.spaces (kind, name, tone, owner_id, invite_code)
  values ('household', trim(p_name), coalesce(p_tone, 'a'), auth.uid(), public.new_invite_code())
  returning id into v_space;
  insert into public.space_members (space_id, user_id, role) values (v_space, auth.uid(), 'owner');
  perform public.seed_categories(v_space, 'household', coalesce(v_locale, 'en'));
  return v_space;
end;
$$;

create function public.join_household(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into v_space from public.spaces
  where kind = 'household' and invite_code = upper(trim(p_code));
  if v_space is null then raise exception 'invite code not found' using errcode = 'P0002'; end if;
  insert into public.space_members (space_id, user_id) values (v_space, auth.uid())
  on conflict do nothing;
  return v_space;
end;
$$;

create function public.leave_household(p_space uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.space_members m
  using public.spaces s
  where m.space_id = p_space and m.user_id = auth.uid() and s.id = m.space_id and s.kind = 'household';
  -- the last member leaving removes the household and everything in it
  delete from public.spaces s
  where s.id = p_space and s.kind = 'household'
    and not exists (select 1 from public.space_members m where m.space_id = p_space);
end;
$$;

-- Charges against every method/source the caller can see, including ones logged in spaces
-- the caller cannot read. Only amount, date and kind are exposed: no note, category or logger.
create function public.money_flows()
returns table (method_id uuid, source_id uuid, kind text, amount bigint, occurred_on date)
language sql stable security definer set search_path = ''
as $$
  select e.method_id, e.source_id, e.kind, e.amount, e.occurred_on
  from public.entries e
  where (e.method_id is not null and exists (
          select 1 from public.payment_methods pm
          where pm.id = e.method_id and public.is_member(pm.space_id)))
     or (e.source_id is not null and exists (
          select 1 from public.sources s
          where s.id = e.source_id and public.is_member(s.space_id)));
$$;

-- ---------------------------------------------------------------- integrity triggers

create function public.check_payment_method()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.sources s where s.id = new.source_id and s.space_id = new.space_id) then
    raise exception 'payment method and its source must be in the same space';
  end if;
  return new;
end;
$$;

create trigger payment_methods_check
  before insert or update on public.payment_methods
  for each row execute function public.check_payment_method();

create function public.check_entry()
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

  if new.kind = 'expense' then
    new.source_id := null;
    if new.method_id is null then raise exception 'an expense needs a payment method'; end if;
    select space_id into v_space from public.payment_methods where id = new.method_id;
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

create trigger entries_check
  before insert or update on public.entries
  for each row execute function public.check_entry();

-- ---------------------------------------------------------------- row level security

alter table public.profiles        enable row level security;
alter table public.spaces          enable row level security;
alter table public.space_members   enable row level security;
alter table public.sources         enable row level security;
alter table public.payment_methods enable row level security;
alter table public.categories      enable row level security;
alter table public.entries         enable row level security;
alter table public.no_spend_days   enable row level security;

create policy "read self and co-members" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_space_with(id));
create policy "update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members read" on public.spaces
  for select to authenticated using (public.is_member(id));
create policy "members rename households" on public.spaces
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "members read" on public.space_members
  for select to authenticated using (public.is_member(space_id));

create policy "members read" on public.sources for select to authenticated using (public.is_member(space_id));
create policy "members insert" on public.sources for insert to authenticated with check (public.is_member(space_id));
create policy "members update" on public.sources for update to authenticated using (public.is_member(space_id)) with check (public.is_member(space_id));
create policy "members delete" on public.sources for delete to authenticated using (public.is_member(space_id));

create policy "members read" on public.payment_methods for select to authenticated using (public.is_member(space_id));
create policy "members insert" on public.payment_methods for insert to authenticated with check (public.is_member(space_id));
create policy "members update" on public.payment_methods for update to authenticated using (public.is_member(space_id)) with check (public.is_member(space_id));
create policy "members delete" on public.payment_methods for delete to authenticated using (public.is_member(space_id));

create policy "members read" on public.categories for select to authenticated using (public.is_member(space_id));
create policy "members insert" on public.categories for insert to authenticated with check (public.is_member(space_id));
create policy "members update" on public.categories for update to authenticated using (public.is_member(space_id)) with check (public.is_member(space_id));
create policy "members delete" on public.categories for delete to authenticated using (public.is_member(space_id));

create policy "members read" on public.entries
  for select to authenticated using (public.is_member(space_id));
create policy "members log" on public.entries
  for insert to authenticated with check (public.is_member(space_id));
create policy "logger edits" on public.entries
  for update to authenticated using (created_by = auth.uid() and public.is_member(space_id))
  with check (created_by = auth.uid() and public.is_member(space_id));
create policy "logger deletes" on public.entries
  for delete to authenticated using (created_by = auth.uid() and public.is_member(space_id));

create policy "own days" on public.no_spend_days
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- grants

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_member(uuid), public.shares_space_with(uuid),
  public.create_household(text, text), public.join_household(text),
  public.leave_household(uuid), public.money_flows()
  to authenticated;

-- Live updates between household members (skipped when the publication does not exist).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.entries, public.sources, public.payment_methods,
      public.categories, public.spaces, public.space_members;
  end if;
end $$;
