-- ============================================================================
-- GymMate — Functions, Triggers & RPCs
-- Run after 02_rls.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- full_name comes from the signup metadata (options.data.full_name).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Haversine distance in metres between two lat/lng points.
-- ---------------------------------------------------------------------------
create or replace function public.distance_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ---------------------------------------------------------------------------
-- Geo-fenced check-in RPC.
-- Member calls this with their current coordinates; we verify they're inside
-- the gym's radius and that they aren't already checked in today.
-- ---------------------------------------------------------------------------
create or replace function public.check_in(p_lat double precision, p_lng double precision)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gym   public.gyms%rowtype;
  v_dist  double precision;
  v_uid   uuid := auth.uid();
  v_today boolean;
begin
  select g.* into v_gym
  from public.gyms g
  join public.profiles p on p.gym_id = g.id
  where p.id = v_uid;

  if v_gym.id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_gym');
  end if;
  if v_gym.latitude is null or v_gym.longitude is null then
    return jsonb_build_object('ok', false, 'reason', 'gym_location_unset');
  end if;

  v_dist := public.distance_m(p_lat, p_lng, v_gym.latitude, v_gym.longitude);

  if v_dist > v_gym.geofence_radius then
    return jsonb_build_object('ok', false, 'reason', 'outside_radius',
                              'distance_m', round(v_dist::numeric, 1),
                              'radius_m', v_gym.geofence_radius);
  end if;

  select exists (
    select 1 from public.attendance
    where member_id = v_uid and gym_id = v_gym.id
      and checked_in_at::date = current_date
  ) into v_today;

  if v_today then
    return jsonb_build_object('ok', false, 'reason', 'already_checked_in');
  end if;

  insert into public.attendance (gym_id, member_id, latitude, longitude, distance_m)
  values (v_gym.id, v_uid, p_lat, p_lng, v_dist);

  return jsonb_build_object('ok', true, 'distance_m', round(v_dist::numeric, 1));
end; $$;

-- ---------------------------------------------------------------------------
-- Gym owner dashboard summary (today's check-ins, active members, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.owner_dashboard(p_gym uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.manages_gym(p_gym) then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'checkins_today', (
      select count(*) from public.attendance
      where gym_id = p_gym and checked_in_at::date = current_date),
    'active_members', (
      select count(distinct member_id) from public.member_subscriptions
      where gym_id = p_gym and status = 'active' and end_date >= current_date),
    'expired_members', (
      select count(distinct member_id) from public.member_subscriptions
      where gym_id = p_gym and end_date < current_date),
    'revenue_today', (
      select coalesce(sum(amount),0) from public.payments
      where gym_id = p_gym and status = 'paid' and paid_at::date = current_date),
    'revenue_month', (
      select coalesce(sum(amount),0) from public.payments
      where gym_id = p_gym and status = 'paid'
        and date_trunc('month', paid_at) = date_trunc('month', now())),
    'pending_payments', (
      select count(*) from public.payments
      where gym_id = p_gym and status = 'pending')
  ) into result;

  return result;
end; $$;

-- ---------------------------------------------------------------------------
-- Super admin platform dashboard (MRR, total gyms, total members)
-- ---------------------------------------------------------------------------
create or replace function public.platform_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
    'mrr', (
      select coalesce(sum(sp.price_monthly),0)
      from public.gyms g join public.saas_plans sp on sp.id = g.plan_id
      where g.sub_status = 'active'),
    'active_gyms',   (select count(*) from public.gyms where status = 'active'),
    'pending_gyms',  (select count(*) from public.gyms where status = 'pending'),
    'total_gyms',    (select count(*) from public.gyms),
    'total_members', (select count(*) from public.profiles where role = 'member')
  ) into result;

  return result;
end; $$;
