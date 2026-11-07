export type DataProvider = "firestore" | "neon";

/**
 * Returns the active data provider.
 * Defaults to "firestore" unless DATA_PROVIDER is explicitly set to "neon" or "postgres".
 */
export function getDataProvider(): DataProvider {
  const provider = (process.env.DATA_PROVIDER || "").toLowerCase().trim();
  if (provider === "firestore") {
    return "firestore";
  }
  return "neon";
}

export function isNeonDataProvider(): boolean {
  return getDataProvider() === "neon";
}
