"use client";

import { createFileRoute } from "@/lib/tanstack-compat";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Shield, ShieldCheck, User } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ADMIN_EMAILS } from "@/lib/admin/admin-constants";

function AdminCustomers() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "admin">("all");

  const { data: adminList = [] } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) return [];
        const json = await res.json();
        return json?.data ?? [];
      } catch (e) {
        return [];
      }
    },
  });

  const adminEmailSet = new Set(
    adminList.map((a: any) => (a.email || "").toLowerCase().trim()).filter(Boolean)
  );
  for (const em of ADMIN_EMAILS) {
    adminEmailSet.add(em.toLowerCase().trim());
  }

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const enriched = customers.map((c: any) => {
    const em = (c.email || "").toLowerCase().trim();
    const isAdmin = adminEmailSet.has(em);
    return {
      ...c,
      role: isAdmin ? "admin" : "customer",
    };
  });

  const filtered = enriched.filter((c: any) => {
    if (roleFilter !== "all" && c.role !== roleFilter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (c.full_name ?? "").toLowerCase().includes(s) ||
      (c.email ?? "").toLowerCase().includes(s) ||
      (c.phone ?? "").toLowerCase().includes(s) ||
      (c.city ?? "").toLowerCase().includes(s)
    );
  });

  const adminCount = enriched.filter((c: any) => c.role === "admin").length;
  const customerCount = enriched.filter((c: any) => c.role === "customer").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-semibold">Users & Customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {customers.length} registered accounts ({adminCount} platform admins, {customerCount} shoppers).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter Tabs */}
          <div className="inline-flex rounded-full border border-border bg-secondary/50 p-1 text-xs">
            <button
              onClick={() => setRoleFilter("all")}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                roleFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setRoleFilter("customer")}
              className={`rounded-full px-3 py-1 font-medium transition-all ${
                roleFilter === "customer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Customers ({customerCount})
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-all ${
                roleFilter === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-3 w-3" />
              Admins ({adminCount})
            </button>
          </div>

          <label className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email, phone, city"
              className="font-subhead h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {isLoading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">No users match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="font-subhead text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Location</th>
                <th className="px-5 text-right">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const isAdmin = c.role === "admin";
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                            <Shield className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <span>{c.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className="text-muted-foreground">{c.email || "—"}</td>
                    <td>
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          Administrator
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Customer
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground">{c.phone || "—"}</td>
                    <td className="text-muted-foreground">
                      {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 text-right text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminCustomers;
