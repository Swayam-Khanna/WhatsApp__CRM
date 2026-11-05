import { authClient } from "@/lib/auth-client";
import { fileToBase64 } from "@/lib/file-to-base64";

// Query builder mapping Supabase client queries to Neon PostgreSQL via /api/data/query
class NeonQueryBuilder {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" = "select";
  private payload: any = null;
  private filters: { col: string; val: any; op?: string }[] = [];
  private orFilters: { col: string; val: any; op?: string }[][] = [];
  private sorts: { col: string; asc: boolean }[] = [];
  private limitCount: number | null = null;
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: any) {
    if (this.action !== "insert" && this.action !== "update" && this.action !== "delete") {
      this.action = "select";
    }
    return this;
  }

  insert(payload: any) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  upsert(payload: any, options?: any) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ col: column, val: values, op: "in" });
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ col: column, val: value, op: "==" });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ col: column, val: value, op: "!=" });
    return this;
  }

  or(filters: string) {
    if (!filters || typeof filters !== "string") return this;

    const clauses = filters.split(",").map((c) => c.trim()).filter(Boolean);
    const parsedGroup: { col: string; val: any; op: string }[] = [];

    for (const clause of clauses) {
      const match = clause.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z]+)\.(.*)$/);
      if (match) {
        let [, col, opStr, rawVal] = match;
        let op = "==";
        if (opStr === "neq") op = "!=";
        else if (opStr === "gt") op = ">";
        else if (opStr === "gte") op = ">=";
        else if (opStr === "lt") op = "<";
        else if (opStr === "lte") op = "<=";
        else if (opStr === "in") op = "in";
        else op = "==";

        let val: any = rawVal;
        if (rawVal === "true") val = true;
        else if (rawVal === "false") val = false;
        else if (rawVal === "null") val = null;

        parsedGroup.push({ col, val, op });
      }
    }

    if (parsedGroup.length > 0) {
      this.orFilters.push(parsedGroup);
    }
    return this;
  }

  match(filterObj: Record<string, any>) {
    Object.entries(filterObj).forEach(([col, val]) => {
      this.filters.push({ col, val, op: "==" });
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sorts.push({ col: column, asc: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      let baseUrl = "";
      if (typeof window === "undefined") {
        const port = process.env.PORT || 3000;
        baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
      }

      const res = await fetch(`${baseUrl}/api/data/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          payload: this.payload,
          filters: this.filters,
          orFilters: this.orFilters,
          sorts: this.sorts,
          limit: this.limitCount,
          isSingle: this.isSingle,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Data query error (${res.status}): ${errText}`);
      }

      const result = await res.json();
      if (onfulfilled) return onfulfilled(result);
      return result;
    } catch (err: any) {
      console.warn(`[Neon Query Adapter] Query failed for table "${this.table}":`, err?.message || err);
      const fallbackResult = {
        data: this.isSingle ? null : [],
        error: { message: err?.message || "Query failed" },
        count: 0,
      };
      if (onrejected) {
        try {
          return onrejected(err);
        } catch {
          return fallbackResult;
        }
      }
      return fallbackResult;
    }
  }
}

class AppStorageBuilder {
  private bucket: string;
  private static urlCache = new Map<string, string>();

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  getPublicUrl(path: string, options?: any): { data: { publicUrl: string } } {
    if (!path) {
      return { data: { publicUrl: "" } };
    }
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("data:") ||
      path.startsWith("blob:")
    ) {
      return { data: { publicUrl: path } };
    }

    const cacheKey = `${this.bucket}/${path}`;
    const cached =
      AppStorageBuilder.urlCache.get(cacheKey) ||
      AppStorageBuilder.urlCache.get(path);
    if (cached) {
      return { data: { publicUrl: cached } };
    }

    if (typeof window !== "undefined") {
      try {
        const stored =
          localStorage.getItem(`prajnaa_file_${this.bucket}_${path}`) ||
          localStorage.getItem(`prajnaa_storage_${path}`);
        if (stored) {
          return { data: { publicUrl: stored } };
        }
      } catch {}
    }

    const publicUrl = path.startsWith("/") ? path : `/${path}`;
    return { data: { publicUrl } };
  }

  async upload(path: string, file: any, options?: any) {
    try {
      let base64Data = "";
      if (typeof file === "string") {
        base64Data = file;
      } else if (file instanceof Blob || (typeof File !== "undefined" && file instanceof File)) {
        base64Data = await fileToBase64(file);
      }

      const cacheKey = `${this.bucket}/${path}`;
      if (base64Data) {
        AppStorageBuilder.urlCache.set(cacheKey, base64Data);
        AppStorageBuilder.urlCache.set(path, base64Data);
        if (typeof window !== "undefined") {
          try {
            if (base64Data.length < 600000) {
              localStorage.setItem(`prajnaa_file_${this.bucket}_${path}`, base64Data);
              localStorage.setItem(`prajnaa_storage_${path}`, base64Data);
            }
          } catch {}
        }
      }

      return { data: { path }, error: null };
    } catch (err: any) {
      console.error("[Storage Upload Error]:", err);
      return { data: { path }, error: null };
    }
  }

  async remove(paths: string[]) {
    for (const p of paths) {
      AppStorageBuilder.urlCache.delete(`${this.bucket}/${p}`);
      AppStorageBuilder.urlCache.delete(p);
    }
    return { data: paths, error: null };
  }

  async createSignedUrl(path: string, expiry: number) {
    const pub = this.getPublicUrl(path);
    if (pub?.data?.publicUrl) {
      return { data: { signedUrl: pub.data.publicUrl }, error: null };
    }
    return { data: null, error: { message: "File not found" } };
  }

  async download(path: string) {
    try {
      const { data } = await this.createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        const res = await fetch(data.signedUrl);
        const blob = await res.blob();
        return { data: blob, error: null };
      }
      return { data: null, error: { message: "Could not download file" } };
    } catch (err: any) {
      return { data: null, error: { message: err?.message || "Download failed" } };
    }
  }

  async list(path?: string, options?: any) {
    return { data: [], error: null };
  }
}

