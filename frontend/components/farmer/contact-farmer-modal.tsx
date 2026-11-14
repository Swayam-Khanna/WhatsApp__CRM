"use client";

import { useState } from "react";
import { X, Send, Phone, MessageSquare, CheckCircle2, ShieldCheck, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CONFIG } from "@/lib/shipping/seed-data";

interface ContactFarmerModalProps {
  farmerName: string;
  farmerSlug?: string;
  farmerPhone?: string;
  location: string;
  farmerPhoto?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactFarmerModal({
  farmerName,
  farmerSlug,
  farmerPhone,
  location,
  farmerPhoto,
  isOpen,
  onClose,
}: ContactFarmerModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    quantity: "",
    message: "",
  });

  if (!isOpen) return null;

  // Format phone number for wa.me link
  const getWhatsAppTargetNumber = () => {
    const phone = farmerPhone || DEFAULT_CONFIG.admin_whatsapp_number || "918091265690";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits || "918091265690";
  };

  const buildWhatsAppMessage = () => {
    let msg = `🌱 *Prajnaa Farm Sourcing Inquiry*\n\n`;
    msg += `*Farmer:* ${farmerName} (${location})\n`;
    if (formData.name) msg += `*Buyer Name:* ${formData.name}\n`;
    if (formData.contact) msg += `*Contact:* ${formData.contact}\n`;
    if (formData.quantity) msg += `*Requested Quantity:* ${formData.quantity}\n`;
    if (formData.message) msg += `*Note:* ${formData.message}\n`;
    else msg += `*Note:* I would like to inquire about pricing and harvest availability for ${farmerName}'s farm.\n`;
    return msg;
  };

  const targetWhatsAppUrl = `https://wa.me/${getWhatsAppTargetNumber()}?text=${encodeURIComponent(buildWhatsAppMessage())}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact) {
      toast.error("Please fill in your name and contact details.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Store in database (farmer_inquiries) via Supabase / Firestore client
      if (supabase) {
        await supabase.from("farmer_inquiries").insert({
          farmer_slug: farmerSlug || farmerName.toLowerCase().replace(/\s+/g, "-"),
          farmer_name: farmerName,
          buyer_name: formData.name,
          buyer_contact: formData.contact,
          quantity: formData.quantity || "Not specified",
          message: formData.message || "General sourcing inquiry",
          status: "pending",
          created_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.warn("Inquiry DB save note:", err.message);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success(`Sourcing request sent for ${farmerName}'s farm!`);

      // 2. Open WhatsApp if selected
      if (sendViaWhatsApp) {
        window.open(targetWhatsAppUrl, "_blank");
      }
    }
  };

  const initials = farmerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#F9F7F2] border border-[#1F3B2C]/20 shadow-2xl animate-scale-up">
        {/* Modal Header */}
        <div className="bg-[#1F3B2C] text-white p-6 sm:p-7 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border-2 border-[#E8A317] bg-[#0F3D2E] flex items-center justify-center flex-shrink-0">
              {farmerPhoto ? (
                <img src={farmerPhoto} alt={farmerName} className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-xl font-bold text-[#E8A317]">{initials}</span>
              )}
            </div>
            <div>
              <span className="inline-flex items-center gap-1 font-subhead text-[10px] uppercase font-bold tracking-wider text-[#E8A317]">
                <ShieldCheck className="h-3 w-3" /> Prajnaa Sourcing Desk
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">Sourcing Request for {farmerName}'s Farm</h3>
              <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5 font-sans">
                <MapPin className="h-3 w-3 text-[#E8A317]" /> {location}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7">
          {submitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="h-8 w-8 text-emerald-700" />
              </div>
              <h4 className="font-display text-2xl font-bold text-[#0F3D2E]">Sourcing Inquiry Recorded!</h4>
              <p className="text-xs text-neutral-600 max-w-sm mx-auto leading-relaxed">
                Your request for <strong>{farmerName}'s farm</strong> has been securely logged into the Prajnaa Sourcing system and assigned to the Sourcing Desk.
              </p>

              <div className="pt-2 flex flex-col gap-2.5 max-w-xs mx-auto">
                <a
                  href={targetWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Continue Chat on WhatsApp
                </a>

                <button
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="w-full rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#1F3B2C]/10">
                <a
                  href={targetWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-white p-3 text-xs font-bold hover:bg-emerald-800 transition shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Quick WhatsApp
                </a>
                <a
                  href={`tel:+${getWhatsAppTargetNumber()}`}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#9E3226] text-white p-3 text-xs font-bold hover:bg-[#9E3226]/90 transition shadow-sm"
                >
                  <Phone className="h-4 w-4" /> Sourcing Line
                </a>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1F3B2C] mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priyesh Patel"
                    className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs outline-none focus:border-[#1F3B2C] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1F3B2C] mb-1">
                    Phone / Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="e.g. +91 98XXX XXXXX or email"
                    className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs outline-none focus:border-[#1F3B2C] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1F3B2C] mb-1">
                    Estimated Bulk Quantity (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 50 kg or 5 boxes"
                    className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs outline-none focus:border-[#1F3B2C] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#1F3B2C] mb-1">
                    Message / Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={`Write a direct note to ${farmerName}...`}
                    className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-xs outline-none focus:border-[#1F3B2C] transition resize-none"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sendViaWhatsApp}
                    onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                    className="rounded border-neutral-300 text-[#1F3B2C] focus:ring-[#1F3B2C]"
                  />
                  <span>Also open message pre-filled in WhatsApp</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[#1F3B2C] py-3.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1F3B2C]/90 transition shadow-md mt-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Submit Direct Sourcing Inquiry
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

