import { createNeonAuth } from "@neondatabase/auth/next/server";

export function getNeonAuthBaseUrl(): string {
  if (process.env.NEON_AUTH_BASE_URL) {
    return process.env.NEON_AUTH_BASE_URL.trim();
  }
  const dbUrl = process.env.DATABASE_URL || "";
  const match = dbUrl.match(/@([^.]+)\.([^.]+)\.([^.]+)\.aws\.neon\.tech\/([^?]+)/);
  if (match) {
    let [, endpointId, cluster, region, dbName] = match;
    endpointId = endpointId.replace(/-pooler$/, "");
    return `https://${endpointId}.neonauth.${cluster}.${region}.aws.neon.tech/${dbName}/auth`;
  }
  return "https://your-endpoint.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth";
}

export function getNeonAuthCookieSecret(): string {
  const secret = (process.env.NEON_AUTH_COOKIE_SECRET || process.env.BETTER_AUTH_SECRET || "").trim();
  if (secret && secret.length >= 32) {
    return secret;
  }
  return "prajnaa-farm-neon-auth-cookie-secret-min-32-chars-2026";
}

export const auth = createNeonAuth({
  baseUrl: getNeonAuthBaseUrl(),
  cookies: {
    secret: getNeonAuthCookieSecret(),
    sessionDataTtl: 300,
  },
});
