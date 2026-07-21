-- ============================================================================
-- GymMate SaaS — Database Schema (Supabase / PostgreSQL)
-- ============================================================================
-- Multi-tenant gym management platform.
--   * Super Admin  → controls the whole platform (all gyms / tenants)
--   * Gym Owner    → manages one gym (tenant), its staff & members
--   * Staff        → trainer / front-desk (role-based access inside a gym)
--   * Member       → end user (web / PWA)
--
-- Run order:  01_schema.sql → 02_rls.sql → 03_functions.sql → 04_seed.sql
-- ============================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
create type user_role        as enum ('super_admin', 'gym_owner', 'staff', 'member');
create type staff_role       as enum ('trainer', 'front_desk', 'manager');
create type gym_status        as enum ('pending', 'active', 'suspended');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');
create type member_sub_status as enum ('active', 'expired', 'pending', 'frozen');
create type payment_status    as enum ('paid', 'pending', 'failed', 'refunded');
create type payment_method    as enum ('cash', 'card', 'bank_transfer', 'online');
create type gender_type       as enum ('male', 'female', 'other');
create type unit_weight       as enum ('kg', 'lbs');
create type unit_length       as enum ('cm', 'in');
create type theme_pref        as enum ('system', 'light', 'dark');
create type meal_type         as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- ============================================================================
-- PLATFORM-LEVEL (Super Admin owns these)
-- ============================================================================

