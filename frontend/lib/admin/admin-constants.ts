// Strictly allowed canonical admin emails
export const ADMIN_EMAILS = new Set([
  "khannaswayam1@gmail.com",
  "aimnishant@zohomail.in",
  "nishantsharmasolan@gmail.com",
  "tanujpmk@gmail.com",
]);

export type AdminRoleLevel = "super_admin" | "ops" | "support" | "content";

export const ROLE_PERMISSIONS: Record<AdminRoleLevel, string[]> = {
  super_admin: [
    "/admin/dashboard",
    "/admin/vendors",
    "/admin/products",
    "/admin/inventory",
    "/admin/orders",
    "/admin/messages",
    "/admin/customers",
    "/admin/settlements",
    "/admin/live-traffic",
    "/admin/coupons",
    "/admin/discounts",
    "/admin/banners",
    "/admin/shipping",
    "/admin/reviews",
    "/admin/journal",
    "/admin/settings",
  ],
  ops: [
    "/admin/dashboard",
    "/admin/vendors",
    "/admin/products",
    "/admin/inventory",
    "/admin/orders",
    "/admin/messages",
    "/admin/settlements",
    "/admin/shipping",
    "/admin/live-traffic",
  ],
  support: [
    "/admin/dashboard",
    "/admin/orders",
    "/admin/messages",
    "/admin/customers",
    "/admin/reviews",
  ],
  content: [
    "/admin/products",
    "/admin/banners",
    "/admin/journal",
    "/admin/reviews",
  ],
};
