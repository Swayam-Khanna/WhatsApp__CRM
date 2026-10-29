import { MongoClient, Db } from "mongodb";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://rajat70184_db_user:K9z3dDPFALKiaQlq@cluster0.qtq2jmz.mongodb.net/prajnaa_crm?retryWrites=true&w=majority";

const options = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  maxPoolSize: 10,
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let lastFailedAt = 0;
let lastError: any = null;

export function getClientPromise(): Promise<MongoClient> {
  // Never connect during Next.js static build phase
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.__NEXT_BUILDING === "1" ||
    (Array.isArray(process.argv) && process.argv.some((arg) => arg.includes("build")));

  if (isBuildPhase) {
    return Promise.reject(new Error("MongoDB connection bypassed during static build phase"));
  }

  // Circuit breaker: if connection failed within last 30s, fail fast without re-hanging on DNS
  if (Date.now() - lastFailedAt < 30000 && lastError) {
    return Promise.reject(lastError);
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = undefined;
      lastFailedAt = Date.now();
      lastError = err;
      if (
        err?.message?.includes("SSL") ||
        err?.code === "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" ||
        err?.name === "MongoServerSelectionError"
      ) {
        console.error(
          "[MongoDB] SSL / TLS Handshake Alert: This error occurs when the connecting host IP (e.g. Vercel) is not whitelisted in MongoDB Atlas Network Access. Add '0.0.0.0/0' to Network Access in Atlas."
        );
      }
      throw err;
    });
  }
  return global._mongoClientPromise;
}

// Export a lazy proxy for default export so importing it doesn't trigger immediate connect() at build time
const clientPromiseProxy: Promise<MongoClient> = {
  then: (onfulfilled, onrejected) => getClientPromise().then(onfulfilled, onrejected),
  catch: (onrejected) => getClientPromise().catch(onrejected),
  finally: (onfinally) => getClientPromise().finally(onfinally),
  [Symbol.toStringTag]: "Promise",
} as Promise<MongoClient>;

export default clientPromiseProxy;

export async function getDatabase(dbName: string = "prajnaa_crm"): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}
