/**
 * Firebase Admin SDK Stub
 * All database operations and administrative functions have been migrated 100% to Neon PostgreSQL (via Drizzle ORM).
 * This file provides inert, type-safe exports so that no code breaks if an old symbol is referenced,
 * without importing the Firebase Admin SDK.
 */

export interface FirestoreDocMock {
  id: string;
  data(): any;
  exists: boolean;
  ref: any;
}

export interface FirestoreQueryMock {
  where(...args: any[]): FirestoreQueryMock;
  orderBy(...args: any[]): FirestoreQueryMock;
  limit(...args: any[]): FirestoreQueryMock;
  get(): Promise<{ empty: boolean; size: number; docs: FirestoreDocMock[] }>;
}

export interface FirestoreDocRefMock {
  id: string;
  get(): Promise<{ exists: boolean; id: string; data(): any }>;
  set(data: any, opts?: any): Promise<void>;
  update(data: any): Promise<void>;
  delete(): Promise<void>;
}

export interface FirestoreCollectionMock extends FirestoreQueryMock {
  doc(id?: string): FirestoreDocRefMock;
  add(data: any): Promise<{ id: string }>;
}

export interface FirestoreAdminMock {
  collection(name: string): FirestoreCollectionMock;
  batch(): any;
}

export const adminApp: any = null;
export const adminDb: FirestoreAdminMock | null = null;
export default null;
