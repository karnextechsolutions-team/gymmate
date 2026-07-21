import { AdminShell } from "@/components/ui/AdminShell";
import { LayoutDashboard, Building2, CreditCard, Library, Megaphone } from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { href: "/admin/gyms", label: "Gyms", icon: <Building2 size={16} /> },
  { href: "/admin/plans", label: "SaaS Plans", icon: <CreditCard size={16} /> },
  { href: "/admin/library", label: "Master Library", icon: <Library size={16} /> },
  { href: "/admin/notifications", label: "Broadcasts", icon: <Megaphone size={16} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell nav={NAV} title="Super Admin">{children}</AdminShell>;
}
