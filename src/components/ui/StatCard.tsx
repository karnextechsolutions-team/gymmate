export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "bg-brand-grad/10 border-brand-500/20" : ""}`}>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  );
}
