"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Utensils, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  X, 
  Sparkles, 
  Flame, 
  Dumbbell, 
  Edit3, 
  BookOpen,
  Apple
} from "lucide-react";

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

interface SavedDietTemplate {
  id: string;
  plan_name: string;
  created_at: string;
  diet_plan_items?: {
    id: string;
    meal_time: string;
    food_item: string;
    calories: number;
    protein: number;
  }[];
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

export default function DietTemplatesPage() {
  const supabase = createClient();

  // Data
  const [masterDiets, setMasterDiets] = useState<MasterDiet[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<SavedDietTemplate[]>([]);

  // Template Builder State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [activeMealTab, setActiveMealTab] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Breakfast");
  const [items, setItems] = useState<EditableDietItem[]>([]);

  // Master Picker Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Fetch Initial Data ─────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // 1. Master Diets
      const { data: masterData, error: masterErr } = await supabase
        .from("master_diets")
        .select("*")
        .order("name", { ascending: true });

      if (masterErr) throw masterErr;
      setMasterDiets(masterData || []);

      // 2. Saved Diet Templates (is_template = true)
      const { data: templatesData, error: tErr } = await supabase
        .from("diet_plans")
        .select(`
          id,
          plan_name,
          created_at,
          diet_plan_items (
            id,
            meal_time,
            food_item,
            calories,
            protein
          )
        `)
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      if (tErr) throw tErr;
      setSavedTemplates((templatesData as unknown as SavedDietTemplate[]) || []);

    } catch (err: any) {
      console.error("Error loading diet templates data:", err);
      setError(err?.message || "Failed to load diet data.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetForm = () => {
    setEditingTemplateId(null);
    setTemplateName("");
    setItems([]);
  };

  // ── Item Builder Handlers ─────────────────────────────
  const handleAddManualItem = (mealTime: "Breakfast" | "Lunch" | "Dinner" | "Snack") => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        meal_time: mealTime,
        food_item: "",
        calories: 100,
        protein: 10
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

  // ── Edit Saved Template ─────────────────────────────
  const handleStartEdit = (template: SavedDietTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.plan_name);

    if (template.diet_plan_items && template.diet_plan_items.length > 0) {
      setItems(
        template.diet_plan_items.map((it) => ({
          id: Math.random().toString(36).substring(7),
          meal_time: (it.meal_time as any) || "Breakfast",
          food_item: it.food_item,
          calories: it.calories || 0,
          protein: it.protein || 0
        }))
      );
    } else {
      setItems([]);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Delete Template ─────────────────────────────
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this diet template?")) return;

    setDeletingId(templateId);
    setError(null);
    setSuccessMsg(null);

    try {
      await supabase.from("diet_plan_items").delete().eq("plan_id", templateId);
      const { error: delErr } = await supabase.from("diet_plans").delete().eq("id", templateId);

      if (delErr) throw delErr;

      setSuccessMsg("Diet template deleted!");
      if (editingTemplateId === templateId) handleResetForm();
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

    const validItems = items.filter((it) => it.food_item.trim() !== "");
    if (validItems.length === 0) {
      setError("Please add at least one food item to the template.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingTemplateId) {
        // UPDATE MODE
        const { error: planErr } = await supabase
          .from("diet_plans")
          .update({ plan_name: templateName.trim() })
          .eq("id", editingTemplateId);

        if (planErr) throw planErr;

        await supabase.from("diet_plan_items").delete().eq("plan_id", editingTemplateId);

        const payload = validItems.map((it) => ({
          plan_id: editingTemplateId,
          meal_time: it.meal_time,
          food_item: it.food_item.trim(),
          calories: Number(it.calories) || 0,
          protein: Number(it.protein) || 0
        }));

        const { error: insErr } = await supabase.from("diet_plan_items").insert(payload);
        if (insErr) throw insErr;

        setSuccessMsg("Diet Template updated successfully!");
      } else {
        // CREATE MODE
        const { data: newPlan, error: planErr } = await supabase
          .from("diet_plans")
          .insert({
            plan_name: templateName.trim(),
            is_template: true,
            member_id: null
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

        setSuccessMsg("Diet Template saved successfully!");
      }

      handleResetForm();
      await loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Save diet template error:", err);
      setError(err?.message || "Failed to save diet template.");
    } finally {
      setSubmitting(false);
    }
  };

  // Macro totals
  const totalCalories = items.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
  const totalProtein = items.reduce((acc, curr) => acc + (Number(curr.protein) || 0), 0);

  const filteredMaster = masterDiets.filter((m) =>
    m.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-5 pt-4 pb-16">
      
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="text-emerald-500" />
          Diet Templates & Nutrition Library
        </h1>
        <p className="mt-1.5 text-sm text-white/50">
          Construct reusable meal plans categorized by meal times (Breakfast, Lunch, Dinner, Snack).
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
        <div className="space-y-10">
          
          {/* ── Main Builder Section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            
            {/* Left: Meal Category & Builder Form */}
            <div className="lg:col-span-3 card p-6 space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">
                    {editingTemplateId ? "Edit Diet Template" : "Build Diet Template"}
                  </h2>
                </div>

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

              <form onSubmit={handleSaveOrUpdateTemplate} className="space-y-6">
                
                {/* Template Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Diet Template Title
                  </label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. High Protein Muscle Gain (2500 kcal)"
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  />
                </div>

                {/* Meal Time Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Meal Categories
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                      >
                        <BookOpen size={13} />
                        <span>Select Master Food</span>
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

                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-white/[0.06] pb-2 overflow-x-auto no-scrollbar">
                    {MEAL_TIMES.map((meal) => {
                      const count = items.filter((it) => it.meal_time === meal).length;
                      return (
                        <button
                          key={meal}
                          type="button"
                          onClick={() => setActiveMealTab(meal)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
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
                </div>

                {/* Items List for Selected Meal */}
                <div className="space-y-3 min-h-[220px]">
                  {items.filter((it) => it.meal_time === activeMealTab).length === 0 ? (
                    <div className="text-center py-10 bg-[#141414] rounded-xl border border-dashed border-white/10 p-6 text-white/30 text-xs flex flex-col items-center justify-center space-y-2">
                      <Apple size={24} className="opacity-40" />
                      <p>No food items added for {activeMealTab} yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsPickerOpen(true)}
                        className="text-emerald-400 text-xs font-bold hover:underline pt-1"
                      >
                        + Pick from Library
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                      {items
                        .filter((it) => it.meal_time === activeMealTab)
                        .map((it) => (
                          <div key={it.id} className="flex gap-2.5 items-center bg-[#151515] p-3 rounded-xl border border-white/[0.04]">
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                required
                                value={it.food_item}
                                onChange={(e) => handleItemChange(it.id, "food_item", e.target.value)}
                                placeholder="Food Item Name"
                                className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-3 py-2 text-white text-xs font-medium focus:border-emerald-500 outline-none"
                              />
                            </div>

                            <div className="w-20 shrink-0">
                              <input
                                type="number"
                                required
                                value={it.calories}
                                onChange={(e) => handleItemChange(it.id, "calories", e.target.value)}
                                placeholder="kcal"
                                className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-2 text-white text-xs text-center font-medium focus:border-emerald-500 outline-none"
                                title="Calories (kcal)"
                              />
                            </div>

                            <div className="w-20 shrink-0">
                              <input
                                type="number"
                                required
                                value={it.protein}
                                onChange={(e) => handleItemChange(it.id, "protein", e.target.value)}
                                placeholder="Protein (g)"
                                className="w-full bg-[#1c1c1c] border border-gray-800 rounded-lg px-2 py-2 text-white text-xs text-center font-medium focus:border-emerald-500 outline-none"
                                title="Protein (g)"
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
                    disabled={submitting || items.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl py-3.5 transition-colors shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    <span>{editingTemplateId ? "Update Diet Template" : "Save Diet Template"}</span>
                  </button>

                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-semibold rounded-xl py-2 text-xs transition"
                    >
                      Create New Diet Template Instead
                    </button>
                  )}
                </div>

              </form>
            </div>

            {/* Right: Macro Summary Card & Overview */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Live Macro Summary Badge */}
              <div className="card p-6 bg-gradient-to-br from-[#121614] to-[#161d19] border border-emerald-500/20 space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Flame size={16} />
                  Total Template Macros
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Total Calories</p>
                    <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{totalCalories} <span className="text-xs font-normal text-white/40">kcal</span></p>
                  </div>

                  <div className="bg-black/30 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Total Protein</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{totalProtein} <span className="text-xs font-normal text-white/40">g</span></p>
                  </div>
                </div>

                <div className="bg-white/[0.03] p-3.5 rounded-xl border border-white/[0.05] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Meal Breakdown ({items.length} items total)
                  </p>
                  {MEAL_TIMES.map((m) => {
                    const mItems = items.filter((it) => it.meal_time === m);
                    const mCals = mItems.reduce((a, b) => a + (Number(b.calories) || 0), 0);
                    return (
                      <div key={m} className="flex justify-between text-xs text-white/70">
                        <span>{m} ({mItems.length})</span>
                        <span className="font-mono text-white/40">{mCals} kcal</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* ── Saved Templates Section ── */}
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Utensils size={18} className="text-emerald-400" />
                  Saved Diet Templates
                </h2>
                <p className="text-xs text-white/40 mt-1">
                  Manage and customize diet master charts created for your gym.
                </p>
              </div>

              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {savedTemplates.length} Saved Templates
              </span>
            </div>

            {savedTemplates.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm border-2 border-dashed border-white/10 rounded-2xl p-6">
                <Utensils size={32} className="mx-auto mb-3 opacity-40" />
                No diet templates found. Create your first diet template using the builder above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedTemplates.map((t) => {
                  const tItems = t.diet_plan_items || [];
                  const tCals = tItems.reduce((a, b) => a + (b.calories || 0), 0);
                  const tProt = tItems.reduce((a, b) => a + (b.protein || 0), 0);

                  return (
                    <div 
                      key={t.id}
                      className={`bg-[#111111] border rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between ${
                        editingTemplateId === t.id
                          ? "border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/[0.02]"
                          : "border-white/[0.05] hover:border-white/[0.12]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-base text-white/90 truncate">
                            {t.plan_name}
                          </h3>
                          {editingTemplateId === t.id && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Editing
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-white/40 mb-3">
                          Created {fmtDate(t.created_at)}
                        </p>

                        <div className="flex gap-2 mb-3">
                          <span className="text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            🔥 {tCals} kcal
                          </span>
                          <span className="text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            💪 {tProt}g Protein
                          </span>
                        </div>

                        <div className="space-y-1 bg-[#161616] p-3 rounded-xl border border-white/[0.03]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">
                            Included Items ({tItems.length})
                          </p>
                          {tItems.length > 0 ? (
                            <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar">
                              {tItems.slice(0, 3).map((it) => (
                                <div key={it.id} className="flex justify-between items-center text-xs text-white/70">
                                  <span className="truncate">{it.food_item}</span>
                                  <span className="text-white/40 text-[10px] font-mono shrink-0 ml-2">
                                    {it.calories}k / {it.protein}g
                                  </span>
                                </div>
                              ))}
                              {tItems.length > 3 && (
                                <p className="text-[10px] text-emerald-400 pt-0.5">
                                  + {tItems.length - 3} more items...
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-white/30 italic">No food items added</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleStartEdit(t)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition border border-emerald-500/20"
                        >
                          <Edit3 size={14} /> Edit
                        </button>

                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          disabled={deletingId === t.id}
                          className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition border border-red-500/20 disabled:opacity-40"
                          title="Delete Diet Template"
                        >
                          {deletingId === t.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Master Library Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col h-[500px]">
            
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
                  placeholder="Search food library..."
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
                      + Add
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
