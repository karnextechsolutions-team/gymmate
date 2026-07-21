"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Logo } from "@/components/ui/Shell";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendCode() {
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/login`,
    });
    setLoading(false);
    if (error) return setErr(error.message);
    setSent(true);
  }

  return (
    <AuthShell back>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-10 flex justify-center">
          <Logo size={64} />
        </div>
        <h1 className="text-center text-2xl font-bold">Forgot Password?</h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-white/55">
          Please enter the email address linked with your account.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <input
            className="input"
            placeholder="Enter your email…"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          {sent && (
            <p className="text-sm text-emerald-400">
              Check your inbox — we sent a reset link.
            </p>
          )}
          <button className="btn-primary" onClick={sendCode} disabled={loading}>
            {loading ? "Sending…" : "Send Code"}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-white/55">
        Remember Password?{" "}
        <Link href="/login" className="font-semibold text-brand-400">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
