"use client";

import { createFileRoute, Link, useSearch } from "@/lib/tanstack-compat";
import { useMemo, useState, useEffect, Suspense } from "react";
import { Search, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/marketing/layout";
import { ProductCard } from "@/components/store/product-card";
import { allProducts } from "@/lib/mock/products";
import { categories } from "@/lib/mock/categories";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getStoredCustomProducts,
  subscribeToProductUpdates,
  formatStoreProduct,
} from "@/lib/services/productSyncService";
import {
  inventoryService,
  subscribeToInventoryUpdates,
  getStoredInventory,
} from "@/lib/services/inventoryService";

const shopSearchSchema = z.object({
  q: z.string().optional().catch(""),
  cat: z.string().optional().catch("all"),
});

function ShopPageContent() {
  const qc = useQueryClient();
  const search = useSearch();
  const [q, setQ] = useState(search.q || "");
  const [cat, setCat] = useState(search.cat || "all");

  // Sync state if URL changes
  useEffect(() => {
    if (search.q !== undefined) setQ(search.q);
    if (search.cat !== undefined) setCat(search.cat);
  }, [search.q, search.cat]);

  const [sort, setSort] = useState<"featured" | "price-asc" | "price-desc" | "rating">("featured");

  // Authoritative live inventory query
  const { data: inventoryRecords = [], refetch: refetchInventory } = useQuery({
    queryKey: ["public-live-inventory"],
    queryFn: () => inventoryService.getAllInventory(),
    staleTime: 5000,
  });

  const { data: dbProducts = [], isLoading, refetch } = useQuery({
    queryKey: ["public-all-products"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const json = await res.json();
          if (json.products && Array.isArray(json.products)) {
            return json.products.filter((p: any) => !p.status || p.status === "published");
          }
        }
      } catch (err) {
        console.warn("[ShopPage] API fetch error, falling back:", err);
      }
      try {
        const { data, error } = await supabase
          .from("farmer_products")
          .select(
            `
            *,
            farmer_profiles:farmer_id (
              slug,
              full_name,
              village,
              state
            )
          `,
          );
        if (error) {
          console.warn("[ShopPage] Error fetching db products:", error);
          return [];
        }
        return (data ?? []).filter((p: any) => !p.status || p.status === "published");
      } catch (err) {
        console.warn("[ShopPage] Catch fetching db products:", err);
        return [];
      }
    },
  });

  // Local synced custom products (instant multi-tab synchronization)
  const [localProducts, setLocalProducts] = useState<any[]>([]);

  useEffect(() => {
    setLocalProducts(
      getStoredCustomProducts().filter((p) => !p.status || p.status === "published")
    );
    const unsubProd = subscribeToProductUpdates(() => {
      setLocalProducts(
        getStoredCustomProducts().filter((p) => !p.status || p.status === "published")
      );
      refetch();
    });

    const unsubInv = subscribeToInventoryUpdates(() => {
      qc.invalidateQueries({ queryKey: ["public-live-inventory"] });
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      refetchInventory();
      refetch();
    });

    return () => {
      unsubProd();
      unsubInv();
    };
  }, [refetch, refetchInventory, qc]);

  // Inventory Map incorporating both synchronous local storage and live DB records
  const inventoryMap = useMemo(() => {
    const map = new Map<string, any>();
    // Synchronous fallback from local cache
    getStoredInventory().forEach((rec) => {
      if (rec.product_id) map.set(rec.product_id, rec);
      if (rec.product_slug) map.set(rec.product_slug, rec);
      if (rec.product_name) map.set(rec.product_name.trim().toLowerCase(), rec);
    });
    // Fresh query data
    inventoryRecords.forEach((rec) => {
      if (rec.product_id) map.set(rec.product_id, rec);
      if (rec.product_slug) map.set(rec.product_slug, rec);
      if (rec.product_name) map.set(rec.product_name.trim().toLowerCase(), rec);
    });
    return map;
  }, [inventoryRecords]);

  const mappedCustomProducts = useMemo(() => {
    return localProducts.map((p) => formatStoreProduct(p, inventoryMap.get(p.id) || inventoryMap.get(p.slug))).filter(Boolean);
  }, [localProducts, inventoryMap]);

  const mappedDbProducts = useMemo(() => {
    return dbProducts.map((p: any) => formatStoreProduct(p, inventoryMap.get(p.id) || inventoryMap.get(p.slug))).filter(Boolean);
  }, [dbProducts, inventoryMap]);

  const combinedProducts = useMemo(() => {
    // Put custom and database products first so new products are immediately visible at the top!
    const customAndDb = [...mappedCustomProducts, ...mappedDbProducts];
    const seen = new Set<string>();
    const uniqueCustomDb: any[] = [];
    for (const p of customAndDb) {
      const key = p.id || p.slug;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (p.slug) seen.add(p.slug);

      const inv =
        inventoryMap.get(p.id) ||
        inventoryMap.get(p.slug) ||
        (p.name ? inventoryMap.get(p.name.trim().toLowerCase()) : null);

      const resolvedStock = inv ? Number(inv.quantity ?? 0) : Number(p.stock ?? 100);
      const allowsPre = inv
        ? Boolean(inv.preorder_enabled)
        : Boolean(p.is_preorder || p.preOrder?.enabled);

      uniqueCustomDb.push({
        ...p,
        stock: resolvedStock,
        is_preorder: allowsPre,
        preOrder: {
          ...p.preOrder,
          enabled: allowsPre,
        },
      });
    }

    // Merge with static catalog, avoiding duplicates
    const finalCatalog = [
      ...uniqueCustomDb,
      ...allProducts
        .filter((p: any) => !seen.has(p.slug) && !seen.has((p as any).id))
        .map((p: any) => {
          const inv =
            inventoryMap.get(p.id) ||
            inventoryMap.get(p.slug) ||
            (p.name ? inventoryMap.get(p.name.trim().toLowerCase()) : null);
          if (inv) {
            const allowsPre = Boolean(inv.preorder_enabled);
            return {
              ...p,
              stock: Number(inv.quantity ?? 0),
              is_preorder: allowsPre,
              preOrder: {
                ...p.preOrder,
                enabled: allowsPre,
              },
            };
          }
          return p;
        }),
    ];
    return finalCatalog;
  }, [mappedCustomProducts, mappedDbProducts, inventoryMap]);

  const items = useMemo(() => {
    let list = combinedProducts.filter((p) => (cat === "all" ? true : p.category === cat));
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(t) || p.description.toLowerCase().includes(t),
      );
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [q, cat, sort, combinedProducts]);

  return (
    <MarketingLayout>
      <div className="container-prj pt-6 md:pt-8">
        {/* Compact Single-Row Header + Controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-4">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Shop the harvest
            </h1>
            <span className="text-xs font-medium text-muted-foreground">
              ({combinedProducts.length} items)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search produce, spices, pickles…"
                className="font-subhead h-9 w-full rounded-full border border-border bg-background pl-9 pr-3 text-xs outline-none transition-colors focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="font-subhead h-9 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="font-subhead h-9 rounded-full border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-1 flex-nowrap sm:flex-wrap">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
              {c.name}
            </Chip>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border p-4 bg-background">
                <Skeleton className="h-48 w-full rounded-xl" />
                <Skeleton className="h-5 w-2/3 mt-2" />
                <Skeleton className="h-4 w-1/2" />
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border bg-secondary/50 p-12 text-center">
            <p className="font-display text-xl">No products matched your search.</p>
            <button
              onClick={() => {
                setQ("");
                setCat("all");
              }}
              className="font-subhead mt-4 text-sm text-primary underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {items.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}

        <div className="mt-16 text-sm text-muted-foreground">
          Looking for a specific farmer?{" "}
          <Link to="/farmers" className="text-primary underline">
            Browse farmers
          </Link>
          .
        </div>
      </div>
    </MarketingLayout>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-subhead rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function ShopPage() {
  return (
    <Suspense
      fallback={
        <MarketingLayout>
          <div className="container-prj grid place-items-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </MarketingLayout>
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}

export default ShopPage;
