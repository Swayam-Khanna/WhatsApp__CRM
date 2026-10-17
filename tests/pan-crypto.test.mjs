import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { encryptPan, decryptPan, maskPan } from "../backend/lib/crypto.ts";

describe("Application-level PAN encryption (AES-256-GCM)", () => {
  test("encrypts and decrypts valid PAN correctly", () => {
    const rawPan = "ABCDE1234F";
    const encrypted = encryptPan(rawPan);

    assert.ok(encrypted.startsWith("enc:v1:"), "Encrypted PAN must have version prefix");
    assert.notEqual(encrypted, rawPan, "Encrypted output must not equal raw PAN");

    const decrypted = decryptPan(encrypted);
    assert.equal(decrypted, rawPan, "Decrypted PAN must match original");
  });

  test("does not double encrypt already encrypted PAN", () => {
    const rawPan = "BKZPK9876Q";
    const enc1 = encryptPan(rawPan);
    const enc2 = encryptPan(enc1);
    assert.equal(enc1, enc2, "Calling encryptPan on already encrypted string should be idempotent");
  });

  test("masks PAN properly without revealing full number", () => {
    const rawPan = "ABCDE1234F";
    const maskedPlain = maskPan(rawPan);
    assert.equal(maskedPlain, "ABCDE****F");

    const enc = encryptPan(rawPan);
    const maskedEnc = maskPan(enc);
    assert.equal(maskedEnc, "ABCDE****F");
  });

  test("rejects tampered ciphertext with authentication error", () => {
    const rawPan = "ABCDE1234F";
    const encrypted = encryptPan(rawPan);
    const parts = encrypted.split(":");
    // parts: ["enc", "v1", iv, authTag, cipher]
    const tamperedCipher = parts[4].slice(0, -2) + (parts[4].slice(-2) === "aa" ? "bb" : "aa");
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${tamperedCipher}`;

    assert.throws(() => {
      decryptPan(tampered);
    }, /Unsupported state or unable to authenticate data|bad decrypt|auth/i);
  });
});
