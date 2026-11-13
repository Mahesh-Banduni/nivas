import { DashboardShell } from "@/components/dashboard/shell";
import type { NavItem } from "@/components/dashboard/sidebar-nav";
import { requireRole } from "@/modules/auth/session";

const NAV: NavItem[] = [
  { href: "/owner", label: "Overview", icon: "grid", exact: true },
  { href: "/owner/properties", label: "Listings", icon: "home" },
  { href: "/owner/bookings", label: "Reservations", icon: "calendar" },
  { href: "/owner/calendar", label: "Calendar", icon: "clock" },
  { href: "/owner/earnings", label: "Earnings", icon: "wallet" },
  { href: "/owner/messages", label: "Messages", icon: "message" },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("owner", "/owner");
  return (
    <DashboardShell user={user} nav={NAV} roleLabel="Host workspace" messagesHref="/owner/messages">
      {children}
    </DashboardShell>
  );
}
