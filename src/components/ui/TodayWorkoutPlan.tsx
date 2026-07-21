"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { 
  Check, 
  Dumbbell, 
  Trophy, 
  PlayCircle, 
  X, 
  Play, 
  Timer, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Flame
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

interface Plan {
  id: string;
  plan_name: string;
}

interface TodayWorkoutPlanProps {
  plan: Plan | null;
  initialExercises: Exercise[];
  userId?: string;
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

export function TodayWorkoutPlan({ plan, initialExercises, userId }: TodayWorkoutPlanProps) {
  const supabase = createClient();
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [error, setError] = useState<string | null>(null);

  // Standalone Demo Modal State
  const [activeDemo, setActiveDemo] = useState<Exercise | null>(null);

  // Active Workout Mode State (Inline rendering)
  const [isActiveWorkout, setIsActiveWorkout] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [isSavingSession, setIsSavingSession] = useState(false);
  
  // Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);

  // Sync initialExercises when prop updates
  useEffect(() => {
    setExercises(initialExercises);
  }, [initialExercises]);

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

  if (!plan) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.06]">
          <Dumbbell size={20} className="text-white/30" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white/80">No Assigned Workout</h3>
          <p className="text-xs text-white/40 mt-1">
            Your trainer hasn&apos;t assigned a workout schedule for you yet.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = exercises.filter((e) => e.is_completed).length;
  const totalCount = exercises.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isFinished = totalCount > 0 && completedCount === totalCount;

  // Toggle single exercise status
  const handleToggle = async (exerciseId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setError(null);

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
      setError("Failed to save progress.");
      setExercises((prev) =>
        prev.map((ex) => (ex.id === exerciseId ? { ...ex, is_completed: currentStatus } : ex))
      );
    }
  };

  // ── Start Active Workout ─────────────────────────────
  const handleStartWorkout = () => {
    setElapsedSeconds(0);
    const firstIncomplete = exercises.findIndex((e) => !e.is_completed);
    setCurrentExIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setIsActiveWorkout(true);
  };

  // ── Action inside Active Workout: Mark Done & Advance ──
  const handleMarkActiveExerciseDone = async () => {
    const currentEx = exercises[currentExIndex];
    if (currentEx && !currentEx.is_completed) {
      await handleToggle(currentEx.id, false);
    }

    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex((prev) => prev + 1);
    }
  };

  // ── Finish & Save Workout ─────────────────────────────
  const handleFinishWorkout = async () => {
    setIsSavingSession(true);
    const finalDuration = elapsedSeconds;
    setCompletedDuration(finalDuration);

    try {
      if (userId && plan.id) {
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

  const activeEx = exercises[currentExIndex];

  // ── INLINE ACTIVE WORKOUT MODE ─────────────────────────────
  if (isActiveWorkout) {
    return (
      <div className="space-y-5 pb-24 animate-in fade-in duration-200">
        
        {/* Top Active Bar */}
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Active Workout
            </p>
            <h2 className="text-base font-black text-white truncate max-w-[170px]">
              {plan.plan_name}
            </h2>
          </div>

          {/* Live Stopwatch Badge */}
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

        {/* Step / Pagination Indicator */}
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

        {/* Active Exercise Details Card */}
        {activeEx && (
          <div className="space-y-4">
            
            {/* Auto-Playing Video Demonstration */}
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

            {/* Exercise Name & Target Stats */}
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

        {/* Controls Bar */}
        <div className="space-y-3 pt-2">
          
          <div className="flex gap-2.5">
            <button
              disabled={currentExIndex === 0}
              onClick={() => setCurrentExIndex((prev) => Math.max(0, prev - 1))}
              className="p-3.5 rounded-xl bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.1] disabled:opacity-30 transition cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>

            {activeEx && !activeEx.is_completed ? (
              <button
                onClick={handleMarkActiveExerciseDone}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl shadow-glow transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <CheckCircle2 size={18} />
                <span>Mark as Done & Next</span>
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
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={handleFinishWorkout}
            disabled={isSavingSession}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black py-3.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
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

        </div>

      </div>
    );
  }

  // ── NORMAL DASHBOARD WORKOUT PLAN CARD ─────────────────────────────
  return (
    <div className="card p-5 space-y-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[30px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <Flame size={12} className="text-orange-400" />
            Today&apos;s Workout Plan
          </p>
          <h3 className="text-lg font-black text-white">{plan.plan_name}</h3>
        </div>
        
        {isFinished ? (
          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">
            <Trophy size={10} />
            <span>Completed</span>
          </div>
        ) : (
          <Link
            href="/workout"
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-glow transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play size={14} className="fill-white" />
            <span>Start Workout</span>
          </Link>
        )}
      </div>

      {/* Error notification */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Checklist items */}
      <div className="space-y-2 pt-1">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 select-none ${
              ex.is_completed
                ? "bg-emerald-500/5 border-emerald-500/25 text-white/50"
                : "bg-white/[0.01] border-white/[0.04] text-white hover:bg-white/[0.03] hover:border-white/[0.08]"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Custom Circular Checkbox */}
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

            <div className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              ex.is_completed 
                ? "bg-emerald-500/10 text-emerald-400/80" 
                : "bg-white/[0.03] text-white/50"
            }`}>
              {ex.sets} Sets × {ex.reps} Reps
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar & Banner */}
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

      {/* Standalone Exercise Demo Modal */}
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
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
