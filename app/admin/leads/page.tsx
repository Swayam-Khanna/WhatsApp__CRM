"use client";

import React from "react";
import LeadsModule from "@/components/leads/LeadsModule";

export default function AdminLeadsPage() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-neutral-900 text-neutral-100">
      <LeadsModule userRole="Store Admin" userName="Admin" />
    </div>
  );
}
