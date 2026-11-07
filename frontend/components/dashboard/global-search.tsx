"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, ShoppingBag, User, Package, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/format";

interface SearchResults {
  orders: any[];
  customers: any[];
  products: any[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    orders: [],
    customers: [],
    products: [],
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search logic
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults({ orders: [], customers: [], products: [] });
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const qLower = trimmed.toLowerCase();
        const [ordersRes, profilesRes, productsRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, total, status, payment_status, created_at")
            .limit(5),
          supabase
            .from("profiles")
            .select("id, full_name, email, phone")
            .limit(5),
          supabase
            .from("farmer_products")
            .select("id, name, slug, category, price, stock")
            .limit(5),
        ]);

        const matchedOrders = (ordersRes.data || []).filter((o: any) =>
          o.id?.toLowerCase().includes(qLower)
        );

        const matchedCustomers = (profilesRes.data || []).filter(
          (c: any) =>
            c.full_name?.toLowerCase().includes(qLower) ||
            c.email?.toLowerCase().includes(qLower) ||
            c.phone?.includes(trimmed)
        );

        const matchedProducts = (productsRes.data || []).filter(
          (p: any) =>
            p.name?.toLowerCase().includes(qLower) ||
            p.category?.toLowerCase().includes(qLower) ||
            p.slug?.toLowerCase().includes(qLower)
        );

        setResults({
          orders: matchedOrders,
          customers: matchedCustomers,
          products: matchedProducts,
        });
      } catch (err) {
        console.warn("Global search query error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  const hasResults =
    results.orders.length > 0 || results.customers.length > 0 || results.products.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search orders, customers, products..."
          className="font-subhead h-9 w-full rounded-full border border-border bg-secondary/20 pl-9 pr-8 text-xs outline-none focus:border-primary focus:bg-background transition"
        />
        {query ? (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="absolute right-3 hidden sm:inline-block font-mono text-[9px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </span>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-2xl border border-border bg-background shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" /> Searching platform...
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching orders, customers, or products found.
            </div>
          ) : (
            <div className="p-2 space-y-3 divide-y divide-border">
              {/* Orders Group */}
              {results.orders.length > 0 && (
                <div className="pt-1">
                  <div className="px-3 py-1 font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="h-3 w-3 text-primary" /> Orders ({results.orders.length})
                  </div>
                  {results.orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleSelect(`/admin/orders`)}
                      className="w-full text-left px-3 py-2 hover:bg-secondary/40 rounded-xl transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-mono font-bold text-foreground">
                          Order #{o.id.substring(0, 8)}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-primary">{inr(o.total)}</span>
                        <span className="block text-[9px] uppercase font-semibold text-muted-foreground">
                          {o.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Customers Group */}
              {results.customers.length > 0 && (
                <div className="pt-2">
                  <div className="px-3 py-1 font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <User className="h-3 w-3 text-primary" /> Customers ({results.customers.length})
                  </div>
                  {results.customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(`/admin/customers`)}
                      className="w-full text-left px-3 py-2 hover:bg-secondary/40 rounded-xl transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-foreground">{c.full_name || "Customer"}</p>
                        <p className="text-[10px] text-muted-foreground">{c.email || c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Products Group */}
              {results.products.length > 0 && (
                <div className="pt-2">
                  <div className="px-3 py-1 font-subhead text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                    <Package className="h-3 w-3 text-primary" /> Products ({results.products.length})
                  </div>
                  {results.products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(`/admin/products`)}
                      className="w-full text-left px-3 py-2 hover:bg-secondary/40 rounded-xl transition flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {p.category?.replace(/-/g, " ")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-primary">{inr(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
