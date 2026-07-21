"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [step, setStep] = useState(0);
  
  const [gymCode, setGymCode] = useState("");
  const [gymId, setGymId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [height, setHeight] = useState(178); // cm
  const [weight, setWeight] = useState(62); // kg
  const [lengthUnit, setLengthUnit] = useState<"cm" | "in">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: prof, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id, height, weight")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          setError(profileError.message);
        } else if (prof) {
          setProfile(prof);
          
          if (prof.gym_id) {
            setGymId(prof.gym_id);
          }
          if (prof.height !== null) {
            setHeight(Number(prof.height));
          }
          if (prof.weight !== null) {
            setWeight(Number(prof.weight));
          }

          // Bypass onboarding if they already have all three fields populated
          if (prof.gym_id !== null && prof.height !== null && prof.weight !== null) {
            router.push("/dashboard");
            return;
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load profile.");
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, [router, supabase]);

  // Dynamically generate the steps list
  const steps: Array<{
    id: "gymCode" | "height" | "weight";
    q: string;
    s: string;
  }> = [];

  if (profile) {
    if (profile.gym_id === null) {
      steps.push({
        id: "gymCode",
        q: "Join Your Gym",
        s: "Enter the 6-digit invite code provided by your gym owner.",
      });
    }
    if (profile.height === null) {
      steps.push({
        id: "height",
        q: "What's your height?",
        s: "Used for better progress tracking.",
      });
    }
    if (profile.weight === null) {
      steps.push({
        id: "weight",
        q: "What's your current weight?",
        s: "We'll use it to track your progress over time.",
      });
    }
  }

  const currentStep = steps[step];

  async function verifyGymCode() {
    setIsVerifying(true);
    setCodeError(null);
    try {
      const { data: gym, error: fetchError } = await supabase
        .from("gyms")
        .select("id, name")
        .eq("invite_code", gymCode)
        .eq("status", "active")
        .single();

      if (fetchError || !gym) {
        setCodeError("Invalid or inactive gym code.");
      } else {
        setGymId(gym.id);
        setCodeError(null);
        setStep(step + 1);
      }
    } catch (err) {
      setCodeError("Invalid or inactive gym code.");
    } finally {
      setIsVerifying(false);
    }
  }

  function next() {
    if (currentStep?.id === "gymCode") {
      verifyGymCode();
    } else if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  }

  async function finishOnboarding() {
    setIsSaving(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found.");
      }

      const updates: any = {
        onboarded: true,
        length_unit: lengthUnit,
        weight_unit: weightUnit,
      };

      if (gymId) {
        updates.gym_id = gymId;
        // Update auth user metadata so JWT has gym_id and role
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { 
            role: "member",
            gym_id: gymId 
          }
        });
        if (authUpdateError) throw authUpdateError;
      }

      if (steps.some(s => s.id === "height")) {
        updates.height = parseFloat(height.toString());
      }

      if (steps.some(s => s.id === "weight")) {
        updates.weight = parseFloat(weight.toString());
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Record first body metrics row in the metrics history
      if (steps.some(s => s.id === "weight")) {
        await supabase.from("body_metrics").insert({ 
          member_id: user.id, 
          weight: parseFloat(weight.toString()) 
        });
      }

      // Redirect to the dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to save profile details.");
    } finally {
      setIsSaving(false);
    }
  }

  const canNext =
    (currentStep?.id === "gymCode" && gymCode.trim().length === 6) ||
    (currentStep?.id === "height" && height > 0) ||
    (currentStep?.id === "weight" && weight > 0);

  if (isLoadingProfile) {
    return (
      <div className="relative min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop')" }}
        ></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/60 text-sm font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop')" }}
      ></div>
      
      {/* Gradient Overlay Layer */}
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>

      {/* Main Content Wrapper */}
      <div className="relative z-10 w-full max-w-sm h-full flex flex-col">
        {/* progress dots */}
        {steps.length > 1 && (
          <div className="mb-10 flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition ${
                  i <= step ? "bg-brand-500" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        )}

        {currentStep && (
          <>
            <h1 className="text-2xl font-bold">{currentStep.q}</h1>
            <p className="mt-1.5 text-sm text-white/55">{currentStep.s}</p>
          </>
        )}

        <div className="flex flex-1 flex-col justify-center my-8">
          {currentStep?.id === "gymCode" && (
            <div className="flex flex-col items-center w-full">
              <input
                autoFocus
                maxLength={6}
                value={gymCode}
                onChange={(e) => {
                  setGymCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                  if (codeError) setCodeError(null);
                }}
                placeholder="000000"
                disabled={isVerifying}
                className="w-full border-b border-white/15 bg-transparent pb-3 text-center text-3xl font-bold tracking-widest outline-none placeholder:text-white/25 focus:border-brand-500 uppercase disabled:opacity-50"
              />
              {codeError && (
                <p className="text-red-500 text-sm mt-2">{codeError}</p>
              )}
            </div>
          )}

          {currentStep?.id === "height" && (
            <Picker
              value={height}
              setValue={setHeight}
              min={120}
              max={220}
              unit={lengthUnit}
              units={["cm", "in"]}
              onUnit={(u) => setLengthUnit(u as "cm" | "in")}
            />
          )}

          {currentStep?.id === "weight" && (
            <WeightPicker
              value={weight}
              setValue={setWeight}
              unit={weightUnit}
              onUnit={(u) => setWeightUnit(u as "kg" | "lbs")}
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              disabled={isSaving}
              className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] disabled:opacity-30"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={next}
            disabled={!canNext || isSaving || isVerifying}
            className="flex items-center gap-2 rounded-full bg-brand-grad px-7 py-3.5 text-[15px] font-semibold shadow-glow disabled:opacity-40"
          >
            {isSaving ? "Saving Profile..." : isVerifying ? "Verifying..." : step === steps.length - 1 ? "Finish" : "Next"}
            <ArrowRight size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-6 text-center">
            <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Vertical wheel-style picker */
function Picker({
  value,
  setValue,
  min,
  max,
  unit,
  units,
  onUnit,
}: {
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  unit: string;
  units: string[];
  onUnit: (u: string) => void;
}) {
  const around = [-2, -1, 0, 1, 2];
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center">
        {around.map((d) => {
          const v = value + d;
          if (v < min || v > max) return <div key={d} className="h-12" />;
          const center = d === 0;
          return (
            <button
              key={d}
              onClick={() => setValue(v)}
              className={
                center
                  ? "my-1 rounded-2xl border border-white/10 bg-ink-600 px-10 py-3 text-3xl font-bold"
                  : `py-1.5 text-xl font-medium ${
                      Math.abs(d) === 1 ? "text-white/45" : "text-white/20"
                    }`
              }
            >
              {v}
              {center && <span className="ml-1 align-top text-xs text-white/50">{unit}</span>}
            </button>
          );
        })}
      </div>
      <UnitToggle value={unit} units={units} onChange={onUnit} />
    </div>
  );
}

