import { db } from "../db.ts";
import { farmerProducts, productInventory, profiles } from "../schema/index.ts";
import { eq, or, desc } from "drizzle-orm";
import { getDatabase } from "../../lib/mongodb.ts";
import { allProducts as staticCatalog } from "../../frontend/lib/mock/products.ts";

export interface ProductVariant {
  name: string;
  weightGrams: number;
  price: number;
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
}

export interface AuthoritativeProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  variants: ProductVariant[];
  image: string;
  stock: "In Stock" | "Low Stock" | "Pre-Order" | "Out of Stock";
  stockStatus: "in_stock" | "few_left" | "pre_order" | "out_of_stock";
  unitsLeft: number;
  origin: string;
  sku: string;
  weight: string;
  isCrmOnly?: boolean;
  channel?: "central" | "crm_only";
  url: string;
  featured?: boolean;
  status?: string;
  updatedAt?: string;
}

// Global in-memory registry caches for instant server-turn feedback
declare global {
  // eslint-disable-next-line no-var
  var __crmLiveProducts: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
  var __crmDeletedProductIds: Set<string> | undefined;
}

if (!globalThis.__crmLiveProducts) {
  globalThis.__crmLiveProducts = new Map();
}

if (!globalThis.__crmDeletedProductIds) {
  globalThis.__crmDeletedProductIds = new Set();
}

/**
 * Normalizes a product name into a clean URL-friendly slug
 */
