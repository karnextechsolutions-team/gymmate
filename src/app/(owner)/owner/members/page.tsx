"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Link as LinkIcon, UserPlus, Users, X, Info } from "lucide-react";

export default function MembersManagementPage() {
  const supabase = createClient();
  const [gymId, setGymId] = useState<string | null>(null);
  
  // Data lists
  const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
  const [activeProfiles, setActiveProfiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "active">("pending");
  const [error, setError] = useState<string | null>(null);

  // Approval Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [approvalOption, setApprovalOption] = useState<"new" | "link">("new");
  
  // Option A States
  const [selectedPlanId, setSelectedPlanId] = useState("");
  
  // Option B States
  const [selectedSubId, setSelectedSubId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial details
  useEffect(() => {
    async function loadInitialData() {
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
          await refreshData(profile.gym_id);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load member records.");
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [supabase]);

  async function refreshData(gId: string) {
    // 1a. Fetch pending profiles
    const { data: pendingData, error: pendingErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("gym_id", gId)
      .eq("role", "member")
      .eq("approval_status", "pending");

    if (pendingErr) throw pendingErr;

    // 1b. Fetch active profiles
    const { data: activeData, error: activeErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("gym_id", gId)
      .eq("role", "member")
      .eq("approval_status", "active");

    if (activeErr) throw activeErr;

    // 2. Fetch membership plans
    const { data: plansData, error: plansErr } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("gym_id", gId);

    if (plansErr) throw plansErr;

    // 3. Fetch active subscriptions
    const { data: subsData, error: subsErr } = await supabase
      .from("member_subscriptions")
      .select("*")
      .eq("gym_id", gId)
      .eq("status", "active");

    if (subsErr) throw subsErr;

    setPendingProfiles(pendingData || []);
    setActiveProfiles(activeData || []);
    setPlans(plansData || []);
    setSubscriptions(subsData || []);
  }

  const handleOpenApproval = (member: any) => {
    setSelectedMember(member);
    setApprovalOption("new");
    setSelectedPlanId(plans[0]?.id || "");
    setSelectedSubId(subscriptions[0]?.id || "");
    setIsModalOpen(true);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !gymId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let finalSubId = null;

      if (approvalOption === "new") {
        // Option A: Assign New Plan
        const plan = plans.find(p => p.id === selectedPlanId);
        if (!plan) throw new Error("Please select a valid pricing plan.");

        const durationDays = plan.duration_days || 30;
        const startDate = new Date().toISOString().split("T")[0];
        const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Insert new subscription record
        const { data: newSub, error: subInsertError } = await supabase
          .from("member_subscriptions")
          .insert({
            gym_id: gymId,
            member_id: selectedMember.id,
            plan_id: selectedPlanId,
            start_date: startDate,
            end_date: endDate,
            status: "active",
          })
          .select()
          .single();

        if (subInsertError) throw subInsertError;
        finalSubId = newSub.id;
      } else {
        // Option B: Link to Existing Group/Couple Plan
        if (!selectedSubId) throw new Error("Please select an active primary subscription to link.");
        finalSubId = selectedSubId;
      }

      // Update profiles record
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          approval_status: "active",
          subscription_id: finalSubId,
        } as any)
        .eq("id", selectedMember.id);

      if (profileUpdateError) throw profileUpdateError;

      await refreshData(gymId);
      closeModal();
    } catch (err: any) {
      setError(err?.message || "Failed to approve member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
    setApprovalOption("new");
    setSelectedPlanId("");
    setSelectedSubId("");
    setError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="mt-2 text-sm text-white/50">
          Manage gym member applications, approve new registrants, or link secondary group plans.
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center mb-6">
          {error}
        </div>
      )}

      {/* Tabs Layout */}
      <div className="flex border-b border-white/[0.06] gap-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-4 text-sm font-semibold relative transition-colors ${
            activeTab === "pending" ? "text-blue-400" : "text-white/40 hover:text-white/60"
          }`}
        >
          <span>Pending Approvals ({pendingProfiles.length})</span>
          {activeTab === "pending" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-4 text-sm font-semibold relative transition-colors ${
            activeTab === "active" ? "text-blue-400" : "text-white/40 hover:text-white/60"
          }`}
        >
          <span>Active Members ({activeProfiles.length})</span>
          {activeTab === "active" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === "pending" ? (
        pendingProfiles.length === 0 ? (
          <div className="card p-8 text-center text-white/40">
            No pending registration requests found.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Member Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Contact Number</th>
                    <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {pendingProfiles.map((member) => (
                    <tr key={member.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white flex items-center gap-3">
                        {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.full_name || "Member"} 
                            className="w-8 h-8 rounded-full object-cover bg-gray-800" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {(member.full_name?.[0] || "M").toUpperCase()}
                          </div>
                        )}
                        <span>{member.full_name || "—"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70 capitalize">{member.gender || "—"}</td>
                      <td className="px-6 py-4 text-sm text-white/50">{member.contact_number || "—"}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => handleOpenApproval(member)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-xs shadow-glow inline-flex items-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>Approve</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : activeProfiles.length === 0 ? (
        <div className="card p-8 text-center text-white/40">
          No active members currently registered.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Member Name</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Plan Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider font-sans">Role Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Gender</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {activeProfiles.map((member) => {
                  const sub = subscriptions.find(s => s.id === member.subscription_id);
                  const plan = plans.find(p => p.id === sub?.plan_id);
                  const isPrimary = sub && sub.member_id === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{member.full_name || "—"}</td>
                      <td className="px-6 py-4 text-sm">
                        {plan ? (
                          <div>
                            <span className="text-white/80 font-medium">{plan.name}</span>
                            <span className="text-xs text-white/40 block mt-0.5">{plan.duration_days} Days Plan</span>
                          </div>
                        ) : (
                          <span className="text-white/30 italic">No plan linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {member.subscription_id ? (
                          isPrimary ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Primary Account Holder
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Linked Group Member
                            </span>
                          )
                        ) : (
                          <span className="text-white/30 italic">Manual Admin Access</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/60 capitalize">{member.gender || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Setup Modal */}
      {isModalOpen && selectedMember && (
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
              <h2 className="text-xl font-bold text-white">Approve Member</h2>
              <p className="text-gray-400 text-sm mt-1">
                Configure membership setup for <span className="text-white font-semibold">"{selectedMember.full_name}"</span>.
              </p>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-6">
              
              {/* Approval Option Tabs */}
              <div className="grid grid-cols-2 bg-[#181818] border border-gray-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setApprovalOption("new")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    approvalOption === "new" 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <UserPlus size={14} />
                  <span>Assign New Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalOption("link")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    approvalOption === "link" 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <LinkIcon size={14} />
                  <span>Link to Plan</span>
                </button>
              </div>

              {/* Option A: Assign New Plan */}
              {approvalOption === "new" && (
                <div className="space-y-4 animate-fadeIn">
                  {plans.length === 0 ? (
                    <div className="text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <span>No membership plans defined for this gym yet. Please create pricing plans first.</span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Select Membership Plan
                      </label>
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm appearance-none cursor-pointer"
                      >
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} - Rs. {Number(plan.price).toLocaleString()} ({plan.duration_days} Days)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Option B: Link to Existing Subscription */}
              {approvalOption === "link" && (
                <div className="space-y-4 animate-fadeIn">
                  {subscriptions.length === 0 ? (
                    <div className="text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                      <Info size={16} className="shrink-0 mt-0.5" />
                      <span>No active primary subscriptions found in the gym to link this account to.</span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Select Existing Primary Subscription
                      </label>
                      <select
                        value={selectedSubId}
                        onChange={(e) => setSelectedSubId(e.target.value)}
                        className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm appearance-none cursor-pointer"
                      >
                        {subscriptions.map((sub) => {
                          const primaryProfile = activeProfiles.find(p => p.id === sub.member_id);
                          const plan = plans.find(p => p.id === sub.plan_id);
                          return (
                            <option key={sub.id} value={sub.id}>
                              {primaryProfile?.full_name || "Unknown"} ({plan?.name || "No Plan"})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-[#181818] hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white font-semibold rounded-xl py-3.5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting || 
                    (approvalOption === "new" && plans.length === 0) || 
                    (approvalOption === "link" && subscriptions.length === 0)
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Approving...</span>
                    </>
                  ) : (
                    "Approve Member"
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
