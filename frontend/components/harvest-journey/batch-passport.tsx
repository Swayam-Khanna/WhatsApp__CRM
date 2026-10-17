"use client";

import { useState } from "react";
import { Tag, Leaf } from "lucide-react";
import { toast } from "sonner";
import type { HarvestBatchInfo } from "@/lib/types/harvest";

interface BatchPassportProps {
  batchInfo: HarvestBatchInfo;
}

export function BatchPassport({ batchInfo }: BatchPassportProps) {
  const [email, setEmail] = useState("");

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.success("You'll be notified as soon as this harvest moves to the next stage!");
    setEmail("");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
      {/* Batch Left Card (col-span-7) */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-[#FAF6ED] p-5 md:p-6 md:col-span-7 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#4B5563]">
              <Tag className="h-4 w-4" />
              <span className="font-display text-base font-bold text-[#1F2937]">
                Harvest Batch
              </span>
            </div>
            <div className="mt-2">
              <span className="font-display text-3xl font-bold tracking-tight text-[#1F2937] font-mono">
                {batchInfo.batchNumber}
              </span>
              <p className="text-xs text-[#6B7280] mt-1">
                Your order will be part of this harvest batch.
              </p>
            </div>
          </div>

          {/* Key-value spec table matching reference UI */}
          <div className="border-t sm:border-t-0 sm:border-l border-[#E6E0D4] pt-3 sm:pt-0 sm:pl-4 text-xs space-y-1.5 min-w-[200px]">
            <div className="flex justify-between gap-3">
              <span className="text-[#6B7280]">Region</span>
              <span className="font-medium text-[#1F2937] text-right">{batchInfo.region}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6B7280]">Harvest Year</span>
              <span className="font-medium text-[#1F2937] text-right">{batchInfo.harvestYear}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6B7280]">Processing</span>
              <span className="font-medium text-[#1F2937] text-right">{batchInfo.processingMethod}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6B7280]">Current Stage</span>
              <span className="font-medium text-[#1F2937] text-right">{batchInfo.currentStatusLabel}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#6B7280]">Expected Dispatch</span>
              <span className="font-medium text-[#1F2937] text-right">{batchInfo.expectedDispatch}</span>
            </div>
          </div>
        </div>
      </div>

      {/* "Be the first to know" (col-span-5) */}
      <div className="rounded-2xl border border-[#E6E0D4] bg-[#FAF6ED] p-5 md:p-6 md:col-span-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#3A5A40]">
              <Leaf className="h-5 w-5 fill-[#3A5A40] text-[#3A5A40]" />
            </span>
            <h4 className="font-display text-base font-bold text-[#1F2937]">
              Be the first to know
            </h4>
          </div>
          <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
            Get notified when this harvest moves to the next stage.
          </p>
        </div>

        <form onSubmit={handleNotifySubmit} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="flex-1 rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-xs text-[#1F2937] placeholder:text-[#9CA3AF] outline-none focus:border-[#3A5A40]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[#3A5A40] hover:bg-[#2D4732] px-4 py-2 text-xs font-semibold text-white transition cursor-pointer shrink-0"
          >
            Notify Me
          </button>
        </form>
      </div>
    </div>
  );
}
