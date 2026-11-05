import React from "react";
import {
  // 8 Presets
  Sprout,
  Sun,
  Leaf,
  Droplets,
  Search,
  Hand,
  Package,
  Truck,
  // Agriculture & Crops
  Wheat,
  Apple,
  Carrot,
  Flower2,
  Trees,
  Shovel,
  Tractor,
  CloudRain,
  Wind,
  // Processing & Craft
  Flame,
  Coffee,
  Sparkles,
  Scissors,
  Layers,
  Filter,
  Beaker,
  FlaskConical,
  GlassWater,
  Zap,
  Thermometer,
  ThermometerSnowflake,
  Fan,
  Hammer,
  Scale,
  Timer,
  Clock,
  RotateCcw,
  // Storage & Warehousing
  Warehouse,
  Factory,
  Container,
  Boxes,
  Box,
  PackageCheck,
  Archive,
  Lock,
  Tag,
  // Quality & Testing
  CheckCircle2,
  ShieldCheck,
  Award,
  ListChecks,
  BadgeCheck,
  Microscope,
  Scan,
  ShieldAlert,
  // Logistics & Distribution
  Ship,
  Plane,
  MapPin,
  Compass,
  Send,
  Navigation,
  // General & Artisanal
  Heart,
  Smile,
  Star,
  Sliders,
  type LucideIcon,
} from "lucide-react";

export interface IconDefinition {
  name: string; // Identifier / lookup key (e.g. "Flame")
  label: string; // Human-friendly label (e.g. "Roasting / Heat")
  category: "Presets" | "Agriculture" | "Processing" | "Quality" | "Storage" | "Logistics" | "General";
  keywords: string[];
  icon: LucideIcon;
}

export const PRESET_ICONS: IconDefinition[] = [
  { name: "sprout", label: "Sprout / Planting", category: "Presets", keywords: ["sprout", "seed", "planting", "growth", "nursery"], icon: Sprout },
  { name: "sun", label: "Sun Drying", category: "Presets", keywords: ["sun", "drying", "solar", "natural", "curing"], icon: Sun },
  { name: "leaf", label: "Harvest / Ripening", category: "Presets", keywords: ["leaf", "harvest", "picking", "ripening", "plucking"], icon: Leaf },
  { name: "droplets", label: "Washing / Processing", category: "Presets", keywords: ["droplets", "wash", "water", "cleaning", "rinse"], icon: Droplets },
  { name: "search", label: "Quality Check", category: "Presets", keywords: ["search", "quality", "check", "inspection", "audit"], icon: Search },
  { name: "hand", label: "Hand Sorting", category: "Presets", keywords: ["hand", "sorting", "grading", "artisan", "selection"], icon: Hand },
  { name: "package", label: "Eco-Packaging", category: "Presets", keywords: ["package", "packing", "box", "eco", "pouch"], icon: Package },
  { name: "truck", label: "Dispatch / Shipping", category: "Presets", keywords: ["truck", "dispatch", "shipping", "transit", "delivery"], icon: Truck },
];

