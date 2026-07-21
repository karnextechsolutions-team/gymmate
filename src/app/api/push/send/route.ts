import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rwtejuojcukcznlccsse.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@gymmate.com",
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (e) {
    console.error("Failed to initialize webpush VAPID details:", e);
  }
}

export async function POST(req: Request) {
  try {
    const { userId, title, message, url } = await req.json();

    if (!userId || !title) {
      return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Insert in notifications table so it appears in the Notification Bell Center
    await supabase.from("notifications").insert({
      member_id: userId,
      title: title,
      message: message || "",
      is_read: false,
    });

    // 2. Fetch push subscription from user_settings
    const { data: settings } = await supabase
      .from("user_settings")
      .select("push_subscription, water_reminders_enabled")
      .eq("member_id", userId)
      .maybeSingle();

    if (settings?.push_subscription && vapidPublicKey && vapidPrivateKey) {
      let subscriptionObj = settings.push_subscription;
      if (typeof subscriptionObj === "string") {
        try {
          subscriptionObj = JSON.parse(subscriptionObj);
        } catch (e) {}
      }

      const payload = JSON.stringify({
        title,
        body: message,
        data: { url: url || "/notifications" }
      });

      await webpush.sendNotification(subscriptionObj, payload);
    }

    return NextResponse.json({ success: true, message: "Push notification sent successfully" });
  } catch (err: any) {
    console.error("Push send API error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Push failed" }, { status: 500 });
  }
}
