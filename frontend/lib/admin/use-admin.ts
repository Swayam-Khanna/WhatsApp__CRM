"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAILS, ROLE_PERMISSIONS, type AdminRoleLevel } from "./admin-constants";

export { ADMIN_EMAILS, ROLE_PERMISSIONS, type AdminRoleLevel };

export function hasPermission(role: AdminRoleLevel | string | undefined | null, path: string): boolean {
  if (!role || role === "super_admin" || role === "admin") return true;
  const allowed = (ROLE_PERMISSIONS as any)[role] || [];
  return allowed.some((allowedPath: string) => path.startsWith(allowedPath));
}

export function useIsAdmin() {
  const { user, loading } = useAuth();
  const q = useQuery({
    enabled: !!user,
    queryKey: ["is-admin", user?.id, user?.email],
    queryFn: async (): Promise<{ isAdmin: boolean; roleLevel: AdminRoleLevel }> => {
      if (!user) return { isAdmin: false, roleLevel: "ops" };

      const em = (user.email || "").toLowerCase().trim();

      // Check strictly against canonical admin emails
      if (ADMIN_EMAILS.has(em)) {
        return { isAdmin: true, roleLevel: "super_admin" };
      }

      // Check database role assigned in Neon (user_roles table)
      try {
        const res = await fetch("/api/account/profile", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.role === "admin") {
            return { isAdmin: true, roleLevel: "super_admin" };
          }
        }
      } catch (err) {}

      // Any other user is denied admin access
      return { isAdmin: false, roleLevel: "ops" };
    },
  });

  const adminInfo = q.data || { isAdmin: false, roleLevel: "ops" as AdminRoleLevel };

  return {
    isAdmin: !!adminInfo.isAdmin,
    roleLevel: adminInfo.roleLevel || ("ops" as AdminRoleLevel),
    isLoading: loading || q.isLoading,
    user,
  };
}
