"use client";

import { useState } from "react";
import { Users, Calendar, DollarSign, Activity, Bell } from "lucide-react";

export default function OwnerDashboard() {
  const [activities] = useState([
    { id: 1, user: "Alex Mercer", action: "Checked In (Geo)", time: "10 mins ago", status: "success" },
    { id: 2, user: "Sarah Connor", action: "Membership Renewed", time: "1 hour ago", status: "renew" },
    { id: 3, user: "David Miller", action: "Checked In (Geo)", time: "2 hours ago", status: "success" },
    { id: 4, user: "Emma Watson", action: "Payment Failed", time: "4 hours ago", status: "failed" },
    { id: 5, user: "Marcus Aurelius", action: "New Registration", time: "5 hours ago", status: "new" },
  ]);

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time statistics and activities for your gym.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span>Live System</span>
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Check-ins */}
        <div className="card p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Check-ins</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">24</span>
            <span className="text-xs font-medium text-emerald-400 font-sans">+12% vs yesterday</span>
          </div>
        </div>

        {/* Total Active Members */}
        <div className="card p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Members</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">148</span>
            <span className="text-xs font-medium text-emerald-400 font-sans">+4 new this week</span>
          </div>
        </div>

        {/* Expiring Memberships */}
        <div className="card p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiring (Month)</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">12</span>
            <span className="text-xs font-medium text-amber-400 font-sans">Requires follow-up</span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="card p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly Revenue</span>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">$1,250</span>
            <span className="text-xs font-medium text-emerald-400 font-sans">+8% vs last month</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Recent Activity Log</h2>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {activities.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-white">{log.user}</td>
                    <td className="px-6 py-4 text-sm text-white/80">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-white/40">{log.time}</td>
                    <td className="px-6 py-4 text-sm">
                      {log.status === "success" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Success
                        </span>
                      )}
                      {log.status === "renew" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
                          Renewed
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Failed
                        </span>
                      )}
                      {log.status === "new" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          New Member
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
