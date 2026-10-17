"use client";

import { createFileRoute, Link } from "@/lib/tanstack-compat";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { Reveal } from "@/components/reveal";
import { allProducts } from "@/lib/mock/products";
import { inr } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";

function WishlistPage() {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const seed = useWishlist((s) => s.add);
  const userId = useWishlist((s) => s.userId);
  const add = useCart((s) => s.add);

  // First-visit seed for guests so the demo isn't empty.
  useEffect(() => {
    if (items.length === 0 && !userId) {
      const seeded =
        typeof window !== "undefined" && localStorage.getItem("prajnaa-wishlist-seeded");
      if (!seeded) {
        allProducts
          .slice(0, 4)
          .forEach((p) =>
            seed({ slug: p.slug, name: p.name, image: p.image, price: p.price, weight: p.weight }),
          );
        try {
          localStorage.setItem("prajnaa-wishlist-seeded", "1");
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const products = useMemo(
    () =>
      items
        .map((w) => ({ w, p: allProducts.find((p) => p.slug === w.slug) }))
        .filter((x): x is { w: (typeof items)[number]; p: NonNullable<typeof x.p> } => !!x.p),
    [items],
  );

  return (
    <MarketingLayout>
      <div className="container-prj pt-6 md:pt-8">
        {/* Clean Single-Row Wishlist Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between border-b border-border/40 pb-3 gap-2">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              Saved for later
            </h1>
            <span className="text-xs font-medium text-muted-foreground">
              ({products.length} {products.length === 1 ? "item" : "items"})
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {userId
              ? "Synced across all your devices."
              : "Sign in to sync your saved items across devices."}
          </p>
        </div>

        {/* Products Grid directly below header */}
        <div className="mt-6 pb-16">
          {products.length === 0 ? (
            <Reveal>
              <div className="mx-auto max-w-md rounded-3xl border border-border bg-background p-10 text-center mt-6">
                <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="font-display mt-4 text-xl font-semibold">Nothing saved yet</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Browse the shop and tap the heart on anything you'd like to come back to.
                </p>
                <Link
                  to="/shop"
                  className="font-subhead mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  Browse the shop
                </Link>
              </div>
            </Reveal>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {products.map(({ p }, i) => (
              <Reveal key={p.slug} delay={(i % 4) * 80}>
                <div className="group flex h-full flex-col rounded-2xl border border-border bg-background p-3 transition-shadow hover:shadow-[0_20px_50px_-20px_oklch(0.34_0.06_156_/_0.25)]">
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="relative block overflow-hidden rounded-xl bg-secondary"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </Link>
                  <div className="mt-4 flex flex-1 flex-col px-1 pb-1">
                    <Link to="/product/$slug" params={{ slug: p.slug }}>
                      <h3 className="font-display text-base font-medium leading-snug">{p.name}</h3>
                    </Link>
                    <p className="font-subhead mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {p.weight}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-display text-lg font-semibold">{inr(p.price)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          aria-label={`Remove ${p.name} from wishlist`}
                          onClick={() => {
                            remove(p.slug);
                            toast("Removed from wishlist");
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            add({
                              slug: p.slug,
                              name: p.name,
                              image: p.image,
                              price: p.price,
                              weight: p.weight,
                            });
                            toast.success(`${p.name} added to cart`);
                          }}
                          className="font-subhead inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-all hover:-translate-y-0.5"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
        </div>
      </div>
    </MarketingLayout>
  );
}

export default WishlistPage;
