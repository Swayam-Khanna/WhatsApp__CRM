import { getAutomatedTemplates, getAutomatedTemplateStats } from "../backend/lib/automation-templates.ts";

console.log("Loading Automated Templates...");
const stats = getAutomatedTemplateStats();
console.log(`Total Templates: ${stats.total}`);
console.log("By Category:");
for (const [cat, count] of Object.entries(stats.byCategory)) {
  console.log(`  - ${cat}: ${count}`);
}

const all = getAutomatedTemplates();
console.log(`\nSample template: ${all[120].id} (${all[120].name})`);
console.log(`En: ${all[120].en}`);
console.log(`Hinglish: ${all[120].hinglish}`);
console.log(`Hi: ${all[120].hi}`);
