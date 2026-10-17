import {
  issueFarmerCertificate,
  revokeFarmerCertificate,
  getCertificateByFarmer,
  hasActiveFarmerCertificate,
  getAllCertificates,
} from "../frontend/lib/certificate/certificate-service";

async function main() {
  console.log("--- 1. Testing Default Uncertified Farmer State ---");
  const testFarmerId = `test-farmer-${Date.now()}`;
  const testFarmerSlug = `test-farmer-slug-${Date.now()}`;

  const initialCertified = await hasActiveFarmerCertificate(testFarmerId);
  if (initialCertified) {
    throw new Error(`Expected new farmer ${testFarmerId} to NOT be certified initially!`);
  }
  console.log("✓ Initial state: Farmer is NOT certified by default (badge will not show).");

  console.log("--- 2. Testing Certificate Issuance Flow ---");
  const certNumber = `PRJ-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const cert = await issueFarmerCertificate({
    farmer_id: testFarmerId,
    farmer_name: "Mahender Dutt",
    farm_name: "Mahender Farm",
    village: "Solan",
    state: "Himachal Pradesh",
    farmer_slug: testFarmerSlug,
    certificate_number: certNumber,
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    verification_notes: "100% pure organic test verification.",
    admin_id: "admin-lead",
    admin_name: "Prajnaa Quality Authority",
  });

  if (!cert || cert.status !== "ACTIVE" || cert.certificate_number !== certNumber) {
    throw new Error("Certificate issuance failed or produced invalid certificate object.");
  }
  if (!cert.qr_code_data_url || !cert.qr_code_data_url.startsWith("data:image/png;base64,")) {
    throw new Error("Certificate QR code generation failed.");
  }
  console.log(`✓ Issued certificate ${cert.certificate_number} with verified QR code.`);

  console.log("--- 3. Testing Dynamic Verification Check ---");
  const nowCertifiedById = await hasActiveFarmerCertificate(testFarmerId);
  const nowCertifiedBySlug = await hasActiveFarmerCertificate(testFarmerSlug);
  if (!nowCertifiedById || !nowCertifiedBySlug) {
    throw new Error("Farmer lookup after issuance should confirm ACTIVE certification!");
  }
  console.log("✓ Dynamic accreditation verified: Farmer is now certified (badge will dynamically appear).");

  console.log("--- 4. Testing Certificate Revocation Flow ---");
  const revoked = await revokeFarmerCertificate({
    certificate_id: cert.id,
    admin_id: "admin-lead",
    admin_name: "Prajnaa Admin",
    reason: "Test revocation of compliance.",
  });

  if (!revoked || revoked.status !== "REVOKED") {
    throw new Error("Certificate revocation failed.");
  }

  const postRevokeCertified = await hasActiveFarmerCertificate(testFarmerId);
  if (postRevokeCertified) {
    throw new Error("Farmer should NOT be certified after certificate revocation!");
  }
  console.log("✓ Revocation verified: Farmer badge dynamically removed after admin revocation.");

  console.log("--- 5. Testing Full List Retrieval ---");
  const all = await getAllCertificates();
  const foundRevoked = all.find((c) => c.id === cert.id);
  if (!foundRevoked || foundRevoked.status !== "REVOKED") {
    throw new Error("getAllCertificates does not reflect the revoked status correctly.");
  }
  console.log("✓ All certificates list correctly reflects updated status.");

  console.log("\n>>> ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! <<<");
}

main().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
