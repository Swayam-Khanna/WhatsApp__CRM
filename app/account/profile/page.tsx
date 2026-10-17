"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, X, ShieldCheck, Upload, Phone } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { useAuth } from "@/hooks/use-auth";
import { compressImage } from "@/lib/image-compress";
import { fileToBase64 } from "@/lib/file-to-base64";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { useIsAdmin } from "@/lib/admin/use-admin";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().optional(),
  avatar_url: z.string().trim().or(z.literal("")).optional(),
});

function ProfilePage() {
  const { user, refreshUserProfile } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch("/api/account/profile")
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setProfile(res.data);
          setAvatarUrl(res.data.avatar_url || "");
        }
      })
      .catch((err) => console.error("Error loading profile:", err));
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const compressedFile = await compressImage(file);
      const base64Url = await fileToBase64(compressedFile);

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: base64Url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update avatar");

      setAvatarUrl(base64Url);
      if (profile) {
        setProfile({ ...profile, avatar_url: base64Url });
      }
      await refreshUserProfile();
      toast.success("Profile photo uploaded and saved!");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload and save failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove avatar");

      setAvatarUrl("");
      if (profile) {
        setProfile({ ...profile, avatar_url: null });
      }
      await refreshUserProfile();
      toast.success("Profile photo removed!");
    } catch (err: any) {
      toast.error(err?.message ?? "Removal failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      full_name: fd.get("full_name"),
      phone: fd.get("phone") || undefined,
      avatar_url: avatarUrl,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: parsed.data.full_name,
          phone: parsed.data.phone || null,
          avatar_url: parsed.data.avatar_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");

      const updatedProfile = data.data as Profile;
      setProfile(updatedProfile);
      setAvatarUrl(updatedProfile?.avatar_url || "");
      await refreshUserProfile();
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AccountPageHeader title="Login & profile" description="How we address and contact you." />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-full bg-primary/15 font-display text-2xl font-semibold text-primary"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              (profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-semibold">
                {profile?.full_name || "Add your name"}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  Administrator
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[#0F3D2E] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#154d3b] transition-all cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            <span>Open Admin Dashboard</span>
          </Link>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            required
            className="input-prj"
          />
        </Field>
        <Field label="Email">
          <input value={user?.email ?? ""} disabled className="input-prj opacity-70" />
        </Field>
        <Field label="Phone">
          <div className="flex gap-2">
            <input
              name="phone"
              defaultValue={profile?.phone ?? ""}
              placeholder="+91 98765 43210"
              className="input-prj flex-1"
            />
            <button
              type="button"
              onClick={() => setShowPhoneModal(true)}
              className="font-subhead inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-secondary px-5 text-xs font-medium text-foreground transition-all hover:bg-secondary/80 disabled:opacity-60 cursor-pointer shrink-0"
            >
              Update
            </button>
          </div>
        </Field>
        <Field label="Profile Photo">
          <div className="flex items-center gap-4 mt-1">
            <div className="relative group h-14 w-14 rounded-full border border-border bg-secondary/35 flex items-center justify-center shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-[10px] font-semibold">No Photo</span>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-file-input"
                  disabled={uploadingAvatar}
                />
                <label
                  htmlFor="avatar-file-input"
                  className="font-subhead inline-flex cursor-pointer h-9 items-center justify-center rounded-full border border-border bg-secondary px-4 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Upload photo
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="font-subhead inline-flex h-9 items-center justify-center rounded-full border border-destructive bg-destructive/5 px-4 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">JPG, PNG under 10MB</span>
            </div>
          </div>
        </Field>
        <div className="sm:col-span-2">
          <button
            disabled={saving}
            className="font-subhead inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      </form>

      {showPhoneModal && (
        <PhoneUpdateModal
          currentPhone={profile?.phone || ""}
          onClose={() => setShowPhoneModal(false)}
          onSuccess={(newPhone) => {
            setProfile((prev) => (prev ? { ...prev, phone: newPhone } : null));
            refreshUserProfile();
          }}
        />
      )}
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

function PhoneUpdateModal({
  currentPhone,
  onClose,
  onSuccess,
}: {
  currentPhone: string;
  onClose: () => void;
  onSuccess: (newPhone: string) => void;
}) {
  const [phone, setPhone] = useState(currentPhone);
  const [loading, setLoading] = useState(false);

  const handleSavePhone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formatted = formatPhoneNumber(phone.trim());

    if (!/^\+?[1-9]\d{7,14}$/.test(formatted)) {
      toast.error(
        "Please enter a valid phone number. E.g. 9876543210 (starts with country code or defaults to India +91)"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update phone number");

      toast.success("Phone number updated successfully!");
      onSuccess(formatted);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update phone number");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity duration-200">
      <div className="w-full max-w-sm rounded-2xl bg-background border border-border p-6 shadow-2xl animate-scale-up text-center relative">
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-3 bg-primary/5 rounded-full inline-block text-primary mb-4">
          <Phone className="h-6 w-6" />
        </div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-2">
          Update Phone Number
        </h2>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Provide your primary phone number for delivery updates and contact.
        </p>

        <form onSubmit={handleSavePhone} className="space-y-3">
          <input
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="h-11 w-full rounded-full border border-border bg-background px-5 text-sm outline-none focus:border-primary text-text"
          />
          <button
            disabled={loading}
            className="font-subhead inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
            Save Phone Number
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
