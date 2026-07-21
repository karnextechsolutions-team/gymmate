"use client";

import { useState, useEffect } from "react";
import { MapPin, Locate, Save, Settings as SettingsIcon, ShieldAlert, CheckCircle2, Navigation } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  
  // Geofencing states
  const [ownerGymId, setOwnerGymId] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number>(6.9271);
  const [longitude, setLongitude] = useState<number>(79.8612);
  const [radius, setRadius] = useState<number>(50);

  // UI state variables
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadGymLocation() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          throw new Error("Unable to retrieve authenticated owner session.");
        }

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single();

        if (profileErr || !profile) {
          throw new Error(profileErr?.message || "Failed to fetch owner profile.");
        }

        if (profile.gym_id) {
          setOwnerGymId(profile.gym_id);
          
          const { data: loc, error: locErr } = await supabase
            .from("gym_locations")
            .select("*")
            .eq("gym_id", profile.gym_id)
            .maybeSingle();

          if (locErr) {
            throw locErr;
          }

          if (loc) {
            setLatitude(loc.latitude);
            setLongitude(loc.longitude);
            setRadius(loc.radius_meters || 50);
          } else {
            // If no location saved in DB, attempt to pre-populate using browser geolocation
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLatitude(pos.coords.latitude);
                  setLongitude(pos.coords.longitude);
                },
                (err) => console.log("Using default coordinates on mount:", err)
              );
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading gym location:", err);
        setError(err.message || "Failed to retrieve configuration settings.");
      } finally {
        setIsLoading(false);
      }
    }

    loadGymLocation();
  }, [supabase]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Error: Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setSaveSuccess(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        alert(`Error getting location: ${err.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!ownerGymId) {
      alert("Error: No gym linked to your owner account.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const { error: upsertError } = await supabase
        .from("gym_locations")
        .upsert({
          gym_id: ownerGymId,
          latitude,
          longitude,
          radius_meters: radius,
        });

      if (upsertError) throw upsertError;

      setSaveSuccess(true);
      alert("Location updated successfully!");
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save geofencing details.");
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-sm text-gray-400 gap-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Retrieving geofencing configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-400" />
            <span>Settings</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure checking geofences and gym boundaries.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          <ShieldAlert className="mt-0.5 flex-shrink-0 text-red-400" size={18} />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 flex-shrink-0 text-emerald-400" size={18} />
          <span>Geofencing configurations updated successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Geofence Form */}
        <div className="card p-6 space-y-6 relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300 bg-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Geofencing Coordinates</h2>
          </div>

          <div className="space-y-4">
            {/* Latitude Input */}
            <div className="space-y-2">
              <label htmlFor="latitude" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Latitude
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => {
                  setLatitude(Number(e.target.value));
                  setSaveSuccess(false);
                }}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder="e.g. 6.9271"
              />
            </div>

            {/* Longitude Input */}
            <div className="space-y-2">
              <label htmlFor="longitude" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Longitude
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => {
                  setLongitude(Number(e.target.value));
                  setSaveSuccess(false);
                }}
                className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder="e.g. 79.8612"
              />
            </div>

            {/* Radius Selector */}
            <div className="space-y-2">
              <label htmlFor="radius" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Geofence Radius
              </label>
              <div className="relative">
                <select
                  id="radius"
                  value={radius}
                  onChange={(e) => {
                    setRadius(Number(e.target.value));
                    setSaveSuccess(false);
                  }}
                  className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm appearance-none cursor-pointer"
                >
                  <option value={10}>10 meters (Very strict)</option>
                  <option value={20}>20 meters (Tight)</option>
                  <option value={50}>50 meters (Standard)</option>
                  <option value={100}>100 meters (Wide)</option>
                </select>
                <div className="absolute right-4 top-4 w-2 h-2 border-r-2 border-b-2 border-gray-400 transform rotate-45 pointer-events-none"></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Members must be within this distance to register a valid check-in.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Info */}
        <div className="space-y-6">
          <div className="card p-6 space-y-6 relative overflow-hidden group hover:border-blue-500/20 transition-all duration-300 bg-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div>
              <h2 className="text-lg font-bold text-white">Geofence Actions</h2>
              <p className="text-gray-400 text-xs mt-0.5">Use GPS coordinates to automatically fetch location details.</p>
            </div>

            {/* Live GPS Coordinates Info */}
            <div className="space-y-3 bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl text-xs font-mono text-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-white/40 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-400" /> Current Configured:
                </span>
                <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Active
                </span>
              </div>
              <hr className="border-white/[0.04] my-2" />
              <div className="flex justify-between">
                <span className="text-white/40">Latitude:</span>
                <span className="text-white">{latitude.toFixed(7)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Longitude:</span>
                <span className="text-white">{longitude.toFixed(7)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Check-in Radius:</span>
                <span className="text-white">{radius} meters</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating || isSaving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/[0.08] hover:bg-white/10 text-white py-3 text-sm font-semibold transition disabled:opacity-50"
              >
                <Locate className={`w-4 h-4 text-blue-400 ${isLocating ? "animate-spin" : ""}`} />
                <span>{isLocating ? "Locating GPS..." : "Set Coordinates to My Current GPS"}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLocating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-grad text-white py-3.5 text-sm font-bold shadow-glow hover:brightness-110 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving Settings..." : "Save Geofencing Settings"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
