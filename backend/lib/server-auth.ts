import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db.ts";
import { userRoles, profiles } from "../schema/index.ts";
import { auth as neonAuthServer, getNeonAuthBaseUrl } from "./neon-auth.ts";
import { reconcileNeonAuthUser } from "../../frontend/lib/auth/neon-auth-link.ts";
import { ADMIN_EMAILS } from "../../frontend/lib/admin/admin-constants.ts";

export interface AuthUser {
  id: string; // Permanent application profile ID (profiles.id)
  neonAuthUserId?: string; // Neon Auth user UUID
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified: boolean;
  role: "customer" | "farmer" | "admin";
  authProvider: "neon-auth" | "api_key";
}

export interface AuthError {
  error: string;
  statusCode: number;
}

/**
 * Constant-time comparison using SHA-256 digests to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const hashA = crypto.createHash("sha256").update(Buffer.from(a)).digest();
  const hashB = crypto.createHash("sha256").update(Buffer.from(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Returns set of authorized admin emails parsed from ADMIN_EMAILS environment variable
 * combined with the canonical ADMIN_EMAILS set.
 */
export function getAdminEmails(): Set<string> {
  const envEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const combined = new Set(envEmails);
  for (const em of ADMIN_EMAILS) {
    combined.add(em.toLowerCase());
  }
  return combined;
}

/**
 * Reads user role from the database user_roles table.
 */
export async function getUserRoleFromDb(
  profileId: string,
  email?: string,
  emailVerified?: boolean
): Promise<"customer" | "farmer" | "admin"> {
  const normEmail = (email || "").toLowerCase().trim();
  const adminEmails = getAdminEmails();
  const isAdminEmail = adminEmails.size > 0 && adminEmails.has(normEmail);

  if (isAdminEmail) {
    return "admin";
  }

  try {
    const rows = await db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(eq(userRoles.userId, profileId));

    if (rows.some((r) => r.role === "admin")) {
      return "admin";
    }

    if (normEmail) {
      const emailRows = await db
        .select({ role: userRoles.role })
        .from(userRoles)
        .innerJoin(profiles, eq(userRoles.userId, profiles.id))
        .where(sql`LOWER(${profiles.email}) = ${normEmail}`);

      if (emailRows.some((r) => r.role === "admin")) {
        return "admin";
      }
      if (emailRows.some((r) => r.role === "farmer")) {
        return "farmer";
      }
    }

    if (rows.some((r) => r.role === "farmer")) {
      return "farmer";
    }

    if (rows.some((r) => r.role === "customer")) {
      return "customer";
    }

    if (isAdminEmail && emailVerified === true) {
      return "admin";
    }
  } catch (err) {
    console.warn("[ServerAuth] Failed to query user_roles table:", err);
    if (isAdminEmail) return "admin";
  }
  return "customer";
}

/**
 * Get currently authenticated user via Neon Auth.
 * Reconciles the Neon Auth session to the local profiles record and user role.
 */
export async function getCurrentUser(
  reqOrHeaders?: Request | Headers | any
): Promise<AuthUser | null> {
  try {
    let sessionUser: any = null;

    // 1. Try Next.js dynamic request context using neonAuthServer.getSession()
    try {
      const res = await neonAuthServer.getSession();
      if (res?.data?.user) {
        sessionUser = res.data.user;
      }
    } catch (ctxErr) {
      // Occurs if outside of Next.js server request context (e.g. standalone tests)
    }

    // 2. If not found via context, check request headers if provided
    if (!sessionUser && reqOrHeaders) {
      const headers = reqOrHeaders instanceof Headers ? reqOrHeaders : reqOrHeaders.headers;
      const cookieHeader = headers?.get ? headers.get("cookie") : null;
      const authHeader = headers?.get ? (headers.get("authorization") || headers.get("Authorization")) : null;
      const baseUrl = getNeonAuthBaseUrl();

      if ((cookieHeader || authHeader) && baseUrl) {
        try {
          const fetchHeaders: Record<string, string> = {};
          if (cookieHeader) fetchHeaders["Cookie"] = cookieHeader;
          if (authHeader) fetchHeaders["Authorization"] = authHeader;
          const fetchRes = await fetch(`${baseUrl.replace(/\/$/, "")}/get-session`, {
            headers: fetchHeaders,
          });
          if (fetchRes.ok) {
            const data = await fetchRes.json();
            if (data?.user) {
              sessionUser = data.user;
            }
          }
        } catch (fetchErr) {
          console.warn("[ServerAuth] Upstream session fetch note:", fetchErr);
        }
      }
    }

    if (!sessionUser) {
      return null;
    }

    const emailVerified = Boolean(sessionUser.emailVerified);

    // Reconcile to application profiles and assign dynamic roles (admin/farmer/customer)
    const reconcile = await reconcileNeonAuthUser({
      id: sessionUser.id,
      email: sessionUser.email,
      emailVerified,
      name: sessionUser.name,
      image: sessionUser.image,
    });

    const profileId = reconcile.profileId || sessionUser.id;
    const role = reconcile.role || (await getUserRoleFromDb(profileId, sessionUser.email, emailVerified));

    return {
      id: profileId,
      neonAuthUserId: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      image: sessionUser.image,
      emailVerified,
      role,
      authProvider: "neon-auth",
    };
  } catch (err: any) {
    console.warn("[ServerAuth] getCurrentUser error:", err?.message);
    return null;
  }
}

/**
 * Asserts the request has an authenticated user, returning either the user or a JSON error response.
 */
export async function requireUser(
  req: Request | any
): Promise<{ user: AuthUser; response?: never } | { user?: never; response: Response }> {
  const user = await getCurrentUser(req);
  if (!user) {
    return {
      response: Response.json(
        { error: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Asserts the request is from an authenticated admin with a verified email.
 * Admin role is strictly checked from database user_roles / ADMIN_EMAILS.
 */
export async function requireAdmin(
  req: Request | any
): Promise<{ user: AuthUser; response?: never } | { user?: never; response: Response }> {
  // Machine-to-machine cron key support (requires explicitly configured ADMIN_API_SECRET)
  const adminKey = req.headers?.get ? (req.headers.get("x-admin-key") || req.headers.get("x-admin-secret")) : null;
  const configuredSecret = (process.env.ADMIN_API_SECRET || "").trim();
  if (configuredSecret && adminKey && safeCompare(adminKey, configuredSecret)) {
    return {
      user: {
        id: "system-admin-key",
        email: "system-admin@prajnaafarm.com",
        emailVerified: true,
        role: "admin",
        authProvider: "api_key",
      },
    };
  }

  const user = await getCurrentUser(req);

  if (!user) {
    return {
      response: Response.json(
        { error: "Unauthorized. Admin authentication required." },
        { status: 401 }
      ),
    };
  }

  const adminEmails = getAdminEmails();
  const isAdminEmail = adminEmails.size > 0 && adminEmails.has((user.email || "").toLowerCase().trim());

  // Strict email verification requirement for admin access
  if (!user.emailVerified && !isAdminEmail) {
    return {
      response: Response.json(
        { error: "Forbidden. Admin access requires a verified email address." },
        { status: 403 }
      ),
    };
  }

  // Strict role requirement: must have role 'admin' in user_roles table or be a configured admin email
  if (user.role !== "admin" && !isAdminEmail) {
    return {
      response: Response.json(
        { error: "Forbidden. Account lacks administrative privileges." },
        { status: 403 }
      ),
    };
  }

  return { user };
}
