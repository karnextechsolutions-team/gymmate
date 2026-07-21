import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/StatCard";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_dashboard");
  const s: any = data ?? {};

  return (
    <div>
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <p className="text-sm text-white/50">All gyms across GymMate</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={`$${s.mrr ?? 0}`} accent sub="monthly recurring" />
        <StatCard label="Active gyms" value={s.active_gyms ?? 0} />
        <StatCard label="Pending gyms" value={s.pending_gyms ?? 0} sub="awaiting approval" />
        <StatCard label="Total members" value={s.total_members ?? 0} />
      </div>
    </div>
  );
}
