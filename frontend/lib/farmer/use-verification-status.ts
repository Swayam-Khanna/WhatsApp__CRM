"use client";

import { useFarmerProfile, type FarmerProfile } from "./use-farmer";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "not_started" | "pending_review" | "verified" | "rejected";

export interface VerificationInfo {
  status: VerificationStatus;
  isVerified: boolean;
  isLocked: boolean;
  isPendingReview: boolean;
  isRejected: boolean;
  isNotStarted: boolean;
  rejectionReason: string | null;
  statusLabel: string;
  statusMessage: string;
  isFarmComplete: boolean;
  isKycComplete: boolean;
  isBankComplete: boolean;
  isStoryComplete: boolean;
  completedRequiredCount: number;
  requiredSectionsCount: number;
  isAllRequiredDone: boolean;
  missingSections: string[];
}

export function computeVerificationStatus(
  farmer: FarmerProfile | null | undefined,
  hasAadhaarDoc: boolean = false,
  hasPanDoc: boolean = false,
): VerificationInfo {
  if (!farmer) {
    return {
      status: "not_started",
      isVerified: false,
      isLocked: true,
      isPendingReview: false,
      isRejected: false,
      isNotStarted: true,
      rejectionReason: null,
      statusLabel: "Not Started",
      statusMessage: "Complete your Prajnaa Onboarding to start selling.",
      isFarmComplete: false,
      isKycComplete: false,
      isBankComplete: false,
      isStoryComplete: false,
      completedRequiredCount: 0,
      requiredSectionsCount: 3,
      isAllRequiredDone: false,
      missingSections: ["Farm Details", "KYC Identity", "Bank & Payout"],
    };
  }

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
    (hasAadhaarDoc || !!farmer.aadhaar_last4) &&
    (hasPanDoc || !!farmer.pan_number)
  );

  const isBankComplete = !!(
    farmer.bank_account_name &&
    farmer.bank_name &&
    farmer.bank_account_number &&
    farmer.bank_ifsc
  );

  const isStoryComplete = !!(farmer.headline && farmer.story);

  const completedRequiredCount =
    (isFarmComplete ? 1 : 0) + (isKycComplete ? 1 : 0) + (isBankComplete ? 1 : 0);
  const isAllRequiredDone = completedRequiredCount === 3;

  const missingSections: string[] = [];
  if (!isFarmComplete) missingSections.push("Farm Details");
  if (!isKycComplete) missingSections.push("KYC Identity");
  if (!isBankComplete) missingSections.push("Bank Details");

  let status: VerificationStatus = "not_started";
  let statusMessage = "Complete your Prajnaa Onboarding to start selling.";
  let statusLabel = "Not Started";

  if (farmer.status === "approved") {
    status = "verified";
    statusLabel = "Verified";
    statusMessage = "Your farmer account is verified. All features are unlocked!";
  } else if (farmer.status === "pending") {
    status = "pending_review";
    statusLabel = "Pending Review";
    statusMessage = "Your application is under review. This usually takes 1-2 business days.";
  } else if (farmer.status === "rejected") {
    status = "rejected";
    statusLabel = "Action Needed";
    statusMessage =
      farmer.rejection_reason ||
      "Your application was rejected. Please review and update your onboarding details to resubmit.";
  } else {
    // draft or unsubmitted
    status = "not_started";
    statusLabel = "Not Started";
    statusMessage = "Complete your Prajnaa Onboarding to start selling.";
  }

  const isVerified = status === "verified";
  const isLocked = !isVerified;

  return {
    status,
    isVerified,
    isLocked,
    isPendingReview: status === "pending_review",
    isRejected: status === "rejected",
    isNotStarted: status === "not_started",
    rejectionReason: farmer.rejection_reason || null,
    statusLabel,
    statusMessage,
    isFarmComplete,
    isKycComplete,
    isBankComplete,
    isStoryComplete,
    completedRequiredCount,
    requiredSectionsCount: 3,
    isAllRequiredDone,
    missingSections,
  };
}

export function useVerificationStatus(): VerificationInfo & {
  isLoading: boolean;
  farmer: FarmerProfile | null;
} {
  const { data: farmer, isLoading: farmerLoading } = useFarmerProfile();

  const { data: docs = [], isLoading: docsLoading } = useQuery({
    enabled: !!farmer?.id,
    queryKey: ["farmer-docs-count", farmer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_documents")
        .select("doc_type")
        .eq("farmer_id", farmer!.id);
      if (error) return [];
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const hasAadhaarDoc = docs.some((d: any) => d.doc_type === "aadhaar");
  const hasPanDoc = docs.some((d: any) => d.doc_type === "pan");

  const info = computeVerificationStatus(farmer, hasAadhaarDoc, hasPanDoc);

  return {
    ...info,
    isLoading: farmerLoading || (!!farmer?.id && docsLoading),
    farmer: farmer ?? null,
  };
}
