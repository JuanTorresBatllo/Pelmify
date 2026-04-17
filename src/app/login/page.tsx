"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(profile.role === "admin" ? "/admin/dashboard" : "/employee/dashboard");
    }
  }, [user, profile, loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 mb-3">
            <Image
              src="/logo.jpeg"
              alt="Pelmo dal 1919"
              fill
              sizes="96px"
              priority
              className="object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="font-display text-3xl text-brand-700">Pelmify</h1>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-400 mt-1">
            Pelmo · dal 1919
          </p>
        </div>

        <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-lift p-8 border border-cream-200">
          <h2 className="font-display text-2xl text-brand-700 mb-1">
            {mode === "signin" ? "Welcome back" : "Join the team"}
          </h2>
          <p className="text-sm text-brand-400 mb-6">
            {mode === "signin"
              ? "Sign in to clock in and manage your week."
              : "Create your account to get started."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-brand-600 mb-1">Full name</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-cream-200 px-3 py-2.5 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-brand-600 mb-1">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-cream-200 px-3 py-2.5 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-600 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-cream-200 px-3 py-2.5 focus:outline-none"
              />
            </div>
            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" disabled={submitting} className="w-full" size="lg">
              {submitting ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-brand-400">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-ochre-600 font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-ochre-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-brand-400">
          Crafted for the Pelmo team · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
