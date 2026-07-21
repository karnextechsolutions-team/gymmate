import { AdminShell } from "@/components/ui/AdminShell";
import { LayoutDashboard, Users, Dumbbell, Clock, Clipboard, Settings, Book, Utensils, Apple, Bell } from "lucide-react";

const NAV = [
  { href: "/owner/dashboard", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/owner/members", label: "Members", icon: <Users size={16} /> },
  { href: "/owner/workouts", label: "Workouts", icon: <Dumbbell size={16} /> },
  { href: "/owner/templates", label: "Workout Templates", icon: <Book size={16} /> },
  { href: "/owner/diets", label: "Assign Diets", icon: <Apple size={16} /> },
  { href: "/owner/diet-templates", label: "Diet Templates", icon: <Utensils size={16} /> },
  { href: "/owner/notifications", label: "Announcements", icon: <Bell size={16} /> },
  { href: "/owner/attendance", label: "Attendance", icon: <Clock size={16} /> },
  { href: "/owner/plans", label: "Plans & Pricing", icon: <Clipboard size={16} /> },
  { href: "/owner/settings", label: "Settings", icon: <Settings size={16} /> },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell nav={NAV} title="Gym Owner">{children}</AdminShell>;
}
