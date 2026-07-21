import { createClient } from "@/lib/supabase/server";
import { WeightChart } from "@/components/ui/WeightChart";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: metrics } = await supabase
    .from("body_metrics")
    .select("weight, recorded_at")
    .eq("member_id", user!.id)
    .order("recorded_at", { ascending: true })
    .limit(30);

  const data = (metrics ?? []).map((m) => ({
    date: new Date(m.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    weight: Number(m.weight),
  }));

  return (
    <div className="px-5 pt-14">
      <h1 className="text-2xl font-bold">Progress</h1>
      <h2 className="eyebrow mt-6">Weight history</h2>
      <div className="card mt-3 p-4">
        {data.length ? <WeightChart data={data} /> : (
          <p className="py-10 text-center text-sm text-white/40">
            Log your weight to see your trend here.
          </p>
        )}
      </div>
    </div>
  );
}
