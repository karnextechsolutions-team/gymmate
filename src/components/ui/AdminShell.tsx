"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Shell";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function AdminShell({
  nav,
  title,
  children,
}: {
  nav: { href: string; label: string; icon?: React.ReactNode }[];
  title: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (path.startsWith("/admin")) {
      if (path.startsWith("/admin/login")) {
        setAuthorized(true);
        return;
      }

      const isAuth = localStorage.getItem("superAdminAuth") === "true";
      if (!isAuth) {
        router.push("/admin/login");
      } else {
        setAuthorized(true);
      }
    } else {
      // Non-admin layouts (such as /owner) are validated server-side/middleware
      setAuthorized(true);
    }
  }, [path, router]);

  async function logout() {
    if (path.startsWith("/admin")) {
      localStorage.removeItem("superAdminAuth");
      document.cookie = "superAdminAuth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      await supabase.auth.signOut();
      router.push("/admin/login");
    } else {
      await supabase.auth.signOut();
      router.push("/login");
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar (desktop) / top scroll (mobile) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-ink-800 p-5 md:flex">
        <Logo size={36} withText />
        <p className="eyebrow mt-1 pl-1">{title}</p>
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-xl px-4 py-2.5 text-sm transition flex items-center gap-2.5 ${
                  active ? "bg-brand-500/15 text-brand-400" : "text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                {n.icon}
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white/50 hover:bg-white/[0.04]"
        >
          <LogOut size={16} /> Log out
        </button>
      </aside>

      <div className="flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-white/[0.06] bg-ink-800 px-5 py-4 md:hidden">
          <Logo size={32} withText />
          <button onClick={logout} className="text-white/50"><LogOut size={18} /></button>
        </header>
        {/* Mobile nav */}
        <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b border-white/[0.06] px-5 py-3 md:hidden">
          {nav.map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm flex items-center gap-1.5 ${
                  active ? "bg-brand-500/15 text-brand-400" : "bg-ink-700 text-white/60"
                }`}
              >
                {n.icon}
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
