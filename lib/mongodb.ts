const uri = process.env.MONGODB_URI || "";

const options = {
  serverSelectionTimeoutMS: 4000,
  connectTimeoutMS: 4000,
  maxPoolSize: 10,
};

declare global {
  var _mongoClientPromise: Promise<any> | undefined;
}

let lastFailedAt = 0;
let lastError: any = null;

export async function getClientPromise(): Promise<any> {
  // Never connect during Next.js static build phase
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.__NEXT_BUILDING === "1" ||
    (Array.isArray(process.argv) && process.argv.some((arg) => arg.includes("build")));

  if (isBuildPhase || !uri) {
    return Promise.resolve(null);
  }

  // Circuit breaker: if connection failed within last 30s, fail fast without re-hanging on DNS
  if (Date.now() - lastFailedAt < 30000 && lastError) {
    return Promise.resolve(null);
  }

  if (!global._mongoClientPromise) {
    try {
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect().catch((err) => {
        global._mongoClientPromise = undefined;
        lastFailedAt = Date.now();
        lastError = err;
        console.warn("[MongoDB] Connection fallback:", err?.message || err);
        return null;
      });
    } catch {
      return Promise.resolve(null);
    }
  }
  return global._mongoClientPromise;
}

// Export a lazy proxy for default export so importing it doesn't trigger immediate connect() at build time
const clientPromiseProxy: Promise<any> = {
  then: (onfulfilled, onrejected) => getClientPromise().then(onfulfilled, onrejected),
  catch: (onrejected) => getClientPromise().catch(onrejected),
  finally: (onfinally) => getClientPromise().finally(onfinally),
  [Symbol.toStringTag]: "Promise",
} as Promise<any>;

export default clientPromiseProxy;

export async function getDatabase(dbName: string = "prajnaa_crm"): Promise<any> {
  try {
    const client = await getClientPromise();
    if (!client) return null;
    return client.db(dbName);
  } catch {
    return null;
  }
}

export async function closeDatabase(): Promise<void> {
  if (global._mongoClientPromise) {
    try {
      const client = await global._mongoClientPromise;
      if (client && typeof client.close === "function") {
        await client.close();
      }
    } catch {}
    global._mongoClientPromise = undefined;
  }
}
