"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  User, 
  Search, 
  X, 
  Sparkles,
  Layers,
  Edit3
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
}

interface TemplatePlan {
  id: string;
  plan_name: string;
  created_at: string;
}

interface MasterExercise {
  id: string;
  name: string;
  category: string;
  default_sets: number;
  default_reps: number;
  video_url?: string;
}

interface EditableExercise {
  id: string; // temp unique key
  exercise_name: string;
  sets: string;
  reps: string;
  video_url?: string | null;
}

interface RecentWorkoutPlan {
  id: string;
  plan_name: string;
  created_at: string;
  member_id: string;
  profiles: {
    full_name: string | null;
  } | null;
}

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

export default function OwnerWorkoutsPage() {
  const supabase = createClient();
  const [gymId, setGymId] = useState<string | null>(null);

  // Data
  const [members, setMembers] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<TemplatePlan[]>([]);
  const [globalExercises, setGlobalExercises] = useState<MasterExercise[]>([]);
  const [recentPlans, setRecentPlans] = useState<RecentWorkoutPlan[]>([]);

  // Form State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [planName, setPlanName] = useState("");
  const [exercises, setExercises] = useState<EditableExercise[]>([]);

  // Global Library Picker State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState<string>("All");

  // UI State
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load All Initial Data ─────────────────────────────
  const loadData = useCallback(async (gId: string) => {
    try {
      // 1. Fetch active members
      const { data: membersData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("gym_id", gId)
        .eq("role", "member")
        .eq("approval_status", "active");
      
      setMembers(membersData || []);
      if (membersData && membersData.length > 0 && !selectedMemberId) {
        setSelectedMemberId(membersData[0].id);
      }

      // 2. Fetch workout templates (is_template = true)
      const { data: templatesData } = await supabase
        .from("workout_plans")
        .select("id, plan_name, created_at")
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      setTemplates(templatesData || []);

      // 3. Fetch Master Exercises
      const { data: masterData } = await supabase
        .from("master_exercises")
        .select("*")
        .order("name", { ascending: true });

      setGlobalExercises(masterData || []);

      // 4. Fetch Recent Assigned Plans (up to 25 items)
      const { data: plansData } = await supabase
        .from("workout_plans")
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
        .limit(25);

      setRecentPlans((plansData as unknown as RecentWorkoutPlan[]) || []);
    } catch (err: any) {
      console.error("Error loading workouts page data:", err);
      setError("Failed to load page data.");
    }
  }, [supabase, selectedMemberId]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.gym_id) {
          setGymId(profile.gym_id);
          await loadData(profile.gym_id);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to initialize page.");
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [supabase, loadData]);

  const handleResetForm = () => {
    setEditingPlanId(null);
    setSelectedTemplateId("");
    setPlanName("");
    setExercises([]);
  };

  // ── Handle Template Load ─────────────────────────────
  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    setLoadingTemplate(true);
    setError(null);
    try {
      const templateObj = templates.find(t => t.id === templateId);
      if (templateObj) {
        setPlanName(templateObj.plan_name);
      }

      const { data: templateExs, error: fetchErr } = await supabase
        .from("workout_exercises")
        .select("exercise_name, sets, reps, video_url")
        .eq("plan_id", templateId);

      if (fetchErr) throw fetchErr;

      if (templateExs) {
        setExercises(
          templateExs.map(ex => ({
            id: Math.random().toString(36).substring(7),
            exercise_name: ex.exercise_name,
            sets: ex.sets || "3",
            reps: ex.reps || "10",
            video_url: ex.video_url || null
          }))
        );
      }
    } catch (err: any) {
      console.error("Failed to load template exercises:", err);
      setError("Failed to load exercises from template.");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // ── Edit Assigned Plan ─────────────────────────────
  const handleStartEditAssignedPlan = async (plan: RecentWorkoutPlan) => {
    setEditingPlanId(plan.id);
    setSelectedMemberId(plan.member_id);
    setPlanName(plan.plan_name);
    setSelectedTemplateId("");

    setLoadingTemplate(true);
    setError(null);
    try {
      const { data: fetchedExs, error: fetchErr } = await supabase
        .from("workout_exercises")
        .select("exercise_name, sets, reps, video_url")
        .eq("plan_id", plan.id);

      if (fetchErr) throw fetchErr;

      if (fetchedExs) {
        setExercises(
          fetchedExs.map(ex => ({
            id: Math.random().toString(36).substring(7),
            exercise_name: ex.exercise_name,
            sets: ex.sets || "3",
            reps: ex.reps || "10",
            video_url: ex.video_url || null
          }))
        );
      }
    } catch (err: any) {
      console.error("Error loading assigned plan exercises for edit:", err);
      setError("Failed to load exercises for this assigned plan.");
    } finally {
      setLoadingTemplate(false);
    }

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Delete Assigned Plan ─────────────────────────────
  const handleDeleteAssignedPlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this assigned workout plan?")) return;

    setDeletingId(planId);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Delete associated workout_exercises
      await supabase
        .from("workout_exercises")
        .delete()
        .eq("plan_id", planId);

      // 2. Delete workout_plans
      const { error: delErr } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", planId);

      if (delErr) throw delErr;

      setSuccessMsg("Assigned workout plan deleted!");
      if (editingPlanId === planId) {
        handleResetForm();
      }
      if (gymId) {
        await loadData(gymId);
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Delete assigned plan error:", err);
      setError(err?.message || "Failed to delete plan.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Exercise List Handlers ─────────────────────────────
  const handleAddManualRow = () => {
    setExercises(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        exercise_name: "",
        sets: "3",
        reps: "10"
      }
    ]);
  };

  const handleAddMasterExercise = (masterEx: MasterExercise) => {
    setExercises(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        exercise_name: masterEx.name,
        sets: masterEx.default_sets ? masterEx.default_sets.toString() : "3",
        reps: masterEx.default_reps ? masterEx.default_reps.toString() : "10",
        video_url: masterEx.video_url || null
      }
    ]);
    setIsPickerOpen(false);
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handleExerciseChange = (id: string, field: "exercise_name" | "sets" | "reps", value: string) => {
    setExercises(prev =>
      prev.map(ex => (ex.id === id ? { ...ex, [field]: value } : ex))
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
      setError("Please provide a plan name.");
      return;
    }

    const validExercises = exercises.filter(ex => ex.exercise_name.trim() !== "");
    if (validExercises.length === 0) {
      setError("Please add at least one exercise to the plan.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingPlanId) {
        // UPDATE MODE
        // 1. Update workout_plans (member_id & plan_name)
        const { error: planErr } = await supabase
          .from("workout_plans")
          .update({
            member_id: selectedMemberId,
            plan_name: planName.trim()
          })
          .eq("id", editingPlanId);

        if (planErr) throw planErr;

        // 2. Delete existing exercises
        const { error: delErr } = await supabase
          .from("workout_exercises")
          .delete()
          .eq("plan_id", editingPlanId);

        if (delErr) throw delErr;

        // 3. Insert updated exercises
        const exercisePayload = validExercises.map(ex => {
          const masterEx = globalExercises.find(
            m => m.name.toLowerCase().trim() === ex.exercise_name.toLowerCase().trim()
          );
          return {
            plan_id: editingPlanId,
            exercise_name: ex.exercise_name.trim(),
            sets: ex.sets || "0",
            reps: ex.reps || "0",
            is_completed: false,
            video_url: ex.video_url || masterEx?.video_url || null
          };
        });

        const { error: exErr } = await supabase
          .from("workout_exercises")
          .insert(exercisePayload);

        if (exErr) throw exErr;

        setSuccessMsg("Assigned workout plan updated successfully!");
      } else {
        // CREATE MODE
        const { data: newPlan, error: planErr } = await supabase
          .from("workout_plans")
          .insert({
            member_id: selectedMemberId,
            plan_name: planName.trim(),
            is_template: false
          })
          .select()
          .single();

        if (planErr) throw planErr;

        const exercisePayload = validExercises.map(ex => {
          const masterEx = globalExercises.find(
            m => m.name.toLowerCase().trim() === ex.exercise_name.toLowerCase().trim()
          );
          return {
            plan_id: newPlan.id,
            exercise_name: ex.exercise_name.trim(),
            sets: ex.sets || "0",
            reps: ex.reps || "0",
            is_completed: false,
            video_url: ex.video_url || masterEx?.video_url || null
          };
        });

        const { error: exErr } = await supabase
          .from("workout_exercises")
          .insert(exercisePayload);

        if (exErr) throw exErr;

        // Insert notification record for member
        await supabase.from("notifications").insert({
          member_id: selectedMemberId,
          title: "New Workout Assigned",
          message: `Your trainer assigned a new workout plan: "${planName.trim()}"`,
          is_read: false
        });

        // Trigger background web push notification
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedMemberId,
            title: "New Workout Assigned 🏋️‍♂️",
            message: `Your trainer assigned a new workout plan: "${planName.trim()}"`,
            url: "/workout"
          })
        }).catch((err) => console.error("Web Push send error:", err));

        setSuccessMsg("Workout plan assigned successfully!");
      }

      handleResetForm();
      setTimeout(() => setSuccessMsg(null), 4000);

      if (gymId) {
        await loadData(gymId);
      }
    } catch (err: any) {
      console.error("Assign/Update error:", err);
      setError(err?.message || "Failed to process workout plan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Master categories
  const categories = ["All", ...Array.from(new Set(globalExercises.map(e => e.category))).filter(Boolean)];
  
  const filteredMaster = globalExercises.filter(ex => {
    const matchesCat = pickerCategory === "All" || ex.category === pickerCategory;
    const matchesSearch = ex.name.toLowerCase().includes(pickerSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 pt-2 pb-12">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Dumbbell className="text-blue-500" />
          Assign Workout Plan
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Load reusable templates or build & manage custom workout charts assigned to your members.
        </p>
      </div>

      {/* Alerts */}
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
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ── Workflow Assignment Form (Left / Main Column) ── */}
          <div className="lg:col-span-2 card p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {editingPlanId ? (
                  <>
                    <Edit3 size={18} className="text-blue-400" />
                    <span>Edit Assigned Plan</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-blue-400" />
                    <span>Customize & Assign</span>
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
              
              {/* Step 1: Member Selection & Template Loader */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Member Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User size={13} className="text-blue-400" />
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
                      className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm cursor-pointer"
                    >
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || "Unknown Member"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Template Dropdown (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={13} className="text-blue-400" />
                    2. Load Template (Optional)
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm cursor-pointer"
                  >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => (
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
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Weight Loss - Week 1"
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              {/* Step 3: Editable Exercise List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Plan Exercises ({exercises.length})
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition"
                    >
                      <BookOpen size={13} />
                      <span>From Master Library</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddManualRow}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/[0.08] transition"
                    >
                      <Plus size={13} />
                      <span>Custom</span>
                    </button>
                  </div>
                </div>

                {loadingTemplate ? (
                  <div className="flex justify-center items-center py-8 bg-[#141414] rounded-xl border border-white/[0.04]">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-xs text-white/40">Loading plan exercises...</span>
                  </div>
                ) : exercises.length === 0 ? (
                  <div className="text-center py-8 bg-[#141414] rounded-xl border border-dashed border-white/10 p-6 text-white/30 text-xs">
                    No exercises added yet. Select a template or add from the master library.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {exercises.map((ex, idx) => (
                      <div key={ex.id} className="flex gap-2.5 items-center bg-[#151515] p-2.5 rounded-xl border border-white/[0.04]">
                        
                        <span className="text-xs text-white/30 font-mono w-5 text-center shrink-0">
                          {idx + 1}.
                        </span>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            required
                            value={ex.exercise_name}
                            onChange={(e) => handleExerciseChange(ex.id, "exercise_name", e.target.value)}
                            placeholder="Exercise Name"
                            className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-xs font-medium"
                          />
                        </div>

                        {/* Sets */}
                        <div className="w-16 shrink-0">
                          <input
                            type="text"
                            required
                            value={ex.sets}
                            onChange={(e) => handleExerciseChange(ex.id, "sets", e.target.value)}
                            placeholder="Sets"
                            className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-xs text-center font-medium"
                            title="Sets"
                          />
                        </div>

                        <span className="text-white/20 text-xs shrink-0">×</span>

                        {/* Reps */}
                        <div className="w-16 shrink-0">
                          <input
                            type="text"
                            required
                            value={ex.reps}
                            onChange={(e) => handleExerciseChange(ex.id, "reps", e.target.value)}
                            placeholder="Reps"
                            className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-xs text-center font-medium"
                            title="Reps"
                          />
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(ex.id)}
                          className="text-gray-500 hover:text-red-400 p-1.5 transition-colors shrink-0"
                          title="Remove exercise"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Assignment / Update Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting || members.length === 0 || exercises.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{editingPlanId ? "Updating Plan..." : "Assigning Plan..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{editingPlanId ? "Update Assigned Plan" : "Assign Workout Plan"}</span>
                    </>
                  )}
                </button>

                {editingPlanId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-semibold rounded-xl py-2 text-xs transition"
                  >
                    Assign New Plan Instead
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* ── Recent Section (Right Sidebar) ── */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-blue-400" />
                Recently Assigned
              </h2>
              <span className="text-[10px] font-mono text-white/40">
                {recentPlans.length} Total
              </span>
            </div>

            {recentPlans.length === 0 ? (
              <p className="text-sm text-white/30 italic py-4 text-center">
                No recent member plans assigned
              </p>
            ) : (
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {recentPlans.map(plan => (
                  <div 
                    key={plan.id} 
                    className={`p-3 bg-[#111111] rounded-xl border transition-all space-y-2 ${
                      editingPlanId === plan.id 
                        ? "border-blue-500 ring-1 ring-blue-500/30 bg-blue-500/[0.02]" 
                        : "border-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    
                    {/* Member & Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-[10px] shrink-0">
                          {memberInitial(plan.profiles?.full_name)}
                        </div>
                        <span className="text-xs font-semibold text-white truncate">
                          {plan.profiles?.full_name || "Unknown Member"}
                        </span>
                      </div>

                      {/* Action Icon Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEditAssignedPlan(plan)}
                          className="p-1.5 text-white/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                          title="Edit Assigned Plan"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          onClick={() => handleDeleteAssignedPlan(plan.id)}
                          disabled={deletingId === plan.id}
                          className="p-1.5 text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40"
                          title="Delete Assigned Plan"
                        >
                          {deletingId === plan.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Plan Details */}
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

      {/* ── Global Master Library Selector Modal ── */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#151515]">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <BookOpen size={16} className="text-blue-400" />
                Select from Master Library
              </h3>
              <button 
                onClick={() => setIsPickerOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="p-4 border-b border-white/[0.04] space-y-3 bg-[#131313]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search exercise..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setPickerCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      pickerCategory === cat
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-white/[0.03] text-white/40 hover:bg-white/[0.08]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredMaster.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-xs">
                  No matching master exercises found.
                </div>
              ) : (
                filteredMaster.map(ex => (
                  <div 
                    key={ex.id}
                    onClick={() => handleAddMasterExercise(ex)}
                    className="flex justify-between items-center p-3 rounded-xl bg-[#161616] border border-white/[0.04] hover:border-blue-500/40 hover:bg-[#1a1a1a] transition cursor-pointer group"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white/90 group-hover:text-blue-400 transition-colors">
                        {ex.name}
                      </h4>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        {ex.category} • {ex.default_sets} Sets × {ex.default_reps} Reps
                      </p>
                    </div>

                    <button className="text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/20 transition">
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
