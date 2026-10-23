-- Invitation-only sign-up.
-- Each code lets exactly one new account register, then it is spent. Codes expire.
-- The owner creates codes in the SQL editor:
--   select public.create_signup_invite('for Sam');        -- valid 7 days
--   select public.create_signup_invite('for Sam', 1);     -- valid 1 day
--   select * from public.signup_invites order by created_at desc;
-- The app sends the code as user metadata (invite_code); the trigger below claims it inside the
-- same transaction that creates the user, so a missing, wrong, expired or used code aborts sign-up.

create table public.signup_invites (
  code text primary key,
  note text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);

-- No policies: only the owner (SQL editor / service role) can read or create codes.
alter table public.signup_invites enable row level security;
revoke all on public.signup_invites from anon, authenticated;

create function public.create_signup_invite(p_note text default null, p_days int default 7)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  -- gen_random_uuid() uses a strong random source; the first 10 hex digits are fully random.
  v_hex text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_code text := 'INV-' || substr(v_hex, 1, 5) || '-' || substr(v_hex, 6, 5);
begin
  if p_days is null or p_days < 1 then raise exception 'p_days must be at least 1'; end if;
  insert into public.signup_invites (code, note, expires_at)
  values (v_code, p_note, now() + make_interval(days => p_days));
  return v_code;
end;
$$;

create function public.claim_signup_invite()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
begin
  update public.signup_invites
  set used_by = new.id, used_at = now()
  where code = v_code and used_at is null and expires_at > now();
  if not found then
    raise exception 'invalid invitation code' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- AFTER INSERT so used_by can reference the new user; raising here still rolls the user back.
create trigger on_auth_user_claim_invite
  after insert on auth.users
  for each row execute function public.claim_signup_invite();

revoke execute on function public.create_signup_invite(text, int), public.claim_signup_invite()
  from public, anon, authenticated;
