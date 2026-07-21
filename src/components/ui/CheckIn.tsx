"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, LogIn, LogOut, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function formatTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = (h % 12 || 12).toString().padStart(2, "0");
  return `${hour}:${m} ${ampm}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export function CheckInButton() {
  const supabase = createClient();

  // Auth / Profile
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeLog, setActiveLog] = useState<any>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // UI state
  const [state, setState] = useState<"loading" | "idle" | "submitting" | "error" | "success">("loading");
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"IN" | "OUT">("IN");
  const [remarks, setRemarks] = useState("");

  // Live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load user status
  useEffect(() => {
    async function loadStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setState("idle"); return; }
        setUser(user);

        const { data: prof } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single();
        setProfile(prof);

        if (prof?.gym_id) {
          const { data: active } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "checked_in")
            .maybeSingle();

          if (active) {
            setActiveLog(active);
            setIsCheckedIn(true);
            setMode("OUT");
          }
        }
      } catch (err) {
        console.error("Error loading check-in status:", err);
      } finally {
        setState("idle");
      }
    }
    loadStatus();
  }, [supabase]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!user || !profile?.gym_id) {
      alert("Gym registration data not found.");
      return;
    }

    setState("submitting");
    setMsg(mode === "IN" ? "Verifying location..." : "Checking you out...");

    // ── CHECK OUT ─────────────────────────────
    if (mode === "OUT") {
      if (!activeLog) {
        setState("error");
        setMsg("No active check-in found.");
        return;
      }
      const { error } = await supabase
        .from("attendance_logs")
        .update({
          check_out_time: new Date().toISOString(),
          status: "checked_out",
          ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        })
        .eq("id", activeLog.id);

      if (error) {
        setState("error");
        setMsg(`Checkout failed: ${error.message}`);
      } else {
        setIsCheckedIn(false);
        setActiveLog(null);
        setRemarks("");
        setState("success");
        setMsg("Checked out successfully!");
        setMode("IN");
      }
      return;
    }

    // ── CHECK IN ──────────────────────────────
    // 1. Fetch gym location first
    const { data: gymLoc, error: locErr } = await supabase
      .from("gym_locations")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .maybeSingle();

    if (locErr || !gymLoc) {
      setState("error");
      setMsg("Gym location is not configured. Contact your gym owner.");
      alert("Gym location is not configured by the gym owner.");
      return;
    }

    // 2. Get member GPS
    if (!navigator.geolocation) {
      setState("error");
      setMsg("Geolocation is not supported by your device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: uLat, longitude: uLon } = pos.coords;
        const dist = getDistance(uLat, uLon, gymLoc.latitude, gymLoc.longitude);
        const radius = gymLoc.radius_meters || 50;

        if (dist <= radius) {
          const { data: newLog, error: checkInErr } = await supabase
            .from("attendance_logs")
            .insert({
              user_id: user.id,
              gym_id: profile.gym_id,
              status: "checked_in",
              check_in_time: new Date().toISOString(),
              ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
            })
            .select()
            .single();

          if (checkInErr) {
            setState("error");
            setMsg(`Check-in failed: ${checkInErr.message}`);
          } else {
            setIsCheckedIn(true);
            setActiveLog(newLog);
            setRemarks("");
            setState("success");
            setMsg("Successfully Checked In!");
            setMode("OUT");
          }
        } else {
          setState("error");
          setMsg("You are outside the gym boundary. Please move closer to the gym entrance.");
          alert("You are outside the gym boundary. Please move closer to the gym entrance.");
        }
      },
      (geoErr) => {
        setState("error");
        setMsg(`Location permission denied: ${geoErr.message}`);
        alert(`Location permission denied: ${geoErr.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [user, profile, mode, activeLog, remarks, supabase]);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex w-full items-center justify-center gap-3 py-6 text-sm text-white/40 animate-pulse">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Initializing attendance system...
      </div>
    );
  }

  const isSubmitting = state === "submitting";

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] overflow-hidden shadow-glow">
      {/* ── Clock Section ── */}
      <div className="relative px-6 pt-6 pb-5 flex flex-col items-center border-b border-white/[0.06] bg-white/[0.01]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 text-blue-400/70 text-xs font-semibold uppercase tracking-widest mb-2">
          <Clock size={12} />
          <span>Attendance Terminal</span>
        </div>
        <p className="text-5xl font-black text-white tracking-tight tabular-nums leading-none">
          {formatTime(now)}
        </p>
        <p className="text-sm text-white/40 mt-2 font-medium">{formatDate(now)}</p>
      </div>

      {/* ── Map Preview Placeholder ── */}
      <div className="mx-6 mt-5 relative rounded-2xl overflow-hidden h-28 border border-white/[0.06] bg-[#0d1520]">
        {/* Fake map grid lines */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }}
        />
        {/* Subtle map labels */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_12px_4px_rgba(59,130,246,0.6)]" />
              <div className="absolute -inset-3 rounded-full border-2 border-blue-500/30 animate-ping" />
            </div>
            <span className="text-[10px] font-semibold text-blue-300/80 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              Gym Location
            </span>
          </div>
        </div>
        {/* Corner pin */}
        <div className="absolute bottom-2 right-2">
          <MapPin size={14} className="text-white/20" />
        </div>
      </div>

      {/* ── Segmented IN/OUT Toggle ── */}
      <div className="px-6 mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2.5">
          Select Action
        </p>
        <div className="relative flex w-full rounded-xl bg-white/[0.04] border border-white/[0.08] p-1 gap-1">
          {(["IN", "OUT"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setState("idle"); setMsg(""); }}
                disabled={isSubmitting || (m === "IN" && isCheckedIn) || (m === "OUT" && !isCheckedIn)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed
                  ${active && m === "IN"
                    ? "bg-brand-grad text-white shadow-glow"
                    : active && m === "OUT"
                    ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]"
                    : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  }`}
              >
                {m === "IN" ? <LogIn size={15} /> : <LogOut size={15} />}
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Remarks Textarea ── */}
      <div className="px-6 mt-4">
        <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
          Remarks <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          disabled={isSubmitting}
          rows={2}
          placeholder="Add a note about your session..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors resize-none disabled:opacity-50"
        />
      </div>

      {/* ── Status Message ── */}
      {(state === "error" || state === "success") && msg && (
        <div className={`mx-6 mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs
          ${state === "error"
            ? "border-red-500/25 bg-red-500/10 text-red-300"
            : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {state === "error"
            ? <ShieldAlert size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
            : <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
          }
          <span>{msg}</span>
        </div>
      )}

      {/* ── Submit Button ── */}
      <div className="px-6 py-5 mt-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-black tracking-widest uppercase transition-all duration-300 shadow-glow disabled:opacity-50 text-white
            ${mode === "OUT"
              ? "bg-rose-600 hover:bg-rose-700 shadow-[0_0_24px_rgba(225,29,72,0.35)]"
              : "bg-brand-grad hover:brightness-110"
            }`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>{msg || "Processing..."}</span>
            </>
          ) : (
            <>
              {mode === "IN" ? <LogIn size={18} /> : <LogOut size={18} />}
              <span>Submit {mode}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
