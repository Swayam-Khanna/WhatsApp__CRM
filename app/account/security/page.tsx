"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Lock, ShieldCheck, Phone, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { GoogleIcon } from "@/components/auth/google-button";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

function SecurityPage() {
  const { user, linkGoogle } = useAuth();
  const [saving, setSaving] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [sentReset, setSentReset] = useState(false);

  const onChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = passwordSchema.safeParse({
      currentPassword: fd.get("currentPassword"),
      password: fd.get("password"),
      confirm: fd.get("confirm"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.password,
        revokeOtherSessions: true,
      });
      setSaving(false);
      if (error) return toast.error(error.message || "Failed to update password");
      toast.success("Password updated successfully");
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err: any) {
      setSaving(false);
      toast.error(err.message || "An unexpected error occurred");
    }
  };

  const sendReset = async () => {
    if (!user?.email) {
      toast.error("No email address associated with this account.");
      return;
    }
    try {
      const { error } = await (authClient as any).forgetPassword({
        email: user.email,
        redirectTo: `${window.location.origin}/auth/login`,
      });
      if (error) return toast.error(error.message || "Failed to send reset link");
      setSentReset(true);
      toast.success("Reset link sent to your email inbox");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    }
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    try {
      await linkGoogle();
      toast.success("Google account linked successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to link Google account");
    } finally {
      setLinkingGoogle(false);
    }
  };

  return (
    <>
      <AccountPageHeader
        title="Security & Logins"
        description="Manage your credentials, linked identities, and password."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Linked Accounts & Identity */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Linked Identities</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign-in methods connected to your Prajnaa account.
          </p>

          <div className="mt-4 space-y-3">
            {/* Phone Number */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3.5 bg-background">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Mobile Phone</div>
                  <div className="text-[11px] text-muted-foreground">
                    {user?.phone || "No phone number linked"}
                  </div>
                </div>
              </div>
              <div>
                {user?.phone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" /> Unlinked
                  </span>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3.5 bg-background">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Email Account</div>
                  <div className="text-[11px] text-muted-foreground">
                    {user?.email || "No email address linked"}
                  </div>
                </div>
              </div>
              <div>
                {user?.email ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" /> Unlinked
                  </span>
                )}
              </div>
            </div>

            {/* Google Account */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 p-3.5 bg-background">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                  <GoogleIcon />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Google Account</div>
                  <div className="text-[11px] text-muted-foreground">
                    {user?.google_id ? "Connected for 1-click login" : "Not connected"}
                  </div>
                </div>
              </div>
              <div>
                {user?.google_id ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    className="font-subhead inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    {linkingGoogle && <Loader2 className="h-3 w-3 animate-spin" />}
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Trouble logging in?</span>
            <button
              onClick={sendReset}
              disabled={sentReset || !user?.email}
              className="font-subhead text-xs text-primary font-semibold hover:underline disabled:opacity-50 cursor-pointer"
            >
              {sentReset ? "Reset email sent" : "Email password reset link"}
            </button>
          </div>
        </section>

        {/* Change Password */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Change Password</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Must be at least 8 characters long.
          </p>

          <form onSubmit={onChange} className="mt-4 grid gap-4">
            <Field label="Current password">
              <input name="currentPassword" type="password" required className="input-prj" />
            </Field>
            <Field label="New password">
              <input name="password" type="password" required minLength={8} className="input-prj" />
            </Field>
            <Field label="Confirm new password">
              <input name="confirm" type="password" required minLength={8} className="input-prj" />
            </Field>
            <button
              disabled={saving}
              className="font-subhead inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer shadow"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default SecurityPage;
