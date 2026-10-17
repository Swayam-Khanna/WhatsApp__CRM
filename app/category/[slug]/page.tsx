"use client";

import { Link, notFound, useParams } from "@/lib/tanstack-compat";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/marketing/layout";
import { ProductCard } from "@/components/store/product-card";
import { categoryBySlug, categories } from "@/lib/mock/categories";
import { productsByCategory } from "@/lib/mock/products";
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

function CategoryPage() {
  const qc = useQueryClient();
  const { slug } = useParams();
  const slugStr = typeof slug === "string" ? slug : "";
  const cat = categoryBySlug(slugStr);

  const mockItems = productsByCategory(slugStr);

  // Authoritative live inventory query
  const { data: inventoryRecords = [], refetch: refetchInventory } = useQuery({
    queryKey: ["public-live-inventory"],
    queryFn: () => inventoryService.getAllInventory(),
    staleTime: 5000,
  });

  const { data: dbProducts = [], isLoading, refetch } = useQuery({
    queryKey: ["category-products", cat?.slug],
    queryFn: async () => {
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
          )
          .eq("category", cat?.slug);
        if (error) return [];
        return (data ?? []).filter((p: any) => !p.status || p.status === "published");
      } catch {
        return [];
      }
    },
    enabled: !!cat,
  });

  const [localProducts, setLocalProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!cat?.slug) return;
    setLocalProducts(
      getStoredCustomProducts().filter(
        (p) => p.category === cat.slug && (!p.status || p.status === "published")
      )
    );
    const unsubProd = subscribeToProductUpdates(() => {
      setLocalProducts(
        getStoredCustomProducts().filter(
          (p) => p.category === cat.slug && (!p.status || p.status === "published")
        )
      );
      refetch();
    });

    const unsubInv = subscribeToInventoryUpdates(() => {
      qc.invalidateQueries({ queryKey: ["public-live-inventory"] });
      qc.invalidateQueries({ queryKey: ["category-products", cat?.slug] });
      refetchInventory();
      refetch();
    });

    return () => {
      unsubProd();
      unsubInv();
    };
  }, [cat?.slug, refetch, refetchInventory, qc]);

  // Inventory Map incorporating both synchronous local storage and live DB records
  const inventoryMap = useMemo(() => {
    const map = new Map<string, any>();
    getStoredInventory().forEach((rec) => {
      if (rec.product_id) map.set(rec.product_id, rec);
      if (rec.product_slug) map.set(rec.product_slug, rec);
      if (rec.product_name) map.set(rec.product_name.trim().toLowerCase(), rec);
    });
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

  const combinedItems = useMemo(() => {
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
    return [
      ...uniqueCustomDb,
      ...mockItems
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
  }, [mockItems, mappedCustomProducts, mappedDbProducts, inventoryMap]);

  if (!cat) {
    notFound();
    return null;
  }
  return (
    <MarketingLayout>
      <div className="container-prj pt-6 md:pt-8 pb-16">
        <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">Category</p>
        <h1 className="font-display mt-1 text-2xl md:text-3xl font-semibold tracking-tight">{cat.name}</h1>
        <p className="mt-1.5 max-w-xl text-xs md:text-sm text-muted-foreground">{cat.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className={`font-subhead rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                c.slug === cat.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {combinedItems.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border bg-secondary/50 p-10 text-center">
            <p className="font-display text-xl">No products in this category yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check back soon — new harvests are listed weekly.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {combinedItems.map((p: any) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}

export default CategoryPage;
