"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Book, Plus, CheckCircle2, AlertCircle, Trash2, Video } from "lucide-react";

interface MasterExercise {
  id: string;
  name: string;
  category: string;
  target_muscle?: string;
  default_sets: number;
  default_reps: number;
  video_url?: string;
  created_at: string;
}

export default function AdminLibraryPage() {
  const supabase = createClient();

  // Data
  const [exercises, setExercises] = useState<MasterExercise[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [defaultSets, setDefaultSets] = useState("");
  const [defaultReps, setDefaultReps] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from("master_exercises")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setExercises(data || []);
    } catch (err: any) {
      console.error("Error loading exercises:", err);
      setError(err?.message || "Failed to load global exercise library.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim() || !category.trim() || !defaultSets || !defaultReps) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        category: category.trim(),
        default_sets: parseInt(defaultSets, 10),
        default_reps: parseInt(defaultReps, 10),
      };

      if (videoUrl.trim()) {
        payload.video_url = videoUrl.trim();
      }

      // No gym_id is passed since this is a global table managed by Super Admin
      const { error: insertError } = await supabase
        .from("master_exercises")
        .insert([payload]);

      if (insertError) throw insertError;

      // Reset form
      setName("");
      setCategory("");
      setDefaultSets("");
      setDefaultReps("");
      setVideoUrl("");
      setSuccessMsg("Global exercise added successfully!");
      
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to add exercise.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this global exercise? It may affect existing templates.")) return;
    
    try {
      const { error: delErr } = await supabase
        .from("master_exercises")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      await loadData();
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-5 pt-8">
      
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Book className="text-blue-500 w-8 h-8" />
          Global Master Library
        </h1>
        <p className="mt-2 text-sm text-white/50 max-w-2xl">
          Super Admin management for the global exercise database. These exercises will be available to all gym owners to use in their workout templates.
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* ── Form Section ── */}
          <div className="lg:col-span-1 bg-[#111111]/80 border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white border-b border-white/[0.06] pb-3 mb-5">
              Add Global Exercise
            </h2>

            <form onSubmit={handleAddExercise} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Barbell Squat"
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Category *
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select Category</option>
                  <option value="Legs">Legs</option>
                  <option value="Back">Back</option>
                  <option value="Chest">Chest</option>
                  <option value="Arms">Arms</option>
                  <option value="Shoulders">Shoulders</option>
                  <option value="Core">Core</option>
                  <option value="Cardio">Cardio</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Default Sets *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(e.target.value)}
                    placeholder="3"
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Default Reps *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={defaultReps}
                    onChange={(e) => setDefaultReps(e.target.value)}
                    placeholder="10"
                    className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Video size={14} className="text-blue-400" />
                  MP4 Video URL (Optional)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://.../video.mp4"
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-all mt-4 shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Add to Global Library</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Library List Section ── */}
          <div className="lg:col-span-2 bg-[#111111]/80 border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white border-b border-white/[0.06] pb-3 mb-5">
              Available Global Exercises ({exercises.length})
            </h2>

            {exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mb-4">
                  <Book size={24} className="text-white/20" />
                </div>
                <p className="text-white/40 text-sm">No exercises found. Add your first global exercise!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {exercises.map(exercise => (
                  <div key={exercise.id} className="group p-4 bg-[#181818] rounded-xl border border-white/[0.04] hover:border-blue-500/30 transition-all flex items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                        {exercise.video_url ? <Video size={20} /> : <Book size={20} />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white/90">
                          {exercise.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-white/60">
                            {exercise.category}
                          </span>
                          {exercise.target_muscle && (
                            <span className="text-xs text-white/40">({exercise.target_muscle})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-center shrink-0">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Sets</p>
                        <p className="text-sm text-white/80 font-semibold">{exercise.default_sets}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Reps</p>
                        <p className="text-sm text-white/80 font-semibold">{exercise.default_reps}</p>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(exercise.id)}
                        className="ml-2 p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Exercise"
                      >
                        <Trash2 size={16} />
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
