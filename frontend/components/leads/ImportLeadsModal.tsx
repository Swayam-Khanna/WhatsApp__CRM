"use client";

import React, { useState } from "react";
import { X, Upload, CheckCircle2, AlertCircle, FileText, RefreshCw } from "lucide-react";
import { leadsService } from "@/lib/services/leadsService";
import { toast } from "sonner";

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const sampleCsv = `businessModel,contactName,contactPhone,contactEmail,businessName,estimatedValue,source,notes
b2b_wholesale,Ramesh Gupta,+91 98111 22334,ramesh@guptagrocery.com,Gupta Grocery Store,35000,import,Wholesale retail store in Chandigarh
b2b_wholesale,Sunil Negi,+91 94180 33445,sunil.negi@pahadi.in,Kinnaur Dry Fruits Hub,60000,import,Bulk inquiry for walnuts and dried apricots
b2c_retail,Deepa Joshi,+91 98970 66778,deepa.j@gmail.com,,4500,import,Asked for direct Mamra almonds delivery in Noida
b2c_retail,Manish Bhatt,+91 94120 88990,manish.bhatt@yahoo.com,,2400,import,Organic turmeric and red apricot assisted purchase`;

  const loadSample = () => {
    setCsvText(sampleCsv);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast.error("Please paste CSV data or load sample template");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV must include a header line and at least one data row");
      }

      const headers = lines[0].split(",").map((h) => h.trim());
      const records: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(",").map((v) => v.trim());
        const rec: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rec[h] = vals[idx] || "";
        });

        records.push({
          businessModel: rec.businessModel === "b2b_wholesale" ? "b2b_wholesale" : "b2c_retail",
          contactName: rec.contactName || "Imported Contact",
          contactPhone: rec.contactPhone,
          contactEmail: rec.contactEmail || undefined,
          businessName: rec.businessName || undefined,
          estimatedValue: rec.estimatedValue ? parseFloat(rec.estimatedValue) : undefined,
          source: rec.source || "import",
          notes: rec.notes || undefined,
        });
      }

      const res = await leadsService.importLeads(records);
      setImportResult(res);
      if (res.imported > 0) {
        toast.success(`Successfully imported ${res.imported} leads!`);
        onImportComplete();
      } else {
        toast.info("No new leads imported (all duplicates or invalid)");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse CSV");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-neutral-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">Import Leads & Enquiries</h3>
              <p className="text-[11px] text-neutral-500">Bulk CSV upload with duplicate detection & phone validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-700 dark:text-slate-300">
              Paste CSV Data (Comma-separated)
            </span>
            <button
              type="button"
              onClick={loadSample}
              className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" /> Load Sample Format
            </button>
          </div>

          <textarea
            rows={8}
            placeholder={`businessModel,contactName,contactPhone,contactEmail,businessName,estimatedValue,source,notes\nb2b_wholesale,Ramesh Gupta,+91 98111 22334,ramesh@guptagrocery.com,Gupta Grocery,35000,import,Wholesale retail store`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 rounded-2xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 font-mono text-[11px] leading-relaxed"
          />

          <div className="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-200 dark:border-slate-700/60 space-y-1 text-[11px] text-neutral-600 dark:text-slate-300">
            <span className="font-bold block text-neutral-900 dark:text-white">Duplicate Detection Policy:</span>
            <p>
              Records matching existing contact phone numbers and business models created within the last 7 days are automatically deduplicated and skipped.
            </p>
          </div>

          {importResult && (
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Import Summary:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-neutral-100 dark:border-slate-800">
                  <span className="text-neutral-500 block text-[10px]">Successfully Imported</span>
                  <strong className="text-base text-emerald-600">{importResult.imported}</strong>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-neutral-100 dark:border-slate-800">
                  <span className="text-neutral-500 block text-[10px]">Duplicates Skipped</span>
                  <strong className="text-base text-amber-600">{importResult.duplicatesSkipped}</strong>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="text-[10px] text-rose-600 dark:text-rose-400 space-y-0.5 pt-1">
                  {importResult.errors.map((e: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-neutral-50/70 dark:bg-slate-900/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 font-semibold text-xs hover:bg-neutral-100 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isImporting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Importing...
              </>
            ) : (
              "Run Import"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
