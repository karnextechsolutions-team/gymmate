"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Droplet, Bell, X, Check, Sparkles } from "lucide-react";

interface WaterReminderAlertProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onWaterMarked?: () => void;
}

export function WaterReminderAlert({
  userId,
  isOpen,
  onClose,
  onWaterMarked,
}: WaterReminderAlertProps) {
  const supabase = createClient();
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [marking, setMarking] = useState(false);

  const checkSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("water_reminders_enabled")
        .eq("member_id", userId)
        .maybeSingle();

      if (data && typeof data.water_reminders_enabled === "boolean") {
        setRemindersEnabled(data.water_reminders_enabled);
      }
    } catch (err) {
      console.error("Error checking water reminder settings:", err);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (userId) checkSettings();
  }, [userId, checkSettings]);

  if (!isOpen || !remindersEnabled) return null;

  const handleMarkWater = async () => {
    setMarking(true);
    const todayStr = new Date().toISOString().split("T")[0];

    try {
      // Fetch current count for today
      const { data } = await supabase
        .from("water_logs")
        .select("glasses_drank, target_glasses")
        .eq("member_id", userId)
        .eq("log_date", todayStr)
        .maybeSingle();

      const currentDrank = data?.glasses_drank || 0;
      const target = data?.target_glasses || 8;
      const newCount = currentDrank + 1;

      await supabase.from("water_logs").upsert(
        {
          member_id: userId,
          log_date: todayStr,
          glasses_drank: newCount,
          target_glasses: target,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_id,log_date" }
      );

      if (onWaterMarked) onWaterMarked();
    } catch (err) {
      console.error("Failed to mark water from alert:", err);
    } finally {
      setMarking(false);
      onClose();
    }
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-[#0f172a]/95 border border-blue-500/40 rounded-2xl p-4 shadow-[0_10px_30px_rgba(59,130,246,0.3)] backdrop-blur-md space-y-3">
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Droplet size={16} className="fill-blue-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Hydration Alert!
                <Sparkles size={12} className="text-blue-400" />
              </h4>
              <p className="text-xs text-blue-200/70">Time to drink a glass of water (250ml)!</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-white/[0.05] hover:bg-white/10 text-white/70 text-xs font-semibold py-2 rounded-xl border border-white/10 transition"
          >
            Skip
          </button>

          <button
            onClick={handleMarkWater}
            disabled={marking}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold py-2 rounded-xl shadow-glow transition-all flex items-center justify-center gap-1.5"
          >
            {marking ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Check size={14} />
                <span>Drink Water (Mark)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
