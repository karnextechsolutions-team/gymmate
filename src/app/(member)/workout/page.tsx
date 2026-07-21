"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Dumbbell, 
  Flame, 
  Timer, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Trophy, 
  Check, 
  PlayCircle,
  X,
  Play
} from "lucide-react";

interface Exercise {
  id: string;
  plan_id: string;
  exercise_name: string;
  sets: string;
  reps: string;
  is_completed: boolean;
  video_url?: string | null;
}

interface WorkoutPlan {
  id: string;
  plan_name: string;
}

function formatTimer(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function MemberWorkoutPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Workout Mode State
  const [isActiveWorkout, setIsActiveWorkout] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [isSavingSession, setIsSavingSession] = useState(false);
  
  // Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);

  // Demo Modal State
  const [activeDemo, setActiveDemo] = useState<Exercise | null>(null);

  // ── Fetch Plan & Exercises ─────────────────────────────
  const loadWorkoutData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Fetch user's latest assigned plan (is_template = false or null)
      const { data: planData, error: planErr } = await supabase
        .from("workout_plans")
        .select("id, plan_name, workout_exercises(*)")
        .eq("member_id", user.id)
        .or("is_template.eq.false,is_template.is.null")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planErr) throw planErr;

      if (planData) {
        setPlan({ id: planData.id, plan_name: planData.plan_name });

        // Fallback lookup table across all master exercises by name
        const { data: masterExData } = await supabase
          .from("master_exercises")
          .select("name, video_url");

        const masterMap = new Map<string, string>();
        if (masterExData) {
          for (const mx of masterExData) {
            if (mx.video_url) masterMap.set(mx.name.toLowerCase().trim(), mx.video_url);
          }
        }

        const rawExercises = planData.workout_exercises || [];
        const sorted = [...rawExercises].sort((a, b) => 
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );

        const mappedExercises = sorted.map((ex: any) => ({
          ...ex,
          video_url: ex.video_url || (ex.exercise_name ? masterMap.get(ex.exercise_name.toLowerCase().trim()) : null) || null
        }));

        setExercises(mappedExercises);
      } else {
        setPlan(null);
        setExercises([]);
      }
    } catch (err: any) {
      console.error("Error loading member workout:", err);
      setError(err?.message || "Failed to load workout plan.");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadWorkoutData();
  }, [loadWorkoutData]);

  // ── Stopwatch Timer ─────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActiveWorkout) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActiveWorkout]);

  // ── Toggle Exercise Completion ─────────────────────────────
  const handleToggle = async (exerciseId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, is_completed: newStatus } : ex))
    );

    try {
      const { error: dbErr } = await supabase
        .from("workout_exercises")
        .update({ is_completed: newStatus })
        .eq("id", exerciseId);

      if (dbErr) throw dbErr;
    } catch (err: any) {
      console.error("Failed to update exercise completion status:", err);
      // Revert optimistic update
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, is_completed: currentStatus } : ex))
      );
    }
  };

  const handleStartWorkout = () => {
    setElapsedSeconds(0);
    const firstIncomplete = exercises.findIndex((e) => !e.is_completed);
    setCurrentExIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setIsActiveWorkout(true);
  };

  const handleMarkActiveExerciseDone = async () => {
    const currentEx = exercises[currentExIndex];
    if (currentEx && !currentEx.is_completed) {
      await handleToggle(currentEx.id, false);
    }

    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex((prev) => prev + 1);
    }
  };

  const handleFinishWorkout = async () => {
    setIsSavingSession(true);
    const finalDuration = elapsedSeconds;
    setCompletedDuration(finalDuration);

    try {
      if (userId && plan?.id) {
        const payload = {
          user_id: userId,
          plan_id: plan.id,
          duration_seconds: finalDuration,
        };

        const { error: sessionErr } = await supabase
          .from("workout_sessions")
          .insert(payload);

        if (sessionErr && sessionErr.message.includes("user_id")) {
          await supabase.from("workout_sessions").insert({
            member_id: userId,
            plan_id: plan.id,
            duration_seconds: finalDuration,
          });
        }
      }
    } catch (err: any) {
      console.error("Error logging workout session:", err);
    } finally {
      setIsSavingSession(false);
      setIsActiveWorkout(false);
      setShowCelebration(true);
    }
  };

  const completedCount = exercises.filter((e) => e.is_completed).length;
  const totalCount = exercises.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFinished = totalCount > 0 && completedCount === totalCount;
  const activeEx = exercises[currentExIndex];

  return (
    <div className="px-5 pt-12 pb-4 max-w-md mx-auto space-y-6">
      
      {/* ── Page Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <Flame size={12} className="text-orange-400" />
            Daily Training
          </p>
          <h1 className="text-2xl font-black text-white">Workout Routine</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !plan || exercises.length === 0 ? (
        <div className="card p-8 flex flex-col items-center justify-center text-center space-y-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
            <Dumbbell size={24} className="text-white/30" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">No Active Workout Plan</h3>
            <p className="text-xs text-white/40 mt-1">
              Your gym trainer has not assigned a workout schedule for you yet.
            </p>
          </div>
        </div>
      ) : isActiveWorkout ? (
        /* ── INLINE ACTIVE WORKOUT MODE ── */
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Active Workout
              </p>
              <h2 className="text-base font-black text-white truncate max-w-[150px]">
                {plan.plan_name}
              </h2>
            </div>

            {/* Stopwatch */}
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Timer size={14} className="text-blue-400" />
              <span className="font-mono font-bold text-sm text-blue-300 tracking-wider">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            {/* Exit Active View Button */}
            <button
              onClick={() => setIsActiveWorkout(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              title="Pause/Exit Active Workout"
            >
              <X size={18} />
            </button>
          </div>

          {/* Pagination / Dots */}
          <div className="flex items-center justify-between text-xs font-semibold text-white/40">
            <span>
              Exercise {currentExIndex + 1} of {exercises.length}
            </span>
            <div className="flex gap-1.5">
              {exercises.map((ex, idx) => (
                <button
                  key={ex.id}
                  onClick={() => setCurrentExIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentExIndex
                      ? "w-6 bg-blue-500 shadow-glow"
                      : ex.is_completed
                      ? "w-2 bg-emerald-500"
                      : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Video & Exercise Info */}
          {activeEx && (
            <div className="space-y-4">
              
              {/* Video Player */}
              <div className="w-full aspect-video rounded-2xl bg-black/60 border border-white/10 overflow-hidden shadow-2xl relative">
                {activeEx.video_url ? (
                  <video
                    src={activeEx.video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                    <Dumbbell size={36} className="opacity-40" />
                    <p className="text-xs">No video demonstration available</p>
                  </div>
                )}

                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  {activeEx.is_completed ? "✓ Completed" : "In Progress"}
                </div>
              </div>

              {/* Title & Sets/Reps */}
              <div className="text-center space-y-3">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeEx.exercise_name}
                </h2>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                  <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">
                      Target Sets
                    </p>
                    <p className="text-xl font-black text-blue-400">
                      {activeEx.sets}
                    </p>
                  </div>

                  <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-0.5">
                      Target Reps
                    </p>
                    <p className="text-xl font-black text-blue-400">
                      {activeEx.reps}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Action Controls */}
          <div className="space-y-3 pt-2">
            
            <div className="flex gap-2.5">
              <button
                disabled={currentExIndex === 0}
                onClick={() => setCurrentExIndex((prev) => Math.max(0, prev - 1))}
                className="p-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.1] disabled:opacity-30 transition cursor-pointer"
                title="Previous Exercise"
              >
                <ChevronLeft size={18} />
              </button>

              {activeEx && !activeEx.is_completed ? (
                <button
                  onClick={handleMarkActiveExerciseDone}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-glow transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <CheckCircle2 size={18} />
                  <span>
                    {currentExIndex === exercises.length - 1 ? "Mark as Done" : "Mark as Done & Next"}
                  </span>
                </button>
              ) : currentExIndex < exercises.length - 1 ? (
                <button
                  onClick={() => setCurrentExIndex((prev) => prev + 1)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-glow transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span>Next Exercise</span>
                  <ChevronRight size={18} />
                </button>
              ) : null}

              <button
                disabled={currentExIndex === exercises.length - 1}
                onClick={() => setCurrentExIndex((prev) => Math.min(exercises.length - 1, prev + 1))}
                className="p-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.1] disabled:opacity-30 transition cursor-pointer"
                title="Next Exercise"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Finish & Log Workout Button (Only visible on last exercise or when all exercises completed) */}
            {(currentExIndex === exercises.length - 1 || isFinished) && (
              <button
                onClick={handleFinishWorkout}
                disabled={isSavingSession}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {isSavingSession ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Trophy size={16} />
                    <span>Finish & Log Workout</span>
                  </>
                )}
              </button>
            )}

          </div>

        </div>
      ) : (
        /* ── OVERVIEW ROUTINE VIEW ── */
        <div className="card p-5 space-y-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl relative overflow-hidden">
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">
                Assigned Routine
              </p>
              <h3 className="text-lg font-black text-white">{plan.plan_name}</h3>
            </div>

            {isFinished ? (
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">
                <Trophy size={10} />
                <span>Completed</span>
              </div>
            ) : (
              <button
                onClick={handleStartWorkout}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-glow transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play size={14} className="fill-white" />
                <span>Start Workout</span>
              </button>
            )}
          </div>

          {/* Exercise List */}
          <div className="space-y-2 pt-1">
            {exercises.map((ex) => (
              <div
                key={ex.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 select-none ${
                  ex.is_completed
                    ? "bg-emerald-500/5 border-emerald-500/25 text-white/50"
                    : "bg-white/[0.01] border-white/[0.04] text-white hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(ex.id, ex.is_completed)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      ex.is_completed
                        ? "bg-emerald-500 border-emerald-500 text-black"
                        : "border-white/30"
                    }`}
                  >
                    {ex.is_completed && <Check size={12} strokeWidth={3} />}
                  </button>

                  <div className="flex items-center gap-2">
                    <span 
                      className={`text-sm font-semibold transition-all cursor-pointer ${ex.is_completed ? "line-through text-white/30" : ""}`}
                      onClick={() => handleToggle(ex.id, ex.is_completed)}
                    >
                      {ex.exercise_name}
                    </span>

                    {ex.video_url && (
                      <button 
                        onClick={() => setActiveDemo(ex)} 
                        className="text-blue-400/80 hover:text-blue-300 transition-colors p-1"
                        title="View Video Demo"
                      >
                        <PlayCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                  ex.is_completed 
                    ? "bg-emerald-500/10 text-emerald-400/80" 
                    : "bg-white/[0.03] text-white/50"
                }`}>
                  {ex.sets} Sets × {ex.reps} Reps
                </div>
              </div>
            ))}
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div className="pt-2 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-white/40">
                <span>Progress</span>
                <span>
                  {completedCount} of {totalCount} exercises ({progressPercent}%)
                </span>
              </div>

              <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                ></div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Standalone Demo Modal */}
      {activeDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="relative">
              <button 
                onClick={() => setActiveDemo(null)}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors backdrop-blur-md"
              >
                <X size={18} />
              </button>

              <div className="w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video 
                  src={activeDemo.video_url!} 
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="p-6 pt-5">
              <h3 className="text-xl font-bold text-white">{activeDemo.exercise_name}</h3>
              <div className="flex gap-4 mt-4">
                 <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-center">
                   <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Sets</p>
                   <p className="text-2xl font-semibold text-white">{activeDemo.sets}</p>
                 </div>
                 <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-center">
                   <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mb-1">Reps</p>
                   <p className="text-2xl font-semibold text-white">{activeDemo.reps}</p>
                 </div>
              </div>
              <button 
                onClick={() => setActiveDemo(null)}
                className="w-full mt-6 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
              >
                Close Demo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Completed Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121216] border border-emerald-500/30 rounded-3xl w-full max-w-sm overflow-hidden p-6 text-center space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] relative">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-glow">
              <Trophy size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Workout Completed! 🎉</h2>
              <p className="text-xs text-white/50">
                Great job crushing your session today! Your progress has been logged.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex justify-around">
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Duration</p>
                <p className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  {formatTimer(completedDuration)}
                </p>
              </div>
              <div className="w-[1px] bg-white/10"></div>
              <div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Exercises</p>
                <p className="text-lg font-black text-blue-400 mt-0.5">
                  {completedCount}/{totalCount}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCelebration(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3.5 rounded-xl transition-all shadow-glow text-sm cursor-pointer"
            >
              Back to Routine
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
