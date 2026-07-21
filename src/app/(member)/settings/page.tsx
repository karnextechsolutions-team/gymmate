"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { registerServiceWorkerAndSubscribe } from "@/lib/pushSubscription";
import { 
  Settings, 
  Bell, 
  Droplet, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ChevronRight,
  LogOut,
  Smartphone,
  Send
} from "lucide-react";

export default function MemberSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [sendingPush, setSendingPush] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      // Check notification permission in browser
      if (typeof window !== "undefined" && "Notification" in window) {
        setPushEnabled(Notification.permission === "granted");
      }

      // Profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.full_name) setUserName(profile.full_name);

      // User Settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("water_reminders_enabled, push_subscription")
        .eq("member_id", user.id)
        .maybeSingle();

      if (settingsData && typeof settingsData.water_reminders_enabled === "boolean") {
        setWaterRemindersEnabled(settingsData.water_reminders_enabled);
      } else {
        setWaterRemindersEnabled(true);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggleWaterReminders = async () => {
    if (!userId) return;
    const newValue = !waterRemindersEnabled;
    setWaterRemindersEnabled(newValue);
    setSaving(true);

    try {
      const { error } = await supabase.from("user_settings").upsert(
        {
          member_id: userId,
          water_reminders_enabled: newValue,
        },
        { onConflict: "member_id" }
      );

      if (error) throw error;
      setMsg(`Water reminders ${newValue ? "enabled" : "disabled"}`);
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      console.error("Failed to update water reminder settings:", err);
      setWaterRemindersEnabled(!newValue);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableWebPush = async () => {
    if (!userId) return;
    setSubscribingPush(true);

    try {
      const success = await registerServiceWorkerAndSubscribe(userId);
      if (success) {
        setPushEnabled(true);
        setMsg("Web Push Notifications enabled!");
      } else {
        setMsg("Could not enable Web Push. Please check browser permissions.");
      }
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      console.error("Enable Web Push error:", err);
    } finally {
      setSubscribingPush(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!userId) return;
    setSendingPush(true);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "GymMate Test Push 🚀",
          message: "Web Push Notification is working perfectly on your device!",
          url: "/notifications"
        })
      });

      const resData = await res.json();
      if (resData.success) {
        setMsg("Test Push Notification sent!");
      } else {
        setMsg("Test push queued in notification bell!");
      }
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      console.error("Send test push error:", err);
    } finally {
      setSendingPush(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="px-5 pt-12 pb-24 max-w-md mx-auto space-y-6">
      
      {/* ── Page Header ── */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
          <Settings size={14} className="text-blue-400" />
          Preferences & Controls
        </p>
        <h1 className="text-2xl font-black text-white mt-0.5">App Settings</h1>
      </div>

      {msg && (
        <div className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={15} />
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* User Profile Card */}
          <div className="card p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
              {userName ? userName[0].toUpperCase() : "A"}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{userName || "Athlete"}</h3>
              <p className="text-xs text-white/40 truncate">{userEmail}</p>
            </div>
          </div>

          {/* Notifications & Reminders Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5">
              <Bell size={13} className="text-blue-400" />
              Notifications & Push
            </h3>

            <div className="card p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
              
              {/* Web Push Notification Registration */}
              <div className="space-y-3 border-b border-white/[0.04] pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Mobile Web Push</h4>
                      <p className="text-[11px] text-white/40">Background alerts when app is closed</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    pushEnabled 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-white/10 text-white/40 border-white/10"
                  }`}>
                    {pushEnabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleEnableWebPush}
                    disabled={subscribingPush}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-glow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {subscribingPush ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Bell size={13} />
                        <span>{pushEnabled ? "Re-subscribe Web Push" : "Enable Web Push"}</span>
                      </>
                    )}
                  </button>

                  {pushEnabled && (
                    <button
                      onClick={handleSendTestPush}
                      disabled={sendingPush}
                      className="bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      title="Send Test Push"
                    >
                      {sendingPush ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Test</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Water Reminder Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Droplet size={18} className="fill-blue-400/30" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Water Reminders</h4>
                    <p className="text-[11px] text-white/40">Receive daily hydration alerts</p>
                  </div>
                </div>

                <button
                  onClick={handleToggleWaterReminders}
                  disabled={saving}
                  className={`w-12 h-6 rounded-full transition-all duration-300 relative p-0.5 cursor-pointer ${
                    waterRemindersEnabled
                      ? "bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                      : "bg-white/10"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                      waterRemindersEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

            </div>
          </div>

          {/* General Security & Preferences */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-400" />
              Account & Privacy
            </h3>

            <div className="card p-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition cursor-pointer">
                <span className="text-xs font-semibold text-white/80">Privacy & Data Control</span>
                <ChevronRight size={16} className="text-white/30" />
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition cursor-pointer">
                <span className="text-xs font-semibold text-white/80">App Version</span>
                <span className="text-xs font-mono text-white/40">v2.4.0</span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3.5 rounded-2xl border border-red-500/20 transition flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out of GymMate</span>
          </button>

        </div>
      )}

    </div>
  );
}
