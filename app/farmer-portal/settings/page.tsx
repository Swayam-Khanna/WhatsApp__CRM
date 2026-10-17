"use client";

import { useState } from "react";
import {
  Settings,
  Bell,
  CreditCard,
  Eye,
  Globe,
  Save,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import Link from "next/link";

export default function FarmerSettingsPage() {
  const { data: farmer } = useFarmerProfile();

  const [settings, setSettings] = useState({
    smsNewOrder: true,
    whatsappDispatch: true,
    weeklyReport: true,
    autoPayouts: true,
    showAccreditationBadge: true,
    publicProfileVisible: true,
    language: "en",
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings and notification preferences saved successfully");
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Portal & Store Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure order alerts, settlement automation, and public profile visibility.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/farmer-portal/dashboard"
            className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#0F3D2E] px-5 py-2 text-xs font-semibold text-white hover:bg-[#16503e] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Order Notifications & Alerts */}
        <div className="rounded-3xl border border-border/80 bg-background p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="h-10 w-10 rounded-2xl bg-[#0F3D2E]/10 grid place-items-center text-[#0F3D2E]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Order & Dispatch Alerts
              </h3>
              <p className="text-[11px] text-muted-foreground">Manage notifications for incoming purchases.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-semibold text-foreground">SMS Order Notifications</p>
                <p className="text-muted-foreground text-[11px]">Instant SMS to {farmer?.phone || "+91 98160 12345"}</p>
              </div>
              <input
                type="checkbox"
                checked={settings.smsNewOrder}
                onChange={() => handleToggle("smsNewOrder")}
                className="h-4 w-4 rounded accent-[#0F3D2E] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-semibold text-foreground">WhatsApp Dispatch Reminders</p>
                <p className="text-muted-foreground text-[11px]">Remind when packaging courier is scheduled</p>
              </div>
              <input
                type="checkbox"
                checked={settings.whatsappDispatch}
                onChange={() => handleToggle("whatsappDispatch")}
                className="h-4 w-4 rounded accent-[#0F3D2E] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-semibold text-foreground">Weekly Performance Summary</p>
                <p className="text-muted-foreground text-[11px]">Email sales & harvest analytics digest</p>
              </div>
              <input
                type="checkbox"
                checked={settings.weeklyReport}
                onChange={() => handleToggle("weeklyReport")}
                className="h-4 w-4 rounded accent-[#0F3D2E] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Settlement & Banking */}
        <div className="rounded-3xl border border-border/80 bg-background p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="h-10 w-10 rounded-2xl bg-[#B47A46]/10 grid place-items-center text-[#B47A46]">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Settlement & Payout Preferences
              </h3>
              <p className="text-[11px] text-muted-foreground">Configured bank and settlement cycles.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-2xl bg-secondary/60 p-3.5 border border-border/60 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Bank Account</p>
                <p className="text-[11px] text-muted-foreground">
                  {farmer?.bank_name || "HDFC Bank"} •••• {farmer?.bank_account_number?.slice(-4) || "1098"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Verified
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-semibold text-foreground">Automated Monthly Settlements</p>
                <p className="text-muted-foreground text-[11px]">Auto-transfer between 7th–10th of every month</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPayouts}
                onChange={() => handleToggle("autoPayouts")}
                className="h-4 w-4 rounded accent-[#0F3D2E] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Visibility & Accreditation */}
        <div className="rounded-3xl border border-border/80 bg-background p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="h-10 w-10 rounded-2xl bg-[#0F3D2E]/10 grid place-items-center text-[#0F3D2E]">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Accreditation & Profile Visibility
              </h3>
              <p className="text-[11px] text-muted-foreground">Control how buyers discover your farm.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-semibold text-foreground">Prajnaa Verified Seal on Listings</p>
                <p className="text-muted-foreground text-[11px]">Show certified badge on your product cards</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showAccreditationBadge}
                onChange={() => handleToggle("showAccreditationBadge")}
                className="h-4 w-4 rounded accent-[#0F3D2E] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-semibold text-foreground">Public Farm Story Page</p>
                <p className="text-muted-foreground text-[11px]">Allow customers to read your organic farming story</p>
              </div>
              <input
                type="checkbox"
                checked={settings.publicProfileVisible}
                onChange={() => handleToggle("publicProfileVisible")}
                className="h-4 w-4 rounded accent-[#0F3D2E] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Language & Regional Preferences */}
        <div className="rounded-3xl border border-border/80 bg-background p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="h-10 w-10 rounded-2xl bg-secondary grid place-items-center text-foreground">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Language & Regional Display
              </h3>
              <p className="text-[11px] text-muted-foreground">Select preferred portal language.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, language: "en" }))}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  settings.language === "en"
                    ? "border-[#0F3D2E] bg-[#0F3D2E]/5 font-bold text-[#0F3D2E]"
                    : "border-border/60 hover:bg-secondary/40 text-foreground"
                }`}
              >
                <p className="text-sm">English</p>
                <p className="text-[10px] text-muted-foreground font-normal">Default Dashboard</p>
              </button>

              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, language: "hi" }))}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  settings.language === "hi"
                    ? "border-[#0F3D2E] bg-[#0F3D2E]/5 font-bold text-[#0F3D2E]"
                    : "border-border/60 hover:bg-secondary/40 text-foreground"
                }`}
              >
                <p className="text-sm">हिन्दी (Hindi)</p>
                <p className="text-[10px] text-muted-foreground font-normal">Dashboard in Hindi</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
