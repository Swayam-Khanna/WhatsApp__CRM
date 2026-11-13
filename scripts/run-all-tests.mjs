import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const testFiles = fs.readdirSync("tests")
  .filter(f => f.endsWith(".test.mjs"))
  .map(f => path.join("tests", f));

console.log("=================================================");
console.log(`PRAJNAA WHATSAPP CRM — FULL SYSTEM TEST SUITE`);
console.log(`Found ${testFiles.length} test files to execute`);
console.log("=================================================\n");

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const file of testFiles) {
  process.stdout.write(`Running: ${file} ... `);
  const start = Date.now();

  const code = await new Promise((resolve) => {
    const child = spawn("node", ["--env-file=.env", "--test", file], {
      stdio: "pipe",
    });

    let output = "";
    child.stdout.on("data", (d) => { output += d.toString(); });
    child.stderr.on("data", (d) => { output += d.toString(); });

    child.on("close", (exitCode) => {
      resolve({ exitCode, output });
    });
  });

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (code.exitCode === 0) {
    console.log(`PASSED (${duration}s)`);
    totalPassed++;
    results.push({ file, status: "PASSED", duration });
  } else {
    console.log(`FAILED (${duration}s)`);
    console.log("------------------ FAILURE LOG ------------------");
    console.log(code.output.trim());
    console.log("-------------------------------------------------");
    totalFailed++;
    results.push({ file, status: "FAILED", duration, error: code.output });
  }
}

console.log("\n=================================================");
console.log(`TEST SUMMARY: ${totalPassed}/${testFiles.length} Test Suites PASSED`);
if (totalFailed > 0) {
  console.log(`FAILED: ${totalFailed} suites`);
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}
