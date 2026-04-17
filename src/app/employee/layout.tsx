import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredRole="employee">{children}</AppShell>;
}
