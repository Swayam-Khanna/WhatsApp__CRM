"use client";

import { createFileRoute, useNavigate, Link } from "@/lib/tanstack-compat";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, Loader2, Sprout, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFarmerProfile, slugify, farmerKey } from "@/lib/farmer/use-farmer";
import { formatPhoneNumber } from "@/lib/phone-utils";

const quickSignupSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      const formatted = formatPhoneNumber(val);
      return /^\+91[6-9]\d{9}$/.test(formatted);
    }, "Enter a valid 10-digit Indian mobile number (starts with 6-9)"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .optional()
    .or(z.literal("")),
});

function RegisterPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: existing, isLoading: profileLoading } = useFarmerProfile();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill email/phone if user is logged in
  useEffect(() => {
    if (user) {
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone.replace("+91", ""));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.info("Please sign in or create an account to start your seller journey.");
      navigate({ to: "/auth/login", search: { redirect: "/become-a-seller/register" } });
      return;
    }

    const validation = quickSignupSchema.safeParse({
      full_name: fullName,
      phone,
      email: email || undefined,
    });

    if (!validation.success) {
      const errs: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errs[issue.path[0] as string] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const cleanPhone = formatPhoneNumber(phone.trim());
      const payload = {
        user_id: user.id,
        full_name: fullName.trim(),
        phone: cleanPhone,
        email: email.trim() || user.email || null,
        status: "draft" as const,
        slug: slugify(fullName.trim()) + "-" + Math.random().toString(36).slice(2, 6),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("farmer_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (profileError) throw profileError;

      // Assign farmer role
      await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "farmer" })
        .then(
          () => {},
          () => {},
        );

      await qc.invalidateQueries({ queryKey: farmerKey(user.id) });
      toast.success("Welcome to Prajnaa! Your seller account is ready.");
      navigate({ to: "/farmer-portal/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed to create farmer account");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (user && profileLoading)) {
    return (
      <MarketingLayout>
        <div className="container-prj grid place-items-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MarketingLayout>
    );
  }

  // If already registered as a farmer, show clear status card without abrupt redirects
  if (existing) {
    return (
      <MarketingLayout>
        <section className="container-prj py-16 md:py-24">
          <div className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center space-y-5 shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-2xl font-semibold">
                You're Already Registered!
              </h1>
              <p className="text-sm text-muted-foreground">
                Your farmer profile is registered under{" "}
                <strong>{existing.full_name || user?.email || "your account"}</strong>.
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <Link
                to="/farmer-portal/dashboard"
                className="font-subhead inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition shadow-sm"
              >
                Go to Farmer Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/farmer-login"
                className="font-subhead inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-medium hover:bg-secondary transition"
              >
                View Seller Program Info
              </Link>
            </div>
          </div>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <section className="container-prj py-12 md:py-20">
        <div className="mx-auto max-w-xl">
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-semibold text-primary">
              <Sprout className="h-3.5 w-3.5" />
              <span>Phase 1 · Quick Seller Registration</span>
            </div>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">
              Start selling direct to consumers
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Create your seller account in 30 seconds. Complete your farm and KYC details later at
              your own pace inside your farmer dashboard.
            </p>
          </div>

          {/* Quick Signup Form Card */}
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="font-subhead text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar Patel"
                  className={`w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary ${
                    errors.full_name ? "border-destructive focus:border-destructive" : "border-border"
                  }`}
                  required
                />
                {errors.full_name && (
                  <p className="text-xs font-medium text-destructive">{errors.full_name}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="font-subhead text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className={`w-full rounded-2xl border bg-background pl-13 pr-4 py-3 text-sm outline-none transition focus:border-primary ${
                      errors.phone ? "border-destructive focus:border-destructive" : "border-border"
                    }`}
                    required
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs font-medium text-destructive">{errors.phone}</p>
                )}
              </div>

              {/* Email Address (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-subhead text-xs font-semibold text-foreground uppercase tracking-wider block">
                    Email Address
                  </label>
                  <span className="text-[11px] text-muted-foreground">Optional</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className={`w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary ${
                    errors.email ? "border-destructive focus:border-destructive" : "border-border"
                  }`}
                />
                {errors.email && (
                  <p className="text-xs font-medium text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Benefits Checklist */}
              <div className="rounded-2xl bg-secondary/40 border border-border p-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Immediate access to your Farmer Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Fill Farm, KYC & Bank details progressively when ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Direct customer connection with 0% listing fee</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="font-subhead w-full inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Setting up your dashboard...</span>
                  </>
                ) : (
                  <>
                    <span>Create Seller Account & Enter Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {!user && (
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/auth/login" className="font-semibold text-primary hover:underline">
                    Sign in here
                  </Link>
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export default RegisterPage;
