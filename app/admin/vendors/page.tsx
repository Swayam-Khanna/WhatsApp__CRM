"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Award, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RegisterFarmerModal } from "./register-farmer-modal";
import { FarmerShowcaseManager } from "@/components/admin/farmers-showcase-manager";
import { FarmerCertificatesManager } from "@/components/admin/farmer-certificates-manager";
import {
  FarmerKycApprovalsManager,
  KycStatusTab,
} from "@/components/admin/farmer-kyc-approvals-manager";
import { useSearchParams } from "next/navigation";

type MainView = "showcase" | "approvals" | "certificates";

function AdminVendors() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams?.get("status") as KycStatusTab) || "pending";
  const initialView = searchParams?.get("tab") as MainView;
  const [mainView, setMainView] = useState<MainView>(
    initialView || (searchParams?.get("status") ? "approvals" : "showcase"),
  );
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  React.useEffect(() => {
    const v = searchParams?.get("tab") as MainView;
    if (v && (v === "showcase" || v === "approvals" || v === "certificates")) {
      setMainView(v);
    }
  }, [searchParams]);

  // Fetch all farmers for ratings & homepage showcase and certificate managers
  const { data: allFarmersDb = [] } = useQuery({
    queryKey: ["admin-all-farmers-showcase"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farmer_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold">Farmers & Verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage farmer ratings, issue official Prajnaa Verified certificates with QR codes, and review KYC approvals.
          </p>
        </div>
        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-[#1b3c29] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#132a1d] transition-colors shadow-xs cursor-pointer"
        >
          + Register Farmer
        </button>
      </div>

      {/* Main View Mode Selector (Ratings & Showcase vs Verified Certificates vs KYC & Approvals Workflow) */}
      <div className="flex border-b border-border/80 gap-6">
        <button
          onClick={() => setMainView("showcase")}
          className={`pb-3 text-sm font-semibold inline-flex items-center gap-2 relative transition-colors cursor-pointer ${
            mainView === "showcase"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          Ratings & Showcase
          {mainView === "showcase" && (
            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setMainView("certificates")}
          className={`pb-3 text-sm font-semibold inline-flex items-center gap-2 relative transition-colors cursor-pointer ${
            mainView === "certificates"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Verified Certificates
          {mainView === "certificates" && (
            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setMainView("approvals")}
          className={`pb-3 text-sm font-semibold inline-flex items-center gap-2 relative transition-colors cursor-pointer ${
            mainView === "approvals"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Award className="h-4 w-4 text-emerald-600" />
          KYC & Approvals Workflow
          {mainView === "approvals" && (
            <span className="absolute bottom-0 left-0 w-full h-[2.5px] bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      {mainView === "showcase" ? (
        <FarmerShowcaseManager dbFarmers={allFarmersDb} />
      ) : mainView === "certificates" ? (
        <FarmerCertificatesManager dbFarmers={allFarmersDb} />
      ) : (
        <FarmerKycApprovalsManager initialStatus={initialStatus} />
      )}

      {/* Register Farmer Modal */}
      <RegisterFarmerModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
}

export default AdminVendors;