export const SEARCHABLE_ICON_LIBRARY: IconDefinition[] = [
  // Processing & Craft (Great for Fermentation, Roasting, Milling, Cold Storage, Brewing)
  { name: "Flame", label: "Flame / Roasting", category: "Processing", keywords: ["flame", "fire", "roasting", "heat", "baking", "kiln", "thermal"], icon: Flame },
  { name: "Coffee", label: "Coffee / Brewing", category: "Processing", keywords: ["coffee", "bean", "brewing", "roast", "infusion", "beverage"], icon: Coffee },
  { name: "Beaker", label: "Beaker / Fermentation", category: "Processing", keywords: ["beaker", "fermentation", "microbiology", "yeast", "enzyme", "culture"], icon: Beaker },
  { name: "FlaskConical", label: "Flask / Extraction", category: "Processing", keywords: ["flask", "extraction", "distillation", "essence", "chemistry"], icon: FlaskConical },
  { name: "ThermometerSnowflake", label: "Cold Storage / Freezing", category: "Storage", keywords: ["cold", "storage", "snowflake", "chill", "freeze", "refrigeration", "cooling"], icon: ThermometerSnowflake },
  { name: "Thermometer", label: "Temperature Control", category: "Processing", keywords: ["temperature", "heat", "curing", "monitoring", "thermal"], icon: Thermometer },
  { name: "Scale", label: "Weighing / Batching", category: "Processing", keywords: ["scale", "weight", "batching", "measurement", "precision"], icon: Scale },
  { name: "Filter", label: "Filtration / Straining", category: "Processing", keywords: ["filter", "filtration", "straining", "purification", "clarification"], icon: Filter },
  { name: "Scissors", label: "Pruning / Trimming", category: "Agriculture", keywords: ["scissors", "pruning", "trimming", "cutting", "shearing"], icon: Scissors },
  { name: "Layers", label: "Layering / Pressing", category: "Processing", keywords: ["layers", "pressing", "milling", "pulping", "mashing"], icon: Layers },
  { name: "Hammer", label: "Crushing / Milling", category: "Processing", keywords: ["hammer", "crushing", "milling", "grinding", "pulverizing"], icon: Hammer },
  { name: "GlassWater", label: "Hydration / Soaking", category: "Processing", keywords: ["water", "soaking", "maceration", "steeping", "liquid"], icon: GlassWater },
  { name: "Fan", label: "Aeration / Ventilation", category: "Processing", keywords: ["fan", "wind", "aeration", "ventilation", "drying"], icon: Fan },
  { name: "Sparkles", label: "Polishing / Refining", category: "Processing", keywords: ["sparkles", "polishing", "refining", "finishing", "enhancement"], icon: Sparkles },
  { name: "Timer", label: "Aging / Rest Time", category: "Processing", keywords: ["timer", "aging", "resting", "maturation", "curing", "duration"], icon: Timer },
  { name: "RotateCcw", label: "Tumbling / Rotating", category: "Processing", keywords: ["rotate", "tumbling", "turning", "churning"], icon: RotateCcw },

  // Agriculture & Crops
  { name: "Wheat", label: "Wheat / Grain", category: "Agriculture", keywords: ["wheat", "grain", "cereal", "harvest", "field", "flour"], icon: Wheat },
  { name: "Apple", label: "Orchard / Fruit", category: "Agriculture", keywords: ["apple", "fruit", "orchard", "picking", "fresh"], icon: Apple },
  { name: "Carrot", label: "Root Crops / Veg", category: "Agriculture", keywords: ["carrot", "vegetable", "root", "organic", "produce"], icon: Carrot },
  { name: "Trees", label: "Forest / Agroforestry", category: "Agriculture", keywords: ["trees", "forest", "wildcraft", "canopy", "plantation"], icon: Trees },
  { name: "Flower2", label: "Flowering / Blossom", category: "Agriculture", keywords: ["flower", "blossom", "pollination", "bloom", "botanical"], icon: Flower2 },
  { name: "Shovel", label: "Soil / Tillage", category: "Agriculture", keywords: ["shovel", "soil", "bedding", "compost", "land"], icon: Shovel },
  { name: "Tractor", label: "Field Ops / Farming", category: "Agriculture", keywords: ["tractor", "farm", "machinery", "plowing", "cultivation"], icon: Tractor },
  { name: "CloudRain", label: "Monsoon / Irrigation", category: "Agriculture", keywords: ["rain", "irrigation", "water", "monsoon", "climate"], icon: CloudRain },
  { name: "Wind", label: "Wind Curing", category: "Agriculture", keywords: ["wind", "air", "breeze", "natural", "ventilation"], icon: Wind },

  // Quality & Testing
  { name: "Microscope", label: "Lab Analysis / Testing", category: "Quality", keywords: ["microscope", "lab", "testing", "pathogen", "analysis", "purity"], icon: Microscope },
  { name: "BadgeCheck", label: "Certified Organic", category: "Quality", keywords: ["badge", "organic", "certification", "compliance", "verified"], icon: BadgeCheck },
  { name: "ListChecks", label: "Grading Checklist", category: "Quality", keywords: ["list", "checklist", "standards", "grading", "specs"], icon: ListChecks },
  { name: "ShieldCheck", label: "Safety / Hygiene", category: "Quality", keywords: ["shield", "safety", "hygiene", "sanitation", "haccp"], icon: ShieldCheck },
  { name: "Award", label: "Premium Grade / Gold", category: "Quality", keywords: ["award", "premium", "gold", "artisan", "grade a", "export"], icon: Award },
  { name: "Scan", label: "Barcoding / Traceability", category: "Quality", keywords: ["scan", "traceability", "qr", "lot", "tracking"], icon: Scan },

  // Storage & Warehousing
  { name: "Warehouse", label: "Warehouse / Silo", category: "Storage", keywords: ["warehouse", "storage", "silo", "depot", "holding"], icon: Warehouse },
  { name: "Factory", label: "Processing Facility", category: "Storage", keywords: ["factory", "facility", "plant", "mill", "refinery"], icon: Factory },
  { name: "Container", label: "Silo / Bulk Tank", category: "Storage", keywords: ["container", "silo", "tank", "bulk", "vessel"], icon: Container },
  { name: "Boxes", label: "Batch Staging", category: "Storage", keywords: ["boxes", "staging", "inventory", "stock", "crates"], icon: Boxes },
  { name: "Box", label: "Carton Packaging", category: "Storage", keywords: ["box", "carton", "casing", "packaging"], icon: Box },
  { name: "PackageCheck", label: "Sealed & Verified", category: "Storage", keywords: ["package", "seal", "verified", "packaged", "ready"], icon: PackageCheck },
  { name: "Archive", label: "Seed Bank / Reserve", category: "Storage", keywords: ["archive", "reserve", "bank", "heritage", "vault"], icon: Archive },
  { name: "Tag", label: "Batch Tagging", category: "Storage", keywords: ["tag", "label", "lot", "stamp", "marking"], icon: Tag },

  // Logistics & Distribution
  { name: "Ship", label: "Sea Cargo / Export", category: "Logistics", keywords: ["ship", "vessel", "export", "port", "cargo"], icon: Ship },
  { name: "Plane", label: "Air Cargo / Express", category: "Logistics", keywords: ["plane", "air", "express", "flight", "speed"], icon: Plane },
  { name: "MapPin", label: "Origin Location", category: "Logistics", keywords: ["map", "pin", "origin", "gps", "farm gate"], icon: MapPin },
  { name: "Compass", label: "Transit Route", category: "Logistics", keywords: ["compass", "route", "corridor", "transport"], icon: Compass },
  { name: "Send", label: "Direct Customer Dispatch", category: "Logistics", keywords: ["send", "dispatch", "courier", "last mile"], icon: Send },

  // General & Artisanal
  { name: "Heart", label: "Community / Fair Trade", category: "General", keywords: ["heart", "community", "love", "farmer", "welfare"], icon: Heart },
  { name: "Smile", label: "Farm Direct", category: "General", keywords: ["smile", "happy", "direct", "satisfaction"], icon: Smile },
  { name: "Star", label: "Specialty Lot", category: "General", keywords: ["star", "specialty", "micro-lot", "exclusive"], icon: Star },
  { name: "Sliders", label: "Custom Blend / Formula", category: "General", keywords: ["sliders", "custom", "recipe", "formula", "tuning"], icon: Sliders },
];

