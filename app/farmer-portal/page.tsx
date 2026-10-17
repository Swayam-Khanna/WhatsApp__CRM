"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFileRoute, redirect } from "@/lib/tanstack-compat";

export default function FarmerPortalPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/farmer-portal/dashboard");
  }, [router]);
  return null;
}
