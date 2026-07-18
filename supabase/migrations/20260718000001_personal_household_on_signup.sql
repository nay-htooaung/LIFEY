-- Migration: 20260718000001_personal_household_on_signup
-- Description: Update handle_new_user() to auto-create a personal household on sign-up
-- Applied: 2026-07-18

-- ============================================================
-- 1. REPLACE handle_new_user — now also creates a personal
--    household, membership (role: admin), and the
--    on_household_created trigger seeds the feature flags.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
    v_display_name varchar(100);
    v_household_id uuid;
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

    return new;
end;
$$;
