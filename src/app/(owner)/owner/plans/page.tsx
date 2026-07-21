"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash, Check, X } from "lucide-react";

export default function PlansPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [features, setFeatures] = useState("");
  const [maxMembers, setMaxMembers] = useState("1");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Gym ID and Plans on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated session found.");

        const { data: profile } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.gym_id) {
          setGymId(profile.gym_id);
          await fetchPlans(profile.gym_id);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load membership plans.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  async function fetchPlans(gId: string) {
    const { data, error: fetchError } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("gym_id", gId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }
    if (data) {
      setPlans(data);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymId) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      gym_id: gymId,
      name: name,
      price: parseFloat(price),
      duration_days: parseInt(durationDays),
      features: features, // saved as comma-separated string
      max_members: parseInt(maxMembers) || 1,
      is_active: true,
    };

    try {
      if (editingPlanId) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from("membership_plans")
          .update(payload as any)
          .eq("id", editingPlanId);

        if (updateError) throw updateError;
      } else {
        // Create new plan
        const { error: insertError } = await supabase
          .from("membership_plans")
          .insert([payload as any]);

        if (insertError) throw insertError;
      }

      await fetchPlans(gymId);
      closeModal();
    } catch (err: any) {
      setError(err?.message || "Failed to save membership plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (plan: any) => {
    setEditingPlanId(plan.id);
    setName(plan.name);
    setPrice(plan.price.toString());
    setDurationDays(plan.duration_days.toString());
    setFeatures(plan.features || "");
    setMaxMembers((plan.max_members || 1).toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from("membership_plans")
        .delete()
        .eq("id", planId);

      if (deleteError) {
        throw deleteError;
      }

      if (gymId) {
        await fetchPlans(gymId);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to delete membership plan.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlanId(null);
    setName("");
    setPrice("");
    setDurationDays("30");
    setFeatures("");
    setMaxMembers("1");
    setError(null);
  };

  const formatPrice = (p: number) => {
    return `Rs. ${Number(p).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div>
      {/* Header section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Plans & Pricing</h1>
          <p className="mt-2 text-sm text-white/50">
            Define subscription packages and membership plans for your gym.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition-colors shadow-glow text-sm flex items-center gap-2"
        >
          <Plus size={18} />
          <span>Create New Plan</span>
        </button>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center mb-6">
          {error}
        </div>
      )}

      {/* Plans list */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-8 text-center text-white/40">
          No membership plans defined yet. Click "Create New Plan" to set up your first pricing tier.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const planFeatures = plan.features
              ? plan.features.split(",").map((f: string) => f.trim()).filter(Boolean)
              : [];
            const capacity = plan.max_members || 1;

            return (
              <div 
                key={plan.id} 
                className="card p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white break-words pr-2">{plan.name}</h2>
                      {/* Capacity badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 mt-2 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {capacity <= 1 ? "👤 Individual" : capacity === 2 ? "👥 Couple" : `👥 Group of ${capacity}`}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      {plan.duration_days} Days
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-extrabold text-white">{formatPrice(plan.price)}</span>
                    <span className="text-xs text-gray-500 font-medium">/ total</span>
                  </div>

                  {planFeatures.length > 0 && (
                    <ul className="space-y-2.5 mb-6 text-sm">
                      {planFeatures.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2.5 text-white/80">
                          <Check size={16} className="text-blue-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-white/[0.06] pt-4 mt-auto flex gap-3">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/80 font-semibold rounded-xl py-2.5 transition-colors text-xs flex items-center justify-center"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold rounded-xl py-2.5 transition-colors text-xs flex items-center justify-center gap-1.5"
                  >
                    <Trash size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
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

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingPlanId ? "Edit Membership Plan" : "Create New Plan"}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {editingPlanId 
                  ? "Update the parameters of this existing pricing tier." 
                  : "Set up a pricing tier that members can subscribe to."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Pro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Price (Rs.)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-sm text-gray-600 font-semibold">Rs.</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="3500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Duration (Days)</label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm appearance-none cursor-pointer"
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">365 Days</option>
                  </select>
                </div>
              </div>

              {/* Package Capacity */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Package Capacity (Max Members)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="1"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">1 for Individual, 2 for Couple, etc.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Included Features</label>
                <textarea
                  placeholder="e.g. Free Trainer, 24/7 Access, Locker Room (comma-separated)"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  rows={3}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm resize-none"
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
                      <span>{editingPlanId ? "Saving..." : "Creating..."}</span>
                    </>
                  ) : (
                    <span>{editingPlanId ? "Save Changes" : "Create Plan"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
