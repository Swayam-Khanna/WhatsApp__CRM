"use client";

import Image from "next/image";
import { Link } from "@/lib/tanstack-compat";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { useCart, cartTotals } from "@/lib/cart-store";
import { inr } from "@/lib/format";

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const appliedCoupon = useCart((s) => s.appliedCoupon);

  const { subtotal, discountAmount, discountBreakdown, shipping, total, count } = cartTotals(
    items,
    appliedCoupon
  );

  return (
    <MarketingLayout>
      <div className="container-prj pt-12 md:pt-16">
        <h1 className="font-display text-4xl font-semibold md:text-5xl">Your cart</h1>
        <p className="mt-2 text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}
        </p>

        {items.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-border bg-secondary/40 p-14 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-display mt-4 text-xl">Your cart is empty.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse the harvest and add something you love.
            </p>
            <Link
              to="/shop"
              className="font-subhead mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-3">
            <ul className="space-y-4 lg:col-span-2">
              {items.map((i) => (
                <li
                  key={i.slug}
                  className="flex gap-4 rounded-2xl border border-border bg-background p-4"
                >
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                    <Image src={i.image} alt={i.name} fill className="object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          to="/product/$slug"
                          params={{ slug: i.slug }}
                          className="font-display text-base font-medium hover:text-primary"
                        >
                          {i.name}
                        </Link>
                        <p className="font-subhead text-xs text-muted-foreground">
                          {i.weight} · {inr(i.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(i.slug)}
                        aria-label="Remove"
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div className="flex h-9 items-center rounded-full border border-border">
                        <button
                          onClick={() => setQty(i.slug, i.qty - 1)}
                          className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-subhead w-7 text-center text-sm">{i.qty}</span>
                        <button
                          onClick={() => setQty(i.slug, i.qty + 1)}
                          className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="font-display text-base font-semibold">{inr(i.price * i.qty)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-2xl border border-border bg-secondary/40 p-6 space-y-6">
              <h2 className="font-display text-xl font-semibold">Order summary</h2>

              {/* Price Breakdown */}
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-semibold text-foreground">{inr(subtotal)}</dd>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <dt className="flex items-center gap-1">
                      <span>Discount ({appliedCoupon?.code})</span>
                    </dt>
                    <dd className="font-semibold">- {inr(discountAmount)}</dd>
                  </div>
                )}

                <div className="flex justify-between border-t border-border pt-3">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="text-xs text-primary font-medium">
                    {appliedCoupon?.discount.freeShipping ? (
                      <span className="text-success font-semibold">FREE</span>
                    ) : (
                      "Calculated at Checkout"
                    )}
                  </dd>
                </div>

                <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  Postage & packaging fees depend on your delivery location and total parcel weight.
                </div>

                <div className="my-3 h-px bg-border" />

                <div className="flex justify-between text-base">
                  <dt className="font-display font-semibold">Estimated Total</dt>
                  <dd className="font-display font-semibold text-primary">
                    {inr(Math.max(0, subtotal - (appliedCoupon?.discount.freeShipping ? 0 : discountAmount)))}
                  </dd>
                </div>
              </dl>

              <Link
                to="/checkout"
                className="font-subhead block w-full rounded-full bg-primary py-3 text-center text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Proceed to checkout
              </Link>
              <Link
                to="/shop"
                className="font-subhead block w-full rounded-full border border-border bg-background py-3 text-center text-sm font-medium hover:bg-background/70 transition"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
}

export default CartPage;
