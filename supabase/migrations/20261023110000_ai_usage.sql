-- The assistant's daily allowance. Before each model request the Worker (worker/index.ts) calls ai_use()
-- with the person's own token: that proves who is asking and counts the request. The model's API key stays
-- in the Worker; the app never sees it.

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage: read own" on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));
-- only ai_use() writes here
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Counts one model request for the caller today (Japan time) and returns how many are left.
-- Over the limit it raises 'ai daily limit' and counts nothing more.
create function public.ai_use()
returns int
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_limit constant int := 150;
  v_day date := (now() at time zone 'Asia/Tokyo')::date;
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select requests into v_n from public.ai_usage where user_id = auth.uid() and day = v_day;
  if coalesce(v_n, 0) >= v_limit then
    raise exception 'ai daily limit';
  end if;
  insert into public.ai_usage as u (user_id, day, requests) values (auth.uid(), v_day, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1
  returning requests into v_n;
  return v_limit - v_n;
end;
$$;

revoke execute on function public.ai_use() from public, anon;
grant execute on function public.ai_use() to authenticated;
