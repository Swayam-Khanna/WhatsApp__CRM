import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Coupon, AppliedCouponDiscount } from "@/lib/coupon/types";

export type CartItem = {
  slug: string;
  name: string;
  image: string;
  price: number;
  weight: string;
  qty: number;
  category?: string;
  baseSlug?: string;
  isSubscription?: boolean;
  sku?: string;
  isPreOrder?: boolean;
  harvestLabel?: string;
};

export type AppliedCouponState = {
  code: string;
  coupon: Coupon;
  discount: AppliedCouponDiscount;
};

type CartState = {
  items: CartItem[];
  appliedCoupon: AppliedCouponState | null;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  setAppliedCoupon: (couponState: AppliedCouponState | null) => void;
  clearAppliedCoupon: () => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      appliedCoupon: null,
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.slug === item.slug);
          if (existing) {
            return {
              items: s.items.map((i) => (i.slug === item.slug ? { ...i, qty: i.qty + qty } : i)),
            };
          }
          return { items: [...s.items, { ...item, qty }] };
        }),
      remove: (slug) =>
        set((s) => {
          const newItems = s.items.filter((i) => i.slug !== slug);
          return {
            items: newItems,
            // If cart is empty, clear coupon
            appliedCoupon: newItems.length === 0 ? null : s.appliedCoupon,
          };
        }),
      setQty: (slug, qty) =>
        set((s) => {
          const newItems =
            qty <= 0
              ? s.items.filter((i) => i.slug !== slug)
              : s.items.map((i) => (i.slug === slug ? { ...i, qty } : i));
          return {
            items: newItems,
            appliedCoupon: newItems.length === 0 ? null : s.appliedCoupon,
          };
        }),
      setAppliedCoupon: (appliedCoupon) => set({ appliedCoupon }),
      clearAppliedCoupon: () => set({ appliedCoupon: null }),
      clear: () => set({ items: [], appliedCoupon: null }),
    }),
    { name: "prajnaa-cart" },
  ),
);

export const cartTotals = (
  items: CartItem[],
  appliedCoupon?: AppliedCouponState | null,
  customShipping?: number
) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  let shipping =
    customShipping !== undefined
      ? customShipping
      : subtotal > 999 || subtotal === 0
      ? 0
      : 49;

  let discountAmount = 0;
  let discountBreakdown = "";

  if (appliedCoupon && appliedCoupon.discount) {
    if (appliedCoupon.discount.freeShipping) {
      shipping = 0;
    }
    discountAmount = appliedCoupon.discount.discountAmount || 0;
    discountBreakdown = appliedCoupon.discount.breakdown || "";
  }

  const finalSubtotal = Math.max(0, subtotal - (appliedCoupon?.discount.freeShipping ? 0 : discountAmount));
  const total = finalSubtotal + shipping;

  return {
    subtotal,
    discountAmount,
    discountBreakdown,
    shipping,
    total,
    count: items.reduce((s, i) => s + i.qty, 0),
  };
};
