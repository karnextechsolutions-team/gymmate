"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarDays, LogIn, LogOut, Clock, MessageSquare } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface AttendanceLog {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: "checked_in" | "checked_out";
  remarks: string | null;
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

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export function AttendanceHistory() {
  const supabase = createClient();

  const [range, setRange] = useState<Range>("30d");
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const since = daysAgo(rangeToDays(range));

    const { data, error } = await supabase
      .from("attendance_logs")
      .select("id, check_in_time, check_out_time, status, remarks")
      .eq("user_id", user.id)
      .gte("check_in_time", since)
      .order("check_in_time", { ascending: false });

    if (!error && data) setLogs(data as AttendanceLog[]);
    setLoading(false);
  }, [range, supabase]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Summary counts ──────────────────────────────────
  const checkedOut = logs.filter((l) => l.status === "checked_out");
  const totalSessions = checkedOut.length;
  const totalMinutes = checkedOut.reduce((acc, l) => {
    if (!l.check_in_time || !l.check_out_time) return acc;
    const ms = new Date(l.check_out_time).getTime() - new Date(l.check_in_time).getTime();
    return acc + Math.round(ms / 60000);
  }, 0);
  const avgHours = totalSessions > 0 ? (totalMinutes / totalSessions / 60).toFixed(1) : "—";

  return (
    <section className="mt-8">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/70">
            Recent Attendance
          </h2>
        </div>
        <span className="text-[10px] font-semibold text-white/25 bg-white/5 rounded-full px-2.5 py-1">
          {logs.length} record{logs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Range Filter Pills ── */}
      <div className="flex gap-2 mb-5">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`flex-1 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200
              ${range === opt.value
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                : "bg-white/[0.03] text-white/35 border border-white/[0.06] hover:border-white/20 hover:text-white/60"
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Summary Tiles ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
            Sessions
          </p>
          <p className="text-2xl font-black text-white">{totalSessions}</p>
          <p className="text-[10px] text-white/30 mt-0.5">completed</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">
            Avg. Duration
          </p>
          <p className="text-2xl font-black text-white">{avgHours}<span className="text-sm font-semibold text-white/40 ml-1">hrs</span></p>
          <p className="text-[10px] text-white/30 mt-0.5">per session</p>
        </div>
      </div>

      {/* ── Log List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 w-full animate-pulse rounded-2xl bg-white/[0.03] border border-white/[0.05]"
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] py-14">
          <CalendarDays size={32} className="text-white/15" />
          <p className="text-sm text-white/30 font-medium">No attendance records found</p>
          <p className="text-xs text-white/20">for the selected date range</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isActive = log.status === "checked_in";
            return (
              <div
                key={log.id}
                className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200"
              >
                {/* Active pulse indicator */}
                {isActive && (
                  <span className="absolute top-4 right-4 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                )}

                {/* Top row: date + status badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-white/30" />
                    <span className="text-xs font-semibold text-white/60">
                      {fmtDate(log.check_in_time)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide
                      ${isActive
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                        : "bg-blue-500/15 text-blue-400 border border-blue-500/25"
                      }`}
                  >
                    {isActive ? (
                      <><LogIn size={9} /> Checked In</>
                    ) : (
                      <><LogOut size={9} /> Checked Out</>
                    )}
                  </span>
                </div>

                {/* Time grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-1">
                      In
                    </p>
                    <div className="flex items-center gap-1">
                      <LogIn size={10} className="text-emerald-400/70" />
                      <span className="text-xs font-bold text-white tabular-nums">
                        {fmtTime(log.check_in_time)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-1">
                      Out
                    </p>
                    <div className="flex items-center gap-1">
                      <LogOut size={10} className={log.check_out_time ? "text-blue-400/70" : "text-white/20"} />
                      <span className={`text-xs font-bold tabular-nums ${log.check_out_time ? "text-white" : "text-white/25"}`}>
                        {fmtTime(log.check_out_time)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 mb-1">
                      Duration
                    </p>
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-white/30" />
                      <span className="text-xs font-bold text-white/70 tabular-nums">
                        {duration(log.check_in_time, log.check_out_time)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {log.remarks && (
                  <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2">
                    <MessageSquare size={10} className="mt-0.5 flex-shrink-0 text-white/25" />
                    <p className="text-[11px] text-white/45 leading-snug">{log.remarks}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
