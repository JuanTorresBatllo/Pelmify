"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Clock, LayoutDashboard, Users, Calendar, FileText, LogOut, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/planning", label: "Planning", icon: CalendarClock },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

const employeeNav: NavItem[] = [
  { href: "/employee/dashboard", label: "Clock", icon: Clock },
  { href: "/employee/calendar", label: "Calendar", icon: Calendar },
  { href: "/employee/timesheets", label: "Timesheets", icon: FileText },
];

export function AppShell({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: "admin" | "employee";
}) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.replace("/login");
      return;
    }
    if (profile.role !== requiredRole) {
      router.replace(profile.role === "admin" ? "/admin/dashboard" : "/employee/dashboard");
    }
  }, [user, profile, loading, router, requiredRole]);

  if (loading || !profile || profile.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>
    );
  }

  const nav = requiredRole === "admin" ? adminNav : employeeNav;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Pelmify</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-slate-900 truncate">{profile.name}</div>
            <div className="text-xs text-slate-500 truncate">{profile.email}</div>
            <div className="text-xs mt-1">
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold">
                {profile.role}
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold">Pelmify</span>
        </div>
        <button
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
          className="p-2 text-slate-600"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 grid grid-cols-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 text-xs",
                active ? "text-brand-600" : "text-slate-500"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
