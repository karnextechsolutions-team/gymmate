"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Bell } from "lucide-react";

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .or(`member_id.eq.${userId},member_id.is.null`)
        .eq("is_read", false);

      if (!error && typeof count === "number") {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Error fetching unread notifications count:", err);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (userId) {
      fetchUnreadCount();

      // Subscribe to real-time changes on notifications
      const channel = supabase
        .channel("notifications_realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `member_id=eq.${userId}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, supabase, fetchUnreadCount]);

  return (
    <Link
      href="/notifications"
      className="relative w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-blue-500/30 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer group shadow-sm"
      title="Notifications"
    >
      <Bell size={18} className="group-hover:scale-110 transition-transform" />

      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-white font-mono text-[9px] font-black shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