/* Horizontal ruler-style weight picker */
function WeightPicker({
  value,
  setValue,
  unit,
  onUnit,
}: {
  value: number;
  setValue: (n: number) => void;
  unit: string;
  onUnit: (u: string) => void;
}) {
  const ticks = Array.from({ length: 13 }, (_, i) => value - 6 + i);
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="grid h-32 w-32 place-items-center rounded-3xl bg-ink-600">
        <div className="text-4xl font-bold">
          {value}
          <span className="ml-1 align-top text-sm font-medium text-white/50">{unit}</span>
        </div>
      </div>

      <div className="relative w-full">
        <div className="flex items-end justify-between px-1">
          {ticks.map((t) => (
            <button
              key={t}
              onClick={() => setValue(t)}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={`text-[10px] ${
                  t === value ? "text-white" : "text-white/30"
                }`}
              >
                {t}
              </span>
              <span
                className={`w-px ${
                  t === value ? "h-7 bg-brand-400" : "h-4 bg-white/20"
                }`}
              />
            </button>
          ))}
        </div>
        <div className="mx-auto mt-1 h-0 w-0 border-x-4 border-t-[6px] border-x-transparent border-t-white" />
      </div>

      <UnitToggle value={unit} units={["kg", "lbs"]} onChange={onUnit} />
    </div>
  );
}

function UnitToggle({
  value,
  units,
  onChange,
}: {
  value: string;
  units: string[];
  onChange: (u: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {units.map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
            value === u ? "bg-ink-600 text-white" : "bg-ink-700/60 text-white/40"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}
