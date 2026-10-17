"use client";

import { useState, Suspense, useEffect } from "react";
import { Link, useNavigate, useSearch, createFileRoute } from "@/lib/tanstack-compat";
import { toast } from "sonner";
import { z } from "zod";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Logo } from "@/components/brand/logo";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function ResetPasswordContent() {
  const navigate = useNavigate();
  const searchParams = useSearch();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    // Read token from search params or window.location.search
    const queryToken = searchParams.token;
    if (typeof queryToken === "string" && queryToken.trim().length > 0) {
      setToken(queryToken.trim());
    } else if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("token");
      if (t) setToken(t.trim());
    }
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset token. Please request a new password reset link.");
      return;
    }

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: parsed.data.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password. The link may have expired.");
      }

      setCompleted(true);
      toast.success("Password reset successfully! You can now sign in.");
    } catch (err: any) {
      console.error("[Password Reset Error]:", err);
      toast.error(err.message || "Failed to reset password. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      <div className="container-prj grid place-items-center py-16 md:py-24">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-background/80 p-8 shadow-xl backdrop-blur-sm sm:p-10">
          <div className="flex justify-center">
            <Logo />
          </div>

          <h1 className="font-display mt-8 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Set New Password
          </h1>

          {completed ? (
            <div className="mt-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Password Updated
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your account password has been successfully reset. You can now sign in with your new credentials.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/auth/login"
                  className="font-subhead inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow transition-all hover:opacity-95 cursor-pointer"
                >
                  Proceed to Sign In
                </Link>
              </div>
            </div>
          ) : !token ? (
            <div className="mt-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Missing Reset Token
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No valid password reset token was found in the link. Please check your email or request a new reset link.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/auth/forgot-password"
                  className="font-subhead inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow transition-all hover:opacity-95 cursor-pointer"
                >
                  Request New Reset Link
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label className="font-subhead block text-xs font-medium text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="font-subhead h-12 w-full rounded-full border border-border bg-background pl-11 pr-12 text-sm outline-none transition-colors focus:border-primary text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-subhead block text-xs font-medium text-foreground">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="font-subhead h-12 w-full rounded-full border border-border bg-background pl-11 pr-12 text-sm outline-none transition-colors focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="font-subhead inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground shadow transition-all hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                Reset Password
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-border/60 pt-6 text-center">
            <Link
              to="/auth/login"
              className="font-subhead inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <MarketingLayout>
          <div className="container-prj grid place-items-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </MarketingLayout>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});
