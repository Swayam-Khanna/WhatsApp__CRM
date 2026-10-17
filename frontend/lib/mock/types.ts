export type Category = {
  slug: string;
  name: string;
  image: any;
  description: string;
};

export type FarmerCrop = {
  id: string;
  farmerId?: string;
  name: string;
  photoUrl: string;
  landAcres: number;
  season: string;
  method: string;
  lastYieldKg: string | number;
};

export type FarmerProduct = {
  id: string;
  farmerId?: string;
  cropId?: string;
  slug?: string;
  name: string;
  grade: string;
  quantityAvailableKg: number;
  pricePerKg: number;
  availabilityStatus: "In season" | "Available" | "Sold out";
};

export type FarmerReview = {
  id: string;
  farmerId?: string;
  buyerName: string;
  buyerLocation: string;
  rating: number;
  comment: string;
  date?: string;
};

export type Farmer = {
  id?: string;
  slug: string;
  name: string;
  image: any;
  village: string;
  district?: string;
  state: string;
  region: string;
  yearsExperience: number;
  generationLabel?: string;
  altitudeM?: string | number;
  totalLandAcres?: number;
  method: string;
  storyPreview: string;
  story: string;
  quote?: string;
  upcomingHarvests: string[];
  productSlugs: string[];
  rating?: number | null;
  ratingAvg?: number;
  practices?: string[];
  certifications?: string[];
  crops?: FarmerCrop[];
  inventoryProducts?: FarmerProduct[];
  reviews?: FarmerReview[];
  showOnHomepage?: boolean;
  is_prajnaa_verified?: boolean;
  isVerified?: boolean;
  verified_certificate_number?: string;
  landLedger?: {
    totalAcres: number;
    crops: Array<{
      id?: string;
      name: string;
      acres: number;
      season: string;
      method: string;
      harvestKg: number;
      image: {
        url: string;
        public_id: string;
      };
    }>;
  };
  trustCertificates?: Array<{
    id: string;
    name: string;
    issuedBy: string;
    certNumber: string;
    validTill: string;
    document?: { url: string; public_id: string };
    status: "pending" | "verified" | "rejected";
    verifiedBy?: string;
    verifiedOn?: string;
    rejectReason?: string;
    submittedAt?: string;
  }>;
  checks?: {
    identity: { done: boolean; date?: string };
    land: { done: boolean; date?: string };
    farmVisit: { done: boolean; date?: string };
    quality: { done: boolean; date?: string };
  };
  applicationStatus?: "none" | "in_review";
};

export type Product = {
  slug: string;
  sku?: string;
  name: string;
  category: string; // category slug
  farmerSlug: string;
  image: any;
  images?: any[];
  price: number; // INR
  mrp?: number;
  weight: string;
  stock: number;
  rating: number;
  reviews: number;
  description: string;
  badges?: string[];
  trending?: boolean;
  seasonal?: boolean;
  preOrder?: {
    enabled: boolean;
    status?: "OPEN" | "LIMITED" | "CLOSED";
    reservationNote?: string;
  };
  is_preorder?: boolean;
  harvestJourney?: import("@/lib/types/harvest").HarvestJourneyData;
};

export type Order = {
  id: string;
  date: string;
  customer: string;
  items: { productSlug: string; qty: number; price: number }[];
  total: number;
  status: "pending" | "packed" | "shipped" | "delivered" | "cancelled";
  payment: "COD" | "UPI" | "Card";
};

export type Review = {
  id: string;
  author: string;
  location: string;
  rating: number;
  text: string;
  title?: string;
  avatar?: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  joined: string;
};
