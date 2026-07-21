"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, Logo } from "@/components/ui/Shell";

function LoginContent() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password, 
      });
      
      if (signInError) {
        console.error('Login Error:', signInError);
        setLoading(false);
        return setErr(signInError.message);
      }

      const user = signInData?.user;
      if (!user) {
        setLoading(false);
        return setErr("Authentication failed. No session could be established.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, gym_id, onboarded, approval_status, height, weight")
        .eq("id", user.id)
        .maybeSingle();

      setLoading(false);

      if (profileError) {
        return setErr(profileError.message);
      }

      if (!profile) {
        // Defensive fallback: route to onboarding if profile is missing
        router.push("/onboarding");
        return;
      }

      // Check if user is a member and needs approval
      if (profile.role === "member" && profile.approval_status === "pending") {
        await supabase.auth.signOut();
        return setErr("Your account is pending approval. Please wait for your gym owner to activate it.");
      }

      if (profile.role === "gym_owner") {
        if (profile.onboarded) {
          router.push("/owner/dashboard");
        } else {
          router.push("/owner/onboarding");
        }
      } else if (profile.role === "member") {
        const needsOnboarding = profile.gym_id === null || profile.height === null || profile.weight === null;
        if (!needsOnboarding) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else if (profile.role === "super_admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setLoading(false);
      setErr(err?.message || "An unexpected error occurred during login.");
    }
  }

  return (
    <AuthShell>
      <div className="mt-8 flex flex-col items-center">
        <Logo size={56} />
        <h1 className="mt-5 text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-white/55">Login to continue</p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-3">
        {message && (
          <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center mb-2">
            {message}
          </div>
        )}

        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            className="input pr-11"
            placeholder="Password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <Link
          href="/forgot-password"
          className="self-end text-sm text-white/55 hover:text-white"
        >
          Forgot password?
        </Link>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button type="submit" className="btn-primary mt-1" disabled={loading}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-white/55">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-brand-400">
          Register Now
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8.5 h-8.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
