import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import { requireRole } from "@/modules/auth/session";

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "grid", exact: true },
  { href: "/admin/moderation", label: "Moderation", icon: "shield" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/payments", label: "Payments", icon: "wallet" },
  { href: "/admin/users", label: "Users", icon: "user" },
  { href: "/admin/reviews", label: "Reviews", icon: "star" },
  { href: "/admin/audit", label: "Audit log", icon: "key" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/admin");
  return (
    <DashboardShell user={user} nav={NAV} roleLabel="Admin console" messagesHref={null}>
      {children}
    </DashboardShell>
  );
}
