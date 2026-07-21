"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProfileDashboard } from "@/components/ui/ProfileDashboard";

export default function ProfilePage() {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("full_name, height, weight, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileErr) console.error("Profile Error:", profileErr);

        // 2. Fetch the active subscription without any joins
        const { data: sub, error: subErr } = await supabase
          .from("member_subscriptions")
          .select("*")
          .eq("member_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        if (subErr) {
          console.error("Subscription Error:", subErr);
        }

        let planName = "Premium Membership";
        if (sub) {
          const planId = sub.plan_id || sub.membership_plan_id;
          if (planId) {
            const { data: plan } = await supabase
              .from("membership_plans")
              .select("name")
              .eq("id", planId)
              .single();
            if (plan) planName = plan.name;
          }
        }

        // 3. Fetch weight logs history (latest 5)
        const { data: logs, error: logsErr } = await supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: false })
          .limit(5);

        if (logsErr) {
          console.error("Logs Error:", logsErr);
        }

        setInitialData({
          user: {
            id: user.id,
            email: user.email || "",
          },
          profile: profile || null,
          subscription: sub ? { ...sub, plan_name: planName } : null,
          weightHistory: logs || [],
          metrics: [], // Explicitly not querying any metrics table
        });
      } catch (err) {
        console.error("Unexpected error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return <ProfileDashboard initialData={initialData} />;
}
