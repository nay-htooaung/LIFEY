-- Migration: 20260718000003_rls_insert_policies
-- Description: Add missing INSERT policies for households and household_memberships.
--   The handle_new_user() trigger (security definer) bypasses RLS, so these are
--   only needed for frontend code that may also try to create households.
-- Applied: 2026-07-18

-- ============================================================
-- 1. households INSERT policy
-- ============================================================
-- Users can create a household (they are the creator).

create policy "Users can create a household"
    on public.households for insert
    with check (auth.uid() = created_by);

-- ============================================================
-- 2. household_memberships INSERT policy
-- ============================================================
-- Users can add themselves as admin of a household they created
-- (this covers the personal household case in older frontend code).

create policy "Users can add themselves to their own household"
    on public.household_memberships for insert
    with check (
        auth.uid() = profile_id
        and exists (
            select 1 from public.households
            where id = household_id and created_by = auth.uid()
        )
    );
