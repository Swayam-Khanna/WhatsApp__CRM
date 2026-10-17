import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env" });

const prodUrl = process.env.DATABASE_URL;
if (!prodUrl) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(prodUrl, { ssl: "require", max: 1 });

async function runChecks() {
  console.log("=================================================================");
  console.log("             PRODUCTION DATABASE VERIFICATION & AUDIT            ");
  console.log("=================================================================\n");

  // Verify connection endpoint
  const hostCheck = await sql`SELECT inet_server_addr(), current_database(), current_user`;
  console.log("Connected to database:", hostCheck[0].current_database, "as user:", hostCheck[0].current_user);

  // -------------------------------------------------------------------------
  // CHECK 1: Compare backend/schema/index.ts definitions vs Production Tables
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 1: Table Comparison (Schema File vs Live Database) ---");
  const schemaFile = fs.readFileSync("backend/schema/index.ts", "utf8");
  const tableRegex = /export const (\w+) = pgTable\(\s*"([^"]+)"/g;
  const schemaTables = [];
  let match;
  while ((match = tableRegex.exec(schemaFile)) !== null) {
    schemaTables.push({ varName: match[1], tableName: match[2] });
  }

  const liveTablesRes = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  const liveTableNames = liveTablesRes.map(t => t.table_name);

  console.log(`Tables in backend/schema/index.ts (${schemaTables.length}):`);
  schemaTables.forEach(t => {
    const isLive = liveTableNames.includes(t.tableName);
    console.log(`  - ${t.varName.padEnd(25)} -> ${t.tableName.padEnd(25)} [${isLive ? "LIVE IN PROD" : "MISSING"}]`);
  });

  console.log(`\nLive tables in production DB (${liveTableNames.length}):`);
  liveTableNames.forEach(t => console.log(`  - ${t}`));

  // Check for any mismatch
  const schemaTableNames = schemaTables.map(t => t.tableName);
  const missingFromDb = schemaTableNames.filter(t => !liveTableNames.includes(t));
  const extraInDb = liveTableNames.filter(t => !schemaTableNames.includes(t));
  console.log("\nComparison result:");
  console.log("  Missing from production DB:", missingFromDb.length ? missingFromDb : "None (100% Match)");
  console.log("  Extra in production DB:", extraInDb.length ? extraInDb : "None");

  // -------------------------------------------------------------------------
  // CHECK 2: Confirm no id or user_id column is uuid
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 2: Confirm No 'id' or 'user_id' Column is UUID ---");
  const idColumns = await sql`
    SELECT 
      table_name, 
      column_name, 
      data_type, 
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name = 'id' OR column_name LIKE '%user_id%' OR column_name LIKE '%_id')
    ORDER BY table_name, column_name;
  `;

  console.log("All identifier columns across production tables:");
  console.log("Table Name".padEnd(28) + "Column Name".padEnd(20) + "Data Type".padEnd(16) + "UDT Name");
  console.log("---------------------------------------------------------------------------");

  let uuidCount = 0;
  for (const col of idColumns) {
    const isUuid = col.data_type === 'uuid' || col.udt_name === 'uuid';
    if (isUuid) uuidCount++;
    console.log(
      col.table_name.padEnd(28) + 
      col.column_name.padEnd(20) + 
      col.data_type.padEnd(16) + 
      col.udt_name +
      (isUuid ? " <-- [ALERT: UUID!]" : "")
    );
  }
  console.log("---------------------------------------------------------------------------");
  console.log(`Total ID / user_id columns checked: ${idColumns.length}`);
  console.log(`UUID columns found: ${uuidCount} (Expected: 0)`);

  // -------------------------------------------------------------------------
  // CHECK 3: Smoke Test on profiles Table
  // -------------------------------------------------------------------------
  console.log("\n--- CHECK 3: Smoke Test (Insert, Read, Delete on 'profiles') ---");
  const testId = "test-user-1";

  // Step A: Count before
  const beforeCount = await sql`SELECT count(*)::int as count FROM profiles`;
  console.log(`1. Initial profiles row count: ${beforeCount[0].count}`);

  // Step B: Insert
  console.log(`2. Inserting test profile with id '${testId}'...`);
  await sql`
    INSERT INTO profiles (id, full_name, email, phone, city, state, country)
    VALUES (${testId}, 'Test User', 'test@market.prajnaa.in', '+919999999999', 'Bengaluru', 'Karnataka', 'India')
  `;

  // Step C: Read back
  const readBack = await sql`SELECT * FROM profiles WHERE id = ${testId}`;
  console.log("3. Read back inserted row:");
  console.log("   id:", readBack[0]?.id);
  console.log("   full_name:", readBack[0]?.full_name);
  console.log("   email:", readBack[0]?.email);
  console.log("   created_at:", readBack[0]?.created_at);

  if (readBack[0]?.id !== testId) {
    throw new Error("Smoke test failed: Inserted row could not be read back!");
  }

  // Step D: Delete
  console.log(`4. Deleting test profile with id '${testId}'...`);
  await sql`DELETE FROM profiles WHERE id = ${testId}`;

  // Step E: Confirm empty
  const afterCount = await sql`SELECT count(*)::int as count FROM profiles`;
  console.log(`5. Final profiles row count: ${afterCount[0].count}`);
  if (afterCount[0].count !== 0) {
    throw new Error(`Smoke test failed: Table is not empty! Remaining rows: ${afterCount[0].count}`);
  }
  console.log("✓ Smoke test passed: Row inserted, read back, deleted, and table confirmed empty!");

  console.log("\n=================================================================");
  console.log("                   ALL 3 CHECKS COMPLETED                        ");
  console.log("=================================================================\n");

  await sql.end();
}

runChecks().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
