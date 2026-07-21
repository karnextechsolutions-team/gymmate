"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Lock, CreditCard, ArrowRight, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function OwnerOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  
  // Data states
  const [gymId, setGymId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial profile & gym details
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error("Unable to retrieve authenticated owner user.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, gym_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error(profileError?.message || "Owner profile record not found.");
        }

        setFullName(profile.full_name || "");
        setGymId(profile.gym_id);

        if (profile.gym_id) {
          const { data: gym } = await supabase
            .from("gyms")
            .select("contact_phone")
            .eq("id", profile.gym_id)
            .maybeSingle();
          if (gym) {
            setPhone((gym as any).contact_phone || "");
          }
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load setup details.");
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [supabase]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCompleteSetup();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCompleteSetup = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated session found.");
      }

      // 1. If password is provided, update Supabase Auth user password
      if (newPassword.trim()) {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword.trim(),
        });
        if (authError) throw authError;
      }

      // 2. Update gyms table with payout details and phone
      if (gymId) {
        const { error: gymUpdateError } = await supabase
          .from("gyms")
          .update({
            contact_phone: phone,
            bank_name: bankName,
            bank_account_name: accountName,
            bank_account_number: accountNumber,
          } as any) 
          .eq("id", gymId);

        if (gymUpdateError) throw gymUpdateError;
      }

      // 3. Update profiles table to set full_name and onboarded: true
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          onboarded: true,
        })
        .eq("id", user.id);

      if (profileUpdateError) throw profileUpdateError;

      // Redirect to owner dashboard
      router.push("/owner/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to complete owner setup.");
    } finally {
      setIsSaving(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      return fullName.trim().length > 1 && phone.trim().length > 4;
    }
    if (step === 2) {
      // Password can be left blank (optional replacement) or must be at least 6 characters if filled
      return !newPassword || newPassword.length >= 6;
    }
    if (step === 3) {
      return bankName.trim().length > 1 && accountName.trim().length > 1 && accountNumber.trim().length > 3;
    }
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111111] border border-gray-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-glow animate-fadeIn">
        
        {/* Top decorative gradient */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
              Step {step} of 3
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">Gym Owner Setup</h1>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                  s === step 
                    ? "bg-blue-500 w-8" 
                    : s < step 
                    ? "bg-blue-500/40" 
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Profile & Contact */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="mb-2">
              <p className="text-sm text-gray-400">Please provide your contact information to verify your profile identity.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-600">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. +1 234 567 890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 2: Password Security */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="mb-2">
              <p className="text-sm text-gray-400">Update your password to secure your owner dashboard account (optional).</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-600">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl pl-12 pr-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs text-amber-500 mt-2">Password must be at least 6 characters long.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Payout Details */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="mb-2">
              <p className="text-sm text-gray-400">Define bank details to receive member subscription and membership payouts.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bank Name</label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-600">
                  <CreditCard size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Holder Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Iron Gym Inc"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Account Number</label>
              <input
                type="text"
                required
                placeholder="e.g. 1234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>
          </div>
        )}

        {/* Buttons navigation */}
        <div className="flex gap-4 mt-8">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={isSaving}
              className="flex-1 bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-semibold rounded-xl py-3.5 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : null}

          <button
            onClick={handleNext}
            disabled={!isStepValid() || isSaving}
            className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Completing Setup...</span>
              </>
            ) : step === 3 ? (
              <>
                <CheckCircle size={16} />
                <span>Complete Setup</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
