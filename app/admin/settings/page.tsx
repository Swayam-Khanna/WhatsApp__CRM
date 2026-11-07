"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Shield,
  ShieldOff,
  UserPlus,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AdminRoleLevel } from "@/lib/admin/use-admin";
import { adminFetch } from "@/lib/api/admin-auth.client";
import {
  PAYMENT_GATEWAYS_CONFIG,
  RESTRICTED_GATEWAYS,
  COD_FLAT_FEE,
  isGatewayEnabled,
} from "@/config/payment-gateways";

function AdminSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [roleLevel, setRoleLevel] = useState<AdminRoleLevel>("super_admin");
  const [busy, setBusy] = useState(false);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admin-list"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load admins");
      return (json.data as { user_id: string; email: string; created_at: string }[]) ?? [];
    },
  });

  const promote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: roleLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not promote user");

      toast.success(`${email} promoted to admin (${roleLevel.replace(/_/g, " ").toUpperCase()})`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admin-list"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not promote");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (uid: string, em: string) => {
    if (uid === user?.id && !confirm("You are about to remove your own admin access. Continue?"))
      return;
    if (!confirm(`Remove admin access from ${em}?`)) return;
    try {
      const res = await adminFetch(`/api/admin/users?user_id=${encodeURIComponent(uid)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke admin");

      toast.success("Admin removed");
      qc.invalidateQueries({ queryKey: ["admin-list"] });
      qc.invalidateQueries({ queryKey: ["is-admin"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke admin");
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-fade-up">
      <div>
        <h2 className="font-display text-3xl font-semibold text-[#0F3D2E]">Admin & Roles Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage platform administrators and assign role-based access levels (Super Admin, Ops, Support, Content).
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6 space-y-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Invite & Assign Admin Role</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The user must have signed up at least once. Enter their registered email and select an access role.
          </p>
        </div>

        <form onSubmit={promote} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              className="font-subhead h-11 flex-1 min-w-64 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <select
              value={roleLevel}
              onChange={(e) => setRoleLevel(e.target.value as AdminRoleLevel)}
              className="font-subhead h-11 rounded-full border border-border bg-background px-4 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="super_admin">Super Admin (Full Access)</option>
              <option value="ops">Ops (Marketplace Operations)</option>
              <option value="support">Support-only (Orders & Reviews)</option>
              <option value="content">Content-only (Products & Journal)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="font-subhead inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Grant Admin Role Access
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Active Admin Users ({admins.length})</h3>
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : admins.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No admins configured.</p>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((a) => (
              <li
                key={a.user_id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{a.email}</p>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20">
                      Super Admin
                    </span>
                  </div>
                  <p className="font-subhead text-[11px] text-muted-foreground mt-0.5">
                    Admin since {new Date(a.created_at).toLocaleDateString()}
                    {a.user_id === user?.id && " · You"}
                  </p>
                </div>
                <button
                  onClick={() => revoke(a.user_id, a.email)}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <ShieldOff className="h-3.5 w-3.5" /> Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PAYMENT GATEWAY MANAGEMENT & LIVE STATUS */}
      <div className="rounded-2xl border border-border bg-background p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Payment Gateways & Policy Status
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current platform transaction switches and backend enforcement state.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono bg-secondary px-2.5 py-1 rounded-full border border-border text-muted-foreground">
            Single Source: frontend/config/payment-gateways.ts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* WhatsApp Status */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">WhatsApp Direct Order</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Instant click-to-chat order routing. No gateway surcharge.
            </p>
          </div>

          {/* COD Status */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">Cash on Delivery (COD)</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> ACTIVE
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Doorstep cash settlement. Handling fee configured at <strong>₹{COD_FLAT_FEE}</strong>.
            </p>
          </div>

          {/* Razorpay Status */}
          <div className={`rounded-xl border p-4 space-y-2 ${
            isGatewayEnabled("razorpay")
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-amber-200 bg-amber-50/40"
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">Razorpay (Cards / UPI)</span>
              {isGatewayEnabled("razorpay") ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" /> DISABLED (HTTP 403)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isGatewayEnabled("razorpay")
                ? "Online payments active via Razorpay SDK."
                : "Disabled by administrator. All backend creation requests reject with HTTP 403."}
            </p>
          </div>

          {/* Cashfree Status */}
          <div className={`rounded-xl border p-4 space-y-2 ${
            isGatewayEnabled("cashfree")
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-amber-200 bg-amber-50/40"
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">Cashfree PG</span>
              {isGatewayEnabled("cashfree") ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> ACTIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" /> DISABLED (HTTP 403)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isGatewayEnabled("cashfree")
                ? "Online payments active via Cashfree PG."
                : "Disabled by administrator. All backend creation requests reject with HTTP 403."}
            </p>
          </div>
        </div>

        {/* How to re-enable guide */}
        <div className="rounded-xl bg-secondary/50 p-4 text-xs space-y-2 border border-border">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-primary" /> How to re-enable Razorpay or Cashfree
          </p>
          <p className="text-muted-foreground leading-relaxed">
            There is no timer or auto-expiration. To re-enable any gateway, update the flag in{" "}
            <code className="font-mono bg-background px-1.5 py-0.5 rounded border border-border text-primary font-medium">
              frontend/config/payment-gateways.ts
            </code>{" "}
            (set <code className="font-mono text-emerald-700">enabled: true</code>) or set the environment variable{" "}
            <code className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">
              NEXT_PUBLIC_ENABLE_RAZORPAY=true
            </code>{" "}
            /{" "}
            <code className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">
              NEXT_PUBLIC_ENABLE_CASHFREE=true
            </code>
            .
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 text-xs space-y-2">
        <p className="font-display text-sm font-bold text-foreground">Role Permission Structure</p>
        <ul className="space-y-1 text-muted-foreground list-disc pl-5">
          <li><strong>Super Admin</strong>: Unrestricted access across Overview, Farmers, Products, Orders, Customers, Settlements, Banners, Shipping, Reviews, Journal, and Settings.</li>
          <li><strong>Ops</strong>: Access restricted to Overview, Farmers, Products, Orders, Settlements, Shipping, and Live Traffic.</li>
          <li><strong>Support-only</strong>: Access restricted to Overview, Orders, Customers, and Reviews.</li>
          <li><strong>Content-only</strong>: Access restricted to Products, Banners, Journal, and Reviews.</li>
        </ul>
      </div>
    </div>
  );
}

export default AdminSettings;
