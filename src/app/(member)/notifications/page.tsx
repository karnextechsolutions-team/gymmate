"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Dumbbell, 
  Apple, 
  CheckCheck, 
  Sparkles, 
  Check, 
  Clock,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  member_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`member_id.eq.${user.id},member_id.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("member_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id: string, currentStatus: boolean) => {
    if (currentStatus) return; // already read

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredList = notifications.filter((n) =>
    filter === "unread" ? !n.is_read : true
  );

  return (
    <div className="px-5 pt-12 pb-24 max-w-md mx-auto space-y-6">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            <ChevronLeft size={18} />
          </Link>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold flex items-center gap-1">
              <Bell size={12} className="text-blue-400" />
              Alert Center
            </p>
            <h1 className="text-2xl font-black text-white">Notifications</h1>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-40"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            filter === "all"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-white/[0.02] text-white/40 hover:bg-white/[0.06]"
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/10 text-white/40">
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            filter === "unread"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-white/[0.02] text-white/40 hover:bg-white/[0.06]"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500/30 text-red-300 font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification Cards List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="card p-8 flex flex-col items-center justify-center text-center space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.06] text-white/30">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">No Notifications</h3>
            <p className="text-xs text-white/40 mt-1">
              {filter === "unread"
                ? "You have read all your notifications!"
                : "You don't have any notifications right now."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((n) => {
            const isWorkout = n.title.toLowerCase().includes("workout");
            const isDiet = n.title.toLowerCase().includes("diet");

            return (
              <div
                key={n.id}
                onClick={() => handleMarkSingleRead(n.id, n.is_read)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative overflow-hidden ${
                  !n.is_read
                    ? "bg-blue-500/[0.04] border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.06)]"
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
                }`}
              >
                {/* Unread indicator bar */}
                {!n.is_read && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500 shadow-glow" />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                        isWorkout
                          ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                          : isDiet
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-purple-500/15 border-purple-500/30 text-purple-400"
                      }`}
                    >
                      {isWorkout ? (
                        <Dumbbell size={16} />
                      ) : isDiet ? (
                        <Apple size={16} />
                      ) : (
                        <Bell size={16} />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {n.title}
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        )}
                      </h4>
                      <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-white/40 shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
