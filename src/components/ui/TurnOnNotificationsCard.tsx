"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerServiceWorkerAndSubscribe } from "@/lib/pushSubscription";
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  Send, 
  Info,
  Sparkles
} from "lucide-react";

interface TurnOnNotificationsCardProps {
  userId: string;
}

export function TurnOnNotificationsCard({ userId }: TurnOnNotificationsCardProps) {
  const supabase = createClient();

  const [permissionState, setPermissionState] = useState<
    "granted" | "denied" | "default" | "unsupported" | "loading"
  >("loading");

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as "granted" | "denied" | "default");
  }, []);

  const handleEnableNotifications = async () => {
    setStatusMsg(null);

    // 1. Check Browser Support
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermissionState("unsupported");
      setStatusMsg({
        type: "error",
        text: "Web Push Notifications are not supported in your current browser.",
      });
      return;
    }

    setPermissionState("loading");

    try {
      // 2. Request Permission
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setPermissionState("denied");
        setStatusMsg({
          type: "error",
          text: "Notification permission was blocked. Please enable notifications in your browser site settings.",
        });
        return;
      }

      if (permission === "granted") {
        // 3. Register SW & Subscribe to Push Manager
        const success = await registerServiceWorkerAndSubscribe(userId);

        if (success) {
          setPermissionState("granted");
          setStatusMsg({
            type: "success",
            text: "Push Notifications enabled! You will now receive background workout & water updates.",
          });
        } else {
          setPermissionState("default");
          setStatusMsg({
            type: "error",
            text: "Failed to establish Push subscription with the server. Please try again.",
          });
        }
      }
    } catch (err: any) {
      console.error("Error enabling push notifications:", err);
      setPermissionState("default");
      setStatusMsg({
        type: "error",
        text: err?.message || "An unexpected error occurred while requesting notification permissions.",
      });
    }
  };

  const handleSendTestPush = async () => {
    if (!userId) return;
    setTesting(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "GymMate Notification 🚀",
          message: "Push notifications are working cleanly on your device!",
          url: "/notifications",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMsg({
          type: "success",
          text: "Test Push Notification sent to your device!",
        });
      } else {
        setStatusMsg({
          type: "info",
          text: "Notification logged to your Alert Center!",
        });
      }
    } catch (err) {
      console.error("Send test push error:", err);
      setStatusMsg({
        type: "error",
        text: "Failed to deliver test push.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card p-5 bg-gradient-to-br from-white/[0.04] to-blue-500/[0.03] border border-white/[0.08] rounded-2xl space-y-4 shadow-lg relative overflow-hidden">
      
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <BellRing size={20} className="animate-bounce-subtle" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Push Notifications
              {permissionState === "granted" && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Get instant water reminders, assigned workouts, & trainer announcements on your mobile device.
            </p>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`text-xs p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-200 ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : statusMsg.type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          ) : statusMsg.type === "error" ? (
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          ) : (
            <Info size={16} className="shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{statusMsg.text}</span>
        </div>
      )}

      {/* Actions based on state */}
      <div className="pt-1 relative z-10 flex flex-wrap gap-2.5">
        {permissionState === "unsupported" ? (
          <div className="w-full text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>Web Push Notifications are not supported in this browser.</span>
          </div>
        ) : permissionState === "denied" ? (
          <div className="w-full space-y-2">
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>Notifications are currently blocked by browser permissions.</span>
            </div>
            <button
              onClick={handleEnableNotifications}
              className="w-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold py-2.5 rounded-xl border border-white/10 transition cursor-pointer"
            >
              Try Re-enabling Notifications
            </button>
          </div>
        ) : permissionState === "granted" ? (
          <div className="w-full flex gap-2">
            <button
              onClick={handleEnableNotifications}
              className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 text-xs font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone size={14} />
              <span>Re-sync Subscription</span>
            </button>

            <button
              onClick={handleSendTestPush}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-glow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {testing ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={13} />
                  <span>Send Test Push</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnableNotifications}
            disabled={permissionState === "loading"}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {permissionState === "loading" ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Requesting Permission...</span>
              </>
            ) : (
              <>
                <Bell size={15} />
                <span>Turn On Push Notifications</span>
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