-- SaaS subscription packages offered to gym owners (Basic / Premium / Enterprise)
create table public.saas_plans (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text unique not null,
  price_monthly   numeric(10,2) not null default 0,
  price_yearly    numeric(10,2) not null default 0,
  max_members     int,                          -- null = unlimited
  max_staff       int,
  features        jsonb not null default '{}',  -- feature flags { "diet_planner": true, ... }
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- TENANTS  (each gym = one tenant)
-- ============================================================================
create table public.gyms (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text unique not null,
  owner_id        uuid references auth.users(id) on delete set null,
  logo_url        text,
  phone           text,
  email           text,
  address         text,
  -- Geo-fenced attendance
  latitude        double precision,
  longitude       double precision,
  geofence_radius int not null default 100,     -- metres
  -- SaaS subscription (gym owner pays the platform)
  plan_id         uuid references public.saas_plans(id),
  sub_status      subscription_status not null default 'trialing',
  trial_ends_at   timestamptz,
  status          gym_status not null default 'pending',
  -- Per-gym feature overrides (merged over plan.features)
  feature_overrides jsonb not null default '{}',
  currency        text not null default 'LKR',
  timezone        text not null default 'Asia/Colombo',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index gyms_owner_idx on public.gyms(owner_id);
create index gyms_status_idx on public.gyms(status);

-- ============================================================================
-- PROFILES  (extends auth.users — one row per user)
-- ============================================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'member',
  gym_id        uuid references public.gyms(id) on delete set null,  -- which gym they belong to
  full_name     text,
  avatar_url    text,
  gender        gender_type,
  date_of_birth date,
  height        numeric(5,1),                 -- stored in cm
  -- App preferences
  theme         theme_pref not null default 'dark',
  weight_unit   unit_weight not null default 'kg',
  length_unit   unit_length not null default 'cm',
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_gym_idx on public.profiles(gym_id);
create index profiles_role_idx on public.profiles(role);

-- ============================================================================
-- STAFF  (trainers / front-desk inside a gym — RBAC)
-- ============================================================================
create table public.staff (
  id          uuid primary key default uuid_generate_v4(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        staff_role not null default 'front_desk',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (gym_id, user_id)
);
create index staff_gym_idx on public.staff(gym_id);

-- ============================================================================
-- MEMBERSHIP PLANS  (gym's own pricing: 1 Month / 3 Months / 1 Year)
-- ============================================================================
create table public.membership_plans (
  id            uuid primary key default uuid_generate_v4(),
  gym_id        uuid not null references public.gyms(id) on delete cascade,
  name          text not null,
  duration_days int not null,                 -- 30 / 90 / 365
  price         numeric(10,2) not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index membership_plans_gym_idx on public.membership_plans(gym_id);

-- ============================================================================
-- MEMBER SUBSCRIPTIONS  (a member's purchased membership at a gym)
-- ============================================================================
create table public.member_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,
  member_id   uuid not null references auth.users(id) on delete cascade,
  plan_id     uuid references public.membership_plans(id) on delete set null,
  start_date  date not null default current_date,
  end_date    date not null,
  status      member_sub_status not null default 'active',
  created_at  timestamptz not null default now()
);
create index member_subs_gym_idx on public.member_subscriptions(gym_id);
create index member_subs_member_idx on public.member_subscriptions(member_id);
create index member_subs_end_idx on public.member_subscriptions(end_date);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
create table public.payments (
  id              uuid primary key default uuid_generate_v4(),
  gym_id          uuid not null references public.gyms(id) on delete cascade,
  member_id       uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.member_subscriptions(id) on delete set null,
  amount          numeric(10,2) not null,
  method          payment_method not null default 'cash',
  status          payment_status not null default 'paid',
  recorded_by     uuid references auth.users(id),  -- staff who recorded a manual payment
  note            text,
  paid_at         timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index payments_gym_idx on public.payments(gym_id);
create index payments_member_idx on public.payments(member_id);
create index payments_paid_at_idx on public.payments(paid_at);

-- ============================================================================
-- ATTENDANCE  (geo-fenced check-ins)
-- ============================================================================
create table public.attendance (
  id           uuid primary key default uuid_generate_v4(),
  gym_id       uuid not null references public.gyms(id) on delete cascade,
  member_id    uuid not null references auth.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  latitude     double precision,
  longitude    double precision,
  distance_m   double precision,              -- distance from gym centre at check-in
  source       text not null default 'geo',   -- 'geo' | 'manual' (front-desk)
  created_at   timestamptz not null default now()
);
create index attendance_gym_idx on public.attendance(gym_id);
create index attendance_member_idx on public.attendance(member_id);
create index attendance_day_idx on public.attendance(gym_id, checked_in_at);

-- ============================================================================
-- BODY METRICS  (weight history for progress tracking)
-- ============================================================================
create table public.body_metrics (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references auth.users(id) on delete cascade,
  weight      numeric(5,1) not null,          -- stored in kg
  body_fat    numeric(4,1),
  notes       text,
  recorded_at date not null default current_date,
  created_at  timestamptz not null default now()
);
create index body_metrics_member_idx on public.body_metrics(member_id, recorded_at);

-- Member fitness goals (target weight etc.)
create table public.member_goals (
  member_id     uuid primary key references auth.users(id) on delete cascade,
  target_weight numeric(5,1),                 -- kg
  goal_type     text,                         -- 'lose_fat' | 'build_muscle' | 'maintain'
  daily_calorie_target int,
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- WORKOUT  (exercise library + plans + logs)
-- ============================================================================
-- Global exercise library (shared) — gym_id null = platform default,
-- non-null = custom exercise added by that gym.
create table public.exercises (
  id            uuid primary key default uuid_generate_v4(),
  gym_id        uuid references public.gyms(id) on delete cascade,
  name          text not null,
  muscle_groups text[] not null default '{}',
  equipment     text,
  instructions  text,
  image_url     text,
  created_at    timestamptz not null default now()
);
create index exercises_gym_idx on public.exercises(gym_id);

-- A member's workout plan (e.g. "Back Day")
create table public.workout_plans (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  day_label   text,                           -- "Week 3 · Day 2"
  created_at  timestamptz not null default now()
);
create index workout_plans_member_idx on public.workout_plans(member_id);

-- Exercises inside a plan, with prescribed sets/reps
create table public.workout_plan_exercises (
  id            uuid primary key default uuid_generate_v4(),
  plan_id       uuid not null references public.workout_plans(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id),
  position      int not null default 0,
  target_sets   int default 4,
  target_reps   int default 8,
  target_weight numeric(6,1),
  rest_seconds  int default 90,
  notes         text
);
create index wpe_plan_idx on public.workout_plan_exercises(plan_id);

-- An actual workout session a member performed
create table public.workout_sessions (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references auth.users(id) on delete cascade,
  plan_id     uuid references public.workout_plans(id) on delete set null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  duration_seconds int,
  created_at  timestamptz not null default now()
);
create index workout_sessions_member_idx on public.workout_sessions(member_id, started_at);

-- Logged sets within a session
create table public.workout_logs (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number  int not null,
  reps        int,
  weight      numeric(6,1),
  completed   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index workout_logs_session_idx on public.workout_logs(session_id);

-- ============================================================================
-- DIET  (meal logging + food library)
-- ============================================================================
create table public.foods (
  id            uuid primary key default uuid_generate_v4(),
  gym_id        uuid references public.gyms(id) on delete cascade,  -- null = global
  name          text not null,
  calories      numeric(7,1) not null,        -- per serving
  protein_g     numeric(6,1) default 0,
  carbs_g       numeric(6,1) default 0,
  fat_g         numeric(6,1) default 0,
  serving       text,                          -- "1 cup", "100 g"
  created_at    timestamptz not null default now()
);
create index foods_gym_idx on public.foods(gym_id);

create table public.meal_logs (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references auth.users(id) on delete cascade,
  food_id     uuid references public.foods(id) on delete set null,
  meal        meal_type not null,
  custom_name text,                            -- if not from food library
  calories    numeric(7,1) not null,
  protein_g   numeric(6,1) default 0,
  carbs_g     numeric(6,1) default 0,
  fat_g       numeric(6,1) default 0,
  servings    numeric(5,2) not null default 1,
  logged_at   date not null default current_date,
  created_at  timestamptz not null default now()
);
create index meal_logs_member_idx on public.meal_logs(member_id, logged_at);

-- ============================================================================
-- NOTIFICATIONS  (workout reminders / diet alerts / push subscriptions)
-- ============================================================================
create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text,
  type        text not null default 'general', -- 'workout' | 'diet' | 'payment' | 'general'
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read);

-- Web Push subscriptions (PWA)
create table public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_gyms_touch     before update on public.gyms     for each row execute function public.touch_updated_at();
create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
