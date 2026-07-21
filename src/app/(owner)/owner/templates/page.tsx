"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  PlayCircle, 
  Dumbbell, 
  X, 
  Search, 
  Edit3, 
  Layers,
  RotateCcw,
  Sparkles
} from "lucide-react";

interface MasterExercise {
  id: string;
  name: string;
  category: string;
  default_sets: number;
  default_reps: number;
  video_url?: string;
}

interface SelectedExercise {
  master_id: string;
  name: string;
  sets: string;
  reps: string;
}

interface SavedTemplate {
  id: string;
  plan_name: string;
  created_at: string;
  workout_exercises?: {
    id: string;
    exercise_name: string;
    sets: string;
    reps: string;
  }[];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TemplatesPage() {
  const supabase = createClient();
  const [gymId, setGymId] = useState<string | null>(null);

  // Global Library Data
  const [globalExercises, setGlobalExercises] = useState<MasterExercise[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Saved Templates Data
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);

  // Template Builder / Edit State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Load Global Library & Saved Templates ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Global Master Exercises
      const { data: masterData, error: masterErr } = await supabase
        .from("master_exercises")
        .select("*")
        .order("name", { ascending: true });

      if (masterErr) throw masterErr;
      
      const exercises = masterData || [];
      setGlobalExercises(exercises);

      const uniqueCats = Array.from(new Set(exercises.map(ex => ex.category))).filter(Boolean) as string[];
      setCategories(uniqueCats);
      if (uniqueCats.length > 0 && !activeCategory) setActiveCategory(uniqueCats[0]);

      // 2. Fetch Saved Templates (workout_plans with is_template = true)
      const { data: templatesData, error: tErr } = await supabase
        .from("workout_plans")
        .select(`
          id,
          plan_name,
          created_at,
          workout_exercises (
            id,
            exercise_name,
            sets,
            reps
          )
        `)
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      if (tErr) throw tErr;
      setSavedTemplates((templatesData as unknown as SavedTemplate[]) || []);

    } catch (err: any) {
      console.error("Error loading templates page data:", err);
      setError(err?.message || "Failed to load exercise library & templates.");
    } finally {
      setLoading(false);
    }
  }, [supabase, activeCategory]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
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
        }
        await loadData();
      } catch (err: any) {
        setError("Initialization failed.");
      }
    }
    bootstrap();
  }, [supabase, loadData]);

  // ── Exercise Builder Handlers ─────────────────────────────
  const handleAddExerciseToTemplate = (ex: MasterExercise) => {
    setSelectedExercises(prev => [
      ...prev,
      {
        master_id: ex.id,
        name: ex.name,
        sets: ex.default_sets ? ex.default_sets.toString() : "3",
        reps: ex.default_reps ? ex.default_reps.toString() : "10"
      }
    ]);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateExercise = (index: number, field: "sets" | "reps", value: string) => {
    setSelectedExercises(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleResetForm = () => {
    setEditingTemplateId(null);
    setTemplateName("");
    setSelectedExercises([]);
  };

  // ── Edit Template ─────────────────────────────
  const handleStartEdit = (template: SavedTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.plan_name);

    if (template.workout_exercises && template.workout_exercises.length > 0) {
      setSelectedExercises(
        template.workout_exercises.map(ex => ({
          master_id: ex.id,
          name: ex.exercise_name,
          sets: ex.sets || "3",
          reps: ex.reps || "10"
        }))
      );
    } else {
      setSelectedExercises([]);
    }

    // Scroll to top/builder
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Delete Template ─────────────────────────────
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    setDeletingId(templateId);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Delete associated workout_exercises
      await supabase
        .from("workout_exercises")
        .delete()
        .eq("plan_id", templateId);

      // 2. Delete workout_plans record
      const { error: delErr } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", templateId);

      if (delErr) throw delErr;

      setSuccessMsg("Template deleted successfully!");
      if (editingTemplateId === templateId) {
        handleResetForm();
      }
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Delete template error:", err);
      setError(err?.message || "Failed to delete template.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Save or Update Template ─────────────────────────────
  const handleSaveOrUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!templateName.trim()) {
      setError("Please specify a template name.");
      return;
    }

    if (selectedExercises.length === 0) {
      setError("Please add at least one exercise to the template.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingTemplateId) {
        // UPDATE MODE
        // 1. Update plan name
        const { error: planErr } = await supabase
          .from("workout_plans")
          .update({ plan_name: templateName.trim() })
          .eq("id", editingTemplateId);

        if (planErr) throw planErr;

        // 2. Delete existing exercises
        const { error: delExErr } = await supabase
          .from("workout_exercises")
          .delete()
          .eq("plan_id", editingTemplateId);

        if (delExErr) throw delExErr;

        // 3. Insert new exercises list
        const exercisePayload = selectedExercises.map(ex => {
          const masterEx = globalExercises.find(m => m.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
          return {
            plan_id: editingTemplateId,
            exercise_name: ex.name,
            sets: ex.sets || "0",
            reps: ex.reps || "0",
            is_completed: false,
            video_url: masterEx?.video_url || null
          };
        });

        const { error: insErr } = await supabase
          .from("workout_exercises")
          .insert(exercisePayload);

        if (insErr) throw insErr;

        setSuccessMsg("Workout Template updated successfully!");
      } else {
        // CREATE MODE
        const { data: newPlan, error: planError } = await supabase
          .from("workout_plans")
          .insert({
            plan_name: templateName.trim(),
            is_template: true,
            member_id: null
          })
          .select()
          .single();

        if (planError) throw planError;

        const exercisePayload = selectedExercises.map(ex => {
          const masterEx = globalExercises.find(m => m.name.toLowerCase().trim() === ex.name.toLowerCase().trim());
          return {
            plan_id: newPlan.id,
            exercise_name: ex.name,
            sets: ex.sets || "0",
            reps: ex.reps || "0",
            is_completed: false,
            video_url: masterEx?.video_url || null
          };
        });

        const { error: exError } = await supabase
          .from("workout_exercises")
          .insert(exercisePayload);

        if (exError) throw exError;

        setSuccessMsg("Workout Template saved successfully!");
      }

      handleResetForm();
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);

    } catch (err: any) {
      console.error("Save/Update template error:", err);
      setError(err?.message || "Failed to save template.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExercises = globalExercises
    .filter(ex => ex.category === activeCategory)
    .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-5 pt-4 pb-16">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="text-blue-500" />
          Workout Templates & Library
        </h1>
        <p className="mt-1.5 text-sm text-white/50">
          Browse global master exercises, create reusable workout charts, and manage your gym&apos;s templates.
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
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* ── Top Section: Global Library & Template Builder ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* ── Global Library (Left Side) ── */}
            <div className="lg:col-span-3 card p-0 overflow-hidden flex flex-col h-[720px]">
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Global Library</h2>
                  <p className="text-xs text-white/40 mt-0.5">Select exercises to add to your template</p>
                </div>
              </div>

              {/* Search and Category Tabs */}
              <div className="border-b border-white/[0.04]">
                <div className="px-5 py-3 border-b border-white/[0.04] relative">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#181818] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeCategory === cat 
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                          : "bg-white/[0.03] text-white/40 hover:bg-white/[0.08]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise Gallery */}
              <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 xl:grid-cols-3 gap-4 custom-scrollbar content-start">
                {filteredExercises.length === 0 ? (
                  <div className="col-span-full text-center py-10 text-white/30 text-sm">
                    No exercises in this category.
                  </div>
                ) : (
                  filteredExercises.map(ex => (
                    <div key={ex.id} className="group flex flex-col justify-between bg-[#111111] border border-white/[0.05] rounded-xl hover:border-blue-500/30 transition-all overflow-hidden h-fit">
                      {ex.video_url ? (
                        <video src={ex.video_url} autoPlay loop muted playsInline className="object-cover w-full h-24 rounded-t-md" />
                      ) : (
                        <div className="w-full h-24 bg-white/[0.02] flex items-center justify-center rounded-t-md">
                          <Dumbbell className="text-white/20 w-8 h-8" />
                        </div>
                      )}
                      
                      <div className="p-3 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-sm text-white/90 leading-tight">{ex.name}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium mb-3">
                          <span>{ex.default_sets} Sets</span>
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          <span>{ex.default_reps} Reps</span>
                        </div>

                        <button
                          onClick={() => handleAddExerciseToTemplate(ex)}
                          className="mt-auto w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                        >
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Template Builder / Editor (Right Side) ── */}
            <div className="lg:col-span-2 card p-6 flex flex-col h-[720px]">
              <div className="border-b border-white/[0.06] pb-3 mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {editingTemplateId ? (
                    <>
                      <Edit3 size={18} className="text-blue-400" />
                      <span>Edit Template</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-blue-400" />
                      <span>Template Builder</span>
                    </>
                  )}
                </h2>

                {editingTemplateId && (
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

              <form onSubmit={handleSaveOrUpdateTemplate} className="flex flex-col h-full">
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. 1st Month Weight Loss"
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                <div className="flex-1 overflow-y-auto mb-5 space-y-3 custom-scrollbar pr-1">
                  {selectedExercises.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30 text-sm border-2 border-dashed border-white/10 rounded-xl p-6">
                      <Dumbbell size={24} className="mb-3 opacity-50" />
                      Select exercises from the global library to start building your chart.
                    </div>
                  ) : (
                    selectedExercises.map((ex, idx) => (
                      <div key={idx} className="bg-[#151515] p-3 rounded-xl border border-white/[0.04] flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white/90 truncate">{ex.name}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="text"
                            value={ex.sets}
                            onChange={(e) => handleUpdateExercise(idx, "sets", e.target.value)}
                            className="w-12 bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-1.5 text-white text-center text-xs focus:border-blue-500 outline-none font-medium"
                            title="Sets"
                          />
                          <span className="text-white/30 text-xs">×</span>
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={(e) => handleUpdateExercise(idx, "reps", e.target.value)}
                            className="w-12 bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-1.5 text-white text-center text-xs focus:border-blue-500 outline-none font-medium"
                            title="Reps"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(idx)}
                            className="text-gray-500 hover:text-red-400 p-1.5 transition-colors ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2 mt-auto shrink-0">
                  <button
                    type="submit"
                    disabled={submitting || selectedExercises.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>{editingTemplateId ? "Update Template" : "Save Template"}</span>
                  </button>

                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-semibold rounded-xl py-2 text-xs transition"
                    >
                      Create New Template Instead
                    </button>
                  )}
                </div>

              </form>
            </div>

          </div>

          {/* ── Saved Templates CRUD Section ── */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-blue-400" />
                  Your Saved Templates
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Manage and quickly edit existing gym workout templates.
                </p>
              </div>

              <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                {savedTemplates.length} Templates Saved
              </span>
            </div>

            {savedTemplates.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm border-2 border-dashed border-white/10 rounded-2xl p-6">
                <Layers size={32} className="mx-auto mb-3 opacity-40" />
                No saved templates found. Create your first template using the builder above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedTemplates.map((t) => (
                  <div 
                    key={t.id}
                    className={`bg-[#111111] border rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between ${
                      editingTemplateId === t.id
                        ? "border-blue-500 ring-1 ring-blue-500/30 bg-blue-500/[0.02]"
                        : "border-white/[0.05] hover:border-white/[0.12]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-base text-white/90 truncate">
                          {t.plan_name}
                        </h3>
                        {editingTemplateId === t.id && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                            Editing
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-white/40 mb-3">
                        Created on {fmtDate(t.created_at)}
                      </p>

                      {/* Exercises summary list */}
                      <div className="space-y-1.5 bg-[#161616] p-3 rounded-xl border border-white/[0.03]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">
                          Included Movements ({t.workout_exercises?.length || 0})
                        </p>
                        {t.workout_exercises && t.workout_exercises.length > 0 ? (
                          <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                            {t.workout_exercises.slice(0, 3).map((ex) => (
                              <div key={ex.id} className="flex justify-between items-center text-xs text-white/70">
                                <span className="truncate">{ex.exercise_name}</span>
                                <span className="text-white/40 text-[10px] font-mono shrink-0 ml-2">
                                  {ex.sets}×{ex.reps}
                                </span>
                              </div>
                            ))}
                            {t.workout_exercises.length > 3 && (
                              <p className="text-[10px] text-blue-400 pt-0.5">
                                + {t.workout_exercises.length - 3} more exercises...
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-white/30 italic">No exercises recorded</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleStartEdit(t)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition border border-blue-500/20"
                      >
                        <Edit3 size={14} /> Edit
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition border border-red-500/20 disabled:opacity-40"
                        title="Delete Template"
                      >
                        {deletingId === t.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
