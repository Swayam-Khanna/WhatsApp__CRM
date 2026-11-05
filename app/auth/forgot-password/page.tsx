"use client";

import { useState, Suspense } from "react";
import { Link } from "@/lib/tanstack-compat";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Logo } from "@/components/brand/logo";

const forgotSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown}s before requesting another reset link.`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data.email,
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error("Too many reset requests. Please wait a few minutes before trying again.");
          return;
        }
        // Do not leak user existence on 404
      }

      setSubmitted(true);
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast.success("Password reset instructions sent. Check your inbox!");
    } catch (err: any) {
      console.error("[Password Reset Error]:", err);
      toast.error(err.message || "Failed to send reset link");
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
            Reset Password
          </h1>
          <p className="mt-2 text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Enter your email address and we&apos;ll send you a secure link to reset your account password.
          </p>

          {submitted ? (
            <div className="mt-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-foreground">
                  Check your inbox
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>. Please click the link in the email to set a new password.
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  Didn&apos;t receive it? Check your Spam/Promotions folder or request a new one below.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => {
                    const form = document.getElementById("resend-form") as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  className="font-subhead inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-secondary/50 text-xs font-semibold text-foreground transition-all hover:bg-secondary disabled:opacity-50 cursor-pointer"
                >
                  {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend reset link"}
                </button>
              </div>

              <form id="resend-form" onSubmit={onSubmit} className="hidden">
                <input type="hidden" name="email" value={email} />
              </form>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label className="font-subhead block text-xs font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="font-subhead h-12 w-full rounded-full border border-border bg-background pl-11 pr-5 text-sm outline-none transition-colors focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="font-subhead inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground shadow transition-all hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                Send Reset Link
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-border/60 pt-6 text-center">
            <Link
              to="/auth/login"
              className="font-subhead inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}

export default function ForgotPasswordPage() {
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
      <ForgotPasswordContent />
    </Suspense>
  );
}
