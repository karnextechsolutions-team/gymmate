"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, CheckCircle, Copy, Check, X } from "lucide-react";

export default function GymsPage() {
  const supabase = createClient();
  
  const [gyms, setGyms] = useState<any[]>([]);
  const [loadingGyms, setLoadingGyms] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gymName, setGymName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // States for viewing gym details
  const [selectedGym, setSelectedGym] = useState<any | null>(null);
  const [copiedSelectedCredentials, setCopiedSelectedCredentials] = useState(false);

  // Fetch gyms from Supabase on component mount
  useEffect(() => {
    async function fetchGyms() {
      setLoadingGyms(true);
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setGyms(data);
      }
      setLoadingGyms(false);
    }
    fetchGyms();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const slug = gymName.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]+/g, "") || `gym-${Date.now()}`;

    try {
      // 1. Create the Gym
      const { data: newGym, error: gymError } = await supabase
        .from("gyms")
        .insert([
          {
            name: gymName,
            slug: slug,
            invite_code: code,
            status: "active",
          },
        ])
        .select()
        .single();

      if (gymError) {
        throw gymError;
      }

      if (!newGym) {
        throw new Error("Failed to retrieve the created gym record.");
      }

      // 2. Create the Auth User (Gym Owner)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: ownerEmail,
        password: password,
        options: {
          data: {
            role: "gym_owner",
            gym_id: newGym.id,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create owner auth user.");
      }

      // 3. Link the Profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authData.user.id,
          full_name: ownerName,
          role: "gym_owner",
          gym_id: newGym.id,
          onboarded: false,
        });

      if (profileError) {
        throw profileError;
      }

      // 4. Prevent Session Override (Crucial)
      // Since signUp automatically logs the new user in on the client side,
      // we must sign them out immediately so the Super Admin's session isn't affected.
      await supabase.auth.signOut();

      // Add to local state list
      setGyms((prev) => [newGym, ...prev]);
      setGeneratedCode(code);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    const text = `Welcome to GymMate! Here are your manager portal credentials:
Login URL: http://localhost:3000/login
Email: ${ownerEmail}
Password: ${password}
Gym Invite Code: ${generatedCode}`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2000);
  };

  const handleCopySelectedCredentials = () => {
    if (!selectedGym) return;
    const email = selectedGym.owner_email || `${selectedGym.slug || "owner"}@example.com`;
    const pwd = selectedGym.temp_password || "••••••••";
    const code = selectedGym.invite_code || "—";
    
    const text = `Welcome to GymMate! Here are your manager portal credentials:
Login URL: http://localhost:3000/login
Email: ${email}
Password: ${pwd}
Gym Invite Code: ${code}`;

    navigator.clipboard.writeText(text);
    setCopiedSelectedCredentials(true);
    setTimeout(() => setCopiedSelectedCredentials(false), 2000);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setGymName("");
    setOwnerName("");
    setOwnerEmail("");
    setPassword("");
    setGeneratedCode(null);
    setError(null);
    setCopiedCredentials(false);
  };

  return (
    <div>
      {/* Header Layout */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Gyms (Tenants)</h1>
          <p className="mt-2 text-sm text-white/50">
            Onboard, approve, or suspend gyms. Toggle feature flags per gym here.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors shadow-glow text-sm flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Add New Gym</span>
        </button>
      </div>

      {/* Gyms Data Table */}
      {loadingGyms ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : gyms.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-white/40">
          No gyms onboarded yet. Click "+ Add New Gym" to get started.
        </div>
      ) : (
        <div className="card mt-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Gym Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Invite Code</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {gyms.map((gym) => (
                  <tr 
                    key={gym.id} 
                    onClick={() => setSelectedGym(gym)}
                    className="cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-white">{gym.name}</td>
                    <td className="px-6 py-4 text-sm font-mono text-blue-400 font-semibold tracking-wider">
                      {gym.invite_code || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {gym.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>{gym.status}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/50">
                      {gym.created_at ? new Date(gym.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-md relative overflow-hidden">
            
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Glow accent */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>

            {!generatedCode ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">Register New Gym</h2>
                  <p className="text-gray-400 text-sm mt-1">Set up a new tenant gym and its owner account.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gym Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Iron Gym"
                      value={gymName}
                      onChange={(e) => setGymName(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner Email</label>
                    <input
                      type="email"
                      required
                      placeholder="owner@example.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Temporary Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-semibold rounded-xl py-3.5 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        "Create Gym"
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Gym Created Successfully!</h2>
                <p className="text-gray-400 text-sm max-w-xs mb-6">
                  The gym <span className="text-white font-semibold">"{gymName}"</span> has been registered. Share the credentials below with the gym owner.
                </p>

                {/* Credentials Summary Box */}
                <div className="w-full bg-[#181818] border border-gray-800 rounded-xl p-5 mb-6 text-left space-y-3 font-sans">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Gym Invite Code</span>
                    <span className="text-2xl font-extrabold text-blue-400 tracking-widest font-mono">
                      {generatedCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Owner Login Email</span>
                    <span className="text-sm font-medium text-white break-all">{ownerEmail}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Temporary Password</span>
                    <span className="text-sm font-medium text-white font-mono">{password}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Login URL</span>
                    <span className="text-sm font-medium text-blue-400 underline break-all">http://localhost:3000/login</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full space-y-3">
                  <button
                    onClick={handleCopyCredentials}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-colors text-sm shadow-glow flex items-center justify-center gap-2"
                  >
                    {copiedCredentials ? (
                      <>
                        <Check size={16} className="text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy Credentials to Share</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeModal}
                    className="w-full bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-semibold rounded-xl py-3.5 transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Gym Details Modal */}
      {selectedGym && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-md relative overflow-hidden">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedGym(null)}
              className="absolute right-4 top-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Glow accent */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none"></div>

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white break-all">{selectedGym.name}</h2>
                {selectedGym.status === "active" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>{selectedGym.status}</span>
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-1">Tenant Profile Details & Security Credentials</p>
            </div>

            {/* Profile Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4 border-b border-white/[0.06] pb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-0.5">Date Created</span>
                  <span className="text-sm text-white/80">
                    {selectedGym.created_at ? new Date(selectedGym.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-0.5">Tenant Reference</span>
                  <span className="text-sm text-white/80 font-mono break-all">{selectedGym.id}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-2">Status Options</span>
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-2.5">
                  <span className="text-sm text-white/70">Status Control Toggle</span>
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    Enabled
                  </span>
                </div>
              </div>
            </div>

            {/* Manager Portal Credentials Box */}
            <div className="w-full bg-[#181818] border border-gray-800 rounded-xl p-5 mb-6 space-y-3">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Gym Invite Code</span>
                <span className="text-2xl font-extrabold text-blue-400 tracking-widest font-mono">
                  {selectedGym.invite_code || "—"}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Owner Login Email</span>
                <span className="text-sm font-medium text-white break-all">
                  {selectedGym.owner_email || `${selectedGym.slug || "owner"}@example.com`}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Temporary Password</span>
                <span className="text-sm font-medium text-white font-mono">
                  {selectedGym.temp_password || "••••••••"}
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-0.5">Login URL</span>
                <span className="text-sm font-medium text-blue-400 underline break-all">
                  http://localhost:3000/login
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleCopySelectedCredentials}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-colors text-sm shadow-glow flex items-center justify-center gap-2"
              >
                {copiedSelectedCredentials ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Owner Credentials</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedGym(null)}
                className="w-full bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-semibold rounded-xl py-3.5 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
