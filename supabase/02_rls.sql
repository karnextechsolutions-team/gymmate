-- ============================================================================
-- GymMate — Row Level Security (RLS)
-- ============================================================================
-- Tenant isolation: a gym owner / staff / member can ONLY touch rows that
-- belong to their gym. Super admin bypasses tenant scoping.
-- Run after 01_schema.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read profiles inside policies
-- without recursing through RLS)
-- ---------------------------------------------------------------------------
-- NOTE: named current_user_role (NOT current_role — that is a reserved word in Postgres)
create or replace function public.current_user_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_gym_id()
returns uuid language sql stable security definer set search_path = public as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

-- Is the current user an owner/staff of the given gym?
create or replace function public.manages_gym(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.gyms where id = g and owner_id = auth.uid()
  ) or exists (
    select 1 from public.staff where gym_id = g and user_id = auth.uid() and is_active
  ) or public.is_super_admin();
$$;

-- Does the current staff member have a finance-capable role? (front_desk excluded)
create or replace function public.can_see_finance(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin()
      or exists (select 1 from public.gyms where id = g and owner_id = auth.uid())
      or exists (select 1 from public.staff
                 where gym_id = g and user_id = auth.uid() and is_active
                   and role in ('manager'));
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.saas_plans            enable row level security;
alter table public.gyms                  enable row level security;
alter table public.profiles              enable row level security;
alter table public.staff                 enable row level security;
alter table public.membership_plans      enable row level security;
alter table public.member_subscriptions  enable row level security;
alter table public.payments              enable row level security;
alter table public.attendance            enable row level security;
alter table public.body_metrics          enable row level security;
alter table public.member_goals          enable row level security;
alter table public.exercises             enable row level security;
alter table public.workout_plans         enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_sessions      enable row level security;
alter table public.workout_logs          enable row level security;
alter table public.foods                 enable row level security;
alter table public.meal_logs             enable row level security;
alter table public.notifications         enable row level security;
alter table public.push_subscriptions    enable row level security;

-- ---------------------------------------------------------------------------
-- SAAS PLANS — readable by all authed users, writable only by super admin
-- ---------------------------------------------------------------------------
create policy saas_plans_read on public.saas_plans
  for select using (auth.role() = 'authenticated');
create policy saas_plans_admin on public.saas_plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- GYMS
-- ---------------------------------------------------------------------------
-- Super admin: everything. Owner/staff: their own gym. Members: read their gym.
create policy gyms_super_admin on public.gyms
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy gyms_owner_manage on public.gyms
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy gyms_member_read on public.gyms
  for select using (id = public.current_gym_id() or public.manages_gym(id));

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- owner/staff can read profiles of members in their gym
create policy profiles_gym_staff_read on public.profiles
  for select using (gym_id is not null and public.manages_gym(gym_id));

create policy profiles_super_admin on public.profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- STAFF
-- ---------------------------------------------------------------------------
create policy staff_self_read on public.staff
  for select using (user_id = auth.uid());
create policy staff_owner_manage on public.staff
  for all using (public.manages_gym(gym_id)) with check (public.manages_gym(gym_id));

-- ---------------------------------------------------------------------------
-- MEMBERSHIP PLANS — gym-scoped
-- ---------------------------------------------------------------------------
create policy mplans_read on public.membership_plans
  for select using (gym_id = public.current_gym_id() or public.manages_gym(gym_id));
create policy mplans_manage on public.membership_plans
  for all using (public.manages_gym(gym_id)) with check (public.manages_gym(gym_id));

-- ---------------------------------------------------------------------------
-- MEMBER SUBSCRIPTIONS
-- ---------------------------------------------------------------------------
create policy msubs_member_read on public.member_subscriptions
  for select using (member_id = auth.uid());
create policy msubs_staff_manage on public.member_subscriptions
  for all using (public.manages_gym(gym_id)) with check (public.manages_gym(gym_id));

-- ---------------------------------------------------------------------------
-- PAYMENTS — finance-restricted (front_desk cannot read)
-- ---------------------------------------------------------------------------
create policy payments_member_read on public.payments
  for select using (member_id = auth.uid());
create policy payments_finance_read on public.payments
  for select using (public.can_see_finance(gym_id));
create policy payments_finance_write on public.payments
  for all using (public.manages_gym(gym_id)) with check (public.manages_gym(gym_id));

-- ---------------------------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------------------------
create policy attendance_member on public.attendance
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy attendance_staff_read on public.attendance
  for select using (public.manages_gym(gym_id));
create policy attendance_staff_write on public.attendance      -- manual front-desk check-in
  for insert with check (public.manages_gym(gym_id));

-- ---------------------------------------------------------------------------
-- BODY METRICS / GOALS — member owns; trainer can read
-- ---------------------------------------------------------------------------
create policy body_metrics_member on public.body_metrics
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy body_metrics_trainer_read on public.body_metrics
  for select using (exists (
    select 1 from public.profiles p
    where p.id = body_metrics.member_id and public.manages_gym(p.gym_id)));

create policy goals_member on public.member_goals
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- EXERCISES — global rows readable by all; gym-custom by that gym
-- ---------------------------------------------------------------------------
create policy exercises_read on public.exercises
  for select using (gym_id is null or gym_id = public.current_gym_id() or public.manages_gym(gym_id));
create policy exercises_manage on public.exercises
  for all using (gym_id is not null and public.manages_gym(gym_id))
  with check (gym_id is not null and public.manages_gym(gym_id));

-- ---------------------------------------------------------------------------
-- WORKOUTS — member owns their plans/sessions/logs
-- ---------------------------------------------------------------------------
create policy wplans_member on public.workout_plans
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy wpe_member on public.workout_plan_exercises
  for all using (exists (select 1 from public.workout_plans wp
                         where wp.id = plan_id and wp.member_id = auth.uid()))
  with check (exists (select 1 from public.workout_plans wp
                      where wp.id = plan_id and wp.member_id = auth.uid()));

create policy wsessions_member on public.workout_sessions
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy wlogs_member on public.workout_logs
  for all using (exists (select 1 from public.workout_sessions s
                         where s.id = session_id and s.member_id = auth.uid()))
  with check (exists (select 1 from public.workout_sessions s
                      where s.id = session_id and s.member_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- DIET
-- ---------------------------------------------------------------------------
create policy foods_read on public.foods
  for select using (gym_id is null or gym_id = public.current_gym_id() or public.manages_gym(gym_id));
create policy foods_manage on public.foods
  for all using (gym_id is not null and public.manages_gym(gym_id))
  with check (gym_id is not null and public.manages_gym(gym_id));

create policy meal_logs_member on public.meal_logs
  for all using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS / PUSH — user owns their own
-- ---------------------------------------------------------------------------
create policy notifications_self on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_self on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
