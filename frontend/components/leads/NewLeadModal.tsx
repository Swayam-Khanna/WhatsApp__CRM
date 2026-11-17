"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Building2, User, ShoppingBag, ShieldAlert, Sparkles, Calendar, Clock, Tag, Percent } from "lucide-react";
import { leadsService, BusinessModel, LeadPriority } from "@/lib/services/leadsService";
import { toast } from "sonner";
import { SearchableProductSelect } from "@/components/common/SearchableProductSelect";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated?: (lead: any) => void;
  onSuccess?: () => void;
  initialPhone?: string;
  initialName?: string;
  initialEmail?: string;
  existingContacts?: Array<{ id: string; name: string; phone: string; email?: string }>;
  products?: Array<{ id: string; name: string; price: number }>;
  teamMembers?: Array<{ id: string; name: string; role: string }>;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onLeadCreated,
  initialPhone = "",
  initialName = "",
  initialEmail = "",
  onSuccess,
  existingContacts = [],
  products = [
    { id: "organic-almonds", name: "Mamra Almonds (500g)", price: 1250 },
    { id: "turmeric-powder", name: "Stone-Ground Turmeric (250g)", price: 240 },
    { id: "walnuts", name: "Himalayan Mountain Walnuts (250g)", price: 604 },
    { id: "himalayan-dried-apricots", name: "Himalayan Dried Apricots (500g)", price: 999 },
    { id: "pink-himalayan-salt", name: "Pink Himalayan Salt (500g)", price: 180 },
    { id: "raw-honey", name: "Raw Himalayan Flora Honey (Bulk 5kg)", price: 3200 },
  ],
  teamMembers = [
    { id: "agent_nishant", name: "Nishant", role: "Store Admin" },
    { id: "agent_concierge", name: "Prajnaa Concierge", role: "Senior Concierge" },
    { id: "agent_sales1", name: "Rahul Sharma", role: "Sales Agent" },
  ],
}) => {
  const [businessModel, setBusinessModel] = useState<BusinessModel>("b2b_wholesale");
  const [contactMode, setContactMode] = useState<"new" | "existing">("new");
  const [selectedContactId, setSelectedContactId] = useState("");

  // Contact fields
  const [contactName, setContactName] = useState(initialName || "");
  const [contactPhone, setContactPhone] = useState(initialPhone || "");
  const [contactEmail, setContactEmail] = useState(initialEmail || "");
  const [source, setSource] = useState<any>("whatsapp");
  const [priority, setPriority] = useState<LeadPriority>("normal");
  const [ownerId, setOwnerId] = useState("");
  const [estimatedValue, setEstimatedValue] = useState<number | "">("");
  const [nextAction, setNextAction] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");

  // Product items & pricing
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<string>("kg");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [discountedPrice, setDiscountedPrice] = useState<number | "">("");

  // Current product info
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const basePrice = selectedProduct?.price || 0;

  // Effective price per unit (after discount)
  const effectiveUnitPrice = useMemo(() => {
    if (discountedPrice !== "" && Number(discountedPrice) >= 0) {
      return Number(discountedPrice);
    }
    if (discountAmount !== "" && Number(discountAmount) > 0) {
      return Math.max(0, basePrice - Number(discountAmount));
    }
    return basePrice;
  }, [basePrice, discountedPrice, discountAmount]);

  // Automatically calculate Estimated Value
  useEffect(() => {
    const calc = effectiveUnitPrice * (selectedQty || 1);
    setEstimatedValue(calc);
  }, [effectiveUnitPrice, selectedQty]);

  // Set quick reminder shortcut (e.g. In 1 week / 7 days)
  const handleSetQuickReminder = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(10, 0, 0, 0); // 10:00 AM
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setNextFollowUpAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    if (!nextAction.trim()) {
      setNextAction(
        `Upcoming connect with ${contactName || "customer"} (${
          days === 7 ? "in 1 week" : days === 1 ? "tomorrow" : `in ${days} days`
        })`
      );
    }
    toast.success(
      `Reminder scheduled for ${d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    );
  };

  // Wholesale specific
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Retail Shop");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Shimla");
  const [state, setState] = useState("Himachal Pradesh");
  const [postalCode, setPostalCode] = useState("171001");
  const [gstin, setGstin] = useState("");
  const [contactRole, setContactRole] = useState("Proprietor");
  const [expectedQuantity, setExpectedQuantity] = useState("");
  const [expectedFrequency, setExpectedFrequency] = useState("Monthly");
  const [requestedPriceTier, setRequestedPriceTier] = useState("Wholesale Tier 1");
  const [requestedPaymentTerms, setRequestedPaymentTerms] = useState("Prepaid UPI");
  const [requestedCreditLimit, setRequestedCreditLimit] = useState<number | "">("");
  const [requestedCreditPeriod, setRequestedCreditPeriod] = useState<number | "">("");

  // Retail specific
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [checkoutReference, setCheckoutReference] = useState("");
  const [pendingReason, setPendingReason] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleContactSelect = (cId: string) => {
    setSelectedContactId(cId);
    const found = existingContacts.find((c) => c.id === cId);
    if (found) {
      setContactName(found.name);
      setContactPhone(found.phone);
      setContactEmail(found.email || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactPhone || contactPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please provide a valid 10-digit customer mobile number");
      return;
    }

    if (businessModel === "b2b_wholesale" && !businessName.trim()) {
      toast.error("Business / Shop Name is required for wholesale inquiries");
      return;
    }

    if (ownerId && !nextAction.trim()) {
      toast.error("Next Action is required for assigned leads");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProd = products.find((p) => p.id === selectedProductId) || products[0];
      const items = selectedProd
        ? [
            {
              productId: selectedProd.id,
              productName: selectedProd.name,
              quantity: selectedQty,
              unit: selectedUnit,
              indicativeUnitPricePaise: effectiveUnitPrice * 100,
              indicativeTotalPaise: effectiveUnitPrice * selectedQty * 100,
            },
          ]
        : [];

      const assignedOwner = teamMembers.find((m) => m.id === ownerId);

      const payload = {
        businessModel,
        contactName: contactName.trim() || (businessModel === "b2b_wholesale" ? businessName : "Customer"),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim() || undefined,
        source,
        priority,
        ownerId: ownerId || null,
        ownerName: assignedOwner?.name || null,
        estimatedValuePaise: effectiveUnitPrice * selectedQty * 100,
        nextAction: nextAction.trim() || undefined,
        nextFollowUpAt: nextFollowUpAt || undefined,
        notes: notes.trim() || undefined,
        items,
        // Wholesale
        businessName: businessName.trim() || undefined,
        businessType: businessType || undefined,
        addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        gstin: gstin.trim() || undefined,
        expectedQuantity: expectedQuantity.trim() || undefined,
        expectedFrequency: expectedFrequency || undefined,
        requestedPriceTier: requestedPriceTier || undefined,
        requestedPaymentTerms: requestedPaymentTerms || undefined,
        requestedCreditLimitPaise: requestedCreditLimit ? Number(requestedCreditLimit) * 100 : 0,
        requestedCreditPeriodDays: requestedCreditPeriod ? Number(requestedCreditPeriod) : 0,
        // Retail
        deliveryPostalCode: deliveryPostalCode.trim() || undefined,
        checkoutReference: checkoutReference.trim() || undefined,
        pendingReason: pendingReason.trim() || undefined,
      };

      const res = await leadsService.createLead(payload);
      if (res.success && res.lead) {
        toast.success(`Opportunity ${res.lead.reference} created successfully!`);
        if (onLeadCreated) onLeadCreated(res.lead);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Failed to create lead");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl lg:max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">Create New Lead / Enquiry</h3>
              <p className="text-[11px] text-neutral-500">Add sales opportunity to wholesale or retail pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
          {/* 1. Business Model Selector */}
          <div>
            <label className="font-bold text-neutral-700 dark:text-slate-300 block mb-1.5 uppercase text-[10px] tracking-wider">
              Sales Pipeline / Business Model *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBusinessModel("b2b_wholesale")}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  businessModel === "b2b_wholesale"
                    ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 shadow-2xs"
                    : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/50 text-neutral-600 dark:text-slate-400"
                }`}
              >
                <Building2 className={`h-5 w-5 mt-0.5 shrink-0 ${businessModel === "b2b_wholesale" ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-400"}`} />
                <div>
                  <span className="font-bold block text-xs">B2B Wholesale</span>
                  <span className="text-[10px] text-neutral-500 leading-tight block mt-0.5">
                    Shopkeepers, distributors, commercial credit & quotes
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBusinessModel("b2c_retail")}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  businessModel === "b2c_retail"
                    ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500 shadow-2xs"
                    : "border-neutral-200 dark:border-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-800/50 text-neutral-600 dark:text-slate-400"
                }`}
              >
                <ShoppingBag className={`h-5 w-5 mt-0.5 shrink-0 ${businessModel === "b2c_retail" ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-400"}`} />
                <div>
                  <span className="font-bold block text-xs">B2C Retail</span>
                  <span className="text-[10px] text-neutral-500 leading-tight block mt-0.5">
                    Direct product enquiries, assisted checkout & cart recovery
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Contact Identification (Shared Contact Directory) */}
          <div className="bg-neutral-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-600" /> Customer / Contact Information
              </span>
              {existingContacts.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setContactMode("new")}
                    className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                      contactMode === "new" ? "bg-white dark:bg-slate-800 text-neutral-900 dark:text-white shadow-2xs" : "text-neutral-500"
                    }`}
                  >
                    New Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactMode("existing")}
                    className={`px-2 py-0.5 rounded-lg font-semibold cursor-pointer ${
                      contactMode === "existing" ? "bg-white dark:bg-slate-800 text-neutral-900 dark:text-white shadow-2xs" : "text-neutral-500"
                    }`}
                  >
                    Existing CRM Contact
                  </button>
                </div>
              )}
            </div>

            {contactMode === "existing" && existingContacts.length > 0 && (
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Select Existing Contact</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="">-- Choose from Directory --</option>
                  {existingContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Chauhan"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98160 55443"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 3. Conditional: B2B Wholesale Business Account Information */}
          {businessModel === "b2b_wholesale" && (
            <div className="bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 space-y-3">
              <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-amber-600" /> Wholesale Business / Shop Profile
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Business / Shop Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Himalayan Organic Mart"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Business Type</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="Retail Shop">Retail Shop</option>
                    <option value="Supermarket">Supermarket</option>
                    <option value="Ayurvedic Pharmacy">Ayurvedic Pharmacy</option>
                    <option value="Distributor">Distributor / Wholesaler</option>
                    <option value="Hotel / Resort">Hotel / Resort Kitchen</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Business Address & PIN</label>
                  <input
                    type="text"
                    placeholder="Shop No., Street, City, State"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="02AAACH7409R1ZZ"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Expected Purchase Qty</label>
                  <input
                    type="text"
                    placeholder="e.g. 50 kg or 20 cases"
                    value={expectedQuantity}
                    onChange={(e) => setExpectedQuantity(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Purchase Frequency</label>
                  <select
                    value={expectedFrequency}
                    onChange={(e) => setExpectedFrequency(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly recurring</option>
                    <option value="Seasonal">Seasonal harvest order</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Requested Payment Terms</label>
                  <select
                    value={requestedPaymentTerms}
                    onChange={(e) => setRequestedPaymentTerms(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="Prepaid UPI">Prepaid UPI / Bank Transfer</option>
                    <option value="Net 15 Days Credit">Requested 15 Days Credit</option>
                    <option value="Net 30 Days Credit">Requested 30 Days Credit</option>
                  </select>
                </div>
              </div>

              {requestedPaymentTerms.includes("Credit") && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Credit Policy Notice:</strong> Requested credit terms are kept separate from approved terms. Credit can only be granted by an authorized Store Admin or Sales Manager decision.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4. Conditional: B2C Retail Fields */}
          {businessModel === "b2c_retail" && (
            <div className="bg-sky-500/5 dark:bg-sky-500/10 p-4 rounded-2xl border border-sky-500/20 space-y-3">
              <span className="font-bold text-sky-900 dark:text-sky-200 text-xs flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5 text-sky-600" /> Retail Product Enquiry & Checkout Recovery
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Delivery PIN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 248001"
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Web Checkout Ref (if any)</label>
                  <input
                    type="text"
                    placeholder="e.g. CHK-WEB-882"
                    value={checkoutReference}
                    onChange={(e) => setCheckoutReference(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Reason Purchase is Pending</label>
                <input
                  type="text"
                  placeholder="e.g. Preferred paying via direct UPI QR rather than credit card gateway"
                  value={pendingReason}
                  onChange={(e) => setPendingReason(e.target.value)}
                  className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          )}

          {/* 5. Produce Interest, Weight/Unit, Discount & Estimated Value */}
          <div className="bg-neutral-50/70 dark:bg-slate-900/40 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 space-y-3">
            <span className="font-bold text-neutral-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" /> Produce Interest, Quantity & Commercial Pricing
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              {/* Searchable Product Dropdown */}
              <div className="sm:col-span-7">
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                  Primary Product Interest (Search produce)
                </label>
                <SearchableProductSelect
                  products={products}
                  selectedProductId={selectedProductId}
                  onSelectProduct={(p) => {
                    setSelectedProductId(p.id);
                    if (
                      p.name.toLowerCase().includes("honey") ||
                      p.name.toLowerCase().includes("walnut") ||
                      p.name.toLowerCase().includes("almond") ||
                      p.name.toLowerCase().includes("apricot") ||
                      p.name.toLowerCase().includes("turmeric") ||
                      p.name.toLowerCase().includes("salt")
                    ) {
                      setSelectedUnit("kg");
                    }
                  }}
                  placeholder="Search produce (e.g. Honey, Walnuts, Shilajit)..."
                />
              </div>

              {/* Quantity with Weight/Unit selector */}
              <div className="sm:col-span-5">
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                  Quantity & Unit (Weight in kg / Units)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-center font-bold"
                  />
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="units">units (Jars/Packs)</option>
                    <option value="cases">cases (Wholesale)</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Discount & Pricing Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-200/60 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Base Catalog Price</label>
                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-mono font-bold text-neutral-700 dark:text-slate-300">
                  ₹{basePrice.toLocaleString("en-IN")} / {selectedUnit}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1 flex items-center justify-between">
                  <span>Discounted Price (₹)</span>
                  <span className="text-[9px] text-emerald-600 font-bold">Main Order Price</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    placeholder={`e.g. ${Math.round(basePrice * 0.9)}`}
                    value={
                      discountedPrice !== ""
                        ? discountedPrice
                        : discountAmount !== ""
                        ? basePrice - Number(discountAmount)
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : "";
                      setDiscountedPrice(val);
                      if (val !== "" && basePrice > 0) {
                        setDiscountAmount(Math.max(0, basePrice - Number(val)));
                      } else {
                        setDiscountAmount("");
                      }
                    }}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs font-mono font-bold text-emerald-950 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-neutral-500 block mb-1 flex items-center justify-between">
                  <span>Estimated Total (Auto-calculated)</span>
                  <span className="text-[9px] text-neutral-400">₹{effectiveUnitPrice} × {selectedQty}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value ? parseFloat(e.target.value) : "")}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-extrabold text-neutral-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {effectiveUnitPrice < basePrice && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>
                  ✓ Applied discount: <strong>₹{(basePrice - effectiveUnitPrice).toLocaleString("en-IN")} off</strong> (₹{effectiveUnitPrice} locked as main price for entire order process)
                </span>
                <span className="font-mono font-bold text-[10px] bg-emerald-200 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                  {Math.round(((basePrice - effectiveUnitPrice) / basePrice) * 100)}% OFF
                </span>
              </div>
            )}
          </div>

          {/* 6. Assignment, Priority, Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Enquiry Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs capitalize"
              >
                <option value="whatsapp">WhatsApp Inbound (+91 80912 65690)</option>
                <option value="website">Website (market.prajnaa.in)</option>
                <option value="phone">Direct Phone Call</option>
                <option value="referral">Merchant Referral</option>
                <option value="campaign">Marketing Campaign</option>
                <option value="manual">Manual Sales Entry</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Assign Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="">-- Unassigned Queue --</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold capitalize"
              >
                <option value="normal">Normal</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* 7. Next Action & Upcoming Connect Reminder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-neutral-500 block mb-1">
                Next Action {ownerId ? "(Required for assigned leads) *" : ""}
              </label>
              <input
                type="text"
                placeholder="e.g. Send sample catalog and confirm batch delivery timeline"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                required={Boolean(ownerId)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-neutral-500 block">
                  Upcoming Connect Reminder
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetQuickReminder(1)}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 text-[10px] font-bold text-neutral-700 dark:text-slate-200 cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickReminder(3)}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 text-[10px] font-bold text-neutral-700 dark:text-slate-200 cursor-pointer"
                  >
                    In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickReminder(7)}
                    className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-[10px] font-bold text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 cursor-pointer"
                  >
                    In 1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickReminder(14)}
                    className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 text-[10px] font-bold text-neutral-700 dark:text-slate-200 cursor-pointer"
                  >
                    In 2 Weeks
                  </button>
                </div>
              </div>
              <input
                type="datetime-local"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e.target.value)}
                className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-500 block mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Commercial details, customer background, or logistics notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 font-semibold text-xs hover:bg-neutral-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Save Opportunity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLeadModal;
