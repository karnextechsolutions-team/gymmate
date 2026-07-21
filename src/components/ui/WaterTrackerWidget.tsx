"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Droplet, Plus, Minus, Trophy, Sparkles, Bell } from "lucide-react";

interface WaterTrackerProps {
  userId: string;
  onTriggerReminderAlert?: () => void;
}

export function WaterTrackerWidget({ userId, onTriggerReminderAlert }: WaterTrackerProps) {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const [glassesDrank, setGlassesDrank] = useState(0);
  const [targetGlasses, setTargetGlasses] = useState(8);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadWaterLog = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("water_logs")
        .select("glasses_drank, target_glasses")
        .eq("member_id", userId)
        .eq("log_date", todayStr)
        .maybeSingle();

      if (data) {
        setGlassesDrank(data.glasses_drank || 0);
        setTargetGlasses(data.target_glasses || 8);
      } else {
        // Initialize log for today
        setGlassesDrank(0);
        setTargetGlasses(8);
      }
    } catch (err) {
      console.error("Error loading water log:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, todayStr]);

  useEffect(() => {
    if (userId) loadWaterLog();
  }, [userId, loadWaterLog]);

  const updateWaterCount = async (newCount: number) => {
    const validCount = Math.max(0, newCount);
    setGlassesDrank(validCount);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("water_logs")
        .upsert(
          {
            member_id: userId,
            log_date: todayStr,
            glasses_drank: validCount,
            target_glasses: targetGlasses,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "member_id,log_date" }
        );

      if (error) throw error;
    } catch (err) {
      console.error("Failed to save water log:", err);
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.min(100, Math.round((glassesDrank / targetGlasses) * 100));
  const isGoalReached = glassesDrank >= targetGlasses;

  return (
    <div className="card p-5 bg-gradient-to-br from-[#101726] via-[#121c30] to-[#0f172a] border border-blue-500/20 rounded-2xl space-y-4 shadow-[0_0_25px_rgba(59,130,246,0.1)] relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Droplet size={18} className="fill-blue-400/30" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Daily Water Tracker</h3>
            <p className="text-[10px] text-blue-300/60 font-semibold uppercase tracking-wider">
              Hydration Goal
            </p>
          </div>
        </div>

        {onTriggerReminderAlert && (
          <button
            onClick={onTriggerReminderAlert}
            className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full transition"
            title="Simulate Water Reminder Alert"
          >
            <Bell size={11} />
            <span>Test Alert</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Progress Display */}
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-white font-mono">{glassesDrank}</span>
              <span className="text-sm font-semibold text-white/40 font-mono"> / {targetGlasses} glasses</span>
            </div>

            <div className="text-right">
              <span className="text-sm font-black text-blue-400 font-mono">{progressPercent}%</span>
              <p className="text-[10px] text-white/40">{(glassesDrank * 250)} ml drank</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-white/[0.04]">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
            />
          </div>

          {/* Glass Icons Grid */}
          <div className="flex gap-1.5 justify-between py-1">
            {Array.from({ length: targetGlasses }).map((_, idx) => {
              const isFilled = idx < glassesDrank;
              return (
                <div
                  key={idx}
                  onClick={() => updateWaterCount(idx + 1)}
                  className={`flex-1 aspect-[3/4] rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                    isFilled
                      ? "bg-blue-500/25 border-blue-400/50 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)] scale-105"
                      : "bg-white/[0.02] border-white/[0.06] text-white/20 hover:border-white/20"
                  }`}
                  title={`Set to ${idx + 1} glasses`}
                >
                  <Droplet size={12} className={isFilled ? "fill-blue-400" : ""} />
                </div>
              );
            })}
          </div>

          {/* Action Buttons & Summary */}
          {isGoalReached ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between text-emerald-400 animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Trophy size={16} />
                <span className="text-xs font-bold">Goal Reached! {glassesDrank}/{targetGlasses} glasses drank 🎉</span>
              </div>
              <button
                onClick={() => updateWaterCount(glassesDrank + 1)}
                className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/30 transition text-emerald-300"
                title="Add another glass"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateWaterCount(glassesDrank - 1)}
                disabled={glassesDrank === 0 || saving}
                className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/10 disabled:opacity-30 text-white flex items-center justify-center transition cursor-pointer"
                title="Remove 1 glass"
              >
                <Minus size={16} />
              </button>

              <button
                onClick={() => updateWaterCount(glassesDrank + 1)}
                disabled={saving}
                className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-glow transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>Add 1 Glass (250ml)</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
