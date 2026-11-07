"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building,
  ShieldCheck,
  Coins,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  Sparkles,
  Trash2,
  ArrowRight,
  MapPin,
  Check,
  Shield,
  FileCheck2,
  FileX,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFarmerProfile, farmerKey, slugify } from "@/lib/farmer/use-farmer";
import { compressImage } from "@/lib/image-compress";
import { fileToBase64 } from "@/lib/file-to-base64";
import {
  validateAadhaar,
  validatePan,
  validateVerhoeff,
  maskAadhaar,
  formatAadhaarDisplay,
  validateKycFile,
} from "@/lib/kyc-validation";

const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Bank of India",
  "Canara Bank",
  "Union Bank of India",
  "IDBI Bank",
  "Central Bank of India",
  "Indian Bank",
  "UCO Bank",
  "Indian Overseas Bank",
  "YES Bank",
  "Federal Bank",
  "IDFC FIRST Bank",
  "Bandhan Bank",
  "Standard Chartered Bank",
  "Punjab & Sind Bank",
  "Bank of Maharashtra",
  "India Post Payments Bank",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
];

export function ProfileCompletionCard() {
  const qc = useQueryClient();
  const { data: farmer, isLoading: farmerLoading } = useFarmerProfile();
  const farmerId = farmer?.id;

  const [expandedSection, setExpandedSection] = useState<string | null>("farm");

  // Fetch KYC documents
  const { data: docs = [], isLoading: docsLoading } = useQuery({
    enabled: !!farmerId,
    queryKey: ["farmer-docs", farmerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_documents")
        .select("*")
        .eq("farmer_id", farmerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Section 1: Farm details state
  const [farmForm, setFarmForm] = useState({
    farm_name: "",
    village: "",
    district: "",
    state: "",
    pincode: "",
    farm_size_acres: "",
    years_farming: "",
    farming_method: "organic",
    crops: "",
  });

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [postOfficesList, setPostOfficesList] = useState<Array<{ name: string; officeType: string }>>([]);
  const [pincodeLocationText, setPincodeLocationText] = useState<string | null>(null);

  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setFarmForm((prev) => ({ ...prev, pincode: clean }));

    if (clean.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`/api/pincode/${clean}`);
        const json = await res.json();
        if (json.success && json.data) {
          const { state: detectedState, district: detectedDistrict, postOffices } = json.data;
          setFarmForm((prev) => ({
            ...prev,
            state: detectedState || prev.state,
            district: detectedDistrict || prev.district,
            village: prev.village || (postOffices?.[0]?.name ?? prev.village),
          }));
          setPostOfficesList(postOffices || []);
          const loc = `${detectedDistrict ? detectedDistrict + ", " : ""}${detectedState}`;
          setPincodeLocationText(loc);
          toast.success(`Location detected: ${loc}`);
        } else {
          setPincodeLocationText(null);
          setPostOfficesList([]);
        }
      } catch (err) {
        console.warn("Failed to fetch pincode:", err);
      } finally {
        setPincodeLoading(false);
      }
    } else {
      setPincodeLocationText(null);
      setPostOfficesList([]);
    }
  };

  // Section 2: Identity & KYC state
  const [kycForm, setKycForm] = useState({
    aadhaar_number: "",
    pan_number: "",
  });
  const [uploadingAadhaar, setUploadingAadhaar] = useState(false);
  const [uploadingPan, setUploadingPan] = useState(false);

  // KYC Verification States & Inline Errors
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);
  const [panError, setPanError] = useState<string | null>(null);
  const [aadhaarDocError, setAadhaarDocError] = useState<string | null>(null);
  const [panDocError, setPanDocError] = useState<string | null>(null);
  const [aadhaarVerifyState, setAadhaarVerifyState] = useState<
    "idle" | "verifying" | "verified" | "error" | "mismatch"
  >("idle");
  const [panVerifyState, setPanVerifyState] = useState<
    "idle" | "verifying" | "verified" | "error" | "mismatch"
  >("idle");
  const [aadhaarVerifiedDetails, setAadhaarVerifiedDetails] = useState<any | null>(null);
  const [panVerifiedDetails, setPanVerifiedDetails] = useState<any | null>(null);

  // Section 3: Bank details state
  const [bankForm, setBankForm] = useState({
    bank_account_name: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    upi_id: "",
  });
  const [uploadingBankPassbook, setUploadingBankPassbook] = useState(false);

  // Section 4: Story state
  const [storyForm, setStoryForm] = useState({
    headline: "",
    story: "",
  });

  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Populate forms when farmer data loads
  React.useEffect(() => {
    if (farmer) {
      setFarmForm({
        farm_name: farmer.farm_name ?? "",
        village: farmer.village ?? "",
        district: farmer.district ?? "",
        state: farmer.state ?? "",
        pincode: farmer.pincode ?? "",
        farm_size_acres: farmer.farm_size_acres?.toString() ?? "",
        years_farming: farmer.years_farming?.toString() ?? "",
        farming_method: farmer.farming_method ?? "organic",
        crops: (farmer.crops ?? []).join(", "),
      });

      setKycForm({
        aadhaar_number: farmer.aadhaar_last4 ? `**** **** ${farmer.aadhaar_last4}` : "",
        pan_number: farmer.pan_number ?? "",
      });

      setBankForm({
        bank_account_name: farmer.bank_account_name ?? "",
        bank_name: farmer.bank_name ?? "",
        bank_account_number: farmer.bank_account_number ?? "",
        bank_ifsc: farmer.bank_ifsc ?? "",
        upi_id: farmer.upi_id ?? "",
      });

      setStoryForm({
        headline: farmer.headline ?? "",
        story: farmer.story ?? "",
      });
    }
  }, [farmer]);

  if (farmerLoading || !farmer) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Completion calculations
  const hasAadhaarDoc = docs.some((d: any) => d.doc_type === "aadhaar");
  const hasPanDoc = docs.some((d: any) => d.doc_type === "pan");

  const isFarmComplete = !!(
    farmer.farm_name &&
    farmer.village &&
    farmer.state &&
    farmer.pincode &&
    farmer.farm_size_acres &&
    farmer.years_farming &&
    (farmer.crops?.length || 0) > 0
  );

  const isKycComplete = !!(
    farmer.aadhaar_last4 &&
    farmer.pan_number &&
    hasAadhaarDoc &&
    hasPanDoc
  );

  const isBankComplete = !!(
    farmer.bank_account_name &&
    farmer.bank_name &&
    farmer.bank_account_number &&
    farmer.bank_ifsc
  );

  const isStoryComplete = !!(farmer.headline && farmer.story);

  const requiredSectionsCount = 3;
  const completedRequiredCount =
    (isFarmComplete ? 1 : 0) + (isKycComplete ? 1 : 0) + (isBankComplete ? 1 : 0);
  const totalCompleted = completedRequiredCount + (isStoryComplete ? 1 : 0);
  const isAllRequiredDone = completedRequiredCount === 3;

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  // Section 1: Save Farm Details
  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (farmer.status === "pending") {
      toast.error("Application is currently under review. Editing is disabled.");
      return;
    }
    if (!farmForm.farm_name.trim()) {
      toast.error("Farm name is required");
      return;
    }
    if (!farmForm.village.trim()) {
      toast.error("Village name is required");
      return;
    }
    if (!farmForm.state.trim()) {
      toast.error("State is required");
      return;
    }
    if (!/^\d{6}$/.test(farmForm.pincode.trim())) {
      toast.error("Enter a valid 6-digit Pincode");
      return;
    }
    if (!farmForm.farm_size_acres || isNaN(Number(farmForm.farm_size_acres))) {
      toast.error("Valid farm size in acres is required");
      return;
    }
    if (!farmForm.years_farming || isNaN(Number(farmForm.years_farming))) {
      toast.error("Valid farming experience in years is required");
      return;
    }
    if (!farmForm.crops.trim()) {
      toast.error("Please list at least one crop");
      return;
    }

    setSavingSection("farm");
    try {
      const cropsArray = farmForm.crops
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const patch: any = {
        farm_name: farmForm.farm_name.trim(),
        slug: farmer.slug || slugify(farmForm.farm_name.trim()) + "-" + Math.random().toString(36).slice(2, 6),
        village: farmForm.village.trim(),
        district: farmForm.district.trim() || null,
        state: farmForm.state.trim(),
        pincode: farmForm.pincode.trim(),
        farm_size_acres: Number(farmForm.farm_size_acres),
        years_farming: parseInt(farmForm.years_farming, 10),
        farming_method: farmForm.farming_method,
        crops: cropsArray,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("farmer_profiles")
        .update(patch)
        .eq("id", farmer.id);

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: farmerKey(farmer.user_id) });
      toast.success("Farm details saved successfully");
      setExpandedSection(isKycComplete ? (isBankComplete ? "story" : "bank") : "kyc");
    } catch (err: any) {
      toast.error(err.message || "Failed to save farm details");
    } finally {
      setSavingSection(null);
    }
  };

  // Section 2: Upload KYC Document
  const handleUploadDoc = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: "aadhaar" | "pan" | "bank_passbook",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileCheck = validateKycFile(file, 5);
    if (!fileCheck.valid) {
      toast.error(fileCheck.error);
      if (docType === "aadhaar") setAadhaarDocError(fileCheck.error || null);
      if (docType === "pan") setPanDocError(fileCheck.error || null);
      return;
    }

    if (docType === "aadhaar") {
      setUploadingAadhaar(true);
      setAadhaarDocError(null);
      setAadhaarVerifyState("idle");
    }
    if (docType === "pan") {
      setUploadingPan(true);
      setPanDocError(null);
      setPanVerifyState("idle");
    }
    if (docType === "bank_passbook") setUploadingBankPassbook(true);

    try {
      const compressedFile = await compressImage(file);
      const base64Url = await fileToBase64(compressedFile);

      // Remove existing doc of same type if present
      const existingDoc = docs.find((d: any) => d.doc_type === docType);
      if (existingDoc) {
        await supabase.from("farmer_documents").delete().eq("id", existingDoc.id);
      }

      const { error } = await supabase.from("farmer_documents").insert({
        farmer_id: farmer.id,
        user_id: farmer.user_id,
        doc_type: docType,
        file_url: base64Url,
        label: file.name,
        status: "pending",
      });

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["farmer-docs", farmer.id] });
      toast.success(`${docType === "aadhaar" ? "Aadhaar" : docType.toUpperCase()} document uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Document upload failed");
    } finally {
      if (docType === "aadhaar") setUploadingAadhaar(false);
      if (docType === "pan") setUploadingPan(false);
      if (docType === "bank_passbook") setUploadingBankPassbook(false);
    }
  };

  // Section 2: Verify & Save KYC Details (Cashfree Integration)
  const handleSaveKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (farmer.status === "pending") {
      toast.error("Application is currently under review. Editing is disabled.");
      return;
    }

    // Reset error flags
    setAadhaarError(null);
    setPanError(null);
    setAadhaarDocError(null);
    setPanDocError(null);

    const aadhaarClean = kycForm.aadhaar_number.replace(/[\s-]/g, "");
    const panClean = kycForm.pan_number.trim().toUpperCase();

    // 1. Client-side Instant Validation
    let hasFormatError = false;

    const aadhaarCheck = validateAadhaar(aadhaarClean);
    if (!aadhaarCheck.valid) {
      setAadhaarError(aadhaarCheck.error || "Please enter a valid 12-digit Aadhaar number");
      hasFormatError = true;
    }

    const panCheck = validatePan(panClean);
    if (!panCheck.valid) {
      setPanError(panCheck.error || "Enter a valid 10-character PAN number (e.g. ABCDE1234F)");
      hasFormatError = true;
    }

    if (!hasAadhaarDoc) {
      setAadhaarDocError("Please upload your Aadhaar document photo or PDF");
      hasFormatError = true;
    }

    if (!hasPanDoc) {
      setPanDocError("Please upload your PAN document photo or PDF");
      hasFormatError = true;
    }

    if (!aadhaarConsent) {
      toast.error("Please tick the consent checkbox for Aadhaar verification");
      return;
    }

    if (hasFormatError) {
      toast.error("Please fix the highlighted errors before submitting verification");
      return;
    }

    setSavingSection("kyc");
    setAadhaarVerifyState("verifying");
    setPanVerifyState("verifying");

    try {
      const aadhaarDoc = docs.find((d: any) => d.doc_type === "aadhaar");
      const panDoc = docs.find((d: any) => d.doc_type === "pan");

      // 2. Call Cashfree PAN and Aadhaar Smart OCR Endpoints in Parallel
      const [panResult, aadhaarResult] = await Promise.allSettled([
        fetch("/api/kyc/verify-pan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pan: panClean,
            name: farmer.full_name,
            farmerId: farmer.id,
            document: panDoc?.file_url,
          }),
        }).then((res) => res.json()),

        fetch("/api/kyc/verify-aadhaar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aadhaar: aadhaarClean,
            document: aadhaarDoc?.file_url,
            consent: true,
            farmerId: farmer.id,
          }),
        }).then((res) => res.json()),
      ]);

      let panVerified = false;
      let aadhaarVerified = false;

      // Handle PAN Result
      if (panResult.status === "fulfilled" && panResult.value?.status === "verified") {
        panVerified = true;
        setPanVerifyState("verified");
        setPanVerifiedDetails(panResult.value.details);
        setPanError(null);
      } else {
        const errorMsg =
          panResult.status === "fulfilled"
            ? panResult.value?.details?.message || "PAN verification failed"
            : "Network error during PAN verification";
        setPanVerifyState("error");
        setPanError(errorMsg);
      }

      // Handle Aadhaar Result
      if (aadhaarResult.status === "fulfilled" && aadhaarResult.value?.status === "verified") {
        aadhaarVerified = true;
        setAadhaarVerifyState("verified");
        setAadhaarVerifiedDetails(aadhaarResult.value.details);
        setAadhaarError(null);
      } else {
        const resValue = aadhaarResult.status === "fulfilled" ? aadhaarResult.value : null;
        if (resValue?.status === "mismatch") {
          setAadhaarVerifyState("mismatch");
          setAadhaarError(
            resValue.details?.message ||
              "Entered Aadhaar number does not match the uploaded document.",
          );
        } else {
          setAadhaarVerifyState("error");
          setAadhaarError(
            resValue?.details?.message ||
              "Aadhaar OCR scan failed. Please ensure the scan is clear and legible.",
          );
        }
      }

      // 3. If both pass verification, update farmer profile
      if (panVerified && aadhaarVerified) {
        const patch: any = {
          pan_number: panClean,
          aadhaar_last4: aadhaarClean.slice(-4),
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("farmer_profiles")
          .update(patch)
          .eq("id", farmer.id);

        if (error) throw error;

        await qc.invalidateQueries({ queryKey: farmerKey(farmer.user_id) });
        await qc.invalidateQueries({ queryKey: ["farmer-docs", farmer.id] });

        toast.success("Identity & KYC verified successfully with Cashfree!");
        setExpandedSection(isBankComplete ? "story" : "bank");
      } else {
        toast.error("Identity verification incomplete. Please review the highlighted errors.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete KYC verification");
    } finally {
      setSavingSection(null);
    }
  };

  // Section 3: Save Bank Details
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (farmer.status === "pending") {
      toast.error("Application is currently under review. Editing is disabled.");
      return;
    }
    if (!bankForm.bank_account_name.trim()) {
      toast.error("Account holder name is required");
      return;
    }
    if (!/^\d{9,18}$/.test(bankForm.bank_account_number.trim())) {
      toast.error("Enter a valid bank account number (9 to 18 digits)");
      return;
    }
    const ifscClean = bankForm.bank_ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
      toast.error("Enter a valid 11-character IFSC code (e.g. SBIN0001234)");
      return;
    }

    setSavingSection("bank");
    try {
      const patch = {
        bank_account_name: bankForm.bank_account_name.trim(),
        bank_name: bankForm.bank_name,
        bank_account_number: bankForm.bank_account_number.trim(),
        bank_ifsc: ifscClean,
        upi_id: bankForm.upi_id.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("farmer_profiles")
        .update(patch)
        .eq("id", farmer.id);

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: farmerKey(farmer.user_id) });
      toast.success("Bank & payout details saved successfully");
      setExpandedSection("story");
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank details");
    } finally {
      setSavingSection(null);
    }
  };

  // Section 4: Save Story
  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (farmer.status === "pending") {
      toast.error("Application is currently under review. Editing is disabled.");
      return;
    }
    setSavingSection("story");
    try {
      const patch = {
        headline: storyForm.headline.trim() || null,
        story: storyForm.story.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("farmer_profiles")
        .update(patch)
        .eq("id", farmer.id);

      if (error) throw error;
      await qc.invalidateQueries({ queryKey: farmerKey(farmer.user_id) });
      toast.success("Farm story saved successfully");
      setExpandedSection(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save farm story");
    } finally {
      setSavingSection(null);
    }
  };

  // Submit / Resubmit profile for review if all 3 required sections are done
  const handleSubmitForApproval = async () => {
    if (!isAllRequiredDone) {
      toast.error("Please complete Farm details, Identity KYC, and Bank details first");
      return;
    }
    setSavingSection("submit");
    try {
      const { error } = await supabase
        .from("farmer_profiles")
        .update({
          status: "pending",
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", farmer.id);

      if (error) throw error;

      await supabase.from("system_notifications").insert({
        type: "farmer_kyc_submission",
        title:
          farmer.status === "rejected"
            ? "Farmer Profile Resubmitted for Review"
            : "Farmer Profile Completed for Review",
        message: `Farmer "${farmer.full_name}" (${farmer.farm_name || "New Farm"}) has completed their profile details and submitted for verification.`,
        read: false,
        metadata: {
          farmer_id: farmer.id,
          farmer_name: farmer.full_name,
        },
      });

      await qc.invalidateQueries({ queryKey: farmerKey(farmer.user_id) });
      toast.success(
        farmer.status === "rejected"
          ? "Profile resubmitted for admin review!"
          : "Profile submitted for admin review!",
      );
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setSavingSection(null);
    }
  };

  // Reset / Clear Onboarding Form
  const handleResetForm = async () => {
    if (!window.confirm("Are you sure you want to clear all fields and start fresh with a blank form?")) {
      return;
    }
    setSavingSection("reset");
    try {
      const emptyPatch = {
        farm_name: null,
        village: null,
        district: null,
        state: null,
        pincode: null,
        farm_size_acres: null,
        years_farming: null,
        farming_method: "organic",
        crops: [],
        pan_number: null,
        aadhaar_last4: null,
        bank_account_name: null,
        bank_name: null,
        bank_account_number: null,
        bank_ifsc: null,
        upi_id: null,
        headline: null,
        story: null,
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("farmer_profiles")
        .update(emptyPatch)
        .eq("id", farmer.id);

      if (error) throw error;

      await supabase.from("farmer_documents").delete().eq("farmer_id", farmer.id);

      setFarmForm({
        farm_name: "",
        village: "",
        district: "",
        state: "",
        pincode: "",
        farm_size_acres: "",
        years_farming: "",
        farming_method: "organic",
        crops: "",
      });

      setKycForm({
        aadhaar_number: "",
        pan_number: "",
      });

      setBankForm({
        bank_account_name: "",
        bank_name: "",
        bank_account_number: "",
        bank_ifsc: "",
        upi_id: "",
      });

      setStoryForm({
        headline: "",
        story: "",
      });

      setAadhaarVerifyState("idle");
      setPanVerifyState("idle");
      setExpandedSection("farm");

      await qc.invalidateQueries({ queryKey: farmerKey(farmer.user_id) });
      await qc.invalidateQueries({ queryKey: ["farmer-docs", farmer.id] });

      toast.success("Onboarding form cleared to a clean blank state");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset form");
    } finally {
      setSavingSection(null);
    }
  };

  const isPendingReview = farmer.status === "pending";

  return (
    <div className="rounded-3xl border border-[#e5ded0] bg-[#faf8f5] p-6 shadow-sm space-y-6">
      {/* Header & Progress */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#ece4d6] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#1b3c29] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="font-display text-xl font-bold text-[#1b3c29]">
              Complete Your Farmer Profile
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Complete the 3 required sections below to unlock product listing and payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleResetForm}
            disabled={savingSection === "reset"}
            className="font-subhead inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
            title="Clear all previously saved fields and start fresh"
          >
            {savingSection === "reset" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Reset & Clear Form
          </button>

          <div className="text-right">
            <p className="font-subhead text-xs font-bold text-[#1b3c29]">
              {completedRequiredCount} of {requiredSectionsCount} required done
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isAllRequiredDone ? "Ready for selling" : "Selling locked until complete"}
            </p>
          </div>
          <div className="relative h-10 w-10">
            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#e2dac9]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#1b3c29] transition-all duration-500 ease-out"
                strokeDasharray={`${(completedRequiredCount / requiredSectionsCount) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="font-subhead absolute inset-0 grid place-items-center text-[10px] font-bold text-[#1b3c29]">
              {Math.round((completedRequiredCount / requiredSectionsCount) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Pending Review Status Notice */}
      {isPendingReview && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/20 p-4.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <p className="font-bold text-sm">Application Currently Under Review</p>
            <p className="opacity-90 leading-relaxed">
              Your onboarding information is being reviewed by the Prajnaa administration team (typically 1-2 business days). While under review, form fields are locked.
            </p>
          </div>
        </div>
      )}

      {/* Rejected Status Notice */}
      {farmer.status === "rejected" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/20 p-4.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Application Requires Revisions</p>
            <p className="leading-relaxed">
              Reason: <strong>{farmer.rejection_reason || "Document or details mismatch."}</strong>
            </p>
            <p className="opacity-90">
              Please update the required sections below and click <strong>Resubmit for Review</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Selling Status Gating Banner */}
      <div
        className={`rounded-2xl p-4 flex items-center justify-between gap-4 border transition-all ${
          isAllRequiredDone
            ? "bg-[#eaf3ed] border-[#c2ded0] text-[#1b3c29]"
            : "bg-[#fdf6e7] border-[#fae2b8] text-[#8f580b]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid h-8 w-8 place-items-center rounded-xl ${
              isAllRequiredDone ? "bg-[#1b3c29] text-white" : "bg-[#8f580b] text-white"
            }`}
          >
            {isAllRequiredDone ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </div>
          <div>
            <h4 className="font-display text-sm font-bold">
              {isAllRequiredDone
                ? farmer.status === "approved"
                  ? "Selling Unlocked — Store Active"
                  : isPendingReview
                  ? "Profile Complete — Under Admin Review"
                  : "Profile Ready — Needs Submission"
                : "Product Listing & Selling — Locked"}
            </h4>
            <p className="text-xs opacity-90">
              {isAllRequiredDone
                ? farmer.status === "approved"
                  ? "All requirements completed. You can create products and receive customer orders."
                  : isPendingReview
                  ? "Your details have been submitted. Admin verification takes 1-2 business days."
                  : "All 3 required sections are filled. Submit your application below for review."
                : `Missing: ${[!isFarmComplete && "Farm Details", !isKycComplete && "KYC Identity", !isBankComplete && "Bank Details"].filter(Boolean).join(", ")}.`}
            </p>
          </div>
        </div>

        {isAllRequiredDone && (farmer.status === "draft" || farmer.status === "rejected") && (
          <button
            onClick={handleSubmitForApproval}
            disabled={savingSection === "submit"}
            className="font-subhead shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#1b3c29] px-4 py-2 text-xs font-bold text-white hover:bg-[#153020] transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {savingSection === "submit" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {farmer.status === "rejected" ? "Resubmit for Review" : "Submit for Review"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 4 Accordion Modules */}
      <div className="space-y-3">
        {/* Module 1: Farm Details */}
        <div className="rounded-2xl border border-[#e8e0d2] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("farm")}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[#fcfbf9] transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1b3c29]/8 text-[#1b3c29]">
                <Building className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm font-bold text-foreground">
                    1. Farm Details
                  </h4>
                  {isFarmComplete ? (
                    <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="font-subhead inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Location, land size, farming methods, and primary crops
                </p>
              </div>
            </div>
            {expandedSection === "farm" ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "farm" && (
            <form onSubmit={handleSaveFarm} className="border-t border-[#ece4d6] p-5 space-y-4 bg-[#faf9f6]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Farm Name *
                  </label>
                  <input
                    type="text"
                    value={farmForm.farm_name}
                    onChange={(e) => setFarmForm({ ...farmForm, farm_name: e.target.value })}
                    placeholder="e.g. Sahyadri Organic Farm"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>

                {/* Pincode with Auto-detection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Pincode * (6 digits)
                    </label>
                    {pincodeLoading && (
                      <span className="text-[10px] text-primary flex items-center gap-1 font-semibold">
                        <Loader2 className="h-3 w-3 animate-spin" /> Detecting...
                      </span>
                    )}
                    {pincodeLocationText && !pincodeLoading && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> {pincodeLocationText}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={farmForm.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="e.g. 412803"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary font-medium tracking-wide"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Enter postal PIN code to automatically detect State, District & Villages.
                  </p>
                </div>

                {/* Village / Town with Auto-suggestions */}
                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Village / Town *
                  </label>
                  <input
                    type="text"
                    list="village-suggestions"
                    value={farmForm.village}
                    onChange={(e) => setFarmForm({ ...farmForm, village: e.target.value })}
                    placeholder="e.g. Wai or select below"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                  {postOfficesList.length > 0 && (
                    <datalist id="village-suggestions">
                      {postOfficesList.map((po, idx) => (
                        <option key={idx} value={po.name} />
                      ))}
                    </datalist>
                  )}
                  {postOfficesList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-20 overflow-y-auto">
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase self-center">Quick Select:</span>
                      {postOfficesList.slice(0, 6).map((po, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFarmForm({ ...farmForm, village: po.name })}
                          className={`text-[10px] rounded-full px-2 py-0.5 font-medium border transition cursor-pointer ${
                            farmForm.village === po.name
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-foreground border-border hover:bg-secondary"
                          }`}
                        >
                          {po.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={farmForm.district}
                    onChange={(e) => setFarmForm({ ...farmForm, district: e.target.value })}
                    placeholder="e.g. Satara"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    State *
                  </label>
                  <select
                    value={farmForm.state}
                    onChange={(e) => setFarmForm({ ...farmForm, state: e.target.value })}
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Farm Size (Acres) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={farmForm.farm_size_acres}
                    onChange={(e) => setFarmForm({ ...farmForm, farm_size_acres: e.target.value })}
                    placeholder="e.g. 4.5"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Years of Farming Experience *
                  </label>
                  <input
                    type="number"
                    value={farmForm.years_farming}
                    onChange={(e) => setFarmForm({ ...farmForm, years_farming: e.target.value })}
                    placeholder="e.g. 8"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Farming Method *
                  </label>
                  <select
                    value={farmForm.farming_method}
                    onChange={(e) => setFarmForm({ ...farmForm, farming_method: e.target.value })}
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  >
                    <option value="organic">Certified Organic</option>
                    <option value="natural">Natural / Zero Budget</option>
                    <option value="regenerative">Regenerative Farming</option>
                    <option value="traditional">Traditional Indigenous</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Primary Crops * (comma separated)
                  </label>
                  <input
                    type="text"
                    value={farmForm.crops}
                    onChange={(e) => setFarmForm({ ...farmForm, crops: e.target.value })}
                    placeholder="e.g. Alphonso Mangoes, Cashews, Turmeric, Black Rice"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSection === "farm"}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#1b3c29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#153020] transition disabled:opacity-50 cursor-pointer"
                >
                  {savingSection === "farm" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Farm Details
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Module 2: Identity & KYC */}
        <div className="rounded-2xl border border-[#e8e0d2] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("kyc")}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[#fcfbf9] transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1b3c29]/8 text-[#1b3c29]">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm font-bold text-foreground">
                    2. Identity Verification & KYC
                  </h4>
                  {isKycComplete ? (
                    <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="font-subhead inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Aadhaar and PAN numbers with document proofs
                </p>
              </div>
            </div>
            {expandedSection === "kyc" ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "kyc" && (
            <form onSubmit={handleSaveKyc} className="border-t border-[#ece4d6] p-5 space-y-5 bg-[#faf9f6]">
              {/* Cashfree Verification Header Banner */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 flex items-start gap-3 text-xs text-emerald-950">
                <Shield className="h-4.5 w-4.5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-emerald-900">
                    Live Cashfree Verification Suite Active
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    PAN is verified instantly against Income Tax Department records. Aadhaar is authenticated via Cashfree Smart OCR AI extraction. All Aadhaar numbers are masked for your privacy.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Aadhaar Section */}
                <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-subhead text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      Aadhaar Card Number *
                    </label>
                    {aadhaarVerifyState === "verified" || (farmer.aadhaar_last4 && !aadhaarError) ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> Smart OCR Verified
                      </span>
                    ) : hasAadhaarDoc ? (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> File Uploaded
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={kycForm.aadhaar_number}
                      onChange={(e) => {
                        const formatted = formatAadhaarDisplay(e.target.value);
                        setKycForm({ ...kycForm, aadhaar_number: formatted });
                        setAadhaarVerifyState("idle");
                        // Instant client validation if 12 digits typed
                        const clean = formatted.replace(/\D/g, "");
                        if (clean.length === 12) {
                          const check = validateAadhaar(clean);
                          setAadhaarError(check.valid ? null : check.error || "Invalid Aadhaar");
                        } else if (clean.length > 0 && clean.length < 12) {
                          setAadhaarError(`12 digits required (${clean.length}/12)`);
                        } else {
                          setAadhaarError(null);
                        }
                      }}
                      placeholder="12 digit Aadhaar number (e.g. 5432 1098 7654)"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${
                        aadhaarError
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                          : "border-border bg-background focus:border-primary"
                      }`}
                      required
                    />
                    {aadhaarError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{aadhaarError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 block">
                      Aadhaar Document Photo / Scan *
                    </label>
                    <label className="border border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/40 transition">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleUploadDoc(e, "aadhaar")}
                        className="hidden"
                      />
                      {uploadingAadhaar ? (
                        <div className="flex items-center gap-2 text-xs text-primary font-semibold py-1">
                          <Loader2 className="h-4 w-4 animate-spin" /> Uploading & compressing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                          <Upload className="h-4 w-4" />
                          <span>{hasAadhaarDoc ? "Replace Aadhaar File (JPG/PNG/PDF)" : "Choose Aadhaar Image/PDF (Max 5MB)"}</span>
                        </div>
                      )}
                    </label>
                    {aadhaarDocError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{aadhaarDocError}</span>
                      </p>
                    )}
                  </div>

                  {aadhaarVerifyState === "verifying" && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                      <span>Cashfree Smart OCR is extracting document details...</span>
                    </div>
                  )}

                  {aadhaarVerifyState === "verified" && aadhaarVerifiedDetails && (
                    <div className="rounded-lg bg-emerald-50/80 p-2.5 text-xs text-emerald-900 border border-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Aadhaar Authenticated: {aadhaarVerifiedDetails.maskedAadhaar}</span>
                      </div>
                      {aadhaarVerifiedDetails.extractedName && (
                        <p className="text-[11px] text-emerald-700">
                          Extracted Name: {aadhaarVerifiedDetails.extractedName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* PAN Section */}
                <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-subhead text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      PAN Card Number *
                    </label>
                    {panVerifyState === "verified" || (farmer.pan_number && !panError) ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" /> ITD Verified
                      </span>
                    ) : hasPanDoc ? (
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> File Uploaded
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <input
                      type="text"
                      maxLength={10}
                      value={kycForm.pan_number}
                      onChange={(e) => {
                        const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                        setKycForm({ ...kycForm, pan_number: clean });
                        setPanVerifyState("idle");
                        // Instant client validation if 10 chars typed
                        if (clean.length === 10) {
                          const check = validatePan(clean);
                          setPanError(check.valid ? null : check.error || "Invalid PAN format");
                        } else if (clean.length > 0 && clean.length < 10) {
                          setPanError(`10 characters required (${clean.length}/10)`);
                        } else {
                          setPanError(null);
                        }
                      }}
                      placeholder="e.g. ABCDE1234F"
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm uppercase outline-none transition ${
                        panError
                          ? "border-rose-400 bg-rose-50/20 focus:border-rose-500"
                          : "border-border bg-background focus:border-primary"
                      }`}
                      required
                    />
                    {panError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{panError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 block">
                      PAN Document Photo / Scan *
                    </label>
                    <label className="border border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/40 transition">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => handleUploadDoc(e, "pan")}
                        className="hidden"
                      />
                      {uploadingPan ? (
                        <div className="flex items-center gap-2 text-xs text-primary font-semibold py-1">
                          <Loader2 className="h-4 w-4 animate-spin" /> Uploading & compressing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                          <Upload className="h-4 w-4" />
                          <span>{hasPanDoc ? "Replace PAN File (JPG/PNG/PDF)" : "Choose PAN Image/PDF (Max 5MB)"}</span>
                        </div>
                      )}
                    </label>
                    {panDocError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{panDocError}</span>
                      </p>
                    )}
                  </div>

                  {panVerifyState === "verifying" && (
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800 border border-amber-200">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                      <span>Verifying PAN with Income Tax Department records...</span>
                    </div>
                  )}

                  {panVerifyState === "verified" && panVerifiedDetails && (
                    <div className="rounded-lg bg-emerald-50/80 p-2.5 text-xs text-emerald-900 border border-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Income Tax Record: {panVerifiedDetails.registeredName}</span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        PAN: {panVerifiedDetails.pan} ({panVerifiedDetails.type || "Individual"})
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Explicit User Consent for Cashfree Aadhaar Verification */}
              <div className="rounded-xl border border-[#e8dfd0] bg-white p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="aadhaar-consent-cb"
                  checked={aadhaarConsent}
                  onChange={(e) => setAadhaarConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1b3c29] focus:ring-[#1b3c29] cursor-pointer"
                />
                <label htmlFor="aadhaar-consent-cb" className="text-xs text-foreground cursor-pointer select-none leading-relaxed">
                  <span className="font-semibold text-[#1b3c29]">User KYC Consent:</span> I hereby give explicit consent to Prajnaa Farm to verify my Aadhaar card details and document scan via Cashfree Verification Suite (Smart OCR) and check my PAN against the Income Tax Department database for the sole purpose of farmer onboarding and payout compliance.
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Bank-grade 256-bit SSL encrypted verification
                </p>
                <button
                  type="submit"
                  disabled={savingSection === "kyc" || !aadhaarConsent}
                  className="font-subhead inline-flex items-center gap-2 rounded-full bg-[#1b3c29] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#153020] transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingSection === "kyc" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Verifying with Cashfree...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify & Save Identity Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Module 3: Bank & Payouts */}
        <div className="rounded-2xl border border-[#e8e0d2] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("bank")}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[#fcfbf9] transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1b3c29]/8 text-[#1b3c29]">
                <Coins className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm font-bold text-foreground">
                    3. Bank & Payout Details
                  </h4>
                  {isBankComplete ? (
                    <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="font-subhead inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Bank account and IFSC for automated monthly sales settlements
                </p>
              </div>
            </div>
            {expandedSection === "bank" ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "bank" && (
            <form onSubmit={handleSaveBank} className="border-t border-[#ece4d6] p-5 space-y-4 bg-[#faf9f6]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={bankForm.bank_account_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })}
                    placeholder="Full name as per bank records"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Bank Name *
                  </label>
                  <select
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  >
                    {INDIAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Bank Account Number *
                  </label>
                  <input
                    type="password"
                    value={bankForm.bank_account_number}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                    placeholder="Account Number (9-18 digits)"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Bank IFSC Code *
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={bankForm.bank_ifsc}
                    onChange={(e) => setBankForm({ ...bankForm, bank_ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. SBIN0001234"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm uppercase outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={bankForm.upi_id}
                    onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })}
                    placeholder="e.g. farmer@okaxis"
                    className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSection === "bank"}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#1b3c29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#153020] transition disabled:opacity-50 cursor-pointer"
                >
                  {savingSection === "bank" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Bank Details
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Module 4: Your Story (Optional) */}
        <div className="rounded-2xl border border-[#e8e0d2] bg-white overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("story")}
            className="w-full p-4.5 flex items-center justify-between text-left hover:bg-[#fcfbf9] transition"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#1b3c29]/8 text-[#1b3c29]">
                <BookOpen className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm font-bold text-foreground">
                    4. Your Farm Story
                  </h4>
                  {isStoryComplete ? (
                    <span className="font-subhead inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      <Check className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="font-subhead inline-flex items-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  A headline and paragraph describing your farming journey for buyers
                </p>
              </div>
            </div>
            {expandedSection === "story" ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "story" && (
            <form onSubmit={handleSaveStory} className="border-t border-[#ece4d6] p-5 space-y-4 bg-[#faf9f6]">
              <div>
                <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  One-Line Headline
                </label>
                <input
                  type="text"
                  value={storyForm.headline}
                  onChange={(e) => setStoryForm({ ...storyForm, headline: e.target.value })}
                  placeholder="e.g. 3rd Generation Natural Mango & Spice Cultivators"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-subhead text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Your Farm Journey & Philosophy
                </label>
                <textarea
                  rows={4}
                  value={storyForm.story}
                  onChange={(e) => setStoryForm({ ...storyForm, story: e.target.value })}
                  placeholder="Share your natural farming journey, heritage techniques, and commitment to pesticide-free agriculture..."
                  className="w-full rounded-xl border border-border bg-white p-3.5 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSection === "story"}
                  className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#1b3c29] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#153020] transition disabled:opacity-50 cursor-pointer"
                >
                  {savingSection === "story" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Farm Story
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
