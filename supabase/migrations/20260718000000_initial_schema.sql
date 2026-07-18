-- Migration: 20260718000000_initial_schema
-- Description: Initial schema for LIFEY - all core tables, functions, triggers, and RLS policies
-- Applied: 2026-07-18

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

create type public.item_status as enum ('pending', 'completed');

-- ============================================================
-- 2. HELPER FUNCTIONS (safe to create before tables — lazily evaluated)
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Check if the requesting user is a household member
create or replace function public.is_household_member(household_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
    select exists (
        select 1
        from public.household_memberships
        where household_memberships.household_id = is_household_member.household_id
          and household_memberships.profile_id = auth.uid()
    );
$$;

-- Check if the requesting user is a household admin
create or replace function public.is_household_admin(household_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
    select exists (
        select 1
        from public.household_memberships
        where household_memberships.household_id = is_household_admin.household_id
          and household_memberships.profile_id = auth.uid()
          and household_memberships.role = 'admin'
    );
$$;

-- ============================================================
-- 3. TABLES (in dependency order)
-- ============================================================

-- 3a. profiles — extends auth.users; created via trigger on sign-up
create table public.profiles (
    id            uuid primary key references auth.users(id) on delete cascade,
    display_name  varchar(100) not null,
    avatar_url    text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- 3b. households — a shared-life group; personal household created on sign-up
create table public.households (
    id          uuid primary key default gen_random_uuid(),
    name        varchar(100) not null,
    created_by  uuid not null references public.profiles(id),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- 3c. household_memberships — join table: profiles <-> households with roles
create table public.household_memberships (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id) on delete cascade,
    profile_id    uuid not null references public.profiles(id) on delete cascade,
    role          varchar(20) not null default 'member' check (role in ('admin', 'member')),
    joined_at     timestamptz not null default now(),
    unique(household_id, profile_id)
);

create index if not exists idx_memberships_profile on public.household_memberships(profile_id);
create index if not exists idx_memberships_household on public.household_memberships(household_id);

-- 3d. household_feature_flags — feature toggles per household
create table public.household_feature_flags (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id) on delete cascade,
    feature_key   varchar(50) not null,
    enabled       boolean not null default false,
    unique(household_id, feature_key)
);

create index if not exists idx_feature_flags_household on public.household_feature_flags(household_id);

-- 3e. invite_codes — time-limited codes to join a household
create table public.invite_codes (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id) on delete cascade,
    code          varchar(20) not null,
    created_by    uuid not null references public.profiles(id),
    used_by       uuid references public.profiles(id),
    used_at       timestamptz,
    expires_at    timestamptz not null,
    created_at    timestamptz not null default now(),
    unique(code)
);

create index if not exists idx_invite_codes_household on public.invite_codes(household_id);

-- 3f. password_reset_codes — 6-digit code delivery for forgot-password flow
create table public.password_reset_codes (
    id            uuid primary key default gen_random_uuid(),
    email         text not null,
    code_hash     text not null,
    expires_at    timestamptz not null,
    attempts      int not null default 0,
    created_at    timestamptz not null default now()
);

create index if not exists idx_password_reset_codes_email on public.password_reset_codes(email);

-- 3g. task_lists — containers for task items, scoped to a household
create table public.task_lists (
    id            uuid primary key default gen_random_uuid(),
    household_id  uuid not null references public.households(id) on delete cascade,
    name          varchar(100) not null,
    created_by    uuid not null references public.profiles(id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_task_lists_household on public.task_lists(household_id);
create index if not exists idx_task_lists_created_by on public.task_lists(created_by);

-- 3h. task_items — individual to-do items inside a task list
create table public.task_items (
    id            uuid primary key default gen_random_uuid(),
    task_list_id  uuid not null references public.task_lists(id) on delete cascade,
    title         varchar(255) not null,
    description   text,
    due_date      timestamptz,
    status        public.item_status not null default 'pending',
    created_by    uuid not null references public.profiles(id),
    completed_by  uuid references public.profiles(id),
    completed_at  timestamptz,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index if not exists idx_task_items_list on public.task_items(task_list_id);
create index if not exists idx_task_items_status on public.task_items(status);
create index if not exists idx_task_items_due_date on public.task_items(due_date);
create index if not exists idx_task_items_created_by on public.task_items(created_by);

-- 3i. task_assignees — many-to-many: task items <-> profiles
create table public.task_assignees (
    id          uuid primary key default gen_random_uuid(),
    task_id     uuid not null references public.task_items(id) on delete cascade,
    profile_id  uuid not null references public.profiles(id) on delete cascade,
    assigned_at timestamptz not null default now(),
    unique(task_id, profile_id)
);

create index if not exists idx_task_assignees_task on public.task_assignees(task_id);
create index if not exists idx_task_assignees_profile on public.task_assignees(profile_id);

-- ============================================================
-- 4. TRIGGER FUNCTIONS (safe to create after tables — only called by triggers)
-- ============================================================

-- Auto-create profile on user sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'User'));
    return new;
end;
$$;

-- Seed default feature flags when a household is created
create or replace function public.seed_feature_flags()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.household_feature_flags (household_id, feature_key, enabled) values
        (new.id, 'todo_lists', true),
        (new.id, 'expenses', false),
        (new.id, 'ai_agent', false),
        (new.id, 'household_chat', false);
    return new;
end;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Profile creation on auth.users insert
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Feature flag seeding on household creation
create trigger on_household_created
    after insert on public.households
    for each row execute function public.seed_feature_flags();

-- Updated_at auto-update triggers
create trigger set_updated_at_profiles
    before update on public.profiles
    for each row execute function public.set_updated_at();

create trigger set_updated_at_households
    before update on public.households
    for each row execute function public.set_updated_at();

create trigger set_updated_at_task_lists
    before update on public.task_lists
    for each row execute function public.set_updated_at();

create trigger set_updated_at_task_items
    before update on public.task_items
    for each row execute function public.set_updated_at();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- 6a. profiles: users can read/update their own profile only
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
    on public.profiles for select
    using (id = auth.uid());

create policy "Users can update their own profile"
    on public.profiles for update
    using (id = auth.uid())
    with check (id = auth.uid());

-- 6b. households: members can read; admins can update
alter table public.households enable row level security;

create policy "Members can view their households"
    on public.households for select
    using (is_household_member(id));

create policy "Admins can update their household"
    on public.households for update
    using (is_household_admin(id))
    with check (is_household_admin(id));

-- 6c. household_memberships: members can read; admins can manage
alter table public.household_memberships enable row level security;

create policy "Members can view memberships in their households"
    on public.household_memberships for select
    using (is_household_member(household_id));

create policy "Admins can manage memberships"
    on public.household_memberships for insert
    with check (is_household_admin(household_id));

create policy "Admins can update memberships"
    on public.household_memberships for update
    using (is_household_admin(household_id))
    with check (is_household_admin(household_id));

create policy "Admins can remove members"
    on public.household_memberships for delete
    using (is_household_admin(household_id));

-- 6d. invite_codes: members can read and create; anyone can use (mark as used)
alter table public.invite_codes enable row level security;

create policy "Members can view invite codes"
    on public.invite_codes for select
    using (is_household_member(household_id));

create policy "Admins can create invite codes"
    on public.invite_codes for insert
    with check (is_household_admin(household_id));

create policy "Anyone can use an invite code (mark as used)"
    on public.invite_codes for update
    using (true)
    with check (true);

-- 6e. password_reset_codes: no direct user access (managed via Edge Function)
alter table public.password_reset_codes enable row level security;

-- Only the Edge Function (service_role) can access this table
create policy "Only service role can manage password reset codes"
    on public.password_reset_codes for all
    using (false)
    with check (false);

-- 6f. task_lists: members can CRUD
alter table public.task_lists enable row level security;

create policy "Members can view task lists"
    on public.task_lists for select
    using (is_household_member(household_id));

create policy "Members can create task lists"
    on public.task_lists for insert
    with check (is_household_member(household_id));

create policy "Members can update task lists"
    on public.task_lists for update
    using (is_household_member(household_id))
    with check (is_household_member(household_id));

create policy "Members can delete task lists"
    on public.task_lists for delete
    using (is_household_member(household_id));

-- 6g. task_items: members can CRUD (access scoped via task_list -> household)
alter table public.task_items enable row level security;

create policy "Members can view task items"
    on public.task_items for select
    using (exists (
        select 1 from public.task_lists
        where task_lists.id = task_items.task_list_id
          and is_household_member(task_lists.household_id)
    ));

create policy "Members can create task items"
    on public.task_items for insert
    with check (exists (
        select 1 from public.task_lists
        where task_lists.id = task_items.task_list_id
          and is_household_member(task_lists.household_id)
    ));

create policy "Members can update task items"
    on public.task_items for update
    using (exists (
        select 1 from public.task_lists
        where task_lists.id = task_items.task_list_id
          and is_household_member(task_lists.household_id)
    ))
    with check (exists (
        select 1 from public.task_lists
        where task_lists.id = task_items.task_list_id
          and is_household_member(task_lists.household_id)
    ));

create policy "Members can delete task items"
    on public.task_items for delete
    using (exists (
        select 1 from public.task_lists
        where task_lists.id = task_items.task_list_id
          and is_household_member(task_lists.household_id)
    ));

-- 6h. task_assignees: members can manage (access scoped via task_item -> task_list -> household)
alter table public.task_assignees enable row level security;

create policy "Members can view assignees"
    on public.task_assignees for select
    using (exists (
        select 1 from public.task_items
        join public.task_lists on task_lists.id = task_items.task_list_id
        where task_items.id = task_assignees.task_id
          and is_household_member(task_lists.household_id)
    ));

create policy "Members can manage assignees"
    on public.task_assignees for insert
    with check (exists (
        select 1 from public.task_items
        join public.task_lists on task_lists.id = task_items.task_list_id
        where task_items.id = task_assignees.task_id
          and is_household_member(task_lists.household_id)
    ));

create policy "Members can remove assignees"
    on public.task_assignees for delete
    using (exists (
        select 1 from public.task_items
        join public.task_lists on task_lists.id = task_items.task_list_id
        where task_items.id = task_assignees.task_id
          and is_household_member(task_lists.household_id)
    ));

-- 6i. household_feature_flags: members can read; admins can toggle
alter table public.household_feature_flags enable row level security;

create policy "Members can view feature flags"
    on public.household_feature_flags for select
    using (is_household_member(household_id));

create policy "Admins can toggle feature flags"
    on public.household_feature_flags for update
    using (is_household_admin(household_id))
    with check (is_household_admin(household_id));
