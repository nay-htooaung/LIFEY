-- Space membership without hard deletes.
-- Leaving, being removed and deleting a space only mark rows, so rejoining (or the owner restoring the space)
-- brings every entry back.
--   space_members.left_at  set when a member leaves or the owner removes them; cleared when they rejoin.
--   spaces.deleted_at      set when the owner deletes a space; cleared when the owner restores it.

alter table public.space_members add column left_at timestamptz;
alter table public.spaces add column deleted_at timestamptz;

-- Active membership of a space that is not deleted. Every data policy goes through this.
create or replace function public.is_member(p_space uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.space_members m join public.spaces s on s.id = m.space_id
    where m.space_id = p_space and m.user_id = auth.uid() and m.left_at is null and s.deleted_at is null
  );
$$;

-- Profiles readable to co-members, including people who have left, so their past entries keep a name.
create or replace function public.shares_space_with(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.space_members a
    join public.space_members b on b.space_id = a.space_id
    join public.spaces s on s.id = a.space_id
    where a.user_id = auth.uid() and a.left_at is null and s.deleted_at is null and b.user_id = p_user
  );
$$;

-- The owner also sees their deleted spaces, so they can restore them.
drop policy "members read" on public.spaces;
create policy "members and owner read" on public.spaces
  for select to authenticated using (public.is_member(id) or owner_id = (select auth.uid()));

-- Members may rename and recolour a space, nothing else (not the owner, code or deletion).
revoke update on public.spaces from authenticated;
grant update (name, tone) on public.spaces to authenticated;

create or replace function public.join_household(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_space uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into v_space from public.spaces
  where kind = 'household' and deleted_at is null and invite_code = upper(trim(p_code));
  if v_space is null then raise exception 'invite code not found' using errcode = 'P0002'; end if;
  -- rejoining clears left_at, so everything logged before shows up again
  insert into public.space_members (space_id, user_id) values (v_space, auth.uid())
  on conflict (space_id, user_id) do update set left_at = null;
  return v_space;
end;
$$;

create or replace function public.leave_household(p_space uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.spaces where id = p_space and owner_id = auth.uid()) then
    raise exception 'the owner deletes the space instead of leaving';
  end if;
  update public.space_members m set left_at = now()
  from public.spaces s
  where m.space_id = p_space and m.user_id = auth.uid() and m.left_at is null
    and s.id = m.space_id and s.kind = 'household';
end;
$$;

create function public.remove_space_member(p_space uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.spaces where id = p_space and owner_id = auth.uid() and kind = 'household' and deleted_at is null
  ) then
    raise exception 'only the owner can remove members';
  end if;
  if p_user = auth.uid() then raise exception 'the owner cannot remove themselves'; end if;
  update public.space_members set left_at = now()
  where space_id = p_space and user_id = p_user and left_at is null;
end;
$$;

create function public.set_space_deleted(p_space uuid, p_deleted boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.spaces set deleted_at = case when p_deleted then now() end
  where id = p_space and owner_id = auth.uid() and kind = 'household';
  if not found then raise exception 'only the owner can delete or restore a space'; end if;
end;
$$;

-- A fresh invite code, so a removed member cannot come back with the old one.
create function public.reset_invite_code(p_space uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := public.new_invite_code();
begin
  update public.spaces set invite_code = v_code
  where id = p_space and owner_id = auth.uid() and kind = 'household' and deleted_at is null;
  if not found then raise exception 'only the owner can change the invite code'; end if;
  return v_code;
end;
$$;

revoke execute on function public.remove_space_member(uuid, uuid), public.set_space_deleted(uuid, boolean),
  public.reset_invite_code(uuid) from public, anon;
grant execute on function public.remove_space_member(uuid, uuid), public.set_space_deleted(uuid, boolean),
  public.reset_invite_code(uuid) to authenticated;
