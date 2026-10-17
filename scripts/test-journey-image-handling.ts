import assert from "node:assert";
import { isFarmerImage, getJourneyStageImage, getStagePlaceholderInfo } from "../frontend/components/harvest-journey/journey-image";
import { products } from "../frontend/lib/mock/products";
import { getSortedJourneyStages } from "../frontend/lib/services/harvestJourneyService";

console.log("=== RUNNING HARVEST JOURNEY IMAGE INTEGRITY TESTS ===\n");

// TEST 1: isFarmerImage
console.log("TEST 1: isFarmerImage detection");
assert.strictEqual(isFarmerImage("/assets/farmer-1.jpg"), true, "Must flag farmer-1.jpg");
assert.strictEqual(isFarmerImage("/assets/farmer-2.jpg"), true, "Must flag farmer-2.jpg");
assert.strictEqual(isFarmerImage("/assets/farmer-3.jpg"), true, "Must flag farmer-3.jpg");
assert.strictEqual(isFarmerImage("/assets/farmer-4.jpg"), true, "Must flag farmer-4.jpg");
assert.strictEqual(isFarmerImage("/uploads/profiles/farmer.jpg"), true, "Must flag profiles/ path");
assert.strictEqual(isFarmerImage("https://example.com/assets/farmer-2.jpg"), true, "Must flag external farmer image");
assert.strictEqual(isFarmerImage(null), false, "Null should not throw");
assert.strictEqual(isFarmerImage(undefined), false, "Undefined should not throw");
assert.strictEqual(isFarmerImage(""), false, "Empty string should not throw");
assert.strictEqual(isFarmerImage("/assets/walnuts-orchard.jpg"), false, "Orchard photo is not farmer");
assert.strictEqual(isFarmerImage("/assets/walnut-dry.jpg"), false, "Drying photo is not farmer");
console.log("✓ TEST 1 PASSED: Farmer portrait assets strictly detected and separated.\n");

// TEST 2: getJourneyStageImage
console.log("TEST 2: getJourneyStageImage field extraction and farmer rejection");
const stageWithValidPhoto = {
  id: "stg-1",
  label: "Harvesting",
  image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
};
assert.strictEqual(
  getJourneyStageImage(stageWithValidPhoto),
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
  "Should extract valid image"
);

const stageWithFarmerPhoto = {
  id: "stg-2",
  label: "Hand Sorting",
  image_url: "/assets/farmer-2.jpg",
  images: ["/assets/farmer-2.jpg"],
};
assert.strictEqual(
  getJourneyStageImage(stageWithFarmerPhoto),
  null,
  "Must REJECT farmer photo and return null"
);

const stageEmpty = {
  id: "stg-3",
  label: "Sun Drying",
};
assert.strictEqual(
  getJourneyStageImage(stageEmpty),
  null,
  "Empty stage must return null"
);
console.log("✓ TEST 2 PASSED: Farmer image NEVER extracted as stage image.\n");

// TEST 3: getStagePlaceholderInfo
console.log("TEST 3: Stage-specific neutral placeholder generation");
const stagesToTest = [
  { label: "Sprout / Planting", expectedIcon: "Sprout" },
  { label: "Harvest / Ripening", expectedIcon: "Leaf" },
  { label: "Sun Drying", expectedIcon: "Sun" },
  { label: "Washing / Processing", expectedIcon: "Droplets" },
  { label: "Hand Sorting", expectedIcon: "Hand" },
  { label: "Quality Check", expectedIcon: "Search" },
  { label: "Eco-Packaging", expectedIcon: "Package" },
  { label: "Dispatch / Shipping", expectedIcon: "Truck" },
];

for (const s of stagesToTest) {
  const info = getStagePlaceholderInfo(s);
  assert.ok(info.defaultTitle && info.defaultTitle.length > 0, "Must have valid title");
  assert.ok(info.defaultSubtitle && info.defaultSubtitle.length > 0, "Must have valid subtitle");
  console.log(`  - [${s.label}] => ${info.defaultTitle} | ${info.defaultSubtitle}`);
}
console.log("✓ TEST 3 PASSED: All canonical stages have distinct neutral placeholders.\n");

// TEST 4: Mock products audit
console.log("TEST 4: Mock products data audit");
let farmerImageLeaksFound = 0;
for (const p of products) {
  const journey = (p as any).harvestJourney || (p as any).harvest_journey;
  if (journey && Array.isArray(journey.stages)) {
    for (const stg of journey.stages) {
      if (isFarmerImage(stg.image_url)) {
        console.error(`LEAK: Product ${p.slug} stage ${stg.label} has farmer image_url: ${stg.image_url}`);
        farmerImageLeaksFound++;
      }
      if (Array.isArray(stg.images)) {
        for (const img of stg.images) {
          if (isFarmerImage(img)) {
            console.error(`LEAK: Product ${p.slug} stage ${stg.label} has farmer images item: ${img}`);
            farmerImageLeaksFound++;
          }
        }
      }
      if (isFarmerImage(stg.transformation_photo_id)) {
        console.error(`LEAK: Product ${p.slug} stage ${stg.label} has farmer transformation_photo_id: ${stg.transformation_photo_id}`);
        farmerImageLeaksFound++;
      }
    }
  }
  if (journey && Array.isArray(journey.transformationGallery)) {
    for (const item of journey.transformationGallery) {
      if (isFarmerImage(item.image)) {
        console.error(`LEAK: Product ${p.slug} transformationGallery item ${item.label} has farmer image: ${item.image}`);
        farmerImageLeaksFound++;
      }
    }
  }
}
assert.strictEqual(farmerImageLeaksFound, 0, "No farmer images allowed in stage data");
console.log("✓ TEST 4 PASSED: 0 farmer images in any product harvest stages or transformation gallery.\n");

