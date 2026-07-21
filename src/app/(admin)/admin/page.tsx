"use client";

import { useState } from "react";
import { Zap, CheckCircle, Copy, Check } from "lucide-react";

export default function RegisterGymPage() {
  const [gymName, setGymName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generateInviteCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const code = generateInviteCode();

    setTimeout(() => {
      setInviteCode(code);
      setIsSubmitting(false);
    }, 1500);
  };

  const handleCopy = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setGymName("");
    setOwnerName("");
    setOwnerEmail("");
    setPassword("");
    setInviteCode(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-6">
      {/* Centered Register Card */}
      <div className="w-full max-w-md bg-[#111111]/80 border border-gray-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(37,99,235,0.15)] relative overflow-hidden backdrop-blur-sm">
        {/* Glow accent */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[40px] pointer-events-none"></div>
        
        {!inviteCode ? (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Register New Gym</h2>
              <p className="text-gray-400 text-sm mt-1 text-center">Set up a new tenant gym and its owner account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gym Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Iron Gym"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner Email</label>
                <input
                  type="email"
                  required
                  placeholder="owner@example.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#181818] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3.5 transition-all mt-6 shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  "Create Gym & Owner Account"
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Gym Created Successfully!</h2>
            <p className="text-gray-400 text-sm max-w-xs mb-8">
              The gym <span className="text-white font-semibold">"{gymName}"</span> and owner profile for <span className="text-white font-semibold">{ownerName}</span> are now registered.
            </p>

            <div className="w-full bg-[#181818] border border-gray-800 rounded-xl p-5 mb-8 flex flex-col items-center relative group">
              <span className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-medium">Gym Invite Code</span>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold text-blue-400 tracking-widest font-mono">
                  {inviteCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 bg-white/[0.03] border border-white/10 rounded-lg hover:bg-white/[0.08] transition text-gray-400 hover:text-white"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && <span className="text-xs text-emerald-400 mt-2 font-medium">Copied to clipboard!</span>}
            </div>

            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-transparent border border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition text-sm"
            >
              Register Another Gym
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
