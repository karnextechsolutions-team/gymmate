"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  User, 
  Clock, 
  Megaphone,
  Sparkles,
  Layers
} from "lucide-react";

interface MemberProfile {
  id: string;
  full_name: string | null;
}

interface OwnerNotificationItem {
  id: string;
  member_id: string | null;
  title: string;
  message: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function OwnerNotificationsPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [targetType, setTargetType] = useState<"ALL" | "SPECIFIC">("ALL");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<OwnerNotificationItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Owner's Gym Members
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .maybeSingle();

      if (ownerProfile?.gym_id) {
        const { data: membersData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("gym_id", ownerProfile.gym_id)
          .eq("role", "member")
          .eq("approval_status", "active");

        setMembers(membersData || []);
        if (membersData && membersData.length > 0) {
          setSelectedMemberId(membersData[0].id);
        }
      }

      // 2. Fetch Recent Notifications sent
      const { data: historyData } = await supabase
        .from("notifications")
        .select(`
          id,
          member_id,
          title,
          message,
          created_at,
          profiles!notifications_member_id_fkey (
            full_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      setHistory((historyData as unknown as OwnerNotificationItem[]) || []);
    } catch (err: any) {
      console.error("Error loading owner notifications data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!title.trim() || !message.trim()) {
      setError("Title and message body are required.");
      return;
    }

    setSending(true);

    try {
      if (targetType === "ALL") {
        if (members.length === 0) {
          setError("No active members found in your gym.");
          setSending(false);
          return;
        }

        // Insert notifications for all gym members
        const payload = members.map((m) => ({
          member_id: m.id,
          title: title.trim(),
          message: message.trim(),
          is_read: false,
        }));

        const { error: insErr } = await supabase.from("notifications").insert(payload);
        if (insErr) throw insErr;

        // Trigger Web Push for each member
        for (const m of members) {
          fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: m.id,
              title: `📢 ${title.trim()}`,
              message: message.trim(),
              url: "/notifications",
            }),
          }).catch((err) => console.error("Push notification error:", err));
        }

        setSuccessMsg(`Announcement sent to all ${members.length} gym members!`);
      } else {
        if (!selectedMemberId) {
          setError("Please select a target member.");
          setSending(false);
          return;
        }

        const { error: insErr } = await supabase.from("notifications").insert({
          member_id: selectedMemberId,
          title: title.trim(),
          message: message.trim(),
          is_read: false,
        });

        if (insErr) throw insErr;

        // Trigger Web Push
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedMemberId,
            title: `📢 ${title.trim()}`,
            message: message.trim(),
            url: "/notifications",
          }),
        }).catch((err) => console.error("Push notification error:", err));

        const memberObj = members.find((m) => m.id === selectedMemberId);
        setSuccessMsg(`Notification sent to ${memberObj?.full_name || "member"}!`);
      }

      setTitle("");
      setMessage("");
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Send notification error:", err);
      setError(err?.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 pt-2 pb-16">
      
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs text-blue-400 uppercase font-bold tracking-widest">
          <Bell size={14} />
          Communication Hub
        </div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5 text-white mt-1">
          <Megaphone className="text-blue-500" size={26} />
          Send Gym Announcements
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Send announcements or direct alerts to all members of your gym or individual athletes.
        </p>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ── Compose Form ── */}
          <div className="lg:col-span-2 card p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" />
                Compose Announcement
              </h2>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-5">
              
              {/* Target Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Target Audience
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetType("ALL")}
                    className={`p-3 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      targetType === "ALL"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-glow"
                        : "bg-[#181818] text-white/50 border-gray-800 hover:text-white"
                    }`}
                  >
                    <Users size={16} />
                    <span>All Gym Members ({members.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("SPECIFIC")}
                    className={`p-3 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      targetType === "SPECIFIC"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-glow"
                        : "bg-[#181818] text-white/50 border-gray-800 hover:text-white"
                    }`}
                  >
                    <User size={16} />
                    <span>Specific Member</span>
                  </button>
                </div>
              </div>

              {/* Member Selector (If Specific) */}
              {targetType === "SPECIFIC" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Select Gym Member
                  </label>
                  {members.length === 0 ? (
                    <div className="bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white/30 italic">
                      No active members found
                    </div>
                  ) : (
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm cursor-pointer"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name || "Unknown Member"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Title & Message */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gym Schedule Update or Holiday Hours"
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Message Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement details..."
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Send size={16} />
                  )}
                  <span>Send Gym Announcement</span>
                </button>
              </div>

            </form>
          </div>

          {/* ── Recent Announcements Sidebar ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                Recent Alerts
              </h2>
              <span className="text-[10px] font-mono text-white/40">
                {history.length} Sent
              </span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-white/30 italic py-6 text-center">
                No recent announcements sent.
              </p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#111111] rounded-xl border border-white/[0.04] space-y-1 hover:border-white/10 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                      <span className="text-[9px] font-mono text-white/30 shrink-0">
                        {fmtDate(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
