"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import {
  Clock,
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  LogOut,
  CalendarClock,
} from "lucide-react";
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

function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? 36 : 44;
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0 rounded-full bg-cream-50 ring-1 ring-cream-200 shadow-soft overflow-hidden"
           style={{ width: dim, height: dim }}>
        <Image
          src="/logo.jpeg"
          alt="Pelmo dal 1919"
          fill
          sizes="44px"
          className="object-cover"
          priority
        />
      </div>
      <div className="leading-tight">
        <div className="font-display text-xl text-brand-700">Pelmify</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-brand-400">
          Pelmo · dal 1919
        </div>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen flex items-center justify-center text-brand-500 font-display text-lg">
        Loading…
      </div>
    );
  }

  // ── Kiosk layout for the tablet (employee role) ───────────────────────────
  if (requiredRole === "employee") {
    return (
      <div className="min-h-screen flex flex-col bg-cream-50">
        <header className="bg-white/85 backdrop-blur-md border-b border-cream-200 flex items-center justify-between px-6 py-3 shrink-0">
          <Brand />
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-700 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    );
  }

  const nav = adminNav;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r border-cream-200 bg-white/70 backdrop-blur-md">
        <div className="px-6 py-6 border-b border-cream-200">
          <Brand />
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-brand-600 text-cream-50 shadow-soft"
                    : "text-brand-600 hover:bg-cream-100 hover:text-brand-700"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-cream-200">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-brand-700 truncate">
              {profile.name}
            </div>
            <div className="text-xs text-brand-400 truncate">{profile.email}</div>
            <div className="text-xs mt-1.5">
              <span className="inline-block px-2 py-0.5 rounded-full bg-ochre-400/20 text-ochre-600 uppercase text-[10px] font-semibold tracking-wider">
                {profile.role}
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-brand-500 hover:bg-cream-100 hover:text-brand-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white/85 backdrop-blur-md border-b border-cream-200 flex items-center justify-between px-4 py-2.5">
        <Brand size="sm" />
        <button
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
          className="p-2 text-brand-500 hover:text-brand-700"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-md border-t border-cream-200 grid",
          nav.length === 3 ? "grid-cols-3" : "grid-cols-5"
        )}
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 text-[11px] transition-colors",
                active ? "text-brand-700" : "text-brand-400 hover:text-brand-600"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 pt-16 pb-20 md:pt-0 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
