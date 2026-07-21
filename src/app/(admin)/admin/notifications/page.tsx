"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Megaphone, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Clock, 
  Bell, 
  Radio, 
  Sparkles 
} from "lucide-react";

interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminNotificationsPage() {
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<BroadcastNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, created_at")
        .is("member_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err: any) {
      console.error("Error loading broadcast history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!title.trim() || !message.trim()) {
      setError("Title and Message are required.");
      return;
    }

    setSending(true);

    try {
      // 1. Insert Global Broadcast Notification (member_id = null)
      const { error: insErr } = await supabase.from("notifications").insert({
        member_id: null,
        title: title.trim(),
        message: message.trim(),
        is_read: false,
      });

      if (insErr) throw insErr;

      // 2. Fetch all members to send web push notifications
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "member");

      if (memberProfiles && memberProfiles.length > 0) {
        // Send async push calls to member push subscriptions
        for (const m of memberProfiles) {
          fetch("/api/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: m.id,
              title: `📢 ${title.trim()}`,
              message: message.trim(),
              url: "/notifications",
            }),
          }).catch((err) => console.error("Push broadcast error:", err));
        }
      }

      setSuccessMsg("Global announcement broadcasted successfully to all users!");
      setTitle("");
      setMessage("");
      await loadHistory();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Broadcast notification error:", err);
      setError(err?.message || "Failed to broadcast notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 pt-4 pb-16">
      
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs text-purple-400 uppercase font-bold tracking-widest">
          <Globe size={14} />
          Super Admin Control Panel
        </div>
        <h1 className="text-3xl font-black text-white mt-1 flex items-center gap-2.5">
          <Megaphone className="text-purple-400" size={28} />
          Global System Announcements
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Broadcast platform-wide updates and push notifications to all users across every gym.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ── Compose Broadcast Form ── */}
        <div className="lg:col-span-2 card p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio size={18} className="text-purple-400 animate-pulse" />
              Compose Broadcast Message
            </h2>
            <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
              Target: All Users (Global)
            </span>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                Announcement Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Maintenance & New Feature Release"
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                Message Body
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter detailed message to broadcast..."
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors text-sm resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl py-3.5 transition-all shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send size={16} />
                )}
                <span>Broadcast System Announcement</span>
              </button>
            </div>
          </form>

        </div>

        {/* ── Broadcast History Sidebar ── */}
        <div className="card p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              Past Broadcasts
            </h2>
            <span className="text-[10px] font-mono text-white/40">
              {history.length} Sent
            </span>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-white/30 italic py-6 text-center">
              No global announcements sent yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-1.5 hover:border-purple-500/30 transition"
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

    </div>
  );
}
