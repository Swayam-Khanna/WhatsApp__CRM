import type { Category } from "./types";
const dryfruits = "/assets/cat-dryfruits.jpg";
const nuts = "/assets/cat-nuts.jpg";
const seeds = "/assets/cat-seeds.jpg";
const spices = "/assets/cat-spices.jpg";
const herbs = "/assets/cat-herbs.jpg";
const plants = "/assets/cat-plants.jpg";
const pickles = "/assets/cat-pickles.jpg";
const salts = "/assets/cat-salts.jpg";
const masalas = "/assets/cat-masalas.jpg";

export const categories: Category[] = [
  {
    slug: "dry-fruits",
    name: "Dry Fruits",
    image: dryfruits,
    description: "Sun-dried, naturally sweet.",
  },
  { slug: "nuts", name: "Nuts", image: nuts, description: "Raw, roasted, hand-sorted." },
  { slug: "seeds", name: "Seeds", image: seeds, description: "Nutrient-dense superfoods." },
  { slug: "spices", name: "Spices", image: spices, description: "Single-origin, freshly ground." },
  { slug: "herbs", name: "Herbs", image: herbs, description: "Aromatic, garden-fresh." },
  { slug: "plants", name: "Plants", image: plants, description: "Live herbs for your home." },
  {
    slug: "pickles",
    name: "Pickles",
    image: pickles,
    description: "Slow-fermented, family recipes.",
  },
  { slug: "salts", name: "Salts", image: salts, description: "Mineral-rich, unrefined." },
  { slug: "masalas", name: "Masalas", image: masalas, description: "Whole-spice blends." },
  {
    slug: "honey",
    name: "Honey",
    image: "/assets/cat-honey.jpg",
    description: "Raw, pure organic mountain honey.",
  },
];

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
