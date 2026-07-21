import Link from "next/link";
import { Zap, Apple, Play, Star, Trophy, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans">
      
      {/* Background Gradients */}
      <div className="absolute top-1/4 left-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute top-1/2 right-[-20%] w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col min-h-screen">
        
        {/* Navigation Bar */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Zap size={20} className="text-white fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight">GymMate</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <Link href="#home" className="hover:text-white transition">Home</Link>
            <Link href="#about" className="hover:text-white transition">About</Link>
            <Link href="#testimonials" className="hover:text-white transition">Testimonials</Link>
            <Link href="#faq" className="hover:text-white transition">FAQ</Link>
          </nav>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/login" className="hidden md:block text-sm font-medium text-white/70 hover:text-white transition">
              Log In
            </Link>
            <Link href="/download" className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-200 transition active:scale-95">
              Download App
            </Link>
          </div>
        </header>

        {/* Main Hero Section */}
        <main className="flex-1 flex items-center py-12 md:py-0">
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-8 items-center">
            
            {/* Left Column: Features List */}
            <div className="flex flex-col gap-16 order-2 md:order-1">
              <div className="flex flex-col gap-8">
                <div className="group cursor-pointer">
                  <p className="text-white font-bold text-2xl lg:text-3xl transition drop-shadow-md">
                    01. Memberships
                  </p>
                </div>
                <div className="group cursor-pointer">
                  <p className="text-white/40 font-medium text-2xl lg:text-3xl transition hover:text-white/70">
                    02. Geo-fenced check-ins
                  </p>
                </div>
                <div className="group cursor-pointer">
                  <p className="text-white/40 font-medium text-2xl lg:text-3xl transition hover:text-white/70">
                    03. Workout tracking & diet plans
                  </p>
                </div>
              </div>

              {/* Bottom Left: Social Proof */}
              <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-2 pr-6 w-fit hover:bg-white/10 transition-colors">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#050505] bg-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">JD</div>
                  <div className="w-10 h-10 rounded-full border-2 border-[#050505] bg-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">AK</div>
                  <div className="w-10 h-10 rounded-full border-2 border-[#050505] bg-green-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">MR</div>
                  <div className="w-10 h-10 rounded-full border-2 border-[#050505] bg-gray-700 flex items-center justify-center text-white shadow-sm">
                    <Users size={16} />
                  </div>
                </div>
                <p className="text-sm font-medium text-white/90 leading-snug">
                  +67K Active Users<br/><span className="text-white/50 text-xs">Worldwide</span>
                </p>
              </div>
            </div>

            {/* Center Column: The Device Mockup */}
            <div className="flex justify-center order-1 md:order-2">
              <div className="relative w-[280px] h-[580px] rounded-[2.5rem] border-[8px] border-gray-800 bg-black overflow-hidden shadow-[0_20px_50px_-12px_rgba(37,99,235,0.3)] transition-all duration-500 md:[transform:perspective(1000px)_rotateY(-15deg)_rotateX(5deg)] hover:[transform:none]">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-20"></div>
                
                {/* App Content */}
                <div className="relative h-full flex flex-col bg-zinc-950">
                  {/* Image Placeholder area */}
                  <div className="h-2/5 w-full bg-gradient-to-br from-blue-900/40 to-black relative border-b border-white/5">
                    <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px]"></div>
                    {/* Mock play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/10">
                        <Play size={24} className="text-white ml-1 fill-current" />
                      </div>
                    </div>
                  </div>
                  
                  {/* App Details */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-2xl font-extrabold leading-tight mb-4 tracking-tight">Anti-Gravity<br/>Conditioning</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="bg-white/10 backdrop-blur-md border border-white/5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide">6 exercises</span>
                      <span className="bg-white/10 backdrop-blur-md border border-white/5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide">45 min</span>
                    </div>
                    
                    <div className="mt-auto space-y-3 pb-4">
                      {/* Fake workout skeleton items */}
                      <div className="h-14 bg-white/5 rounded-2xl border border-white/5 flex items-center px-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 mr-3 shrink-0"></div>
                        <div className="flex-1">
                          <div className="w-1/2 h-2 bg-white/20 rounded-full mb-2"></div>
                          <div className="w-1/3 h-1.5 bg-white/10 rounded-full"></div>
                        </div>
                      </div>
                      <div className="h-14 bg-white/5 rounded-2xl border border-white/5 flex items-center px-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 mr-3 shrink-0"></div>
                        <div className="flex-1">
                          <div className="w-2/3 h-2 bg-white/20 rounded-full mb-2"></div>
                          <div className="w-1/4 h-1.5 bg-white/10 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-gray-900 absolute bottom-0">
                    <div className="h-full w-[65%] bg-blue-600 rounded-r-full shadow-[0_0_15px_rgba(37,99,235,0.8)]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Stats & Badges */}
            <div className="flex flex-col gap-6 order-3 md:order-3">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 transition-colors shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                  <Star size={24} className="fill-current" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">4.9 ★</h4>
                  <p className="text-sm text-white/50 font-medium">User Satisfaction</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 transition-colors shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                  <Trophy size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">95%</h4>
                  <p className="text-sm text-white/50 font-medium">Goal Achievement Rate</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors shadow-lg">
                <p className="text-sm text-white/50 mb-4 uppercase tracking-widest font-bold text-center sm:text-left">Access: Available on</p>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 border border-white/5 hover:bg-white/20 transition cursor-pointer">
                    <Apple size={20} className="fill-current" />
                    <span className="font-semibold text-sm">iOS</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 border border-white/5 hover:bg-white/20 transition cursor-pointer">
                    <Play size={18} className="fill-current" />
                    <span className="font-semibold text-sm">Android</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
