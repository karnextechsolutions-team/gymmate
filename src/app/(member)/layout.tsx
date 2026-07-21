import { BottomNav } from "@/components/ui/Shell";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-28">
      {children}
      <BottomNav />
    </div>
  );
}
