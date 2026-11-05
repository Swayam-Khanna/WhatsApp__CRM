/**
 * Shipping data seeder
 * Shipping data (slabs, zones, rates) is permanently seeded in Neon PostgreSQL.
 */
export async function ensureShippingSeedData(): Promise<void> {
  // No-op: Data is maintained in Neon PostgreSQL tables (shipping_slabs, pincode_zones)
}