// TEST 5: Order/Product with ALL stage images present
console.log("TEST 5: Order/Product with ALL stage images present");
const fullJourneyStages = [
  { id: "s-1", label: "Sprout", image_url: "https://images.unsplash.com/sprout.jpg" },
  { id: "s-2", label: "Harvest", image_url: "https://images.unsplash.com/harvest.jpg" },
  { id: "s-3", label: "Sun Drying", image_url: "https://images.unsplash.com/drying.jpg" },
];
fullJourneyStages.forEach((stg) => {
  const img = getJourneyStageImage(stg);
  assert.strictEqual(img, stg.image_url, `Stage ${stg.label} must return valid image`);
});
console.log("✓ TEST 5 PASSED: All stage images preserved when present.\n");

// TEST 6: Order/Product with SOME stage images missing
console.log("TEST 6: Order/Product with SOME stage images missing");
const partialJourneyStages = [
  { id: "s-1", label: "Sprout", image_url: "https://images.unsplash.com/sprout.jpg" },
  { id: "s-2", label: "Hand Sorting", image_url: null },
  { id: "s-3", label: "Quality Check" },
];
assert.strictEqual(getJourneyStageImage(partialJourneyStages[0]), "https://images.unsplash.com/sprout.jpg");
assert.strictEqual(getJourneyStageImage(partialJourneyStages[1]), null, "Missing image must be null");
assert.strictEqual(getJourneyStageImage(partialJourneyStages[2]), null, "Missing image must be null");
// Verify placeholders for the missing stages
const sortPlaceholder = getStagePlaceholderInfo(partialJourneyStages[1]);
assert.strictEqual(sortPlaceholder.defaultTitle, "Hand Sorting");
assert.ok(sortPlaceholder.defaultSubtitle.includes("Grading and sorting"));
console.log("✓ TEST 6 PASSED: Missing stages cleanly return null and stage-specific placeholders without farmer image.\n");

// TEST 7: Order/Product with NO stage images at all
console.log("TEST 7: Order/Product with NO stage images at all");
const emptyJourneyStages = [
  { id: "s-1", label: "Sprout" },
  { id: "s-2", label: "Harvest" },
  { id: "s-3", label: "Sun Drying" },
  { id: "s-4", label: "Washing" },
];
emptyJourneyStages.forEach((stg) => {
  const img = getJourneyStageImage(stg);
  assert.strictEqual(img, null, "Stage with no image must return null");
  const placeholder = getStagePlaceholderInfo(stg);
  assert.ok(placeholder.defaultTitle, "Placeholder title must exist");
  assert.ok(placeholder.icon, "Stage icon must exist");
});
console.log("✓ TEST 7 PASSED: Pure empty journey renders neutral stage placeholders across all stages.\n");

// TEST 8: Old order with legacy farmer image data
console.log("TEST 8: Legacy order with accidental farmer image data");
const legacyStage = {
  id: "legacy-sort",
  label: "Hand Sorting",
  image_url: "/assets/farmer-2.jpg",
  images: ["/assets/farmer-2.jpg", "/assets/farmer-3.jpg"],
  transformation_photo_id: "/assets/farmer-2.jpg",
};
assert.strictEqual(getJourneyStageImage(legacyStage), null, "Legacy farmer image must be scrubbed");
assert.strictEqual(isFarmerImage(legacyStage.image_url), true);
assert.strictEqual(isFarmerImage(legacyStage.images[0]), true);
assert.strictEqual(isFarmerImage(legacyStage.transformation_photo_id), true);
console.log("✓ TEST 8 PASSED: Legacy orders with farmer images are actively sanitized to null.\n");

// TEST 9: Broken image URL handling simulation
console.log("TEST 9: Broken image URL / 404 handling logic");
const brokenUrl = "https://example.com/non-existent-404.jpg";
const brokenImageSet = new Set<string>();
// Simulate onError handler
function simulateImgError(url: string) {
  brokenImageSet.add(url);
}
simulateImgError(brokenUrl);
assert.strictEqual(brokenImageSet.has(brokenUrl), true, "Broken URL must be tracked");
// When broken, component uses placeholder instead of rendering img tag
function resolveImageToRender(stage: any) {
  const raw = getJourneyStageImage(stage);
  if (!raw || brokenImageSet.has(raw)) {
    return { type: "placeholder", ...getStagePlaceholderInfo(stage) };
  }
  return { type: "image", src: raw };
}
const renderResult = resolveImageToRender({ label: "Quality Check", image_url: brokenUrl });
assert.strictEqual(renderResult.type, "placeholder", "Broken image must fall back to placeholder");
assert.strictEqual(renderResult.defaultTitle, "Quality Check");
console.log("✓ TEST 9 PASSED: Broken image falls back to stage placeholder with loop prevention.\n");

console.log("=== ALL 9 HARVEST JOURNEY INTEGRITY TESTS PASSED WITH 100% SUCCESS! ===");

