# GymMate — Multi-tenant Gym SaaS

AI-assisted gym management platform. One codebase, three audiences:

| Module | Who | What |
|--------|-----|------|
| **Super Admin** | Platform owner (you) | MRR, tenants (gyms), SaaS plans, feature flags |
| **Gym Owner** | Each gym | Members, payments, attendance, staff (RBAC), reports |
| **Member** | End users (Web/PWA) | Check-in, workouts, diet, progress, settings |

Stack: **Next.js 14 (App Router) + Supabase (Postgres + Auth + RLS) + Tailwind CSS + TypeScript**. Responsive, installable as a PWA.

---

## 1. Quick start

```bash
# 1. install deps
npm install.

# 2. create your env file
cp .env.local.example .env.local
# → fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. run
npm run dev   # http://localhost:3000
```

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the files in `supabase/` **in order**:
   ```
   01_schema.sql      → tables, enums, types
   02_rls.sql         → row-level security (tenant isolation)
   03_functions.sql   → triggers + RPCs (check_in, dashboards)
   04_seed.sql        → SaaS plans + starter exercises/foods
   ```
3. **Auth → Providers**: enable Email. For OTP, turn on "Confirm email".
4. Copy **Project URL** + **anon key** (Settings → API) into `.env.local`.

### Make yourself a super admin
After signing up once, run in SQL Editor:
```sql
update public.profiles set role = 'super_admin' where id = 'YOUR-AUTH-UID';
```

### Create a gym owner + gym
```sql
-- after the owner signs up:
update public.profiles set role = 'gym_owner' where id = 'OWNER-UID';

insert into public.gyms (name, slug, owner_id, latitude, longitude, geofence_radius, status, plan_id)
values ('Iron Lab', 'iron-lab', 'OWNER-UID', 7.2089, 79.8389, 120, 'active',
        (select id from saas_plans where slug = 'premium'));

-- link a member to that gym:
update public.profiles set gym_id = (select id from gyms where slug='iron-lab')
where id = 'MEMBER-UID';
```

---

## 3. How multi-tenancy works (important)

Every gym is a **tenant**. Isolation is enforced in the database via **Row Level Security**, not in app code — so even a bug in the frontend can't leak one gym's data to another.

- `current_gym_id()` / `manages_gym()` / `is_super_admin()` are helper SQL functions used inside policies.
- A **member** sees only their own rows.
- An **owner/manager** sees rows for their gym.
- **Front-desk staff** are blocked from `payments` (see `can_see_finance()`) — that's the RBAC requirement.
- **Super admin** bypasses tenant scoping everywhere.

`feature flags`: `saas_plans.features` is a JSON object (e.g. `{"diet_planner": true}`). Per-gym overrides live in `gyms.feature_overrides`. Read the merged value to show/hide features (e.g. Diet Planner only for Premium).

---

## 4. Key flows already wired

- **Auth**: register → OTP verify → onboarding → role-based redirect (`/dashboard` sends owners to `/owner`, admins to `/admin`).
- **Onboarding**: name / gender / height / weight, saved to `profiles` + first `body_metrics` row.
- **Geo check-in**: `CheckIn.tsx` reads device GPS → calls the `check_in()` RPC → server verifies distance against the gym's radius (Haversine) and blocks double check-ins.
- **Dashboards**: `owner_dashboard()` and `platform_dashboard()` RPCs return live stats.
- **PWA**: `manifest.json` + `sw.js` (offline shell + web-push handler) + auto-registration.

---

## 5. Project structure

```
supabase/            SQL — run in numbered order
src/
  app/
    (auth)/          login, register, forgot-password, verify-otp
    onboarding/      multi-step setup
    (member)/        dashboard, workout, diet, progress, profile  (+ BottomNav)
    (owner)/         owner dashboard, members, payments, staff
    (admin)/         platform overview, gyms, plans
  components/ui/     Shell, AdminShell, CheckIn, ProfileSettings, charts
  lib/supabase/      client.ts (browser) + server.ts (cookies)
  middleware.ts      session refresh + route guard
public/              manifest.json, sw.js, icons
```

---

## 6. Roadmap (what to build next)

These screens are scaffolded but need their data tables wired up:

- [ ] **Owner → Members**: list/add members, view body metrics, assign membership plans.
- [ ] **Owner → Payments**: record manual payments, pending-payment alerts, monthly income report.
- [ ] **Owner → Staff**: invite trainers/front-desk, set `staff.role`.
- [ ] **Owner → Settings**: set gym lat/lng + geofence radius (a map picker).
- [ ] **Admin → Gyms**: approve/suspend tenants, toggle `feature_overrides`.
- [ ] **Admin → Plans**: CRUD on `saas_plans`.
- [ ] **Member → Exercise Library**: browse/search, swap exercises, build plans (screenshot 4).
- [ ] **Member → Live workout**: timer + set/rep/weight logging into `workout_logs`.
- [ ] **Push notifications**: VAPID keys + a server route to send workout/diet reminders.
- [ ] **Billing**: connect Stripe for SaaS subscriptions + a webhook to update `gyms.sub_status`.

---

## 7. Notes

- Heights are stored in **cm**, weights in **kg** internally; the UI converts for display based on `profiles.length_unit` / `weight_unit`.
- The `(member)`, `(owner)`, `(admin)` folders are **route groups** — the parentheses don't appear in the URL.
- Service-role key is server-only — never import it into a client component.
# gymmate
