"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Sparkles,
  Eye,
  Search,
  Filter,
  Layers,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  whatsappCrmService,
  BroadcastCampaign,
  PRAJNAA_WHATSAPP_CONFIG,
} from "@/lib/services/whatsappCrmService";

const META_TEMPLATES = [
  {
    id: "prajnaa_harvest_announcement_v1",
    name: "Himalayan Harvest Release",
    category: "MARKETING",
    language: "en, hi",
    status: "APPROVED",
    text: "Namaste {{1}} ji! 🙏 This year's {{2}} harvest from {{3}} is now available for priority pre-order on Prajnaa Market. Hand-sorted and tested for 600+ purity parameters. Tap below to reserve your pack.",
    buttons: ["View Harvest", "Chat on WhatsApp"],
  },
  {
    id: "prajnaa_restock_alert",
    name: "Limited Batch Restock Alert",
    category: "MARKETING",
    language: "en, hi",
    status: "APPROVED",
    text: "Namaste {{1}} ji! Fresh wooden-churned batch of {{2}} has just arrived from our farmer partner {{3}}. Packaging dispatches start in 2–3 working days. Reserve before stock finishes.",
    buttons: ["Order Now", "Ask a Query"],
  },
  {
    id: "prajnaa_festive_offer",
    name: "Mountain Festival Gift Hampers",
    category: "MARKETING",
    language: "en, hi",
    status: "APPROVED",
    text: "Namaste {{1}} ji! Celebrate this season with genuine Himalayan wellness. Prajnaa Gift Boxes featuring Mongra Saffron, Walnuts, and Multi-Flora Honey are now ready with complimentary India Post Speed Post shipping.",
    buttons: ["Explore Gifts"],
  },
];

