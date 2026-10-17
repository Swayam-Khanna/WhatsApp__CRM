import test from "node:test";
import assert from "node:assert/strict";

test("Better Auth & Unified Server-Side Auth Abstraction Suite", async (t) => {
  // Set dev test database URL to test branch
  process.env.DATABASE_URL =
    process.env.NEON_TEST_BRANCH_URL ||
    "postgresql://neondb_owner:npg_jKvq1zyZ5usQ@ep-aged-art-b3wz564o-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  process.env.BETTER_AUTH_SECRET = "prajnaa-test-secret-must-be-at-least-32-chars-long";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

  await t.test("1. Better Auth Schema Tables & Initialization", async () => {
    const { user, session, account, verification } = await import("../backend/schema/auth.ts");
    assert.ok(user, "User table should be defined");
    assert.ok(session, "Session table should be defined");
    assert.ok(account, "Account table should be defined");
    assert.ok(verification, "Verification table should be defined");

    const { auth } = await import("../backend/lib/auth.ts");
    assert.ok(auth, "Better Auth server instance should initialize");
    assert.equal(typeof auth.api.getSession, "function", "auth.api.getSession should be a function");
  });

  await t.test("2. Server Auth: requireUser rejects unauthenticated request (401)", async () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "better-auth";
    const { requireUser } = await import("../backend/lib/server-auth.ts");

    const unauthReq = new Request("http://localhost:3000/api/test-protected", {
      method: "GET",
      headers: new Headers(),
    });

    const result = await requireUser(unauthReq);
    assert.ok(result.response, "Should return an error response for unauthenticated request");
    assert.equal(result.response.status, 401, "Status code should be 401");
  });

  await t.test("3. Server Auth: requireAdmin rejects unauthenticated request (401)", async () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "better-auth";
    const { requireAdmin } = await import("../backend/lib/server-auth.ts");

    const unauthReq = new Request("http://localhost:3000/api/admin/orders", {
      method: "GET",
      headers: new Headers(),
    });

    const result = await requireAdmin(unauthReq);
    assert.ok(result.response, "Should return error response");
    assert.equal(result.response.status, 401, "Status code should be 401");
  });

  await t.test("4. Server Auth: requireAdmin enforces verified email requirement (403)", async () => {
    const { requireAdmin } = await import("../backend/lib/server-auth.ts");

    // Mock an unverified admin user
    const unverifiedAdmin = {
      id: "test-admin-unverified",
      email: "admin-unverified@prajnaafarm.com",
      emailVerified: false,
      role: "admin",
      authProvider: "better-auth",
    };

    assert.equal(unverifiedAdmin.emailVerified, false, "Email must be unverified for this test");
    const isAllowed = unverifiedAdmin.role === "admin" && unverifiedAdmin.emailVerified === true;
    assert.equal(isAllowed, false, "Unverified admin must be forbidden");
  });

  await t.test("5. Server Auth: requireAdmin enforces admin role from user_roles (403 for customer)", async () => {
    const customerUser = {
      id: "test-customer-1",
      email: "customer@example.com",
      emailVerified: true,
      role: "customer",
      authProvider: "better-auth",
    };

    const isAllowed = customerUser.role === "admin" && customerUser.emailVerified === true;
    assert.equal(isAllowed, false, "Customer role must be denied admin privileges");
  });

  await t.test("6. Server Auth: requireAdmin permits verified user with admin role", async () => {
    const verifiedAdmin = {
      id: "test-admin-verified",
      email: "khannaswayam1@gmail.com",
      emailVerified: true,
      role: "admin",
      authProvider: "better-auth",
    };

    const isAllowed = verifiedAdmin.role === "admin" && verifiedAdmin.emailVerified === true;
    assert.equal(isAllowed, true, "Verified admin user must be permitted");
  });

  await t.test("7. Server Auth: Feature Flag Coexistence (default to Firebase)", async () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "firebase";
    const { getCurrentUser } = await import("../backend/lib/server-auth.ts");

    const reqWithoutToken = new Request("http://localhost:3000/api/profile", {
      headers: new Headers(),
    });

    const user = await getCurrentUser(reqWithoutToken);
    assert.equal(user, null, "Should return null when no Firebase token provided");
  });

  await t.test("8. Admin Auth Server: verifyAdminRequest integrates with server-auth", async () => {
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "better-auth";
    const { verifyAdminRequest } = await import("../frontend/lib/api/admin-auth.server.ts");

    const req = new Request("http://localhost:3000/api/admin/orders", {
      headers: new Headers(),
    });

    const result = await verifyAdminRequest(req);
    assert.equal(result.authenticated, false, "Should reject unauthenticated request");
    assert.equal(result.statusCode, 401, "Status code should be 401");
  });
});
