import type { Farmer } from "./types";
const f1 = "/assets/farmer-1.jpg";
const f2 = "/assets/farmer-2.jpg";
const f3 = "/assets/farmer-3.jpg";
const f4 = "/assets/farmer-4.jpg";

export const farmers: Farmer[] = [
  {
    id: "f-ramesh-singh",
    slug: "ramesh-singh",
    name: "Ramesh Singh",
    image: f2,
    village: "Hunza",
    district: "Leh",
    state: "Ladakh",
    region: "Hunza Valley",
    yearsExperience: 35,
    generationLabel: "3rd Generation Farmer",
    altitudeM: "3,650m (12,000 ft)",
    totalLandAcres: 6.5,
    method: "Glacier-fed Heirloom Orchards",
    storyPreview: "Almond and apricot orchards tended the same way his grandfather did, fed by glacier streams.",
    quote: "We don't force the trees. The glacial water and freezing nights give the almond its sweet oil.",
    story: "At 12,000 feet, Ramesh's orchards yield slowly but with exceptional flavour. Every almond is hand-shelled by women's collectives in the village — a livelihood the family has protected for over three decades. Tended using zero chemical pesticides and pure glacier meltwater.",
    upcomingHarvests: ["Mamra almond · Aug 2026", "Wild apricot · Sep 2026"],
    productSlugs: ["organic-almonds"],
    rating: 4.9,
    ratingAvg: 4.9,
    showOnHomepage: true,
    practices: [
      "Glacier meltwater gravity irrigation",
      "Zero synthetic pesticides or chemicals",
      "Hand-shelled by village women collective",
      "Solar rooftop drying"
    ],
    certifications: [
      "Ladakh Organic Certified (PGS-India)",
      "GI Tag — Raktsey Karpo Apricots",
      "Fair Trade Smallholder Cooperative"
    ],
    landLedger: {
      totalAcres: 6.5,
      crops: [
        {
          id: "c-1",
          name: "Mamra Almonds",
          acres: 3.2,
          season: "Aug-Oct",
          method: "Glacier Rainfed Natural",
          harvestKg: 1450,
          image: {
            url: "/assets/prod-almonds.jpg",
            public_id: "seed-mamra-almonds",
          },
        },
        {
          id: "c-2",
          name: "Raktsey Karpo Apricots",
          acres: 2.1,
          season: "Jul-Sep",
          method: "Traditional High-Altitude Orchard",
          harvestKg: 980,
          image: {
            url: "/assets/cat-dryfruits.jpg",
            public_id: "seed-raktsey-apricots",
          },
        },
      ],
    },
    crops: [
      {
        id: "c-1",
        name: "Mamra Almonds",
        photoUrl: "/assets/prod-almonds.jpg",
        landAcres: 3.2,
        season: "Aug – Oct",
        method: "Glacier Rainfed Natural",
        lastYieldKg: "1,450 kg"
      },
      {
        id: "c-2",
        name: "Raktsey Karpo Apricots",
        photoUrl: "/assets/cat-dryfruits.jpg",
        landAcres: 2.1,
        season: "Jul – Sep",
        method: "Traditional High-Altitude Orchard",
        lastYieldKg: "980 kg"
      }
    ],
    inventoryProducts: [
      {
        id: "p-1",
        slug: "organic-almonds",
        name: "Heirloom Mamra Almonds",
        grade: "Grade A (High Oil Content)",
        quantityAvailableKg: 420,
        pricePerKg: 2500,
        availabilityStatus: "In season"
      },
      {
        id: "p-2",
        slug: "organic-apricots",
        name: "Sun-Dried Sweet Apricots",
        grade: "Premium Kernels",
        quantityAvailableKg: 180,
        pricePerKg: 1300,
        availabilityStatus: "Available"
      }
    ],
    reviews: [
      {
        id: "r-1",
        buyerName: "Ananya Sharma",
        buyerLocation: "Bengaluru, KA",
        rating: 5,
        comment: "The almond sweetness and oil content is unbelievable compared to imported almonds. You can taste the purity!"
      },
      {
        id: "r-2",
        buyerName: "Dr. K. V. Raman",
        buyerLocation: "Chennai, TN",
        rating: 5,
        comment: "Fast shipping and fantastic packaging. Knowing it comes directly from Ramesh ji's orchard in Hunza adds true value."
      }
    ]
  },
  {
    id: "f-lakshmi-devi",
    slug: "lakshmi-devi",
    name: "Lakshmi Devi",
    image: f1,
    village: "Anantapur",
    district: "Anantapur",
    state: "Andhra Pradesh",
    region: "Rayalaseema",
    yearsExperience: 22,
    generationLabel: "2nd Generation Natural Farmer",
    altitudeM: "335m",
    totalLandAcres: 5.0,
    method: "Natural Farming · Zero Chemical",
    storyPreview: "Two generations of growing groundnut and millet without a drop of chemical.",
    quote: "Soil is alive. Feed the soil micro-organisms with Jeevamrutha and the crops feed you naturally.",
    story: "Lakshmi inherited 4 acres from her father in 1998 and turned away from the chemical inputs the village had adopted. Today her farm is a benchmark for natural cultivation in Rayalaseema, supplying co-operatives and now, directly, families across India.",
    upcomingHarvests: ["Groundnut · Nov 2026", "Foxtail millet · Dec 2026"],
    productSlugs: ["organic-almonds", "mixed-seeds"],
    rating: 4.8,
    ratingAvg: 4.8,
    showOnHomepage: true,
    practices: [
      "Subhash Palekar Natural Farming (SPNF)",
      "Desi Cow Jeevamrutha Soil Treatment",
      "Crop Rotation with Legumes",
      "Drip Water Conservation"
    ],
    certifications: [
      "Andhra Pradesh Community-Managed Natural Farming (APCNF)",
      "Zero Budget Natural Farming Verified"
    ],
    landLedger: {
      totalAcres: 5.0,
      crops: [
        {
          id: "c-3",
          name: "Foxtail Millet (Korralu)",
          acres: 2.5,
          season: "Jul-Nov",
          method: "Rainfed Natural Farming",
          harvestKg: 2100,
          image: {
            url: "/assets/prod-seeds.jpg",
            public_id: "seed-foxtail-millet",
          },
        },
        {
          id: "c-4",
          name: "Kadapa Groundnut",
          acres: 1.8,
          season: "Oct-Mar",
          method: "Zero Pesticide Bio-Mulched",
          harvestKg: 1600,
          image: {
            url: "/assets/cat-nuts.jpg",
            public_id: "seed-groundnut",
          },
        },
      ],
    },
    crops: [
      {
        id: "c-3",
        name: "Foxtail Millet (Korralu)",
        photoUrl: "/assets/prod-seeds.jpg",
        landAcres: 2.5,
        season: "Kharif (Jul – Nov)",
        method: "Rainfed Natural Farming",
        lastYieldKg: "2,100 kg"
      },
      {
        id: "c-4",
        name: "Kadapa Groundnut",
        photoUrl: "/assets/cat-nuts.jpg",
        landAcres: 1.8,
        season: "Rabi (Oct – Mar)",
        method: "Zero Pesticide Bio-Mulched",
        lastYieldKg: "1,600 kg"
      }
    ],
    inventoryProducts: [
      {
        id: "p-3",
        slug: "foxtail-millet",
        name: "Unpolished Organic Foxtail Millet",
        grade: "A Grade Whole Grain",
        quantityAvailableKg: 650,
        pricePerKg: 140,
        availabilityStatus: "Available"
      },
      {
        id: "p-4",
        slug: "woodpressed-groundnut-oil",
        name: "Cold-Pressed Groundnut Oil",
        grade: "Virgin Wood-Pressed",
        quantityAvailableKg: 240,
        pricePerKg: 380,
        availabilityStatus: "In season"
      }
    ],
    reviews: [
      {
        id: "r-3",
        buyerName: "Rajesh V.",
        buyerLocation: "Hyderabad, TS",
        rating: 5,
        comment: "Freshly harvested foxtail millet cooks wonderfully. Lakshmi garu's dedication shines in every batch."
      }
    ]
  },
  {
    id: "f-asha-patel",
    slug: "asha-patel",
    name: "Asha Patel",
    image: f3,
    village: "Anand",
    district: "Anand",
    state: "Gujarat",
    region: "Charotar",
    yearsExperience: 9,
    generationLabel: "1st Generation Eco Farmer",
    altitudeM: "39m",
    totalLandAcres: 4.0,
    method: "Permaculture & Herbal Kitchen",
    storyPreview: "A first-generation farmer growing kitchen herbs and traditional pickle ingredients.",
    quote: "Healthy soil, chemical-free spices, and traditional solar curing make authentic home flavors.",
    story: "Asha left her corporate desk job to set up a 4-acre permaculture farm in 2017. She now grows over forty culinary herbs and runs a solar-powered pickle kitchen employing local village women.",
    upcomingHarvests: ["Holy basil · Year-round", "Mango (kesar) · May 2026"],
    productSlugs: ["mango-pickle", "garam-masala"],
    rating: 4.9,
    ratingAvg: 4.9,
    showOnHomepage: true,
    practices: [
      "Permaculture Companion Planting",
      "Solar Rooftop Curing & Dehydration",
      "Zero Chemical Preservatives",
      "Women Self-Help Group Kitchen"
    ],
    certifications: [
      "FSSAI Certified Artisanal Kitchen",
      "Gujarat Organic Farming Cell Registered"
    ],
    crops: [
      {
        id: "c-5",
        name: "Gir Kesar Mangoes",
        photoUrl: "/assets/prod-pickle.jpg",
        landAcres: 2.0,
        season: "Summer (Apr – Jun)",
        method: "Organic companion planted",
        lastYieldKg: "3,200 kg"
      },
      {
        id: "c-6",
        name: "Culinary Herbs & Spices",
        photoUrl: "/assets/cat-herbs.jpg",
        landAcres: 1.2,
        season: "Year-Round",
        method: "Bio-dynamic raised beds",
        lastYieldKg: "850 kg"
      }
    ],
    inventoryProducts: [
      {
        id: "p-5",
        slug: "mango-pickle",
        name: "Heirloom Kesar Mango Pickle",
        grade: "Small-Batch Homemade",
        quantityAvailableKg: 150,
        pricePerKg: 650,
        availabilityStatus: "In season"
      },
      {
        id: "p-6",
        slug: "garam-masala",
        name: "Stone-Ground Garam Masala",
        grade: "Aromatic Whole Spices",
        quantityAvailableKg: 85,
        pricePerKg: 950,
        availabilityStatus: "Available"
      }
    ],
    reviews: [
      {
        id: "r-4",
        buyerName: "Pooja Mehta",
        buyerLocation: "Ahmedabad, GJ",
        rating: 5,
        comment: "This mango pickle tastes exactly like my grandmother's hand-made barni pickle. Unmatched authenticity!"
      }
    ]
  },
  {
    id: "f-vikram-rao",
    slug: "vikram-rao",
    name: "Vikram Rao",
    image: f4,
    village: "Khammam",
    district: "Khammam",
    state: "Telangana",
    region: "Godavari Belt",
    yearsExperience: 18,
    generationLabel: "2nd Generation Spice Master",
    altitudeM: "107m",
    totalLandAcres: 8.0,
    method: "Sun-Dried · Stone-Ground",
    storyPreview: "Spices grown, dried, and ground on-farm — never warehoused or fumigated.",
    quote: "Spices should reach the buyer within 48 hours of stone grinding to lock in their natural essential oils.",
    story: "Vikram's farm is also an artisanal mill. Chillies, turmeric, and coriander are sun-dried on raised bamboo cots and stone-ground within 48 hours of harvest — ensuring maximum aroma, flavor, and natural curcumin content.",
    upcomingHarvests: ["Guntur chilli · Jan 2027", "Turmeric · Feb 2027"],
    productSlugs: ["turmeric-powder", "garam-masala", "pink-himalayan-salt"],
    rating: 4.7,
    ratingAvg: 4.7,
    showOnHomepage: true,
    practices: [
      "Raised cot hygienic sun-drying",
      "Slow stone-grinding at low temperature",
      "No anti-caking agents or fillers",
      "Organic Neem oil pest repellent"
    ],
    certifications: [
      "Spices Board of India Registered",
      "Zero Chemical Residue Lab Tested"
    ],
    crops: [
      {
        id: "c-7",
        name: "High-Curcumin Turmeric",
        photoUrl: "/assets/prod-turmeric.jpg",
        landAcres: 4.5,
        season: "Jan – Mar",
        method: "Organic Raised-Bed Farming",
        lastYieldKg: "4,800 kg"
      },
      {
        id: "c-8",
        name: "Guntur Red Chillies",
        photoUrl: "/assets/prod-masala.jpg",
        landAcres: 2.5,
        season: "Dec – Feb",
        method: "Drip Irrigated Bio-Farmed",
        lastYieldKg: "2,900 kg"
      }
    ],
    inventoryProducts: [
      {
        id: "p-7",
        slug: "turmeric-powder",
        name: "Stone-Ground High Curcumin Turmeric",
        grade: "6.2% Curcumin Grade A",
        quantityAvailableKg: 340,
        pricePerKg: 480,
        availabilityStatus: "Available"
      }
    ],
    reviews: [
      {
        id: "r-5",
        buyerName: "Sunil K.",
        buyerLocation: "Bengaluru, KA",
        rating: 5,
        comment: "The vibrant color and pungent aroma of Vikram's turmeric powder prove its unmatched freshness."
      }
    ]
  }
];

export const farmerBySlug = (slug: string) => farmers.find((f) => f.slug === slug);
