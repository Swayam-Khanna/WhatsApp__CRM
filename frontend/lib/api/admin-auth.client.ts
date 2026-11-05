import { authClient } from "@/lib/auth-client";

/**
 * Returns the current authorization token from Neon Auth.
 */
export async function getClientAuthToken(): Promise<string | null> {
  try {
    const sessionRes = await authClient.getSession();
    const token = (sessionRes?.data?.session as any)?.token;
    if (token) return token;
  } catch (e) {}

  return null;
}

/**
 * Fetch wrapper for Admin API endpoints that automatically injects Bearer authorization token.
 */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await getClientAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    credentials: "same-origin",
    ...init,
    headers,
  });
}
