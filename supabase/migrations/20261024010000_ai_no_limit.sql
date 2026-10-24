-- The assistant has no daily limit any more: ai_use() still proves who is asking (the Worker calls it with the
-- person's own token before each model request) and counts the request, but never refuses one.

-- Counts one model request for the caller today (Japan time) and returns how many they have made today.
create or replace function public.ai_use()
returns int
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Tokyo')::date;
  v_n int;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.ai_usage as u (user_id, day, requests) values (auth.uid(), v_day, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1
  returning requests into v_n;
  return v_n;
end;
$$;
