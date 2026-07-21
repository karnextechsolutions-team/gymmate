"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, Calendar, Zap, Apple, User } from "lucide-react";

/* ----------------------------------------------------------------------- */
/* Logo — lightning bolt mark from the brand                               */
/* ----------------------------------------------------------------------- */
export function Logo({ size = 40, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-2xl bg-brand-grad shadow-glow"
        style={{ width: size, height: size }}
      >
        <Zap size={size * 0.5} className="fill-white text-white" />
      </div>
      {withText && <span className="text-lg font-bold tracking-tight">GymMate</span>}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* AuthShell — blue gradient hero used on every auth screen                */
/* ----------------------------------------------------------------------- */
export function AuthShell({
  children,
  back = false,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col bg-auth-grad px-6 pb-10 pt-14">
      {back && (
        <Link
          href="/login"
          className="absolute left-5 top-12 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur"
          aria-label="Go back"
        >
          ←
        </Link>
      )}
      {children}
    </main>
  );
}

/* ----------------------------------------------------------------------- */
/* BottomNav — member app tab bar                                          */
/* ----------------------------------------------------------------------- */
const TABS = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/progress", icon: Calendar, label: "Progress" },
  { href: "/workout", icon: Zap, label: "Train", primary: true },
  { href: "/diet", icon: Apple, label: "Diet" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between rounded-full border border-white/10 bg-ink-800/90 px-3 py-2 backdrop-blur-xl">
        {TABS.map(({ href, icon: Icon, primary }) => {
          const active = path === href || path.startsWith(href + "/");
          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="grid h-12 w-12 place-items-center rounded-full bg-brand-grad shadow-glow"
                aria-label="Train"
              >
                <Icon size={22} className="fill-white text-white" />
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={`grid h-11 w-11 place-items-center rounded-full transition ${
                active ? "text-brand-400" : "text-white/45 hover:text-white/70"
              }`}
            >
              <Icon size={22} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export { Dumbbell };
