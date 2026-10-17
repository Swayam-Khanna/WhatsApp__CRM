"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Search, Award, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";

export default function CertificateVerifyIndexPage() {
  const router = useRouter();
  const [certInput, setCertInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (certInput.trim()) {
      router.push(`/certificate/verify/${encodeURIComponent(certInput.trim().toUpperCase())}`);
    }
  };

  return (
    <MarketingLayout>
      <div className="bg-[#F9F7F2] min-h-screen py-16 text-foreground font-sans">
        <div className="container-prj max-w-2xl space-y-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0F3D2E] text-[#D4AF37] shadow-md">
            <ShieldCheck className="h-9 w-9" />
          </div>

          <div>
            <p className="font-subhead text-xs font-bold uppercase tracking-[0.2em] text-[#9E3226]">
              Prajnaa Farm Authenticity Registry
            </p>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl font-bold text-[#0F3D2E]">
              Verify Farmer Certificate
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-neutral-600">
              Enter the official Prajnaa Verified Certificate Number to verify its status and origin credentials.
            </p>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="mx-auto flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="e.g. PRJ-2026-000001"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                className="h-12 w-full rounded-full border border-border bg-white pl-10 pr-4 font-mono text-xs outline-none focus:border-[#0F3D2E] shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-full bg-[#0F3D2E] px-7 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#0c2b20] transition-colors cursor-pointer"
            >
              Verify
            </button>
          </form>

          {/* Quick links to sample verified farmers */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-xs text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Sample Verified Certificates:
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { name: "Ramesh Singh", num: "PRJ-2026-000001", state: "Ladakh" },
                { name: "Lakshmi Devi", num: "PRJ-2026-000002", state: "Andhra Pradesh" },
                { name: "Asha Patel", num: "PRJ-2026-000003", state: "Gujarat" },
              ].map((c) => (
                <Link
                  key={c.num}
                  href={`/certificate/verify/${c.num}`}
                  className="rounded-2xl border border-border/80 bg-secondary/20 p-3 hover:border-primary hover:bg-secondary/40 transition group"
                >
                  <p className="font-mono text-xs font-bold text-[#0F3D2E]">{c.num}</p>
                  <p className="text-xs font-semibold text-foreground mt-0.5">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.state}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
