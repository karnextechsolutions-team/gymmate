"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Apple, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Layers, 
  BookOpen, 
  X, 
  Sparkles, 
  Flame, 
  Calendar, 
  Edit3, 
  Search,
  Utensils
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
}

interface DietTemplatePlan {
  id: string;
  plan_name: string;
  created_at: string;
}

interface MasterDiet {
  id: string;
  name: string;
  calories: number;
  protein: number;
}

interface EditableDietItem {
  id: string; // temp unique key
  meal_time: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  food_item: string;
  calories: number;
  protein: number;
}

interface RecentDietPlan {
  id: string;
  plan_name: string;
  created_at: string;
  member_id: string;
  profiles: {
    full_name: string | null;
  } | null;
}

const MEAL_TIMES: ("Breakfast" | "Lunch" | "Dinner" | "Snack")[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack"
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function memberInitial(name: string | null | undefined): string {
  return ((name ?? "M")[0] ?? "M").toUpperCase();
}

export default function DietsAssignmentPage() {
  const supabase = createClient();

  // Data
  const [members, setMembers] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<DietTemplatePlan[]>([]);
  const [masterDiets, setMasterDiets] = useState<MasterDiet[]>([]);
  const [recentPlans, setRecentPlans] = useState<RecentDietPlan[]>([]);

  // Workflow Form State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [planName, setPlanName] = useState("");
  const [activeMealTab, setActiveMealTab] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Breakfast");
  const [items, setItems] = useState<EditableDietItem[]>([]);

  // Master Picker Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // UI State
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load All Initial Data ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // 1. Members
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.gym_id) {
        const { data: membersData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("gym_id", profile.gym_id)
          .eq("role", "member")
          .eq("approval_status", "active");

        setMembers(membersData || []);
        if (membersData && membersData.length > 0 && !selectedMemberId) {
          setSelectedMemberId(membersData[0].id);
        }
      }

      // 2. Diet Templates (is_template = true)
      const { data: templatesData } = await supabase
        .from("diet_plans")
        .select("id, plan_name, created_at")
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      setTemplates(templatesData || []);

      // 3. Master Diets
      const { data: masterData } = await supabase
        .from("master_diets")
        .select("*")
        .order("name", { ascending: true });

      setMasterDiets(masterData || []);

      // 4. Recent Assigned Plans (is_template = false or null)
      const { data: recentData } = await supabase
        .from("diet_plans")
        .select(`
          id,
          plan_name,
          created_at,
          member_id,
          profiles (
            full_name
          )
        `)
        .or("is_template.eq.false,is_template.is.null")
        .order("created_at", { ascending: false })
        .limit(20);

      setRecentPlans((recentData as unknown as RecentDietPlan[]) || []);

    } catch (err: any) {
      console.error("Error loading diet assignment page data:", err);
      setError("Failed to load page data.");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedMemberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetForm = () => {
    setEditingPlanId(null);
    setSelectedTemplateId("");
    setPlanName("");
    setItems([]);
  };

  // ── Load Template Handlers ─────────────────────────────
  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    setLoadingTemplate(true);
    setError(null);
    try {
      const templateObj = templates.find((t) => t.id === templateId);
      if (templateObj) setPlanName(templateObj.plan_name);

      const { data: fetchedItems, error: fetchErr } = await supabase
        .from("diet_plan_items")
        .select("meal_time, food_item, calories, protein")
        .eq("plan_id", templateId);

      if (fetchErr) throw fetchErr;

      if (fetchedItems) {
        setItems(
          fetchedItems.map((it) => ({
            id: Math.random().toString(36).substring(7),
            meal_time: (it.meal_time as any) || "Breakfast",
            food_item: it.food_item,
            calories: it.calories || 0,
            protein: it.protein || 0
          }))
        );
      }
    } catch (err: any) {
      console.error("Failed to load diet template items:", err);
      setError("Failed to load items from diet template.");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // ── Edit Assigned Plan ─────────────────────────────
  const handleStartEditAssignedPlan = async (plan: RecentDietPlan) => {
    setEditingPlanId(plan.id);
    setSelectedMemberId(plan.member_id);
    setPlanName(plan.plan_name);
    setSelectedTemplateId("");

    setLoadingTemplate(true);
    setError(null);
    try {
      const { data: fetchedItems, error: fetchErr } = await supabase
        .from("diet_plan_items")
        .select("meal_time, food_item, calories, protein")
        .eq("plan_id", plan.id);

      if (fetchErr) throw fetchErr;

      if (fetchedItems) {
        setItems(
          fetchedItems.map((it) => ({
            id: Math.random().toString(36).substring(7),
            meal_time: (it.meal_time as any) || "Breakfast",
            food_item: it.food_item,
            calories: it.calories || 0,
            protein: it.protein || 0
          }))
        );
      }
    } catch (err: any) {
      console.error("Error loading assigned diet items for edit:", err);
      setError("Failed to load diet items for this plan.");
    } finally {
      setLoadingTemplate(false);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Delete Assigned Plan ─────────────────────────────
  const handleDeleteAssignedPlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this assigned diet plan?")) return;

    setDeletingId(planId);
    setError(null);
    setSuccessMsg(null);

    try {
      await supabase.from("diet_plan_items").delete().eq("plan_id", planId);
      const { error: delErr } = await supabase.from("diet_plans").delete().eq("id", planId);

      if (delErr) throw delErr;

      setSuccessMsg("Assigned diet plan deleted!");
      if (editingPlanId === planId) handleResetForm();
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Delete assigned plan error:", err);
      setError(err?.message || "Failed to delete plan.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Item Builder Handlers ─────────────────────────────
  const handleAddManualItem = (mealTime: "Breakfast" | "Lunch" | "Dinner" | "Snack") => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        meal_time: mealTime,
        food_item: "",
        calories: 150,
        protein: 15
      }
    ]);
  };

  const handleAddMasterDietItem = (master: MasterDiet) => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        meal_time: activeMealTab,
        food_item: master.name,
        calories: master.calories || 0,
        protein: master.protein || 0
      }
    ]);
    setIsPickerOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof EditableDietItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // ── Submit Assignment / Update ─────────────────────────────
  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedMemberId) {
      setError("Please select a target member.");
      return;
    }

    if (!planName.trim()) {
      setError("Please specify a diet plan name.");
      return;
    }

    const validItems = items.filter((it) => it.food_item.trim() !== "");
    if (validItems.length === 0) {
      setError("Please add at least one food item.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingPlanId) {
        // UPDATE MODE
        const { error: planErr } = await supabase
          .from("diet_plans")
          .update({
            member_id: selectedMemberId,
            plan_name: planName.trim()
          })
          .eq("id", editingPlanId);

        if (planErr) throw planErr;

        await supabase.from("diet_plan_items").delete().eq("plan_id", editingPlanId);

        const payload = validItems.map((it) => ({
          plan_id: editingPlanId,
          meal_time: it.meal_time,
          food_item: it.food_item.trim(),
          calories: Number(it.calories) || 0,
          protein: Number(it.protein) || 0
        }));

        const { error: insErr } = await supabase.from("diet_plan_items").insert(payload);
        if (insErr) throw insErr;

        setSuccessMsg("Assigned diet plan updated successfully!");
      } else {
        // CREATE MODE
        const { data: newPlan, error: planErr } = await supabase
          .from("diet_plans")
          .insert({
            member_id: selectedMemberId,
            plan_name: planName.trim(),
            is_template: false
          })
          .select()
          .single();

        if (planErr) throw planErr;

        const payload = validItems.map((it) => ({
          plan_id: newPlan.id,
          meal_time: it.meal_time,
          food_item: it.food_item.trim(),
          calories: Number(it.calories) || 0,
          protein: Number(it.protein) || 0
        }));

        const { error: insErr } = await supabase.from("diet_plan_items").insert(payload);
        if (insErr) throw insErr;

        // Insert notification record for member
        await supabase.from("notifications").insert({
          member_id: selectedMemberId,
          title: "New Diet Plan Assigned",
          message: `Your trainer assigned a new diet plan: "${planName.trim()}"`,
          is_read: false
        });

        // Trigger background web push notification
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedMemberId,
            title: "New Diet Plan Assigned 🥗",
            message: `Your trainer assigned a new diet plan: "${planName.trim()}"`,
            url: "/nutrition"
          })
        }).catch((err) => console.error("Web Push send error:", err));

        setSuccessMsg("Diet plan assigned to member successfully!");
      }

      handleResetForm();
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Assign diet error:", err);
      setError(err?.message || "Failed to assign diet plan.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCalories = items.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
  const totalProtein = items.reduce((acc, curr) => acc + (Number(curr.protein) || 0), 0);

  const filteredMaster = masterDiets.filter((m) =>
    m.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 pt-2 pb-12">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Apple className="text-emerald-500" />
          Assign Diet Plan
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Load reusable diet templates or build custom nutrition plans tailored for your members.
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2.5">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-2.5">
          <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ── Workflow Assignment Form ── */}
          <div className="lg:col-span-2 card p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingPlanId ? (
                  <>
                    <Edit3 size={18} className="text-emerald-400" />
                    <span>Edit Assigned Diet Plan</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-emerald-400" />
                    <span>Customize & Assign Diet</span>
                  </>
                )}
              </h2>

              {editingPlanId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-white/40 hover:text-white flex items-center gap-1 bg-white/[0.05] px-2.5 py-1 rounded-lg transition"
                >
                  <X size={13} />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            <form onSubmit={handleAssignPlan} className="space-y-6">
              
              {/* Target Member & Template Loader */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User size={13} className="text-emerald-400" />
                    1. Target Member
                  </label>
                  {members.length === 0 ? (
                    <div className="bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white/30 italic">
                      No active members found
                    </div>
                  ) : (
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm cursor-pointer"
                    >
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || "Unknown Member"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={13} className="text-emerald-400" />
                    2. Load Diet Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm cursor-pointer"
                  >
                    <option value="">-- Choose Diet Template --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.plan_name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Plan Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Diet Plan Title
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Keto Fat Loss - Week 1"
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                />
              </div>

              {/* Macro Summary Badge */}
              <div className="bg-[#141816] border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} /> Total Plan Macros:
                </span>
                <div className="flex gap-3">
                  <span className="text-xs font-mono font-bold text-amber-400">
                    🔥 {totalCalories} kcal
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    💪 {totalProtein}g Protein
                  </span>
                </div>
              </div>

              {/* Meal Time Tabs & Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Plan Food Items ({items.length})
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                    >
                      <BookOpen size={13} />
                      <span>Master Library</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddManualItem(activeMealTab)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/[0.08] transition"
                    >
                      <Plus size={13} />
                      <span>Custom Food</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 border-b border-white/[0.06] pb-2 overflow-x-auto no-scrollbar">
                  {MEAL_TIMES.map((meal) => {
                    const count = items.filter((it) => it.meal_time === meal).length;
                    return (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => setActiveMealTab(meal)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                          activeMealTab === meal
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/[0.02] text-white/40 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span>{meal}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeMealTab === meal ? "bg-emerald-500/30 text-emerald-300" : "bg-white/10 text-white/40"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {loadingTemplate ? (
                  <div className="flex justify-center items-center py-8 bg-[#141414] rounded-xl border border-white/[0.04]">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-xs text-white/40">Loading diet items...</span>
                  </div>
                ) : items.filter((it) => it.meal_time === activeMealTab).length === 0 ? (
                  <div className="text-center py-8 bg-[#141414] rounded-xl border border-dashed border-white/10 p-6 text-white/30 text-xs">
                    No food items for {activeMealTab} yet. Pick from master library or add custom item.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                    {items
                      .filter((it) => it.meal_time === activeMealTab)
                      .map((it) => (
                        <div key={it.id} className="flex gap-2.5 items-center bg-[#151515] p-2.5 rounded-xl border border-white/[0.04]">
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              required
                              value={it.food_item}
                              onChange={(e) => handleItemChange(it.id, "food_item", e.target.value)}
                              placeholder="Food Item"
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-3 py-2 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                            />
                          </div>

                          <div className="w-18 shrink-0">
                            <input
                              type="number"
                              required
                              value={it.calories}
                              onChange={(e) => handleItemChange(it.id, "calories", e.target.value)}
                              placeholder="kcal"
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-2 text-white text-xs text-center font-medium focus:border-emerald-500 outline-none"
                              title="Calories"
                            />
                          </div>

                          <div className="w-18 shrink-0">
                            <input
                              type="number"
                              required
                              value={it.protein}
                              onChange={(e) => handleItemChange(it.id, "protein", e.target.value)}
                              placeholder="Protein"
                              className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-2 text-white text-xs text-center font-medium focus:border-emerald-500 outline-none"
                              title="Protein"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="text-gray-500 hover:text-red-400 p-1.5 transition shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || members.length === 0 || items.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>{editingPlanId ? "Update Assigned Diet Plan" : "Assign Diet Plan to Member"}</span>
                </button>

                {editingPlanId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-semibold rounded-xl py-2 text-xs transition"
                  >
                    Assign New Diet Plan Instead
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* ── Recent Sidebar ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-emerald-400" />
                Recently Assigned
              </h2>
              <span className="text-[10px] font-mono text-white/40">
                {recentPlans.length} Total
              </span>
            </div>

            {recentPlans.length === 0 ? (
              <p className="text-sm text-white/30 italic py-4 text-center">
                No recent member diet plans assigned
              </p>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {recentPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-3 bg-[#111111] rounded-xl border transition-all space-y-2 ${
                      editingPlanId === plan.id
                        ? "border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/[0.02]"
                        : "border-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-[10px] shrink-0">
                          {memberInitial(plan.profiles?.full_name)}
                        </div>
                        <span className="text-xs font-semibold text-white truncate">
                          {plan.profiles?.full_name || "Unknown Member"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditAssignedPlan(plan)}
                          className="p-1.5 text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                          title="Edit Assigned Diet"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDeleteAssignedPlan(plan.id)}
                          disabled={deletingId === plan.id}
                          className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40"
                          title="Delete Assigned Diet"
                        >
                          {deletingId === plan.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-white/90 truncate">
                        {plan.plan_name}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        Assigned on {fmtDate(plan.created_at)}
                      </p>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Master Library Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[480px]">
            
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#151515]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-400" />
                Select Master Food Item
              </h3>
              <button 
                onClick={() => setIsPickerOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-white/[0.04] bg-[#131313]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search master diets..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredMaster.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">
                  No matching master food items found.
                </div>
              ) : (
                filteredMaster.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleAddMasterDietItem(m)}
                    className="flex justify-between items-center p-3 rounded-xl bg-[#161616] border border-white/[0.04] hover:border-emerald-500/40 hover:bg-[#1a1a1a] transition cursor-pointer group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors">
                        {m.name}
                      </h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        🔥 {m.calories} kcal • 💪 {m.protein}g Protein
                      </p>
                    </div>

                    <button className="text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition">
                      + Select
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
