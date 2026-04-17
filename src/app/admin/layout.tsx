import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredRole="admin">{children}</AppShell>;
}
