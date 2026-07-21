"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Apple, 
  Flame, 
  Dumbbell, 
  Utensils, 
  Sun, 
  Coffee, 
  Moon, 
  Cookie, 
  CheckCircle2, 
  Sparkles 
} from "lucide-react";

interface DietItem {
  id: string;
  plan_id: string;
  meal_time: string;
  food_item: string;
  calories: number;
  protein: number;
}

interface DietPlan {
  id: string;
  plan_name: string;
}

const MEAL_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  Breakfast: { icon: Coffee, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Breakfast" },
  Lunch: { icon: Sun, color: "text-orange-400 bg-orange-500/10 border-orange-500/20", label: "Lunch" },
  Dinner: { icon: Moon, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", label: "Dinner" },
  Snack: { icon: Cookie, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Snack" },
};

export default function MemberNutritionPage() {
  const supabase = createClient();
  const router = useRouter();

  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [items, setItems] = useState<DietItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNutritionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch user's assigned diet plan (is_template = false or null)
      const { data: planData, error: planErr } = await supabase
        .from("diet_plans")
        .select("id, plan_name, diet_plan_items(*)")
        .eq("member_id", user.id)
        .or("is_template.eq.false,is_template.is.null")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planErr) throw planErr;

      if (planData) {
        setPlan({ id: planData.id, plan_name: planData.plan_name });
        setItems(planData.diet_plan_items || []);
      } else {
        setPlan(null);
        setItems([]);
      }

    } catch (err: any) {
      console.error("Error loading nutrition plan:", err);
      setError(err?.message || "Failed to load nutrition plan.");
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadNutritionData();
  }, [loadNutritionData]);

  const totalCalories = items.reduce((acc, it) => acc + (it.calories || 0), 0);
  const totalProtein = items.reduce((acc, it) => acc + (it.protein || 0), 0);

  const mealTimes = ["Breakfast", "Lunch", "Dinner", "Snack"];

  return (
    <div className="px-5 pt-12 pb-24 max-w-md mx-auto space-y-6">
      
      {/* ── Page Header ── */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
          <Apple size={14} className="text-emerald-400" />
          Nutrition & Meal Plan
        </p>
        <h1 className="text-2xl font-black text-white mt-0.5">Daily Diet Routine</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : !plan || items.length === 0 ? (
        <div className="card p-8 flex flex-col items-center justify-center text-center space-y-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <Utensils size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white/90">No Assigned Diet Plan</h3>
            <p className="text-xs text-white/40 mt-1">
              Your gym trainer has not assigned a personalized nutrition plan yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Plan Title & Macros Card */}
          <div className="card p-5 bg-gradient-to-br from-[#121815] via-[#141d18] to-[#121614] border border-emerald-500/20 rounded-2xl space-y-5 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Assigned Diet
                </span>
                <h2 className="text-xl font-black text-white mt-1.5">{plan.plan_name}</h2>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles size={18} />
              </div>
            </div>

            {/* Target Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-center">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Daily Energy</p>
                <p className="text-xl font-black text-amber-400 mt-0.5 font-mono">
                  {totalCalories} <span className="text-xs font-normal text-white/40">kcal</span>
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 text-center">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Daily Protein</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                  {totalProtein} <span className="text-xs font-normal text-white/40">g</span>
                </p>
              </div>
            </div>
          </div>

          {/* Meals Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-1">
              Meal Schedule
            </h3>

            {mealTimes.map((meal) => {
              const mealItems = items.filter((it) => it.meal_time === meal);
              if (mealItems.length === 0) return null;

              const config = MEAL_CONFIG[meal] || MEAL_CONFIG.Breakfast;
              const IconComp = config.icon;
              const mealCals = mealItems.reduce((a, b) => a + (b.calories || 0), 0);
              const mealProt = mealItems.reduce((a, b) => a + (b.protein || 0), 0);

              return (
                <div 
                  key={meal}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3 hover:border-white/10 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${config.color}`}>
                        <IconComp size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{meal}</h4>
                        <p className="text-[10px] text-white/40">{mealItems.length} items</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-400 block">
                        {mealCals} kcal
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {mealProt}g protein
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-white/[0.04]">
                    {mealItems.map((it) => (
                      <div key={it.id} className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/[0.03]">
                        <span className="text-xs font-semibold text-white/90">
                          {it.food_item}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-white/50">
                          <span>{it.calories} kcal</span>
                          <span>•</span>
                          <span className="text-emerald-400">{it.protein}g P</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
