import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ScanLine, ChevronRight } from "lucide-react";
import { TodayWorkoutPlan } from "@/components/ui/TodayWorkoutPlan";
import { DashboardWaterSection } from "@/components/ui/DashboardWaterSection";
import { NotificationBell } from "@/components/ui/NotificationBell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, onboarded, gym_id, height, weight")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") redirect("/admin/dashboard");
  if (profile?.role === "gym_owner") redirect("/owner/dashboard");

  if (profile) {
    const needsOnboarding =
      profile.gym_id === null || profile.height === null || profile.weight === null;
    if (needsOnboarding) redirect("/onboarding");
  }

  const firstName = (profile?.full_name || "Athlete").split(" ")[0];

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, plan_name")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let exercises: any[] = [];
  if (plan) {
    const { data: rawExData } = await supabase
      .from("workout_exercises")
      .select("*, master_exercises(video_url)")
      .eq("plan_id", plan.id)
      .order("created_at", { ascending: true });

    // Fallback lookup table across all master exercises by exercise name
    const { data: masterExData } = await supabase
      .from("master_exercises")
      .select("name, video_url");

    const masterMap = new Map();
    if (masterExData) {
      for (const mx of masterExData) {
        if (mx.video_url) masterMap.set(mx.name.toLowerCase().trim(), mx.video_url);
      }
    }

    exercises = (rawExData || []).map((ex: any) => {
      const joinedVideoUrl = Array.isArray(ex.master_exercises) 
        ? ex.master_exercises[0]?.video_url 
        : ex.master_exercises?.video_url;
      const directVideoUrl = ex.video_url;
      const mappedVideoUrl = ex.exercise_name ? masterMap.get(ex.exercise_name.toLowerCase().trim()) : null;

      return {
        ...ex,
        video_url: directVideoUrl || joinedVideoUrl || mappedVideoUrl || null,
      };
    });
  }

  return (
    <div className="px-5 pt-14 space-y-6">
      {/* ── Greeting & Notification Bell ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Welcome back,</p>
          <h1 className="text-2xl font-black text-white">{firstName} 💪</h1>
        </div>

        <NotificationBell userId={user.id} />
      </div>

      {/* ── Attendance Terminal Card ── */}
      <Link
        href="/attendance"
        className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition hover:bg-white/[0.06] hover:border-blue-500/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]"
      >
        {/* Icon blob */}
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-grad shadow-glow">
          <ScanLine size={20} className="text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/80 mb-0.5">
            GPS Geofencing
          </p>
          <p className="text-sm font-bold text-white leading-tight">
            Attendance Terminal
          </p>
          <p className="text-xs text-white/35 mt-0.5">
            Mark your check-in or check-out
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight
          size={16}
          className="flex-shrink-0 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all"
        />
      </Link>

      {/* ── Today's Workout Plan ── */}
      <TodayWorkoutPlan plan={plan} initialExercises={exercises} userId={user.id} />

      {/* ── Daily Water Tracker & Reminder Alert ── */}
      <DashboardWaterSection userId={user.id} />

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="This week" value="3" sub="sessions" />
        <Stat label="Streak" value="5" sub="days 🔥" />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      <p className="text-xs text-white/40">{sub}</p>
    </div>
  );
}