// Combined dictionary for instant O(1) lookup
export const ALL_ICONS_MAP: Record<string, LucideIcon> = {};

[...PRESET_ICONS, ...SEARCHABLE_ICON_LIBRARY].forEach((item) => {
  ALL_ICONS_MAP[item.name.toLowerCase()] = item.icon;
  ALL_ICONS_MAP[item.name] = item.icon;
});

// Additional alias mappings for preset keys
ALL_ICONS_MAP["sun-drying"] = Sun;
ALL_ICONS_MAP["hand-sorting"] = Hand;
ALL_ICONS_MAP["quality-check"] = Search;
ALL_ICONS_MAP["eco-packaging"] = Package;

/**
 * Resolve Lucide icon component by name / key with fallback
 */
export function getLucideIcon(iconNameOrKey?: string | null, fallback: LucideIcon = Sparkles): LucideIcon {
  if (!iconNameOrKey) return fallback;
  const clean = iconNameOrKey.trim();
  const lower = clean.toLowerCase();

  if (ALL_ICONS_MAP[clean]) return ALL_ICONS_MAP[clean];
  if (ALL_ICONS_MAP[lower]) return ALL_ICONS_MAP[lower];

  // Try matching common substrings
  if (lower.includes("sun") || lower.includes("dry")) return Sun;
  if (lower.includes("wash") || lower.includes("water")) return Droplets;
  if (lower.includes("sprout") || lower.includes("plant") || lower.includes("seed")) return Sprout;
  if (lower.includes("harvest") || lower.includes("leaf")) return Leaf;
  if (lower.includes("sort") || lower.includes("hand")) return Hand;
  if (lower.includes("check") || lower.includes("quality") || lower.includes("test")) return Search;
  if (lower.includes("pack") || lower.includes("box")) return Package;
  if (lower.includes("truck") || lower.includes("ship") || lower.includes("dispatch")) return Truck;
  if (lower.includes("flame") || lower.includes("roast")) return Flame;
  if (lower.includes("coffee") || lower.includes("brew")) return Coffee;
  if (lower.includes("cold") || lower.includes("chill") || lower.includes("freeze")) return ThermometerSnowflake;
  if (lower.includes("mill") || lower.includes("crush")) return Hammer;
  if (lower.includes("scale") || lower.includes("weigh")) return Scale;
  if (lower.includes("warehouse") || lower.includes("store")) return Warehouse;

  return fallback;
}

/**
 * Sanitizes SVG string before rendering or persisting to prevent XSS.
 */
export function sanitizeSvgString(svgContent: string): string {
  if (!svgContent) return "";
  let clean = svgContent
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove inline event handlers like onclick=, onload=, onerror=
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^ >]+/gi, "")
    // Remove javascript: and data: (except safe data:image)
    .replace(/href\s*=\s*(['"])javascript:.*?\1/gi, "")
    .replace(/href\s*=\s*javascript:[^ >]+/gi, "")
    // Remove foreignObject
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, "");

  return clean;
}
