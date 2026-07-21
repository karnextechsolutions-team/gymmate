import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckInButton } from "@/components/ui/CheckIn";
import { AttendanceHistory } from "@/components/ui/AttendanceHistory";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarded, gym_id, height, weight")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") redirect("/admin/dashboard");
  if (profile?.role === "gym_owner") redirect("/owner/dashboard");

  if (profile) {
    const needsOnboarding =
      profile.gym_id === null || profile.height === null || profile.weight === null;
    if (needsOnboarding) redirect("/onboarding");
  }

  return (
    <div className="min-h-dvh px-5 pt-14 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard"
          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white transition"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
            Attendance
          </p>
          <h1 className="text-xl font-bold leading-tight">Terminal</h1>
        </div>
      </div>

      {/* Attendance terminal */}
      <CheckInButton />

      {/* Subtle bottom hint */}
      <p className="mt-6 text-center text-[11px] text-white/20">
        GPS location is required to verify gym presence
      </p>

      {/* Divider */}
      <div className="my-8 border-t border-white/[0.06]" />

      {/* Attendance history */}
      <AttendanceHistory />
    </div>
  );
}

