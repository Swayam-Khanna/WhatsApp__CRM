import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const devDbUrl = process.env.NEON_TEST_BRANCH_URL || process.env.DATABASE_URL;
if (!devDbUrl || devDbUrl.includes('ep-snowy-fog-b3wop5vp')) {
  console.error('FATAL: Refusing to run on production database');
  process.exit(1);
}

const sql = postgres(devDbUrl, { ssl: 'require' });

async function main() {
  console.log('Applying schema migrations to DEV Neon branch...');

  // 1. Add cod_fee_paise to orders
  await sql`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS cod_fee_paise integer NOT NULL DEFAULT 0;
  `;
  console.log('✓ Added orders.cod_fee_paise column');

  await sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_cod_fee_paise_check'
      ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_cod_fee_paise_check CHECK (cod_fee_paise >= 0);
      END IF;
    END $$;
  `;
  console.log('✓ Added orders_cod_fee_paise_check constraint');

  // 2. Make order_items.farmer_id nullable
  await sql`
    ALTER TABLE order_items 
    ALTER COLUMN farmer_id DROP NOT NULL;
  `;
  console.log('✓ Dropped NOT NULL constraint on order_items.farmer_id');

  // 3. Drop hard foreign key on order_items.product_id
  await sql`
    ALTER TABLE order_items 
    DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
  `;
  console.log('✓ Dropped order_items_product_id_fkey constraint');

  await sql.end();
  console.log('Schema update complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
