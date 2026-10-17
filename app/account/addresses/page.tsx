"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchPincodeDetails } from "@/lib/api/pincode";

type Address = {
  id: string;
  label: string;
  full_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

const schema = z.object({
  label: z.string().trim().min(1).max(30),
  full_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  postal_code: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(2),
  is_default: z.boolean(),
});

function AddressesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/account/addresses?userId=${encodeURIComponent(user.id)}`);
      const json = await res.json();
      setLoading(false);
      if (!res.ok || json.error) {
        toast.error(json.error || "Failed to load addresses");
        return;
      }
      setItems((json.data ?? []) as Address[]);
    } catch (e: any) {
      setLoading(false);
      toast.error(e.message || "Failed to load addresses");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    if (!user || !confirm("Delete this address?")) return;
    try {
      const res = await fetch(
        `/api/account/addresses?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || json.error) return toast.error(json.error || "Failed to remove address");
      toast.success("Address removed");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove address");
    }
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch("/api/account/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, userId: user.id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) return toast.error(json.error || "Failed to set default");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to set default");
    }
  };

  return (
    <>
      <AccountPageHeader
        title="Addresses"
        description="Saved shipping addresses for faster checkout."
        action={
          <button
            onClick={() => setEditing("new")}
            className="font-subhead inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add address
          </button>
        }
      />

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState onAdd={() => setEditing("new")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => (
            <article key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-primary">
                    {a.label}
                  </p>
                  <p className="font-display mt-1 text-base font-medium">{a.full_name}</p>
                </div>
                {a.is_default && (
                  <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-primary">
                    <Star className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
              <address className="mt-3 text-sm not-italic text-muted-foreground">
                {a.line1}
                {a.line2 && (
                  <>
                    <br />
                    {a.line2}
                  </>
                )}
                <br />
                {a.city}, {a.state} {a.postal_code}
                <br />
                {a.country}
                {a.phone && (
                  <>
                    <br />
                    Phone: {a.phone}
                  </>
                )}
              </address>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setEditing(a)}
                  className="font-subhead inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs uppercase tracking-[0.14em] hover:bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                {!a.is_default && (
                  <button
                    onClick={() => setDefault(a.id)}
                    className="font-subhead inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs uppercase tracking-[0.14em] hover:bg-secondary"
                  >
                    <Star className="h-3.5 w-3.5" /> Set default
                  </button>
                )}
                <button
                  onClick={() => remove(a.id)}
                  className="font-subhead inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs uppercase tracking-[0.14em] text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && user && (
        <AddressDialog
          userId={user.id}
          address={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="font-display text-lg font-semibold">No saved addresses</p>
      <p className="mt-1 text-sm text-muted-foreground">Add one to speed up checkout.</p>
      <button
        onClick={onAdd}
        className="font-subhead mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-xs uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> Add your first address
      </button>
    </div>
  );
}

function AddressDialog({
  userId,
  address,
  onClose,
  onSaved,
}: {
  userId: string;
  address: Address | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState(address?.city ?? "");
  const [state, setState] = useState(address?.state ?? "");
  const [postalCode, setPostalCode] = useState(address?.postal_code ?? "");
  const [detecting, setDetecting] = useState(false);

  const handlePostalCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPostalCode(val);
    const cleanPin = val.trim().replace(/\D/g, "");
    if (cleanPin.length === 6) {
      setDetecting(true);
      try {
        const res = await fetchPincodeDetails(cleanPin);
        if (res.success && res.data) {
          if (res.data.state) setState(res.data.state);
          if (res.data.district) setCity(res.data.district);
        }
      } catch {
        // ignore fallback
      } finally {
        setDetecting(false);
      }
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      label: fd.get("label"),
      full_name: fd.get("full_name"),
      phone: fd.get("phone") || "",
      line1: fd.get("line1"),
      line2: fd.get("line2") || "",
      city: fd.get("city"),
      state: fd.get("state"),
      postal_code: fd.get("postal_code"),
      country: (fd.get("country") as string)?.toUpperCase() || "IN",
      is_default: fd.get("is_default") === "on",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          phone: parsed.data.phone || null,
          line2: parsed.data.line2 || null,
          userId,
          id: address ? address.id : undefined,
        }),
      });
      const json = await res.json();
      setSaving(false);
      if (!res.ok || json.error) return toast.error(json.error || "Failed to save address");
      toast.success(address ? "Address updated" : "Address saved");
      onSaved();
    } catch (e: any) {
      setSaving(false);
      toast.error(e.message || "Failed to save address");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
      >
        {/* Header with Title & Close (X) button */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 shrink-0 bg-background/95">
          <h2 className="font-display text-lg sm:text-xl font-semibold">
            {address ? "Edit address" : "New address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="h-8 w-8 rounded-full border border-border/80 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label">
            <input
              name="label"
              defaultValue={address?.label ?? "Home"}
              required
              className="input-prj"
            />
          </Field>
          <Field label="Full name">
            <input
              name="full_name"
              defaultValue={address?.full_name ?? ""}
              required
              className="input-prj"
            />
          </Field>
          <Field label="Phone">
            <input
              name="phone"
              defaultValue={address?.phone ?? ""}
              placeholder="+91…"
              className="input-prj"
            />
          </Field>
          <Field label="Country (2-letter)">
            <input
              name="country"
              defaultValue={address?.country ?? "IN"}
              maxLength={2}
              required
              className="input-prj uppercase"
            />
          </Field>
          <Field label="Postal code">
            <div className="relative">
              <input
                name="postal_code"
                value={postalCode}
                onChange={handlePostalCodeChange}
                placeholder="6-digit pincode"
                maxLength={6}
                required
                className="input-prj"
              />
              {detecting && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary flex items-center gap-1 font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              )}
            </div>
          </Field>
          <Field label="City">
            <input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="input-prj"
            />
          </Field>
          <Field label="State">
            <input
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
              className="input-prj"
            />
          </Field>
          <Field label="Address line 1" full>
            <input
              name="line1"
              defaultValue={address?.line1 ?? ""}
              required
              className="input-prj"
            />
          </Field>
          <Field label="Address line 2" full>
            <input name="line2" defaultValue={address?.line2 ?? ""} className="input-prj" />
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              name="is_default"
              defaultChecked={address?.is_default ?? false}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm">Make this my default address</span>
          </label>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-5 py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="font-subhead inline-flex h-9 sm:h-10 items-center rounded-full border border-border px-4 text-xs uppercase tracking-[0.14em] hover:bg-secondary cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="font-subhead inline-flex h-9 sm:h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90 disabled:opacity-60 cursor-pointer shadow-xs"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Address
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export default function AddressesPageWrapper() {
  return <AddressesPage />;
}