export function createProductSlug(name: string, idSuffix: string = ""): string {
  const base = (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return idSuffix ? `${base}-${idSuffix}` : (base || "himalayan-produce");
}

/**
 * Derives realistic packaging sizes and prices based on category and base item price
 */
export function deriveProductVariants(
  productName: string,
  basePrice: number,
  baseWeight: string = "500g"
): ProductVariant[] {
  const nl = (productName || "").toLowerCase();

  if (nl.includes("honey") || nl.includes("shehad") || nl.includes("shahad")) {
    return [
      { name: "500g Glass Jar", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "250g Glass Jar", weightGrams: 250, price: Math.round(basePrice * 0.56), stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: Math.round(basePrice * 1.73), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("almond") || nl.includes("badam") || nl.includes("mamra")) {
    return [
      { name: "500g Pack", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Mountain Pack", weightGrams: 1000, price: Math.round(basePrice * 1.94), stockStatus: "in_stock" },
      { name: "500g Mamra Giri", weightGrams: 500, price: Math.round(basePrice * 1.74), stockStatus: "in_stock" },
      { name: "1kg Mamra Giri", weightGrams: 1000, price: Math.round(basePrice * 3.33), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("walnut") || nl.includes("akhrot")) {
    return [
      { name: "500g Giri (Kernels)", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "500g In-Shell", weightGrams: 500, price: Math.round(basePrice * 0.7), stockStatus: "in_stock" },
      { name: "1kg In-Shell", weightGrams: 1000, price: Math.round(basePrice * 1.3), stockStatus: "in_stock" },
      { name: "1kg Giri (Kernels)", weightGrams: 1000, price: Math.round(basePrice * 1.92), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("shilajit")) {
    return [
      { name: "20g Pure Resin", weightGrams: 20, price: basePrice, stockStatus: "in_stock" },
      { name: "50g Pure Resin", weightGrams: 50, price: Math.round(basePrice * 2.2), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("ghee") || nl.includes("bilona")) {
    return [
      { name: "1 Litre Glass Jar", weightGrams: 1000, price: basePrice, stockStatus: "in_stock" },
      { name: "500ml Glass Jar", weightGrams: 500, price: Math.round(basePrice * 0.55), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("saffron") || nl.includes("kesar")) {
    return [
      { name: "1g Authentic Kashmiri Mongra", weightGrams: 1, price: basePrice, stockStatus: "in_stock" },
      { name: "2g Gift Wooden Box", weightGrams: 2, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("apricot") || nl.includes("khumani") || nl.includes("khubani")) {
    return [
      { name: "500g Sun-Dried Red", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Ladakh Value Pack", weightGrams: 1000, price: Math.round(basePrice * 1.9), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("turmeric") || nl.includes("haldi") || nl.includes("spices") || nl.includes("masala")) {
    return [
      { name: "250g Jar", weightGrams: 250, price: basePrice, stockStatus: "in_stock" },
      { name: "500g Value Pack", weightGrams: 500, price: Math.round(basePrice * 1.85), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("pickle") || nl.includes("achar")) {
    return [
      { name: "400g Glass Jar", weightGrams: 400, price: basePrice, stockStatus: "in_stock" },
      { name: "800g Family Jar", weightGrams: 800, price: Math.round(basePrice * 1.8), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("salt") || nl.includes("namak")) {
    return [
      { name: "500g Pouch", weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: Math.round(basePrice * 1.8), stockStatus: "in_stock" },
    ];
  }
  if (nl.includes("seed") || nl.includes("chia")) {
    return [
      { name: "250g Pack", weightGrams: 250, price: basePrice, stockStatus: "in_stock" },
      { name: "500g Value Pack", weightGrams: 500, price: Math.round(basePrice * 1.85), stockStatus: "in_stock" },
    ];
  }

  return [
    { name: baseWeight, weightGrams: 500, price: basePrice, stockStatus: "in_stock" },
    { name: `2x ${baseWeight} Twin Pack`, weightGrams: 1000, price: Math.round(basePrice * 1.88), stockStatus: "in_stock" },
  ];
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise
      .then((res) => {
        if (timer) clearTimeout(timer);
        return res;
      })
      .catch(() => fallback),
    timeoutPromise,
  ]);
}

/**
 * Authoritative Base Products ensuring comprehensive Himalayan inventory coverage
 */
const BASE_HIMALAYAN_PRODUCTS: AuthoritativeProduct[] = [
  {
    id: "prod_honey",
    name: "Himalayan Raw Flora Honey",
    slug: "himalayan-multiflora-honey",
    category: "Honey",
    description: "100% pure raw multi-flora forest harvest from high-altitude Himalayan beekeepers.",
    price: 550,
    compareAtPrice: 650,
    variants: [
      { name: "500g Glass Jar", weightGrams: 500, price: 550, stockStatus: "in_stock" },
      { name: "250g Glass Jar", weightGrams: 250, price: 310, stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: 950, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-honey.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 64,
    origin: "Solan & Shimla Mountain Valley Orchards",
    sku: "PM-HNY-500",
    weight: "500g",
    url: "/catalogue#himalayan-multiflora-honey",
    featured: true,
  },
  {
    id: "prod_almond",
    name: "Himalayan Organic Almonds (Badam)",
    slug: "himalayan-organic-almonds",
    category: "Dry Fruits & Nuts",
    description: "100% pure Himalayan organic almonds (Mamra Giri & Kashmir Sweet) from mountain orchards.",
    price: 720,
    compareAtPrice: 850,
    variants: [
      { name: "500g Pack", weightGrams: 500, price: 720, stockStatus: "in_stock" },
      { name: "1kg Mountain Pack", weightGrams: 1000, price: 1400, stockStatus: "in_stock" },
      { name: "500g Mamra Giri", weightGrams: 500, price: 1250, stockStatus: "in_stock" },
      { name: "1kg Mamra Giri", weightGrams: 1000, price: 2400, stockStatus: "in_stock" },
    ],
    image: "/assets/prod-almonds.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 42,
    origin: "High Altitude Organic Orchards, Kashmir",
    sku: "PM-ALM-500",
    weight: "500g",
    url: "/catalogue#himalayan-organic-almonds",
    featured: true,
  },
  {
    id: "prod_walnut",
    name: "Kashmiri Organic Walnuts (Akhrot)",
    slug: "kashmiri-organic-walnuts",
    category: "Dry Fruits & Nuts",
    description: "Direct Kashmir & Himachal valley certified fresh Kagzi Walnuts and Giri Kernels.",
    price: 650,
    compareAtPrice: 750,
    variants: [
      { name: "500g Giri (Kernels)", weightGrams: 500, price: 650, stockStatus: "in_stock" },
      { name: "500g In-Shell", weightGrams: 500, price: 450, stockStatus: "in_stock" },
      { name: "1kg In-Shell", weightGrams: 1000, price: 850, stockStatus: "in_stock" },
      { name: "1kg Giri (Kernels)", weightGrams: 1000, price: 1250, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-nuts.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 38,
    origin: "Kashmir Giri High Oil Belt",
    sku: "PM-WAL-500",
    weight: "500g",
    url: "/catalogue#kashmiri-organic-walnuts",
    featured: true,
  },
  {
    id: "prod_shilajit",
    name: "Pure Himalayan Shilajit Resin",
    slug: "pure-himalayan-shilajit",
    category: "Wellness & Shilajit",
    description: "Gold grade pure Himalayan Shilajit resin with 75%+ fulvic acid content.",
    price: 1450,
    compareAtPrice: 1800,
    variants: [
      { name: "20g Pure Resin", weightGrams: 20, price: 1450, stockStatus: "in_stock" },
      { name: "50g Pure Resin", weightGrams: 50, price: 3190, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-herbs.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 25,
    origin: "High Altitude Himalayan Rocks (16,000+ ft)",
    sku: "PM-SHL-020",
    weight: "20g",
    url: "/catalogue#pure-himalayan-shilajit",
    featured: true,
  },
  {
    id: "prod_ghee",
    name: "A2 Badri Cow Bilona Ghee",
    slug: "badri-cow-a2-ghee",
    category: "Ghee & Dairy",
    description: "Cultured slow-churned wooden bilona ghee from indigenous mountain Badri cows.",
    price: 2100,
    compareAtPrice: 2400,
    variants: [
      { name: "1 Litre Glass Jar", weightGrams: 1000, price: 2100, stockStatus: "in_stock" },
      { name: "500ml Glass Jar", weightGrams: 500, price: 1150, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-nuts.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 18,
    origin: "Uttarakhand High Altitude Forest Gaushala",
    sku: "PM-GHE-1000",
    weight: "1L",
    url: "/catalogue#badri-cow-a2-ghee",
    featured: true,
  },
  {
    id: "prod_saffron",
    name: "Pure Kashmiri Mongra Saffron",
    slug: "kashmiri-mongra-saffron",
    category: "Spices & Saffron",
    description: "Grade 1 Pampore Mongra saffron with intense aroma and high crocin content.",
    price: 380,
    compareAtPrice: 450,
    variants: [
      { name: "1g Authentic Kashmiri Mongra", weightGrams: 1, price: 380, stockStatus: "in_stock" },
      { name: "2g Gift Wooden Box", weightGrams: 2, price: 720, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-masalas.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 50,
    origin: "Pampore Saffron Fields, Kashmir",
    sku: "PM-SAF-001",
    weight: "1g",
    url: "/catalogue#kashmiri-mongra-saffron",
    featured: true,
  },
  {
    id: "prod_apricot",
    name: "Ladakh Sun-Dried Apricots (Khumani)",
    slug: "ladakh-sun-dried-apricots",
    category: "Dry Fruits & Nuts",
    description: "Sun-dried natural wild red apricots from cold desert Ladakh valleys.",
    price: 550,
    compareAtPrice: 650,
    variants: [
      { name: "500g Sun-Dried Red", weightGrams: 500, price: 550, stockStatus: "in_stock" },
      { name: "1kg Ladakh Value Pack", weightGrams: 1000, price: 1050, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-dryfruits.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 45,
    origin: "Sham Valley Orchard, Ladakh",
    sku: "PM-APR-500",
    weight: "500g",
    url: "/catalogue#ladakh-sun-dried-apricots",
  },
  {
    id: "turmeric-powder",
    name: "Stone-Ground Lakadong Turmeric",
    slug: "stone-ground-turmeric",
    category: "Spices & Saffron",
    description: "High-curcumin (7%+) mountain turmeric, stone ground slowly to preserve volatile essential oils.",
    price: 240,
    compareAtPrice: 290,
    variants: [
      { name: "250g Jar", weightGrams: 250, price: 240, stockStatus: "in_stock" },
      { name: "500g Value Pack", weightGrams: 500, price: 440, stockStatus: "in_stock" },
    ],
    image: "/assets/prod-turmeric.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 86,
    origin: "Lakadong Valley Mountain Terraces",
    sku: "PM-TUR-250",
    weight: "250g",
    url: "/catalogue#stone-ground-turmeric",
  },
  {
    id: "mango-pickle",
    name: "Heirloom Himalayan Mango Pickle",
    slug: "heirloom-mango-pickle",
    category: "Pickles & Preserves",
    description: "Traditional sun-matured mountain mango pickle in pure cold-pressed mustard oil with Himalayan rock salt.",
    price: 380,
    compareAtPrice: 450,
    variants: [
      { name: "400g Glass Jar", weightGrams: 400, price: 380, stockStatus: "in_stock" },
      { name: "800g Family Jar", weightGrams: 800, price: 680, stockStatus: "in_stock" },
    ],
    image: "/assets/prod-pickle.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 24,
    origin: "Himalayan Foothills Wood Pressed",
    sku: "PM-PCK-400",
    weight: "400g",
    url: "/catalogue#heirloom-mango-pickle",
  },
  {
    id: "pink-himalayan-salt",
    name: "Pink Himalayan Mineral Rock Salt",
    slug: "pink-himalayan-salt",
    category: "Salts & Minerals",
    description: "Unrefined pink crystal salt rich in 84 trace minerals, crushed from pristine fossilized mountain beds.",
    price: 180,
    compareAtPrice: 220,
    variants: [
      { name: "500g Pouch", weightGrams: 500, price: 180, stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: 320, stockStatus: "in_stock" },
    ],
    image: "/assets/prod-salt.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 120,
    origin: "Khewra Foothills Mineral Rich",
    sku: "PM-SLT-500",
    weight: "500g",
    url: "/catalogue#pink-himalayan-salt",
  },
  {
    id: "garam-masala",
    name: "Pahari House Garam Masala",
    slug: "house-garam-masala",
    category: "Spices & Saffron",
    description: "Artisanal blend of 14 slow-roasted Himalayan spices, stone-ground in traditional brass mills.",
    price: 320,
    compareAtPrice: 390,
    variants: [
      { name: "200g Jar", weightGrams: 200, price: 320, stockStatus: "in_stock" },
      { name: "400g Value Pack", weightGrams: 400, price: 590, stockStatus: "in_stock" },
    ],
    image: "/assets/prod-masala.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 58,
    origin: "Stone-Ground Whole Mountain Spices",
    sku: "PM-MAS-200",
    weight: "200g",
    url: "/catalogue#house-garam-masala",
  },
  {
    id: "mixed-seeds",
    name: "Himalayan Five-Seed Superfood Mix",
    slug: "five-seed-mix",
    category: "Seeds & Superfoods",
    description: "Sun-dried raw pumpkin, chia, flax, watermelon, and sunflower seeds from organic hill growers.",
    price: 280,
    compareAtPrice: 340,
    variants: [
      { name: "250g Pack", weightGrams: 250, price: 280, stockStatus: "in_stock" },
      { name: "500g Value Pack", weightGrams: 500, price: 510, stockStatus: "in_stock" },
    ],
    image: "/assets/prod-seeds.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 96,
    origin: "Uttarakhand Hill Farms",
    sku: "PM-SED-500",
    weight: "500g",
    url: "/catalogue#five-seed-mix",
  },
  {
    id: "lemon-pickle",
    name: "Sun-Cured Mountain Lemon Pickle",
    slug: "salt-cured-lemon-pickle",
    category: "Pickles & Preserves",
    description: "Six-week sun-cured galgal lemons infused with roasted ajwain and Himalayan black salt. Oil-free.",
    price: 320,
    compareAtPrice: 380,
    variants: [
      { name: "400g Glass Jar", weightGrams: 400, price: 320, stockStatus: "in_stock" },
      { name: "800g Family Jar", weightGrams: 800, price: 580, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-pickles.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 42,
    origin: "Solan Valley Six-Week Sun Aged",
    sku: "PM-LMN-400",
    weight: "400g",
    url: "/catalogue#salt-cured-lemon-pickle",
  },
  {
    id: "black-salt",
    name: "Kiln-Fired Himalayan Black Salt (Kala Namak)",
    slug: "black-salt-kala-namak",
    category: "Salts & Minerals",
    description: "Authentic volcanic mineral salt kiln-fired with harad and amla seeds for deep digestive wellness.",
    price: 160,
    compareAtPrice: 190,
    variants: [
      { name: "500g Pouch", weightGrams: 500, price: 160, stockStatus: "in_stock" },
      { name: "1kg Pack", weightGrams: 1000, price: 290, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-salts.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 86,
    origin: "Kiln-Fired Natural Crystals",
    sku: "PM-BSL-500",
    weight: "500g",
    url: "/catalogue#black-salt-kala-namak",
  },
  {
    id: "chai-masala",
    name: "Pahari Spiced Kadak Chai Masala",
    slug: "spiced-chai-masala",
    category: "Spices & Saffron",
    description: "Pahari cardamom, clove, ginger root, cinnamon, and black pepper for comforting mountain tea.",
    price: 260,
    compareAtPrice: 310,
    variants: [
      { name: "150g Jar", weightGrams: 150, price: 260, stockStatus: "in_stock" },
      { name: "300g Value Pack", weightGrams: 300, price: 470, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-spices.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 24,
    origin: "Pahari Cardamom & Clove Terroir",
    sku: "PM-CHM-150",
    weight: "150g",
    url: "/catalogue#spiced-chai-masala",
  },
  {
    id: "chia-seeds",
    name: "High-Altitude Black Chia Seeds",
    slug: "black-chia-seeds",
    category: "Seeds & Superfoods",
    description: "Organic chia seeds rich in Omega-3 fatty acids, plant protein, and soluble dietary fiber.",
    price: 220,
    compareAtPrice: 270,
    variants: [
      { name: "250g Pack", weightGrams: 250, price: 220, stockStatus: "in_stock" },
      { name: "500g Value Pack", weightGrams: 500, price: 390, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-seeds.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 120,
    origin: "High Altitude Organic Cultivation",
    sku: "PM-CHI-250",
    weight: "250g",
    url: "/catalogue#black-chia-seeds",
  },
  {
    id: "kashmir-lavender-oil",
    name: "Kashmiri Pure Lavender Essential Oil",
    slug: "kashmiri-lavender-oil",
    category: "Wellness & Shilajit",
    description: "Steam-distilled pure mountain lavender blossoms from Kashmir valley slopes.",
    price: 850,
    compareAtPrice: 999,
    variants: [
      { name: "15ml Glass Dropper", weightGrams: 15, price: 850, stockStatus: "in_stock" },
      { name: "30ml Value Dropper", weightGrams: 30, price: 1550, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-herbs.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 30,
    origin: "Kashmir Mountain Lavender Valley",
    sku: "PM-LAV-015",
    weight: "15ml",
    url: "/catalogue#kashmiri-lavender-oil",
  },
  {
    id: "apple-cider-vinegar",
    name: "Himalayan Raw Apple Cider Vinegar (With Mother)",
    slug: "himalayan-apple-cider-vinegar",
    category: "Wellness & Shilajit",
    description: "Raw, unpasteurized, naturally fermented vinegar from juicy Kinnaur and Shimla hill apples.",
    price: 480,
    compareAtPrice: 590,
    variants: [
      { name: "500ml Glass Bottle", weightGrams: 500, price: 480, stockStatus: "in_stock" },
      { name: "1 Litre Family Bottle", weightGrams: 1000, price: 880, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-honey.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 55,
    origin: "Kinnaur Mountain Apple Orchards",
    sku: "PM-ACV-500",
    weight: "500ml",
    url: "/catalogue#himalayan-apple-cider-vinegar",
  },
  {
    id: "pahadi-rajma",
    name: "Pahadi Chitra Rajma (Munsiari Kidney Beans)",
    slug: "pahadi-chitra-rajma",
    category: "Produce",
    description: "Famous Munsiari valley red kidney beans grown without synthetic pesticides. Melts in your mouth.",
    price: 290,
    compareAtPrice: 350,
    variants: [
      { name: "500g Pack", weightGrams: 500, price: 290, stockStatus: "in_stock" },
      { name: "1kg Family Pack", weightGrams: 1000, price: 540, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-dryfruits.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 60,
    origin: "Munsiari High Valley Terraces",
    sku: "PM-RAJ-500",
    weight: "500g",
    url: "/catalogue#pahadi-chitra-rajma",
  },
  {
    id: "chamomile-tea",
    name: "Wild Himalayan Chamomile Flower Tea",
    slug: "wild-chamomile-tea",
    category: "Wellness & Shilajit",
    description: "Whole chamomile blossoms hand-picked from high-altitude slopes. Naturally caffeine-free.",
    price: 390,
    compareAtPrice: 480,
    variants: [
      { name: "100g Loose Blossom Tin", weightGrams: 100, price: 390, stockStatus: "in_stock" },
      { name: "250g Value Pouch", weightGrams: 250, price: 850, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-herbs.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 35,
    origin: "Himachal High Meadows",
    sku: "PM-CHM-100",
    weight: "100g",
    url: "/catalogue#wild-chamomile-tea",
  },
  {
    id: "prod_atta",
    name: "Himalayan Stone-Ground Khapli Atta",
    slug: "himalayan-stone-ground-khapli-atta",
    category: "Produce",
    description: "Traditional stone-ground diabetic-friendly ancient Khapli wheat flour, naturally rich in dietary fiber.",
    price: 180,
    compareAtPrice: 220,
    variants: [
      { name: "1kg Stone-Ground Pack", weightGrams: 1000, price: 180, stockStatus: "in_stock" },
      { name: "2kg Value Pack", weightGrams: 2000, price: 350, stockStatus: "in_stock" },
      { name: "5kg Family Bag", weightGrams: 5000, price: 850, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-dryfruits.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 100,
    origin: "Solan Valley Traditional Watermills",
    sku: "PM-ATT-1000",
    weight: "1kg",
    url: "/catalogue#himalayan-stone-ground-khapli-atta",
  },
  {
    id: "prod_rice",
    name: "Himalayan Red Rice (Pahari Lal Chawal)",
    slug: "himalayan-red-rice",
    category: "Produce",
    description: "Unpolished, nutrient-dense Himalayan red rice irrigated by glacial mountain streams.",
    price: 220,
    compareAtPrice: 260,
    variants: [
      { name: "1kg Mountain Pack", weightGrams: 1000, price: 220, stockStatus: "in_stock" },
      { name: "2kg Family Pack", weightGrams: 2000, price: 420, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-dryfruits.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 80,
    origin: "Chamba Mountain Terraces",
    sku: "PM-RIC-1000",
    weight: "1kg",
    url: "/catalogue#himalayan-red-rice",
  },
  {
    id: "prod_mustard_oil",
    name: "Cold-Pressed Himalayan Kachi Ghani Mustard Oil",
    slug: "cold-pressed-mustard-oil",
    category: "Ghee & Dairy",
    description: "Authentic wood-churned (Kachi Ghani) pungent yellow mustard oil, rich in Omega-3.",
    price: 240,
    compareAtPrice: 280,
    variants: [
      { name: "1 Litre Bottle", weightGrams: 1000, price: 240, stockStatus: "in_stock" },
      { name: "2 Litre Can", weightGrams: 2000, price: 460, stockStatus: "in_stock" },
    ],
    image: "/assets/cat-honey.jpg",
    stock: "In Stock",
    stockStatus: "in_stock",
    unitsLeft: 75,
    origin: "Himachal Foothills Wood Press",
    sku: "PM-OIL-1000",
    weight: "1L",
    url: "/catalogue#cold-pressed-mustard-oil",
  },
];


/**
 * Loads all authoritative products across:
 * 1. MongoDB `crm_products` (live persistent store)
 * 2. PostgreSQL `farmerProducts` + `productInventory`
 * 3. In-memory `__crmLiveProducts` cache
 * 4. High-quality Himalayan base catalogue
 * Excluding any deleted or unpublished products
 */
export async function getAuthoritativeCrmProducts(baseUrl?: string): Promise<AuthoritativeProduct[]> {
  const host = baseUrl || "";
  const catalogueUrl = host ? `${host}/catalogue` : "/catalogue";
  const productsMap = new Map<string, AuthoritativeProduct>();

  // 1. Seed with base Himalayan catalog
  BASE_HIMALAYAN_PRODUCTS.forEach((p) => {
    productsMap.set(p.id, {
      ...p,
      url: `${catalogueUrl}#${p.slug}`,
    });
    if (p.slug) {
      productsMap.set(p.slug, {
        ...p,
        url: `${catalogueUrl}#${p.slug}`,
      });
    }
  });

  // 2. Load static catalog complements
  staticCatalog.forEach((sp: any) => {
    const id = sp.id || sp.slug;
    const slug = sp.slug || createProductSlug(sp.name);
    if (!productsMap.has(id) && !productsMap.has(slug)) {
      const basePrice = Math.round(sp.price || 999);
      const variants = deriveProductVariants(sp.name, basePrice, sp.weight || "500g");
      const img = sp.image || (Array.isArray(sp.images) && sp.images[0]) || "/assets/cat-honey.jpg";
      let stock: AuthoritativeProduct["stock"] = "In Stock";
      let stockStatus: AuthoritativeProduct["stockStatus"] = "in_stock";
      if (sp.stock === 0) {
        stock = sp.is_preorder ? "Pre-Order" : "Out of Stock";
        stockStatus = sp.is_preorder ? "pre_order" : "out_of_stock";
      }

      const item: AuthoritativeProduct = {
        id,
        name: sp.name,
        slug,
        category: sp.category || "Himalayan Produce",
        description: sp.description || "100% pure certified organic harvest from high-altitude Himalayan valleys.",
        price: basePrice,
        compareAtPrice: sp.mrp ? Math.round(sp.mrp) : Math.round(basePrice * 1.15),
        variants,
        image: img,
        stock,
        stockStatus,
        unitsLeft: typeof sp.stock === "number" ? sp.stock : 50,
        origin: sp.origin || "Himalayan Mountain Farms",
        sku: `PM-${slug.substring(0, 3).toUpperCase()}-500`,
        weight: sp.weight || "500g",
        url: `${catalogueUrl}#${slug}`,
      };
      productsMap.set(id, item);
      productsMap.set(slug, item);
    }
  });

  // 3. Load PostgreSQL products
  try {
    const rows = await withTimeout(
      db
        .select({
          product: farmerProducts,
          inventory: productInventory,
        })
        .from(farmerProducts)
        .leftJoin(productInventory, eq(farmerProducts.id, productInventory.productId))
        .orderBy(desc(farmerProducts.createdAt)),
      1200,
      []
    );

    if (rows && rows.length > 0) {
      rows.forEach(({ product, inventory }) => {
        if (!product || product.status === "archived") return;
        const currentStock = inventory?.quantity ?? product.stock ?? 10;
        let stock: AuthoritativeProduct["stock"] = "In Stock";
        let stockStatus: AuthoritativeProduct["stockStatus"] = "in_stock";
        if (currentStock <= 0) {
          stock = "Out of Stock";
          stockStatus = "out_of_stock";
        } else if (currentStock < 5) {
          stock = "Low Stock";
          stockStatus = "few_left";
        }

        const basePrice = Math.round(product.price || 0);
        const variants = deriveProductVariants(product.name, basePrice, product.unit || "500g");
        const img =
          Array.isArray(product.images) && product.images[0] ? product.images[0] : "/assets/cat-honey.jpg";

        const pItem: AuthoritativeProduct = {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category || "Produce",
          description: product.description || "100% pure mountain harvest direct from partner farmers.",
          price: basePrice,
          compareAtPrice: product.compareAtPrice ? Math.round(product.compareAtPrice) : Math.round(basePrice * 1.15),
          variants,
          image: img,
          stock,
          stockStatus,
          unitsLeft: currentStock,
          origin: "High Altitude Farm, Himachal Pradesh",
          sku: `PM-${product.slug.substring(0, 3).toUpperCase()}-500`,
          weight: product.unit || "500g",
          url: `${catalogueUrl}#${product.slug}`,
          status: product.status || "published",
        };

        productsMap.set(product.id, pItem);
        if (product.slug) productsMap.set(product.slug, pItem);
      });
    }
  } catch (pgErr) {
    // remote DB skipped/offline in dev
  }

  // 4. Load MongoDB crm_products
  try {
    const mongo = await withTimeout(getDatabase(), 1200, null);
    if (mongo) {
      const mongoDocs = await mongo.collection("crm_products").find({}).toArray();
      if (mongoDocs && mongoDocs.length > 0) {
        mongoDocs.forEach((doc: any) => {
          const id = doc.id || doc._id?.toString();
          const slug = doc.slug || createProductSlug(doc.name);
          const basePrice = Number(doc.price) || 0;
          const variants = doc.variants && Array.isArray(doc.variants) && doc.variants.length > 0
            ? doc.variants
            : deriveProductVariants(doc.name, basePrice, doc.weight || "500g");

          let sStatus: AuthoritativeProduct["stockStatus"] = "in_stock";
          if (doc.stock === "Out of Stock" || doc.unitsLeft === 0) sStatus = "out_of_stock";
          else if (doc.stock === "Pre-Order") sStatus = "pre_order";
          else if (doc.stock === "Low Stock" || doc.unitsLeft < 5) sStatus = "few_left";

          const pItem: AuthoritativeProduct = {
            id,
            name: doc.name,
            slug,
            category: doc.category || "Produce",
            description: doc.description || `100% authentic mountain harvest from ${doc.origin || "Himalayan farms"}.`,
            price: basePrice,
            compareAtPrice: doc.compareAtPrice ? Number(doc.compareAtPrice) : Math.round(basePrice * 1.15),
            variants,
            image: doc.image || "/assets/cat-honey.jpg",
            stock: doc.stock || "In Stock",
            stockStatus: sStatus,
            unitsLeft: typeof doc.unitsLeft === "number" ? doc.unitsLeft : 50,
            origin: doc.origin || "Himalayan Farms",
            sku: doc.sku || `PM-${id.substring(0, 4).toUpperCase()}`,
            weight: doc.weight || "500g",
            isCrmOnly: Boolean(doc.isCrmOnly),
            channel: doc.channel || (doc.isCrmOnly ? "crm_only" : "central"),
            url: `${catalogueUrl}#${slug}`,
            updatedAt: doc.updatedAt,
          };
          productsMap.set(id, pItem);
          productsMap.set(slug, pItem);
        });
      }
    }
  } catch {}

  // 5. Overlay in-memory live updates from CRM actions
  if (globalThis.__crmLiveProducts) {
    for (const [id, prod] of globalThis.__crmLiveProducts.entries()) {
      if (!prod) continue;
      const basePrice = Number(prod.price) || 0;
      const slug = prod.slug || createProductSlug(prod.name);
      const variants = prod.variants && Array.isArray(prod.variants) && prod.variants.length > 0
        ? prod.variants
        : deriveProductVariants(prod.name, basePrice, prod.weight || "500g");

      let sStatus: AuthoritativeProduct["stockStatus"] = "in_stock";
      if (prod.stock === "Out of Stock" || prod.unitsLeft === 0) sStatus = "out_of_stock";
      else if (prod.stock === "Pre-Order") sStatus = "pre_order";
      else if (prod.stock === "Low Stock" || (typeof prod.unitsLeft === "number" && prod.unitsLeft < 5)) sStatus = "few_left";

      const pItem: AuthoritativeProduct = {
        id: prod.id || id,
        name: prod.name,
        slug,
        category: prod.category || "Produce",
        description: prod.description || `100% authentic mountain harvest from ${prod.origin || "Himalayan farms"}.`,
        price: basePrice,
        compareAtPrice: prod.compareAtPrice ? Number(prod.compareAtPrice) : Math.round(basePrice * 1.15),
        variants,
        image: prod.image || "/assets/cat-honey.jpg",
        stock: prod.stock || "In Stock",
        stockStatus: sStatus,
        unitsLeft: typeof prod.unitsLeft === "number" ? prod.unitsLeft : 50,
        origin: prod.origin || "Himalayan Farms",
        sku: prod.sku || `PM-${(prod.id || id).substring(0, 4).toUpperCase()}`,
        weight: prod.weight || "500g",
        isCrmOnly: Boolean(prod.isCrmOnly),
        channel: prod.channel || (prod.isCrmOnly ? "crm_only" : "central"),
        url: `${catalogueUrl}#${slug}`,
        updatedAt: prod.updatedAt,
      };

      productsMap.set(id, pItem);
      productsMap.set(slug, pItem);
    }
  }

  // 6. Filter out deleted products
  const deletedSet = globalThis.__crmDeletedProductIds || new Set<string>();

  // Also load deleted products from MongoDB if available
  try {
    const mongo = await withTimeout(getDatabase(), 800, null);
    if (mongo) {
      const delDocs = await mongo.collection("crm_deleted_products").find({}).toArray();
      if (delDocs && delDocs.length > 0) {
        delDocs.forEach((d: any) => {
          if (d.id) deletedSet.add(d.id);
          if (d.slug) deletedSet.add(d.slug);
        });
      }
    }
  } catch {}

  // Deduplicate products by id and slug
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const result: AuthoritativeProduct[] = [];

  for (const prod of productsMap.values()) {
    if (!prod || !prod.id) continue;
    const pid = prod.id.toLowerCase();
    const pslug = (prod.slug || "").toLowerCase();

    if (deletedSet.has(prod.id) || (prod.slug && deletedSet.has(prod.slug)) || prod.status === "archived") {
      continue;
    }

    if (seenIds.has(pid) || (pslug && seenSlugs.has(pslug))) {
      continue;
    }

    seenIds.add(pid);
    if (pslug) seenSlugs.add(pslug);
    result.push(prod);
  }

  return result;
}

/**
 * Saves or updates a product across memory cache, MongoDB, and PostgreSQL
 */
export async function saveProductToRegistry(prodData: Partial<AuthoritativeProduct>): Promise<AuthoritativeProduct> {
  const name = (prodData.name || "").trim();
  if (!name) throw new Error("Product name is required");

  const id = prodData.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const slug = prodData.slug || createProductSlug(name);
  const basePrice = Math.round(Number(prodData.price) || 0);
  const weight = prodData.weight || "500g";
  const numUnits = typeof prodData.unitsLeft === "number" ? prodData.unitsLeft : prodData.stock === "Out of Stock" ? 0 : 50;
  const stock: AuthoritativeProduct["stock"] = prodData.stock || (numUnits <= 0 ? "Out of Stock" : "In Stock");

  let stockStatus: AuthoritativeProduct["stockStatus"] = "in_stock";
  if (stock === "Out of Stock" || numUnits <= 0) stockStatus = "out_of_stock";
  else if (stock === "Pre-Order") stockStatus = "pre_order";
  else if (stock === "Low Stock" || numUnits < 5) stockStatus = "few_left";

  const variants = prodData.variants && Array.isArray(prodData.variants) && prodData.variants.length > 0
    ? prodData.variants
    : deriveProductVariants(name, basePrice, weight);

  const productRecord: AuthoritativeProduct = {
    id,
    name,
    slug,
    category: prodData.category || "Produce",
    description: prodData.description || `100% authentic mountain harvest from ${prodData.origin || "Himalayan farms"}.`,
    price: basePrice,
    compareAtPrice: prodData.compareAtPrice ? Math.round(Number(prodData.compareAtPrice)) : Math.round(basePrice * 1.15),
    variants,
    image: prodData.image || "/assets/cat-honey.jpg",
    stock,
    stockStatus,
    unitsLeft: numUnits,
    origin: prodData.origin || "High Altitude Farm, Himachal Pradesh",
    sku: prodData.sku || `PM-${slug.substring(0, 3).toUpperCase()}-${weight.replace(/\D/g, "") || "500"}`,
    weight,
    isCrmOnly: Boolean(prodData.isCrmOnly),
    channel: prodData.channel || (prodData.isCrmOnly ? "crm_only" : "central"),
    url: `/catalogue#${slug}`,
    status: "published",
    updatedAt: new Date().toISOString(),
  };

  // 1. In-memory update
  if (!globalThis.__crmLiveProducts) globalThis.__crmLiveProducts = new Map();
  globalThis.__crmLiveProducts.set(id, productRecord);
  globalThis.__crmLiveProducts.set(slug, productRecord);

  if (globalThis.__crmDeletedProductIds) {
    globalThis.__crmDeletedProductIds.delete(id);
    globalThis.__crmDeletedProductIds.delete(slug);
  }

  // 2. Persist to MongoDB
  try {
    const mongo = await withTimeout(getDatabase(), 1500, null);
    if (mongo) {
      await mongo.collection("crm_products").updateOne(
        { $or: [{ id }, { slug }] },
        { $set: productRecord },
        { upsert: true }
      );
    }
  } catch (mErr) {
    console.warn("[MongoDB] CRM product persist note:", mErr);
  }

  // 3. Persist to PostgreSQL
  try {
    await withTimeout(
      db.transaction(async (tx) => {
        await tx
          .insert(profiles)
          .values({ id: "admin_system", fullName: "CRM Admin" })
          .onConflictDoNothing();

        await tx
          .insert(farmerProducts)
          .values({
            id,
            userId: "admin_system",
            name,
            slug,
            description: productRecord.description,
            price: basePrice,
            compareAtPrice: productRecord.compareAtPrice,
            category: productRecord.category,
            stock: numUnits,
            stockGrams: numUnits * 500,
            unit: weight,
            images: [productRecord.image],
            status: "published",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: farmerProducts.id,
            set: {
              name,
              price: basePrice,
              compareAtPrice: productRecord.compareAtPrice,
              category: productRecord.category,
              stock: numUnits,
              stockGrams: numUnits * 500,
              unit: weight,
              images: [productRecord.image],
              status: "published",
              updatedAt: new Date(),
            },
          });

        await tx
          .insert(productInventory)
          .values({
            id: `inv_${id}`,
            productId: id,
            variantName: "standard",
            stockGrams: numUnits * 500,
            quantity: numUnits,
            soldCount: 0,
            preorderEnabled: stock === "Pre-Order",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: productInventory.productId,
            set: {
              stockGrams: numUnits * 500,
              quantity: numUnits,
              preorderEnabled: stock === "Pre-Order",
              updatedAt: new Date(),
            },
          });
      }),
      2000,
      null
    );
  } catch (pgErr) {
    // optional remote note
  }

  return productRecord;
}

/**
 * Updates stock, price, units, or availability for an existing product
 */
export async function updateProductStockInRegistry(
  id: string,
  updates: {
    stock?: AuthoritativeProduct["stock"];
    unitsLeft?: number;
    price?: number;
    name?: string;
    image?: string;
    category?: string;
  }
): Promise<AuthoritativeProduct | null> {
  if (!id) return null;

  if (!globalThis.__crmLiveProducts) globalThis.__crmLiveProducts = new Map();
  const existing = globalThis.__crmLiveProducts.get(id) || {};

  const name = updates.name ?? existing.name ?? "Himalayan Produce";
  const basePrice = updates.price !== undefined ? Math.round(Number(updates.price)) : (existing.price || 450);
  const unitsLeft = updates.unitsLeft !== undefined ? Number(updates.unitsLeft) : (existing.unitsLeft ?? 50);
  const stock = updates.stock ?? (unitsLeft <= 0 ? "Out of Stock" : existing.stock || "In Stock");

  let stockStatus: AuthoritativeProduct["stockStatus"] = "in_stock";
  if (stock === "Out of Stock" || unitsLeft <= 0) stockStatus = "out_of_stock";
  else if (stock === "Pre-Order") stockStatus = "pre_order";
  else if (stock === "Low Stock" || unitsLeft < 5) stockStatus = "few_left";

  const updated: AuthoritativeProduct = {
    ...existing,
    id,
    name,
    slug: existing.slug || createProductSlug(name),
    category: updates.category ?? existing.category ?? "Produce",
    price: basePrice,
    stock,
    stockStatus,
    unitsLeft,
    image: updates.image ?? existing.image ?? "/assets/cat-honey.jpg",
    variants: deriveProductVariants(name, basePrice, existing.weight || "500g"),
    updatedAt: new Date().toISOString(),
  };

  globalThis.__crmLiveProducts.set(id, updated);
  if (updated.slug) globalThis.__crmLiveProducts.set(updated.slug, updated);

  // Persist to MongoDB
  try {
    const mongo = await withTimeout(getDatabase(), 1000, null);
    if (mongo) {
      await mongo.collection("crm_products").updateOne({ id }, { $set: updated }, { upsert: true });
    }
  } catch {}

  // Persist to PostgreSQL
  try {
    await withTimeout(
      db
        .update(farmerProducts)
        .set({
          ...(updates.price !== undefined ? { price: basePrice } : {}),
          stock: unitsLeft,
          stockGrams: unitsLeft * 500,
          updatedAt: new Date(),
        })
        .where(or(eq(farmerProducts.id, id), eq(farmerProducts.slug, id))),
      1500,
      null
    );
  } catch {}

  return updated;
}

/**
 * Deletes / archives a product from live registry across all feeds
 */
export async function deleteProductFromRegistry(id: string): Promise<boolean> {
  if (!id) return false;

  if (!globalThis.__crmLiveProducts) globalThis.__crmLiveProducts = new Map();
  const existing = globalThis.__crmLiveProducts.get(id);
  globalThis.__crmLiveProducts.delete(id);
  if (existing?.slug) globalThis.__crmLiveProducts.delete(existing.slug);

  if (!globalThis.__crmDeletedProductIds) globalThis.__crmDeletedProductIds = new Set();
  globalThis.__crmDeletedProductIds.add(id);
  if (existing?.slug) globalThis.__crmDeletedProductIds.add(existing.slug);

  // MongoDB deletion & archive
  try {
    const mongo = await withTimeout(getDatabase(), 1000, null);
    if (mongo) {
      await mongo.collection("crm_products").deleteOne({ id });
      await mongo.collection("crm_deleted_products").insertOne({ id, slug: existing?.slug, deletedAt: new Date() });
    }
  } catch {}

  // PostgreSQL archive
  try {
    await withTimeout(
      db
        .update(farmerProducts)
        .set({ status: "archived", updatedAt: new Date() })
        .where(or(eq(farmerProducts.id, id), eq(farmerProducts.slug, id))),
      1500,
      null
    );
  } catch {}

  return true;
}
