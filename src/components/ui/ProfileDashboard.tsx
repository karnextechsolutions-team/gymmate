"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Calendar, 
  Scale, 
  TrendingUp, 
  Camera, 
  X, 
  Activity, 
  Clock, 
  CreditCard,
  Plus
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileDashboardProps {
  initialData: {
    user: {
      id: string;
      email: string;
    };
    profile: {
      full_name: string | null;
      avatar_url: string | null;
      height: number | null;
      weight: number | null;
    } | null;
    subscription: {
      id: string;
      start_date?: string;
      end_date?: string;
      status: string;
      plan_id?: string;
      plan_name?: string;
    } | null;
    weightHistory: any[];
    metrics: any[];
  };
}

export function ProfileDashboard({ initialData }: ProfileDashboardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState(initialData.profile);
  const [subscription] = useState(initialData.subscription);
  const [weightHistory, setWeightHistory] = useState<any[]>(initialData.weightHistory || []);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name || "");
  const [editHeight, setEditHeight] = useState(profile?.height?.toString() || "");
  const [editWeight, setEditWeight] = useState(profile?.weight?.toString() || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);

  const [newWeight, setNewWeight] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const heightCm = profile?.height || 0;
  const weightKg = profile?.weight || 0;
  const bmi = heightCm > 0 ? (weightKg / Math.pow(heightCm / 100, 2)) : 0;

  let bmiCategory = "Underweight";
  let bmiColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
  if (bmi >= 18.5 && bmi < 25) {
    bmiCategory = "Normal";
    bmiColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  } else if (bmi >= 25 && bmi < 30) {
    bmiCategory = "Overweight";
    bmiColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  } else if (bmi >= 30) {
    bmiCategory = "Obese";
    bmiColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse";
  }

  const calculateDaysRemaining = (endDate?: string) => {
    if (!endDate) return 0;
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining(subscription?.end_date);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogWeight = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWeight || isNaN(newWeight as any)) return;
    setIsLogging(true);
    setError(null);

    // 1. Insert into weight_logs table
    const { error: logErr } = await supabase
      .from('weight_logs')
      .insert([{ user_id: initialData.user.id, weight: parseFloat(newWeight) }]);

    if (!logErr) {
      // 2. Update the main profiles table so BMI updates
      await supabase
        .from('profiles')
        .update({ weight: parseFloat(newWeight) })
        .eq('id', initialData.user.id);

      // 3. Update local state to reflect instantly
      setProfile((prev: any) => (prev ? { ...prev, weight: parseFloat(newWeight) } : null));
      
      const newLog = {
        user_id: initialData.user.id,
        weight: parseFloat(newWeight),
        logged_at: new Date().toISOString()
      };
      setWeightHistory((prev) => [newLog, ...prev].slice(0, 5));
      
      setNewWeight('');
      alert('Weight logged successfully!');
    } else {
      setError(logErr.message);
    }
    setIsLogging(false);
  };

  const handleSaveDetails = async () => {
    if (!editName.trim()) {
      setModalError("Please enter a valid full name.");
      return;
    }

    setIsSavingDetails(true);
    setModalError(null);

    try {
      let finalAvatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${initialData.user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrlData.publicUrl;
      }

      const parsedHeight = parseFloat(editHeight);
      const parsedWeight = parseFloat(editWeight);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          height: isNaN(parsedHeight) ? null : parsedHeight,
          weight: isNaN(parsedWeight) ? null : parsedWeight,
          avatar_url: finalAvatarUrl,
        })
        .eq("id", initialData.user.id);

      if (updateError) throw updateError;

      // Log a new weight entry if weight was updated/changed
      if (!isNaN(parsedWeight) && parsedWeight !== profile?.weight) {
        await supabase.from("weight_logs").insert({
          member_id: initialData.user.id,
          weight: parsedWeight,
        });
      }

      setProfile((prev: any) => ({
        ...prev,
        full_name: editName,
        height: isNaN(parsedHeight) ? null : parsedHeight,
        weight: isNaN(parsedWeight) ? null : parsedWeight,
        avatar_url: finalAvatarUrl,
      }));

      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setModalError(err?.message || "Failed to update profile details.");
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <div className="px-5 pt-14 pb-28">
      {/* 1. HERO PROFILE SECTION */}
      <div className="card overflow-hidden relative">
        <div className="bg-brand-grad/10 p-6 flex flex-col items-center text-center">
          <div className="relative">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-500/20"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-ink-600 flex items-center justify-center border border-white/10">
                <User size={36} className="text-white/40" />
              </div>
            )}
          </div>
          
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{profile?.full_name || "Athlete"}</h1>
          
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-brand/10 border border-brand/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-brand-400">
              Member
            </span>
          </div>

          <button
            onClick={() => {
              setEditName(profile?.full_name || "");
              setEditHeight(profile?.height?.toString() || "");
              setEditWeight(profile?.weight?.toString() || "");
              setAvatarPreview(profile?.avatar_url || null);
              setAvatarFile(null);
              setIsEditOpen(true);
            }}
            className="mt-5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold hover:bg-white/[0.08] transition"
          >
            Edit Profile details
          </button>
        </div>
      </div>

      {/* 2. FITNESS STATISTICS & LIVE BMI */}
      <div className="mt-6">
        <p className="eyebrow mb-3">Health Metrics</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="backdrop-blur-md bg-white/5 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-white/40 uppercase">Height</span>
            <span className="text-xl font-bold mt-1.5">{profile?.height ?? "--"}<span className="text-xs text-white/45 ml-0.5">cm</span></span>
          </div>

          <div className="backdrop-blur-md bg-white/5 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-white/40 uppercase">Weight</span>
            <span className="text-xl font-bold mt-1.5">{profile?.weight ?? "--"}<span className="text-xs text-white/45 ml-0.5">kg</span></span>
          </div>

          <div className="backdrop-blur-md bg-white/5 border border-white/[0.06] rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center w-full">
              <span className="text-[11px] font-medium text-white/40 uppercase">BMI</span>
              {bmi > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${bmiColor}`}>
                  {bmiCategory}
                </span>
              )}
            </div>
            <span className="text-xl font-bold mt-1.5">
              {bmi > 0 ? bmi.toFixed(1) : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MEMBERSHIP & SUBSCRIPTION STATUS */}
      <div className="mt-6">
        <p className="eyebrow mb-3">Membership status</p>
        <div className="backdrop-blur-md bg-white/5 border border-white/[0.06] rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-brand-500/10 rounded-xl flex items-center justify-center border border-brand-500/25">
                <CreditCard size={20} className="text-brand-400" />
              </div>
              {subscription ? (
                <div>
                  <div className="font-semibold text-white text-base">
                    {subscription.plan_name || 'Premium Membership'}
                  </div>
                  <span className="text-xs text-white/40">GymMate Premium Membership</span>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-white text-base">No Active Plan</div>
                </div>
              )}
            </div>

            {subscription && subscription.end_date && (
              <span className="rounded-full bg-brand-grad px-3.5 py-1 text-[11px] font-bold text-white shadow-glow">
                {calculateDaysRemaining(subscription.end_date)} Days Left
              </span>
            )}
          </div>

          {subscription ? (
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
              {subscription.start_date && (
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-white/30" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-semibold">Start Date</span>
                    <span className="text-xs text-white/80 font-medium">
                      {new Date(subscription.start_date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>
              )}

              {subscription.end_date && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-white/30" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase font-semibold">Expiry Date</span>
                    <span className="text-xs text-white/80 font-medium">
                      {new Date(subscription.end_date).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/40 mt-4 text-center">
              Reach out to your gym owner to activate or renew a membership package.
            </p>
          )}
        </div>
      </div>

      {/* 4. WEIGHT PROGRESS TRACKER */}
      <div className="mt-6">
        <p className="eyebrow mb-3">Weight History & Tracker</p>
        
        {/* Quick Log Input */}
        <form onSubmit={handleLogWeight} className="flex gap-2.5 mb-4">
          <div className="relative flex-1">
            <Scale size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="number"
              step="0.1"
              min="10"
              max="500"
              required
              placeholder="Log today's weight (kg)..."
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              className="w-full rounded-xl bg-ink-700/60 border border-white/[0.08] pl-10 pr-4 py-3.5 text-sm placeholder:text-white/30 outline-none focus:border-brand-500/70 focus:ring-2 focus:ring-brand-500/20 transition text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isLogging}
            className="rounded-xl bg-brand-grad px-5 py-3.5 text-sm font-bold shadow-glow hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5 transition"
          >
            {isLogging ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Plus size={16} />
                <span>Log</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl mb-4 text-center">
            {error}
          </p>
        )}

        {/* Recent Weight Logs */}
        {weightHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">Recent Logs</p>
            <div className="space-y-2">
              {weightHistory.map((log, index) => {
                const dateString = log.logged_at 
                  ? new Date(log.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : "Just Now";
                return (
                  <div key={index} className="flex justify-between items-center bg-white/5 rounded-xl p-3.5 border border-white/[0.04] transition hover:bg-white/[0.08]">
                    <span className="text-xs text-white/50">{dateString}</span>
                    <span className="text-sm font-bold text-white">{log.weight} kg</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. EDIT DETAILS SLIDE-UP DRAWER MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm p-0 animate-fade-in transition-all">
          <div className="absolute inset-0" onClick={() => setIsEditOpen(false)} />
          
          <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-ink-800 border-t border-white/10 p-6 shadow-glow animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Edit Profile details
              </h2>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 border border-white/5 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Preview" 
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-500/20"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-ink-700 flex items-center justify-center border border-white/10">
                    <User size={36} className="text-white/30" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer">
                  <Camera size={20} className="text-white" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarChange}
                    className="hidden" 
                  />
                </label>
              </div>
              <span className="text-[11px] text-white/40 mt-2 font-medium">Click photo to update avatar</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Athlete name..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#181818] border border-white/[0.08] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Height..."
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="w-full bg-[#181818] border border-white/[0.08] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Weight..."
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full bg-[#181818] border border-white/[0.08] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {modalError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl mt-4 text-center">
                {modalError}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="flex-1 rounded-xl bg-white/5 border border-white/15 py-3.5 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDetails}
                disabled={isSavingDetails}
                className="flex-1 rounded-xl bg-brand-grad py-3.5 text-sm font-bold text-white shadow-glow hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-1.5 transition"
              >
                {isSavingDetails ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span>Save changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