export default function WhatsAppCrmBroadcastsPage() {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<BroadcastCampaign | null>(null);

  // Form State
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(META_TEMPLATES[0].id);
  const [audienceSegment, setAudienceSegment] = useState<BroadcastCampaign["audienceSegment"]>("repeat_buyers");
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    setCampaigns(whatsappCrmService.getCampaigns());
  }, []);

  const getAudienceCount = (seg: BroadcastCampaign["audienceSegment"]) => {
    switch (seg) {
      case "all_customers":
        return 1420;
      case "repeat_buyers":
        return 384;
      case "high_value":
        return 215;
      case "dry_fruits_buyers":
        return 512;
      case "opted_in":
        return 890;
      default:
        return 350;
    }
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    const tpl = META_TEMPLATES.find((t) => t.id === selectedTemplate) || META_TEMPLATES[0];
    const audienceCount = getAudienceCount(audienceSegment);

    const created = whatsappCrmService.createCampaign({
      name: campaignName.trim(),
      templateName: tpl.id,
      audienceSegment,
      audienceCount,
      status: scheduleTime ? "scheduled" : "sending",
      scheduledFor: scheduleTime ? scheduleTime : undefined,
      previewMessage: tpl.text.replace("{{1}}", "Valued Customer").replace("{{2}}", "Himalayan Dried Apricots").replace("{{3}}", "Ladakh"),
      tags: ["Broadcasting", "Meta Approved"],
    });

    setCampaigns(whatsappCrmService.getCampaigns());
    setIsNewModalOpen(false);
    setCampaignName("");
    setScheduleTime("");
    toast.success(`Broadcast campaign '${created.name}' launched to ${audienceCount} customers!`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 space-y-6 bg-background">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              WhatsApp Broadcast Campaigns
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
              Meta Approved Templates
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Send targeted, policy-compliant harvest announcements and restock notifications directly from Prajnaa's official WhatsApp Business number ({PRAJNAA_WHATSAPP_CONFIG.businessNumber}).
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:opacity-90 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> New Broadcast Campaign
        </button>
      </div>

      {/* Aggregate Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-muted-foreground">Total Broadcasts Sent</span>
          <p className="font-display text-2xl font-bold text-foreground">1,804</p>
          <span className="text-[10px] text-emerald-600 font-medium">98.4% Delivery Success</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-muted-foreground">Read Rate (Open Rate)</span>
          <p className="font-display text-2xl font-bold text-foreground">81.6%</p>
          <span className="text-[10px] text-emerald-600 font-medium">Industry standard: 65%</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-muted-foreground">Opted-In Customer Base</span>
          <p className="font-display text-2xl font-bold text-foreground">890</p>
          <span className="text-[10px] text-muted-foreground">Compliant with TRAI / Meta</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-2xs">
          <span className="text-xs text-muted-foreground">Avg. 24h Response Rate</span>
          <p className="font-display text-2xl font-bold text-foreground">34.2%</p>
          <span className="text-[10px] text-emerald-600 font-medium">Direct order conversions</span>
        </div>
      </div>

      {/* Campaigns Listing */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Active & Historic Campaigns</h3>
          <span className="text-xs text-muted-foreground">{campaigns.length} campaigns</span>
        </div>

        <div className="divide-y divide-border">
          {campaigns.map((camp) => (
            <div key={camp.id} className="p-4.5 hover:bg-secondary/40 transition space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground">{camp.name}</h4>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        camp.status === "completed"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : camp.status === "scheduled"
                          ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300"
                          : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {camp.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Segment: <strong className="text-foreground capitalize">{camp.audienceSegment.replace(/_/g, " ")}</strong></span>
                    <span>•</span>
                    <span>Template: <code className="font-mono text-[11px] bg-secondary px-1.5 py-0.5 rounded">{camp.templateName}</code></span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-right">
                    <span className="font-bold text-foreground">{camp.audienceCount} recipients</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {camp.sentAt || camp.scheduledFor || "Immediate"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Sample */}
              <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground border border-border/80">
                <p className="italic font-sans leading-relaxed text-foreground/90">"{camp.previewMessage}"</p>
              </div>

              {/* Analytics bar if sent */}
              {camp.sentCount > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-1 text-[11px] text-muted-foreground">
                  <div>
                    <span className="block text-[10px] uppercase">Sent</span>
                    <strong className="text-foreground">{camp.sentCount}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase">Delivered</span>
                    <strong className="text-emerald-600">{camp.deliveredCount}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase">Read</span>
                    <strong className="text-sky-600">{camp.readCount}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase">Failed</span>
                    <strong className="text-rose-600">{camp.failedCount}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Meta WhatsApp Template Directory */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Meta WhatsApp Approved Templates
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              These pre-approved templates can be sent outside the 24-hour customer window for announcements and updates.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            3 Templates Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {META_TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">{tpl.name}</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {tpl.status}
                </span>
              </div>
              <code className="text-[10px] font-mono text-muted-foreground block">{tpl.id}</code>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                {tpl.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create Broadcast Campaign */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-base text-foreground">
                Create WhatsApp Broadcast Campaign
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Kinnaur Apple First Harvest Priority"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Audience Segment</label>
                <select
                  value={audienceSegment}
                  onChange={(e) => setAudienceSegment(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="repeat_buyers">Repeat Buyers (384 customers)</option>
                  <option value="all_customers">All Past Customers (1,420 customers)</option>
                  <option value="high_value">High-Value Orders &gt; ₹2,000 (215 customers)</option>
                  <option value="dry_fruits_buyers">Dry Fruits & Saffron Buyers (512 customers)</option>
                  <option value="opted_in">Opted-In Promotional Subscribers (890 customers)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Target size: <strong className="text-foreground">{getAudienceCount(audienceSegment)} customers</strong>. Respects customer marketing opt-out preferences.
                </p>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Meta Approved Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {META_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Schedule (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty for immediate send, or e.g. Tomorrow, 10:00 AM"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-secondary text-foreground font-semibold hover:bg-secondary/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 cursor-pointer shadow-2xs"
                >
                  Launch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
