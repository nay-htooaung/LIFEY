-- 貯金: pots of money set aside on paper. A pot belongs to a space like a category: every member sees it, its
-- goal and monthly amount, and can put money in or take it out. Pots are not tied to any account, so a move
-- into a shared pot never shows where the money came from. Totals are summed from the moves, never stored.

create table public.pots (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  name        text not null check (length(name) between 1 and 40),
  color       text not null default '#2F8F7F',
  goal        bigint check (goal is null or goal > 0),
  monthly     bigint not null default 0 check (monthly >= 0),  -- set aside each month; comes off what is left to spend
  sort        integer not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index pots_space_idx on public.pots (space_id);

-- Money put into a pot (positive) or taken out (negative), logged by hand.
create table public.pot_moves (
  id           uuid primary key default gen_random_uuid(),
  pot_id       uuid not null references public.pots (id) on delete cascade,
  space_id     uuid not null references public.spaces (id) on delete cascade,
  amount       bigint not null check (amount <> 0),
  occurred_on  date not null default current_date,
  note         text not null default '' check (length(note) <= 200),
  created_by   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create index pot_moves_space_date_idx on public.pot_moves (space_id, occurred_on desc);
create index pot_moves_pot_idx on public.pot_moves (pot_id);

create function public.check_pot_move()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif new.created_by <> old.created_by then
    raise exception 'created_by cannot change';
  end if;
  if not exists (select 1 from public.pots p where p.id = new.pot_id and p.space_id = new.space_id) then
    raise exception 'pot belongs to another space';
  end if;
  return new;
end;
$$;
create trigger check_pot_move before insert or update on public.pot_moves
  for each row execute function public.check_pot_move();
revoke execute on function public.check_pot_move() from public, anon, authenticated;

alter table public.pots enable row level security;
alter table public.pot_moves enable row level security;

create policy "members read" on public.pots for select to authenticated using (public.is_member(space_id));
create policy "members insert" on public.pots for insert to authenticated with check (public.is_member(space_id));
create policy "members update" on public.pots for update to authenticated
  using (public.is_member(space_id)) with check (public.is_member(space_id));

create policy "members read" on public.pot_moves for select to authenticated using (public.is_member(space_id));
create policy "members log" on public.pot_moves for insert to authenticated with check (public.is_member(space_id));
create policy "logger edits" on public.pot_moves for update to authenticated
  using (created_by = (select auth.uid()) and public.is_member(space_id))
  with check (created_by = (select auth.uid()) and public.is_member(space_id));
create policy "logger deletes" on public.pot_moves for delete to authenticated
  using (created_by = (select auth.uid()) and public.is_member(space_id));

-- pots are archived, never deleted
revoke all on public.pots, public.pot_moves from anon;
revoke delete on public.pots from authenticated;
grant select, insert, update on public.pots to authenticated;
grant select, insert, update, delete on public.pot_moves to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.pots, public.pot_moves;
  end if;
end;
$$;
