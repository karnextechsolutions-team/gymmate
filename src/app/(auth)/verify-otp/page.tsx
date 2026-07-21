"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Logo } from "@/components/ui/Shell";

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function set(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 3) refs[i + 1].current?.focus();
  }

  async function verify() {
    setErr(null);
    const token = digits.join("");
    if (token.length < 4) return setErr("Enter the 4-digit code.");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setLoading(false);
    if (error) return setErr(error.message);
    router.push("/onboarding");
  }

  async function resend() {
    setErr(null);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return setErr(error.message);
    setCooldown(30);
  }

  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-10 flex justify-center">
          <Logo size={64} />
        </div>
        <h1 className="text-center text-2xl font-bold">OTP Verification</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-white/55">
          Enter the verification code we just sent to your email address.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              value={d}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0)
                  refs[i - 1].current?.focus();
              }}
              inputMode="numeric"
              maxLength={1}
              className="h-16 w-16 rounded-2xl border border-white/10 bg-ink-600/70 text-center text-2xl font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          ))}
        </div>

        {err && <p className="mt-4 text-center text-sm text-red-400">{err}</p>}

        <button className="btn-primary mt-8" onClick={verify} disabled={loading}>
          {loading ? "Verifying…" : "Verify"}
        </button>
      </div>

      <p className="text-center text-sm text-white/55">
        Didn&apos;t receive code?{" "}
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="font-semibold text-brand-400 disabled:text-white/30"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
        </button>
      </p>
    </>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthShell back>
      <Suspense fallback={null}>
        <OtpForm />
      </Suspense>
    </AuthShell>
  );
}
