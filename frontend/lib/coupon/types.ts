export type CouponType =
  | "amount_off"
  | "percent_off"
  | "free_shipping"
  | "sale_price"
  | "bogo";

export type CouponApplyTo = "entire_order" | "specific_category" | "specific_items";

export type CouponStatus = "active" | "scheduled" | "expired";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  type: CouponType;
  value: number | null;
  buyQty: number | null;
  getQty: number | null;
  applyTo: CouponApplyTo;
  categoryId: string | null;
  itemIds: string[] | null;
  applyOncePerOrder: boolean;
  includeSubscriptions: boolean;
  startDate: string;
  endDate: string | null;
  totalUseLimit: number | null;
  perCustomerLimit: number | null;
  timesUsed: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Computed on read / render
  status?: CouponStatus;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  customerId: string;
  orderId?: string | null;
  redeemedAt: string;
}

export interface CartItemForCoupon {
  slug: string;
  name: string;
  price: number;
  qty: number;
  weight?: string;
  image?: string;
  category?: string;
  baseSlug?: string;
  isSubscription?: boolean;
}

export interface CartForCoupon {
  items: CartItemForCoupon[];
  shippingCost?: number;
  isSubscriptionOrder?: boolean;
}

export interface AppliedCouponDiscount {
  discountAmount: number;
  freeShipping: boolean;
  breakdown: string;
  eligibleItemCount: number;
  newSubtotal: number;
  newShipping: number;
  newTotal: number;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discount?: AppliedCouponDiscount;
}
