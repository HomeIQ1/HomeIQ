-- ============================================================================
-- HomeIQ AI — Database schema + Row Level Security
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- ============================================================================

-- 1. The single data entity: a CMA that belongs to a user.
create table if not exists public.cmas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  property_address text not null,
  generated_cma    text not null,   -- JSON payload (value range, comps, etc.)
  listing_copy     text not null,
  created_at       timestamptz not null default now()
);

-- Index for the common "my CMAs, newest first" query.
create index if not exists cmas_user_id_created_at_idx
  on public.cmas (user_id, created_at desc);

-- 2. Turn ON Row Level Security so the table is deny-by-default.
alter table public.cmas enable row level security;

-- 3. Policies: a user may only see and act on their OWN rows.
--    auth.uid() is the id of the currently authenticated user.

drop policy if exists "cmas_select_own" on public.cmas;
create policy "cmas_select_own"
  on public.cmas for select
  using (auth.uid() = user_id);

drop policy if exists "cmas_insert_own" on public.cmas;
create policy "cmas_insert_own"
  on public.cmas for insert
  with check (auth.uid() = user_id);

drop policy if exists "cmas_update_own" on public.cmas;
create policy "cmas_update_own"
  on public.cmas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cmas_delete_own" on public.cmas;
create policy "cmas_delete_own"
  on public.cmas for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Done. With RLS enabled and these policies in place, the anon/authenticated
-- API key can never read or modify another user's CMAs — isolation is enforced
-- in the database, not just in the application code.
-- ============================================================================
