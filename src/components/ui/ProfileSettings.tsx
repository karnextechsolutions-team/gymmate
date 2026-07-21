"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Monitor,
  Sun,
  Moon,
  ChevronRight,
  Smartphone,
  Ruler,
  Bell,
  HelpCircle,
  Headphones,
  LogOut,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Theme = "system" | "light" | "dark";

export function ProfileSettings({
  initialTheme,
  initialWeight,
  initialLength,
}: {
  initialTheme: Theme;
  initialWeight: string;
  initialLength: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : theme;
    root.setAttribute("data-theme", resolved);
  }, [theme]);

  async function saveTheme(t: Theme) {
    setTheme(t);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ theme: t }).eq("id", user.id);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* THEME */}
      <section>
        <p className="eyebrow mb-2">Theme</p>
        <div className="flex gap-2">
          {[
            { k: "system", label: "System", icon: Monitor },
            { k: "light", label: "White", icon: Sun },
            { k: "dark", label: "Dark", icon: Moon },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => saveTheme(k as Theme)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm transition ${
                theme === k
                  ? "border-brand-500 bg-brand-500/10 text-white"
                  : "border-white/10 bg-ink-700 text-white/60"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* GENERAL */}
      <section>
        <p className="eyebrow mb-2">General settings</p>
        <div className="card divide-y divide-white/5">
          <Row icon={Smartphone} label="Connected Devices" />
          <Row icon={Ruler} label="Unit Preferences" hint={`${initialWeight} · ${initialLength}`} />
          <Row icon={Bell} label="Notifications" />
        </div>
      </section>

      {/* HELP */}
      <section>
        <p className="eyebrow mb-2">Help &amp; about</p>
        <div className="card divide-y divide-white/5">
          <Row icon={HelpCircle} label="Help Center" />
          <Row icon={Headphones} label="Contact Support" />
        </div>
      </section>

      {/* ACCOUNT */}
      <section>
        <p className="eyebrow mb-2">Account actions</p>
        <div className="card divide-y divide-white/5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 p-4 text-left text-white/80"
          >
            <LogOut size={18} className="text-white/50" />
            <span className="flex-1 text-[15px]">Log Out</span>
            <ChevronRight size={16} className="text-white/30" />
          </button>
          <button className="flex w-full items-center gap-3 p-4 text-left text-red-400">
            <Trash2 size={18} />
            <span className="flex-1 text-[15px]">Delete Account</span>
            <ChevronRight size={16} className="text-red-400/40" />
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
}) {
  return (
    <button className="flex w-full items-center gap-3 p-4 text-left">
      <Icon size={18} className="text-white/50" />
      <span className="flex-1 text-[15px] text-white/85">{label}</span>
      {hint && <span className="text-xs text-white/35">{hint}</span>}
      <ChevronRight size={16} className="text-white/30" />
    </button>
  );
}