export const supabase = {
  channel: (_name: string) => {
    const builder = {
      on: (_event: string, _schema: any, _callback?: any) => builder,
      subscribe: () => builder,
      unsubscribe: () => {},
    };
    return builder;
  },
  removeChannel: (_channel: any) => {},
  from: (table: string) => {
    return new NeonQueryBuilder(table);
  },
  storage: {
    from: (bucket: string) => {
      return new AppStorageBuilder(bucket);
    },
  },
  rpc: async (fnName: string, args?: any) => {
    try {
      let baseUrl = "";
      if (typeof window === "undefined") {
        const port = process.env.PORT || 3000;
        baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
      }

      const res = await fetch(`${baseUrl}/api/data/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rpc",
          fnName,
          args,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`RPC error (${res.status}): ${errText}`);
      }

      return await res.json();
    } catch (err: any) {
      console.warn(`[Neon RPC Adapter] Error calling RPC '${fnName}':`, err?.message || err);
      return { data: null, error: { message: err?.message || "RPC failed" } };
    }
  },
  auth: {
    getSession: async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          return {
            data: {
              session: {
                access_token: "neon-auth-token",
                user: {
                  id: data.user.id,
                  email: data.user.email,
                  user_metadata: {
                    name: data.user.name,
                    avatar_url: data.user.image,
                  },
                },
                expires_in: 3600,
                token_type: "bearer",
              },
            },
            error: null,
          };
        }
        return { data: { session: null }, error: null };
      } catch (err: any) {
        return { data: { session: null }, error: { message: err.message } };
      }
    },
    getUser: async () => {
      try {
        const { data } = await authClient.getSession();
        if (data?.user) {
          return {
            data: {
              user: {
                id: data.user.id,
                email: data.user.email,
                user_metadata: {
                  name: data.user.name,
                  avatar_url: data.user.image,
                },
              },
            },
            error: null,
          };
        }
        return { data: { user: null }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },
    setSession: async () => {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      // Return safe unsubscribe function
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signUp: async ({ email, password, options }: any) => {
      try {
        const res = await authClient.signUp.email({
          email,
          password,
          name: options?.data?.name || options?.data?.full_name || "User",
        });
        return { data: { user: res.data?.user || null }, error: res.error || null };
      } catch (err: any) {
        return { data: { user: null }, error: { message: err.message } };
      }
    },
    signOut: async () => {
      try {
        await authClient.signOut();
        return { error: null };
      } catch (err: any) {
        return { error: { message: err.message } };
      }
    },
    updateUser: async () => {
      return { data: { user: null }, error: null };
    },
    resetPasswordForEmail: async () => {
      return { data: null, error: null };
    },
  },
} as any;
