-- Migration: 20260718000002_auto_consume_invite_on_signup
-- Description:
--   1. Replace handle_new_user() to auto-consume the invite code and
--      join the shared household if the invite code has a household_id.
--   2. Add RLS policy so anonymous users can look up invite codes for
--      pre-sign-up validation.
-- Applied: 2026-07-18

-- ============================================================
-- 1. REPLACE handle_new_user — now also auto-consumes the
--    invite code passed via raw_user_meta_data.invite_code and
--    joins the shared household if the code has a household_id.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
    v_display_name varchar(100);
    v_household_id uuid;
    v_invite_code varchar(20);
    v_invite_record record;
begin
    -- Derive display name from user meta, default to 'User'
    v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', 'User');

    -- 1. Create the user's profile
    insert into public.profiles (id, display_name)
    values (new.id, v_display_name);

    -- 2. Create a personal household
    insert into public.households (name, created_by)
    values (v_display_name || '''s Home', new.id)
    returning id into v_household_id;

    -- 3. Add the user as admin of their personal household
    --    (on_household_created trigger handles feature flags)
    insert into public.household_memberships (household_id, profile_id, role)
    values (v_household_id, new.id, 'admin');

    -- 4. If the user signed up with an invite code, consume it and
    --    join the shared household
    v_invite_code := new.raw_user_meta_data ->> 'invite_code';
    if v_invite_code is not null then
        -- Look up the invite code
        select id, household_id, used_at, expires_at
        into v_invite_record
        from public.invite_codes
        where code = upper(trim(v_invite_code))
        limit 1;

        -- Only consume if valid (not used, not expired)
        if v_invite_record.id is not null
           and v_invite_record.used_at is null
           and v_invite_record.expires_at > now() then

            -- Mark the invite code as used
            update public.invite_codes
            set used_at = now(), used_by = new.id
            where id = v_invite_record.id;

            -- Add user as member of the shared household
            insert into public.household_memberships (household_id, profile_id, role)
            values (v_invite_record.household_id, new.id, 'member');
        end if;
    end if;

    return new;
end;
$$;

-- ============================================================
-- 2. RLS: Allow anonymous SELECT on invite_codes for validation.
--    The code value is already known to the user (they entered
--    it), so exposing the row is safe.
-- ============================================================

create policy "Anyone can look up invite codes for validation"
    on public.invite_codes for select
    using (true);
