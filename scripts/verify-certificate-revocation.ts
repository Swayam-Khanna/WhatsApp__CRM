import assert from "node:assert";
import {
  getCertificateById,
  getCertificateByNumber,
  revokeFarmerCertificate,
  getAllCertificates,
} from "../frontend/lib/certificate/certificate-service";

async function main() {
  console.log("==============================================================");
  console.log("TESTING FARMER CERTIFICATE REVOCATION");
  console.log("==============================================================\n");

  // 1. Test finding Ramesh Singh's certificate by certificate number
  console.log("Test 1: Find certificate by certificate number 'PRJ-2026-000001'");
  const certByNum = await getCertificateByNumber("PRJ-2026-000001");
  assert.ok(certByNum, "Certificate PRJ-2026-000001 must exist");
  assert.strictEqual(certByNum.farmer_name, "Ramesh Singh");
  assert.strictEqual(certByNum.certificate_number, "PRJ-2026-000001");
  console.log("✓ Test 1 Passed: Found certificate by number PRJ-2026-000001\n");

  // 2. Test finding by ID
  console.log("Test 2: Find certificate by ID 'cert-ramesh-singh'");
  const certById = await getCertificateById("cert-ramesh-singh");
  assert.ok(certById, "Certificate cert-ramesh-singh must exist");
  assert.strictEqual(certById.id, "cert-ramesh-singh");
  console.log("✓ Test 2 Passed: Found certificate by ID\n");

  // 3. Test find certificate by certificate_number inside getCertificateById
  console.log("Test 3: Find certificate using getCertificateById with certificate number");
  const certByIdOrNum = await getCertificateById("PRJ-2026-000001");
  assert.ok(certByIdOrNum, "getCertificateById must also find by certificate_number");
  assert.strictEqual(certByIdOrNum.farmer_name, "Ramesh Singh");
  console.log("✓ Test 3 Passed: getCertificateById safely found certificate using number\n");

  // 4. Test revoking certificate
  console.log("Test 4: Revoke certificate PRJ-2026-000001 with reason 'remove it'");
  const revoked = await revokeFarmerCertificate({
    certificate_id: "cert-ramesh-singh",
    admin_id: "admin-user",
    admin_name: "Prajnaa Admin",
    reason: "remove it",
  });

  assert.ok(revoked, "Revocation must return updated certificate");
  assert.strictEqual(revoked.status, "REVOKED", "Status must be REVOKED");
  assert.strictEqual(revoked.revocation_reason, "remove it");
  assert.ok(revoked.revoked_at, "revoked_at timestamp must be populated");
  console.log("✓ Test 4 Passed: Certificate status successfully updated to REVOKED\n");

  // 5. Test verifying effective status reflects REVOKED everywhere
  console.log("Test 5: Verify revocation persistence in memory store");
  const fetchedAfterRevoke = await getCertificateById("cert-ramesh-singh");
  assert.ok(fetchedAfterRevoke);
  assert.strictEqual(fetchedAfterRevoke.status, "REVOKED", "Status must remain REVOKED");
  console.log("✓ Test 5 Passed: Effective status correctly reflects REVOKED\n");

  console.log("==============================================================");
  console.log("ALL CERTIFICATE REVOCATION TESTS PASSED SUCCESSFULLY!");
  console.log("==============================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
