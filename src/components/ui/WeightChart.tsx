"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function WeightChart({ data }: { data: { date: string; weight: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip
          contentStyle={{ background: "#16161A", border: "1px solid #ffffff15", borderRadius: 12 }}
          labelStyle={{ color: "#fff" }}
        />
        <Line type="monotone" dataKey="weight" stroke="#2D6BFF" strokeWidth={3} dot={{ r: 3, fill: "#2D6BFF" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
