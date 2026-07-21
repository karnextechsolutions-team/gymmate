"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Expanded fields
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [gender, setGender] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (inviteCode.trim().length !== 6) {
      setError("Gym Invite Code must be a 6-digit number.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Query the gyms table to find a gym that matches the provided Invite Code
      const { data: gym, error: gymError } = await supabase
        .from("gyms")
        .select("id, name")
        .eq("invite_code", inviteCode.trim())
        .eq("status", "active")
        .maybeSingle();

      if (gymError || !gym) {
        setError("Invalid Gym Invite Code.");
        setIsLoading(false);
        return;
      }

      // 2. Upload Avatar if provided
      let avatarUrl = "";
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) {
          setError(`Avatar upload failed: ${uploadError.message}`);
          setIsLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrlData.publicUrl;
      }

      // 3. Call supabase.auth.signUp passing metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "member",
            gym_id: gym.id,
            avatar_url: avatarUrl,
            gender: gender,
            phone: contactNumber,
          },
        },
      });


      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      const user = authData?.user;
      if (!user) {
        setError("Failed to create user session in authentication.");
        setIsLoading(false);
        return;
      }

      // 4. Log the user out immediately and redirect to /login with success message
      await supabase.auth.signOut();

      const successMessage = encodeURIComponent(
        "Registration successful! Please log in and wait for your gym owner to approve your account."
      );
      router.push(`/login?message=${successMessage}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during registration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden py-12">
      {/* Background Gradient */}
      <div className="absolute top-0 center w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md bg-transparent z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.5)]">
            <Zap className="w-8 h-8 text-white" fill="white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Hello!</h1>
          <p className="text-gray-400">Register to get started</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Contact Number */}
          <div>
            <input
              type="tel"
              placeholder="Contact Number"
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required
            />
          </div>

          {/* Gender */}
          <div className="relative">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
              required
            >
              <option value="" disabled>Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">Profile Picture (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="6-digit Gym Invite Code"
              className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-center text-lg tracking-widest uppercase"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.replace(/[^0-9]/g, ""))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-4 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>

        {error && (
          <div className="mt-4 text-center">
            <p className="text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center space-x-4">
          <div className="h-[1px] bg-gray-800 flex-1"></div>
          <span className="text-gray-500 text-sm">Or Login with</span>
          <div className="h-[1px] bg-gray-800 flex-1"></div>
        </div>

        {/* Social Buttons Placeholder */}
        <div className="flex justify-center space-x-4 mt-6">
          <button className="w-16 h-12 bg-[#111111] border border-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors text-white font-bold">f</button>
          <button className="w-16 h-12 bg-[#111111] border border-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors text-white font-bold">G</button>
          <button className="w-16 h-12 bg-[#111111] border border-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors text-white font-bold"></button>
        </div>

        <p className="text-center text-gray-400 mt-8 mb-12">
          Already have an account? <Link href="/login" className="text-white font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}