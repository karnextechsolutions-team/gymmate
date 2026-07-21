"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Clock,
  Search,
  Download,
  LogIn,
  LogOut,
  CalendarDays,
  RefreshCw,
  MessageSquare,
} from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface AttendanceLog {
  id: string;
  user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: "checked_in" | "checked_out";
  remarks: string | null;
  profiles: { full_name: string | null } | null;
}

type Range = "7d" | "30d" | "90d";

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: "Last 7 Days", value: "7d" },
  { label: "This Month", value: "30d" },
  { label: "Last 3 Months", value: "90d" },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function rangeToDays(r: Range): number {
  return r === "7d" ? 7 : r === "30d" ? 30 : 90;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function duration(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "—";
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function memberInitial(name: string | null | undefined): string {
  return ((name ?? "M")[0] ?? "M").toUpperCase();
}

// ─────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────
function exportToCSV(logs: AttendanceLog[]) {
  const headers = ["Member Name", "Date", "Check-in Time", "Check-out Time", "Duration", "Status", "Remarks"];
  const rows = logs.map((l) => [
    l.profiles?.full_name ?? "Unknown",
    fmtDate(l.check_in_time),
    fmtTime(l.check_in_time),
    fmtTime(l.check_out_time),
    duration(l.check_in_time, l.check_out_time),
    l.status === "checked_in" ? "Checked In" : "Checked Out",
    l.remarks ?? "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────
export default function OwnerAttendancePage() {
  const supabase = createClient();
  const [gymId, setGymId] = useState<string | null>(null);

  // Data
  const [liveFeed, setLiveFeed] = useState<AttendanceLog[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  // Filters
  const [range, setRange] = useState<Range>("30d");
  const [search, setSearch] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Bootstrap: get owner gym_id ─────────────
  useEffect(() => {
    async function bootstrap() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.gym_id) setGymId(profile.gym_id);
    }
    bootstrap();
  }, [supabase]);

  // ── Fetch history ────────────────────────────
  const fetchHistory = useCallback(async (gId: string) => {
    const since = daysAgo(rangeToDays(range));
    const { data, error } = await supabase
      .from("attendance_logs")
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq("gym_id", gId)
      .gte("check_in_time", since)
      .order("check_in_time", { ascending: false });

    if (error) {
      console.log("fetchHistory error:", error);
    }
    if (!error && data) setLogs(data as unknown as AttendanceLog[]);
  }, [range, supabase]);

  // ── Fetch live feed ──────────────────────────
  const fetchLive = useCallback(async (gId: string) => {
    const { data, error } = await supabase
      .from("attendance_logs")
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq("gym_id", gId)
      .eq("status", "checked_in")
      .order("check_in_time", { ascending: true });

    if (error) {
      console.log("fetchLive error:", error);
    }
    if (!error && data) setLiveFeed(data as unknown as AttendanceLog[]);
  }, [supabase]);

  // ── On gymId load ─────────────────────────────
  useEffect(() => {
    if (!gymId) return;
    (async () => {
      setLoading(true);
      await Promise.all([fetchLive(gymId), fetchHistory(gymId)]);
      setLoading(false);
    })();
  }, [gymId, fetchLive, fetchHistory]);

  // ── Auto-refresh live feed every 30s ─────────
  useEffect(() => {
    if (!gymId) return;
    liveTimerRef.current = setInterval(() => fetchLive(gymId), 30_000);
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [gymId, fetchLive]);

  // ── Manual refresh ────────────────────────────
  const handleRefresh = async () => {
    if (!gymId || refreshing) return;
    setRefreshing(true);
    await Promise.all([fetchLive(gymId), fetchHistory(gymId)]);
    setRefreshing(false);
  };

  // ── Filtered logs ─────────────────────────────
  const filtered = logs.filter((l) =>
    search.trim() === "" ||
    (l.profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Summary stats ─────────────────────────────
  const checkedOutLogs = logs.filter((l) => l.status === "checked_out");
  const totalSessions = checkedOutLogs.length;
  const totalMinutes = checkedOutLogs.reduce((acc, l) => {
    if (!l.check_in_time || !l.check_out_time) return acc;
    return acc + Math.round((new Date(l.check_out_time).getTime() - new Date(l.check_in_time).getTime()) / 60000);
  }, 0);
  const avgHours = totalSessions > 0 ? (totalMinutes / totalSessions / 60).toFixed(1) : "—";

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="mt-1 text-sm text-white/50">
            Monitor member check-ins in real time and review historical logs.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/60 hover:text-white transition disabled:opacity-40"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Live Now", value: liveFeed.length, sub: "checked in", icon: Users, color: "text-emerald-400" },
          { label: "Sessions", value: totalSessions, sub: "completed", icon: LogOut, color: "text-blue-400" },
          { label: "Avg. Duration", value: avgHours, sub: "hrs / session", icon: Clock, color: "text-purple-400" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
              <Icon size={14} className={color} />
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Live Feed ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
            Currently Checked In
          </h2>
          <span className="ml-auto text-[10px] font-semibold text-white/25 bg-white/5 rounded-full px-2.5 py-1">
            {liveFeed.length} member{liveFeed.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="card p-6 flex items-center justify-center gap-3 text-sm text-white/30">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading live feed...
          </div>
        ) : liveFeed.length === 0 ? (
          <div className="card p-8 text-center text-white/30 text-sm">
            <Users size={28} className="mx-auto mb-3 text-white/15" />
            No members are currently checked in
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-white/[0.04]">
              {liveFeed.map((log) => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition">
                  {/* Avatar */}
                  <div className="w-9 h-9 flex-shrink-0 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                    {memberInitial(log.profiles?.full_name)}
                  </div>
                  {/* Name + time */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {log.profiles?.full_name ?? "Unknown Member"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <LogIn size={10} className="text-emerald-400/70" />
                      <p className="text-[11px] text-white/40">{fmtTime(log.check_in_time)}</p>
                    </div>
                  </div>
                  {/* Live badge */}
                  <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── History Table ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={14} className="text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
            Attendance History
          </h2>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Range pills */}
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap
                  ${range === opt.value
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "bg-white/[0.03] text-white/35 border border-white/[0.06] hover:border-white/20 hover:text-white/60"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search + Export */}
          <div className="flex gap-2 sm:ml-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <button
              onClick={() => exportToCSV(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/[0.07] transition disabled:opacity-30 whitespace-nowrap"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-6 flex items-center justify-center gap-3 text-sm text-white/30">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <CalendarDays size={32} className="mx-auto mb-3 text-white/15" />
            <p className="text-sm text-white/30">No attendance records found</p>
            <p className="text-xs text-white/20 mt-1">
              {search ? "Try a different search term" : "for the selected date range"}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Member</th>
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Check In</th>
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Check Out</th>
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((log) => {
                    const isActive = log.status === "checked_in";
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.015] transition-colors">
                        {/* Member */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                              {memberInitial(log.profiles?.full_name)}
                            </div>
                            <span className="text-sm font-medium text-white whitespace-nowrap">
                              {log.profiles?.full_name ?? "Unknown"}
                            </span>
                          </div>
                        </td>
                        {/* Date */}
                        <td className="px-5 py-4 text-sm text-white/60 whitespace-nowrap">
                          {fmtDate(log.check_in_time)}
                        </td>
                        {/* Check In */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <LogIn size={11} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-white tabular-nums whitespace-nowrap">
                              {fmtTime(log.check_in_time)}
                            </span>
                          </div>
                        </td>
                        {/* Check Out */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <LogOut size={11} className={log.check_out_time ? "text-blue-400" : "text-white/20"} />
                            <span className={`text-sm tabular-nums whitespace-nowrap ${log.check_out_time ? "font-medium text-white" : "text-white/30"}`}>
                              {fmtTime(log.check_out_time)}
                            </span>
                          </div>
                        </td>
                        {/* Duration */}
                        <td className="px-5 py-4 text-sm text-white/60 tabular-nums whitespace-nowrap">
                          {duration(log.check_in_time, log.check_out_time)}
                        </td>
                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap
                            ${isActive
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                              : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                            }`}
                          >
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            {isActive ? "Checked In" : "Checked Out"}
                          </span>
                        </td>
                        {/* Remarks */}
                        <td className="px-5 py-4 max-w-[180px]">
                          {log.remarks ? (
                            <div className="flex items-start gap-1.5">
                              <MessageSquare size={11} className="mt-0.5 flex-shrink-0 text-white/25" />
                              <span className="text-xs text-white/45 leading-snug line-clamp-2">{log.remarks}</span>
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Footer row count */}
            <div className="border-t border-white/[0.04] px-5 py-3 flex items-center justify-between">
              <p className="text-xs text-white/25">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : ""}
              </p>
              <button
                onClick={() => exportToCSV(filtered)}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition disabled:opacity-30"
              >
                <Download size={11} />
                Export
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
