-- Performance follow-ups from the Supabase advisor.
-- Wrap auth.uid() in a sub-select so policies evaluate it once per query, not once per row.
alter policy "read self and co-members" on public.profiles
  using ((select auth.uid()) = id or public.shares_space_with(id));
alter policy "update self" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "logger edits" on public.entries
  using (created_by = (select auth.uid()) and public.is_member(space_id))
  with check (created_by = (select auth.uid()) and public.is_member(space_id));
alter policy "logger deletes" on public.entries
  using (created_by = (select auth.uid()) and public.is_member(space_id));
alter policy "own days" on public.no_spend_days
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Cover foreign keys used for lookups and cascades.
create index if not exists entries_category_idx on public.entries (category_id);
create index if not exists entries_created_by_idx on public.entries (created_by);
create index if not exists payment_methods_source_idx on public.payment_methods (source_id);
