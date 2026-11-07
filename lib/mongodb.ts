/**
 * Legacy MongoDB shim:
 * The application has been fully consolidated and migrated to PostgreSQL via Drizzle ORM.
 * This file is retained as a safe backward-compatible stub.
 */
export async function getDatabase(): Promise<any> {
  return null;
}

export function getClientPromise(): Promise<any> {
  return Promise.resolve(null);
}

const clientPromiseProxy: Promise<any> = {
  then: (onfulfilled) => Promise.resolve(null).then(onfulfilled),
  catch: () => Promise.resolve(null),
  finally: (onfinally) => Promise.resolve(null).finally(onfinally),
  [Symbol.toStringTag]: "Promise",
} as Promise<any>;

export default clientPromiseProxy;
