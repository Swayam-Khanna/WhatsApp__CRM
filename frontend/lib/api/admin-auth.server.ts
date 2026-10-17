import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server.js";
import { requireAdmin, requireUser, safeCompare } from "../../../backend/lib/server-auth.ts";

export interface AdminAuthResult {
  authenticated: boolean;
  user?: {
    uid: string;
    email: string;
    role?: string;
  };
  error?: string;
  statusCode?: number;
}

export interface UserAuthResult {
  authenticated: boolean;
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
  error?: string;
  statusCode?: number;
}

/**
 * Server-side Admin Authentication & Authorization Checker.
 * Verifies caller identity against Neon Auth session or Admin API Key.
 */
export async function verifyAdminRequest(req: Request | NextRequest): Promise<AdminAuthResult> {
  // 1. Check API Key Header (only valid if ADMIN_API_SECRET is configured to a non-empty string)
  const adminApiKey = req.headers?.get ? (req.headers.get("x-admin-key") || req.headers.get("x-admin-secret")) : null;
  const configuredSecret = (process.env.ADMIN_API_SECRET || "").trim();
  if (configuredSecret && adminApiKey && safeCompare(adminApiKey, configuredSecret)) {
    return {
      authenticated: true,
      user: {
        uid: "system-admin-key",
        email: "system-admin@prajnaafarm.com",
        role: "super_admin",
      },
    };
  }

  // 2. Verify via requireAdmin
  const adminCheck = await requireAdmin(req);
  if (adminCheck.user) {
    return {
      authenticated: true,
      user: {
        uid: adminCheck.user.id,
        email: adminCheck.user.email,
        role: "super_admin",
      },
    };
  }

  return {
    authenticated: false,
    error: "Unauthorized or lacks verified administrator privileges.",
    statusCode: adminCheck.response?.status || 401,
  };
}

/**
 * Route Guard helper for Admin routes.
 * Returns NextResponse error if unauthorized, or null if the caller is authorized.
 */
export async function requireAdminAuth(req: Request | NextRequest): Promise<NextResponse | null> {
  const result = await verifyAdminRequest(req);
  if (!result.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Admin access required.",
        code: "UNAUTHORIZED_ADMIN",
      },
      { status: result.statusCode || 401 }
    );
  }
  return null;
}

/**
 * General User Authentication Checker for user-scoped endpoints.
 */
export async function verifyUserAuth(req: Request | NextRequest): Promise<UserAuthResult> {
  const userCheck = await requireUser(req);
  if (userCheck.user) {
    return {
      authenticated: true,
      user: {
        uid: userCheck.user.id,
        email: userCheck.user.email,
        role: userCheck.user.role,
      },
    };
  }

  return {
    authenticated: false,
    error: "Unauthorized. Please log in to perform this action.",
    statusCode: userCheck.response?.status || 401,
  };
}

export async function requireUserAuth(
  req: Request | NextRequest
): Promise<{ user: { uid: string; email?: string; role?: string } } | NextResponse> {
  const result = await verifyUserAuth(req);
  if (!result.authenticated || !result.user) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Authentication required.",
        code: "UNAUTHORIZED",
      },
      { status: result.statusCode || 401 }
    );
  }
  return { user: result.user };
}
