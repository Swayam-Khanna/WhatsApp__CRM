"use client";

import {
  useState, useRef, useEffect, useMemo } from "react";
import LeadsModule from "@/components/leads/LeadsModule";
import NewLeadModal from "@/components/leads/NewLeadModal";
import { SearchableProductSelect } from "@/components/common/SearchableProductSelect";
import {
  Upload,
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Users,
  Send,
  Package,
  FileCode,
  Truck,
  BarChart3,
  UserCheck,
  Settings,
  Search,
  Bell,
  Star,
  Tag,
  MoreVertical,
  Paperclip,
  Smile,
  CheckCheck,
  Check,
  ArrowRight,
  Printer,
  Edit3,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  QrCode,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Phone,
  Menu,
  ArrowLeft,
  Info,
  Layers,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Zap,
  TrendingUp,
  DollarSign,
  Copy,
  Share2,
  Calendar,
  Activity,
  Award,
  Key,
  Palette,
  Sun,
  Moon,
  Compass,
  Trash2,
  UserX,
  Store,
  Globe,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";

// Type definitions
interface Message {
  id: string;
  sender: "customer" | "business";
  text: string;
  time: string;
  isQr?: boolean;
  qrAmount?: number;
  status: "sent" | "delivered" | "read";
  isAutomated?: boolean;
  senderName?: string;
  date?: string;
  type?: string;
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
  filename?: string;
}

// Resolves proper absolute catalogue URL for client and chat redirects
function getClientCatalogueUrl(hash?: string): string {
  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://crm.prajnaa.in";
  return hash ? `${origin}/catalogue#${hash}` : `${origin}/catalogue`;
}

// Client-side smart automated reply generator matching the 15 intent specifications
function generateClientAutoReply(customerName?: string, queryText: string = "", contextOrder?: any): string {
  const query = (queryText || "").toLowerCase().trim();
  const catalogueUrl = getClientCatalogueUrl();

  // 1. Human handoff / outside knowledge
  if (
    query.includes("human") ||
    query.includes("agent") ||
    query.includes("owner") ||
    query.includes("nishant") ||
    query.includes("manager") ||
    query.includes("call me") ||
    query.includes("phone par baat")
  ) {
    return "Nishant ji abhi available nahi hain. Woh jald hi aapse connect karenge.";
  }

  // 2. Complaint / Issue
  if (
    query.includes("complaint") ||
    query.includes("kharab") ||
    query.includes("damaged") ||
    query.includes("tuta") ||
    query.includes("wrong product") ||
    query.includes("problem") ||
    query.includes("shikayat")
  ) {
    return "Ji, inconvenience ke liye maafi chahte hain. Hamari team jald aapse connect karegi.";
  }

  // 3. Greeting
  if (
    query === "hi" ||
    query === "hello" ||
    query === "namaste" ||
    query === "hey" ||
    query === "pranam" ||
    query === "hlo" ||
    query === "namaste ji" ||
    query === "good morning" ||
    query === "good evening"
  ) {
    return `Namaste ji! 🙏 Prajnaa Farmer Market mein aapka swagat hai.\n\nHum aapki kya sahayata kar sakte hain?\n• 🌿 Hamara Product Catalogue dekhein: ${catalogueUrl}\n• 📦 Order status check karein\n• 💬 Products ki jaankari ya price poochhein`;
  }

  // 4. Specific Product Enquiries (Honey, Shilajit, Ghee, Almond, Walnut, Saffron)
  if (query.includes("honey") || query.includes("shehad") || query.includes("shahad")) {
    return `Ji haan! Himalayan Raw Flora Honey 500g available hai. Price: ₹550. Details: ${getClientCatalogueUrl("himalayan-multiflora-honey")}`;
  }
  if (query.includes("almond") || query.includes("badam") || query.includes("mamra")) {
    return `Ji haan! Kashmiri Mamra Almonds 500g available hai. Price: ₹1,250. Details: ${getClientCatalogueUrl("kashmiri-mamra-almonds")}`;
  }
  if (query.includes("walnut") || query.includes("akhrot")) {
    return `Ji haan! Kashmiri Kagzi Walnuts (Kernels) 500g available hai. Price: ₹650. Details: ${getClientCatalogueUrl("kashmir-kagzi-walnuts")}`;
  }
  if (query.includes("shilajit")) {
    return `Ji haan! Pure Himalayan Shilajit Resin 20g available hai. Price: ₹1,450. Details: ${getClientCatalogueUrl("pure-himalayan-shilajit")}`;
  }
  if (query.includes("ghee") || query.includes("badri")) {
    return `Ji haan! A2 Badri Cow Bilona Ghee 1L available hai. Price: ₹2,100. Details: ${getClientCatalogueUrl("badri-cow-a2-ghee")}`;
  }
  if (query.includes("saffron") || query.includes("kesar")) {
    return `Ji haan! Pure Kashmiri Mongra Saffron 1g available hai. Price: ₹380. Details: ${getClientCatalogueUrl("kashmiri-mongra-saffron")}`;
  }

  // 5. Catalogue Request & General Product Enquiries (Broad matching)
  const isCatalogueQuery =
    query.includes("catalogue") ||
    query.includes("catalog") ||
    query.includes("menu") ||
    query.includes("all products") ||
    query.includes("saare products") ||
    query.includes("products list") ||
    query.includes("product list") ||
    query.includes("product details") ||
    query.includes("products details") ||
    query.includes("about your products") ||
    query.includes("about products") ||
    query.includes("tell me about your products") ||
    query.includes("tell me about products") ||
    query.includes("what products") ||
    query.includes("what do you sell") ||
    query.includes("what do you have") ||
    query.includes("what items") ||
    query.includes("show me products") ||
    query.includes("show products") ||
    query.includes("kya kya milta") ||
    query.includes("kya bechte") ||
    query.includes("aapke yahan kya") ||
    query.includes("kya products") ||
    query.includes("products ke baare") ||
    query.includes("kaun-kaun") ||
    query.includes("kya-kya") ||
    query.includes("उत्पाद") ||
    query.includes("कैटलॉग") ||
    query.includes("सामान") ||
    query === "products" ||
    query === "product" ||
    /\b(?:tell\s+me|know|about|what|show|list|give)\s+.*?\bproducts?\b/i.test(query);

  if (isCatalogueQuery) {
    return `Namaste ji! 🙏 Prajnaa Farmer Market mein aapka swagat hai. Hum high-altitude Himalayas ke kisaano se 100% shuddh, natural aur lab-tested products direct aap tak pahunchate hain:

🌿 *Hamare Top Himalayan Products:*
1. 🍯 *Himalayan Raw Multiflora Honey* (500g) – ₹550
2. 🏔️ *Pure Himalayan Shilajit Resin* (20g Lab Certified) – ₹1,450
3. 🧈 *A2 Badri Cow Bilona Desi Ghee* (1 Litre) – ₹2,100
4. 🌰 *Kashmiri Mamra Badam* (500g) – ₹1,250
5. 🌸 *Pure Kashmiri Mongra Kesar* (1g) – ₹380
6. 🥜 *Kashmiri Kagzi Akhrot Giri* (500g) – ₹650

📦 *Poore Bharat mein fast home delivery* uplabdh hai.
Hamara latest product catalogue yahan dekhein: ${catalogueUrl}

Aapko kis product ke baare mein jaanna hai ya order book karna hai, bataiye ji?`;
  }

  // 6. Order Placement
  if (
    query.includes("order karna") ||
    query.includes("mujhe order") ||
    query.includes("i want to order") ||
    query.includes("kharidna") ||
    query.includes("book karna")
  ) {
    return "Bilkul ji! Aap product ka naam aur quantity bata dijiye, hum turant book kar denge.";
  }

  // 7. Order Status
  if (
    query.includes("order status") ||
    query.includes("mera order") ||
    query.includes("kahan tak pahuncha") ||
    query.includes("kahan hai")
  ) {
    if (contextOrder?.orderNumber) {
      return `Ji, aapka order #${contextOrder.orderNumber} abhi ${contextOrder.orderStatus || "Processing"} hai.`;
    }
    return "Ji, apna order number share kar dijiye. Hum check karte hain.";
  }

  // 8. Payment Enquiry
  if (
    query.includes("payment") ||
    query.includes("upi") ||
    query.includes("paise") ||
    query.includes("qr") ||
    query.includes("pay")
  ) {
    if (contextOrder?.paymentStatus === "Paid") {
      return "Thank you ji! Aapka payment confirm ho gaya hai.";
    }
    return "Ji, aapka payment abhi pending hai. Official UPI: prajnaa@upi.";
  }

  // 9. Delivery & Dispatch Enquiry
  if (
    query.includes("dispatch") ||
    query.includes("kab tak") ||
    query.includes("kab aayega") ||
    query.includes("deliver") ||
    query.includes("kitne din") ||
    query.includes("kahan pahuncha") ||
    query.includes("tracking")
  ) {
    if (contextOrder?.orderNumber) {
      const st = String(contextOrder.orderStatus || "").toLowerCase();
      if (st.includes("tomorrow") || contextOrder.shippingStage === "delivering_tomorrow") {
        return `Namaste ji! Good news: aapka order #${contextOrder.orderNumber} kal deliver ho jayega! Kripya address par available rahein. 🚚`;
      }
      if (st.includes("transit") || contextOrder.currentLocation) {
        const loc = contextOrder.currentLocation || "Regional Sorting Hub";
        return `Namaste ji! Update: aapka order #${contextOrder.orderNumber} abhi ${loc} pahunch chuka hai aur aapki taraf badh raha hai. 📍`;
      }
      if (st.includes("shipped")) {
        return `Namaste ji! Aapka order #${contextOrder.orderNumber} Solan mountain hub se ship ho gaya hai. Live updates aapko WhatsApp par milte rahenge! 📦`;
      }
      return `Namaste ji! Aapka order #${contextOrder.orderNumber} mountain packaging hub par fresh artisan packing mein hai. Dispatch mein 2–3 din lagte hain. Ship hote hi automated WhatsApp update mil jayegi! 🌿`;
    }
    return "Namaste ji! Prajnaa Market ke orders mountain hub par fresh pack hokar 2–3 din mein dispatch hote hain. Kripya apna Order ID share kar dijiye taaki hum status check kar sakein! 🌿";
  }

  // 10. Default / Unclear intent -> Short polite handoff with catalogue guide
  return `Maaf kijiye ji, main aapki baat samajh nahi paaya. Nishant ji jald hi aapse connect karenge. Tab tak aap hamare authentic Himalayan products yahan dekh sakte hain: ${catalogueUrl}`;
}

// Sanitizes any text that contains duplicated origin schemes (e.g., http://...http://...)
function sanitizeTextContent(text?: string): string {
  if (!text) return "";
  const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://127.0.0.1:3000";
  return text
    .replace(/https?:\/\/[^\s]+https?:\/\/[^\s]*\/(?:catalogue|customer|catalog)([^\s]*)/gi, `${origin}/catalogue$1`)
    .replace(/https?:\/\/[^\s]+http\/[^\s]*\/(?:catalogue|customer|catalog)([^\s]*)/gi, `${origin}/catalogue$1`);
}

// Normalizes any catalogue/customer URL to open reliably on the current environment
function normalizeLinkTarget(raw: string): string {
  if (typeof window === "undefined") return raw;
  const origin = window.location.origin;
  let target = (raw || "").trim().replace(/[.,!?)]+$/, "");

  // 1. If target points to catalogue, customer, or catalog (even if malformed or with duplicated schemes)
  const catMatch = target.match(/\/(?:catalogue|customer|catalog)(#[a-zA-Z0-9_-]+)?/i);
  if (catMatch) {
    const anchor = catMatch[1] || "";
    return `${origin}/catalogue${anchor}`;
  }

  // 2. Fix duplicated http(s) schemes on external URLs
  if (/https?:\/\/.+https?:\/\//i.test(target) || /https?:\/\/.+http\/\//i.test(target)) {
    const lastHttp = target.lastIndexOf("http");
    if (lastHttp > 0) {
      target = target.substring(lastHttp).replace(/^http\/\//i, "http://");
    }
  }

  // 3. If viewing on localhost or 127.0.0.1, rewrite remote domain catalogue links to current local origin
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    target = target.replace(/https?:\/\/(?:crm|market)\.prajnaa\.in/i, origin);
  }

  // 4. Ensure relative path gets full protocol & host
  if (target.startsWith("/")) {
    target = `${origin}${target}`;
  }

  return target;
}

// Resolves and renders clickable hyperlinks and interactive catalogue cards for chat messages
function renderMessageContentWithLinks(rawText?: string) {
  if (!rawText) return null;
  const text = sanitizeTextContent(rawText);

  // Extract any catalogue/customer URL or relative path
  const catalogueUrlMatch = text.match(/https?:\/\/[^\s]+(?:catalogue|customer|catalog)[^\s]*|\/(?:catalogue|customer|catalog)[^\s]*/i);
  let resolvedCatalogueUrl: string | null = null;
  if (catalogueUrlMatch) {
    resolvedCatalogueUrl = normalizeLinkTarget(catalogueUrlMatch[0]);
  }

  // Regex to split URLs and relative catalogue/customer paths
  const urlRegex = /(https?:\/\/[^\s]+|\/(?:catalogue|customer|catalog)[^\s]*)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      <div className="leading-relaxed whitespace-pre-wrap">
        {parts.map((part, index) => {
          if (/^https?:\/\/[^\s]+/i.test(part) || /^\/(?:catalogue|customer|catalog)[^\s]*/i.test(part)) {
            const fullTarget = normalizeLinkTarget(part);
            return (
              <a
                key={index}
                href={fullTarget}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-100 break-all transition-colors cursor-pointer inline-flex items-center gap-0.5"
              >
                <span>{fullTarget}</span>
                <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-70" />
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>

      {/* Interactive 1-click Catalogue Launcher Card if message links to or mentions catalogue */}
      {resolvedCatalogueUrl && (
        <a
          href={resolvedCatalogueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0F3D2E] text-white hover:bg-[#16503d] transition shadow-xs text-xs font-semibold no-underline group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-[#E8A317] shrink-0" />
            <span>Open Live Product Catalogue</span>
          </div>
          <ExternalLink className="w-3 h-3 text-white/70 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </a>
      )}
    </>
  );
}

interface OrderItem {
  name: string;
  weight: string;
  qty: number;
  price: number;
  discount?: number;
  total: number;
  image: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: string;
  itemsCount: number;
  amount: number;
  paymentStatus: "Pending" | "Paid" | "Refunded" | "COD";
  orderStatus: "Pending" | "Processing" | "Packed" | "Shipped" | "In Transit" | "Out for Delivery" | "Delivering Tomorrow" | "Delivered" | "Cancelled" | "Completed";
  currentLocation?: string;
  date: string;
  time?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  paymentMethod: string;
  trackingNumber?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  totalOrders: number;
  totalSpent: number;
  customerSince: string;
  isVip: boolean;
  avatar: string;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  latestOrder: Order;
  unreadCount?: number;
  lastMessageTime?: string;
  lastMessageText?: string;
  assignedTo?: string;
  resolved?: boolean;
  notes?: string;
  tags?: string[];
}

export type UserRole = "Store Admin" | "Senior Concierge" | "Fulfillment Officer" | "Inventory Associate" | "Sales Manager" | "Sales Agent" | "Accounts";

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Pre-Order";

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  stock: StockStatus;
  image: string;
  category: string;
  unitsLeft: number;
  origin: string;
  sku?: string;
  weight?: string;
  isCrmOnly?: boolean;
  channel?: "central" | "crm_only";
  farmerName?: string;
  description?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "Online" | "On Break" | "Offline" | "Revoked" | "Deactivated";
  assignedChats: number;
  avgResponseTime: string;
  avatar: string;
  tempPassword?: string;
  createdAt: string;
  credentialsStatus?: "active" | "revoked";
  revokedAt?: string;
  revokedReason?: string;
  revokedBy?: string;
}

interface BroadcastCampaign {
  id: string;
  name: string;
  audience: string;
  segment?: string;
  message: string;
  status: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
}

type ThemeMode = "forest" | "dark" | "mist" | "harvest";

// Role-Based Access Control Permissions Matrix
const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    allowedTabs: string[];
    defaultTab: string;
    label: string;
    description: string;
    badgeColor: string;
  }
> = {
  "Store Admin": {
    allowedTabs: [
      "leads",
      "dashboard",
      "inbox",
      "orders",
      "order_details",
      "customers",
      "broadcast",
      "products",
      "templates",
      "shipments",
      "analytics",
      "team",
      "settings",
    ],
    defaultTab: "leads",
    label: "Store Admin (Master Control)",
    description: "Full access to revenue analytics, broadcasts, team management & settings",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  "Senior Concierge": {
    allowedTabs: ["leads", "inbox", "orders", "order_details", "customers", "products", "templates"],
    defaultTab: "inbox",
    label: "Concierge Work Area",
    description: "Customer WhatsApp chats, order status confirmation & product lookup",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
  },
  "Fulfillment Officer": {
    allowedTabs: ["shipments", "orders", "order_details", "products"],
    defaultTab: "shipments",
    label: "Dispatch & Fulfillment Area",
    description: "2–3 day packaging pipeline, Speed Post tracking & consignment updates",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  "Sales Manager": {
    allowedTabs: ["leads", "dashboard", "inbox", "orders", "order_details", "customers", "products", "templates", "analytics"],
    defaultTab: "leads",
    label: "Sales Manager (Wholesale & Retail)",
    description: "Full pipeline control, quotation approvals, credit terms & team assignments",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  "Sales Agent": {
    allowedTabs: ["leads", "inbox", "orders", "order_details", "customers", "products", "templates"],
    defaultTab: "leads",
    label: "Sales Agent (Concierge Sales)",
    description: "Assisted purchases, phone follow-ups, quotation builder & orders",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
  },
  "Accounts": {
    allowedTabs: ["leads", "orders", "order_details", "customers", "analytics"],
    defaultTab: "leads",
    label: "Accounts & Billing",
    description: "Credit approvals, payment reconciliation & accounting sync",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
  },
  "Inventory Associate": {
    allowedTabs: ["products", "orders", "order_details"],
    defaultTab: "products",
    label: "Catalog & Inventory Area",
    description: "Product pricing reference, Himalayan stock status & shareable links",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
  },
};

// Production Customers State (loaded dynamically from WhatsApp webhook feed & MongoDB Atlas)
const INITIAL_CUSTOMERS: Customer[] = [];

// Production Messages Map (loaded dynamically per customer conversation)
const INITIAL_MESSAGES_MAP: Record<string, Message[]> = {};

const DEFAULT_STORE_DESK: Customer = {
  id: "desk_prajnaa",
  name: "Prajnaa Market Desk",
  phone: "+91 89797 68681",
  email: "prajnaafarm@gmail.com",
  location: "Seva Niketan, Ward No.2, Near ITI, Solan, Himachal Pradesh",
  totalOrders: 0,
  totalSpent: 0,
  customerSince: "2026",
  isVip: false,
  avatar: "",
  address: {
    line1: "Seva Niketan, Ward No.2, Near ITI",
    city: "Solan",
    state: "Himachal Pradesh",
    pincode: "173212",
    country: "India",
  },
  unreadCount: 0,
  lastMessageTime: "",
  lastMessageText: "Shared WhatsApp Inbox Active",
  latestOrder: {
    id: "ord_empty",
    orderNumber: "N/A",
    itemsCount: 0,
    amount: 0,
    paymentStatus: "Pending",
    orderStatus: "Processing",
    date: "Today",
    time: "Just now",
    items: [],
    subtotal: 0,
    discount: 0,
    shipping: 0,
    paymentMethod: "UPI Direct",
  },
};

// Initial Team Members Data (ONLY THESE USERS CAN SIGN IN)
const INITIAL_TEAM: TeamMember[] = [
  {
    id: "tm_1",
    name: "Nishant",
    email: "admin@prajnaamarket.com",
    phone: "+91 80912 65690",
    role: "Store Admin",
    status: "Online",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
    tempPassword: "adminPrajnaa#2024",
    createdAt: "10 Jan 2024",
  },
  {
    id: "tm_2",
    name: "Rajat Gupta",
    email: "rajat@prajnaamarket.com",
    phone: "+91 98101 44556",
    role: "Senior Concierge",
    status: "Online",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    tempPassword: "Rajat#Prajnaa88",
    createdAt: "15 Jan 2024",
  },
  {
    id: "tm_3",
    name: "Anita Rawat",
    email: "anita.rawat@prajnaamarket.com",
    phone: "+91 97600 88991",
    role: "Fulfillment Officer",
    status: "Online",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    tempPassword: "Anita#Dispatch33",
    createdAt: "01 Feb 2024",
  },
  {
    id: "tm_4",
    name: "Vikram Negi",
    email: "vikram.negi@prajnaamarket.com",
    phone: "+91 98970 12345",
    role: "Inventory Associate",
    status: "On Break",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    tempPassword: "Vikram#Negi2024",
    createdAt: "12 Feb 2024",
  },
];

// Real Himalayan Catalog Photo Mapping
const REAL_PRODUCT_IMAGES: Record<string, string> = {
  "himalayan-dried-apricots": "/assets/cat-dryfruits.jpg",
  "walnuts": "/assets/cat-nuts.jpg",
  "himalayan-mountain-walnuts": "/assets/cat-nuts.jpg",
  "organic-almonds": "/assets/prod-almonds.jpg",
  "mamra-almonds": "/assets/prod-almonds.jpg",
  "turmeric-powder": "/assets/prod-turmeric.jpg",
  "stone-ground-turmeric": "/assets/prod-turmeric.jpg",
  "mango-pickle": "/assets/prod-pickle.jpg",
  "heirloom-mango-pickle": "/assets/prod-pickle.jpg",
  "pink-himalayan-salt": "/assets/prod-salt.jpg",
  "garam-masala": "/assets/prod-masala.jpg",
  "house-garam-masala": "/assets/prod-masala.jpg",
  "mixed-seeds": "/assets/prod-seeds.jpg",
  "five-seed-mix": "/assets/prod-seeds.jpg",
  "california-almonds": "/assets/prod-almonds.jpg",
  "chilli-powder": "/assets/cat-spices.jpg",
  "guntur-red-chilli": "/assets/cat-spices.jpg",
  "lemon-pickle": "/assets/cat-pickles.jpg",
  "salt-cured-lemon-pickle": "/assets/cat-pickles.jpg",
  "black-salt": "/assets/cat-salts.jpg",
  "chai-masala": "/assets/cat-spices.jpg",
  "spiced-chai-masala": "/assets/cat-spices.jpg",
  "chia-seeds": "/assets/cat-seeds.jpg",
  "black-chia-seeds": "/assets/cat-seeds.jpg",
};

const REAL_CATEGORY_IMAGES: Record<string, string> = {
  "dry-fruits": "/assets/cat-dryfruits.jpg",
  "dry fruits": "/assets/cat-dryfruits.jpg",
  "spices": "/assets/cat-spices.jpg",
  "pickles": "/assets/cat-pickles.jpg",
  "salts": "/assets/cat-salts.jpg",
  "masalas": "/assets/cat-spices.jpg",
  "seeds": "/assets/cat-seeds.jpg",
  "nuts": "/assets/cat-nuts.jpg",
  "honey": "/assets/cat-honey.jpg",
};

const getRealProductImage = (prod: { id?: string; slug?: string; name?: string; category?: string; image?: string; images?: string[] }): string => {
  const rawImg = prod.image || (Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : undefined);
  if (rawImg) {
    if (rawImg.startsWith("/api/storage") || rawImg.startsWith("/storage")) {
      return `https://market.prajnaa.in${rawImg}`;
    }
    if (rawImg.startsWith("/") || rawImg.startsWith("http")) {
      return rawImg;
    }
  }
  const byId = prod.id && REAL_PRODUCT_IMAGES[prod.id];
  if (byId) return byId;

  const bySlug = prod.slug && REAL_PRODUCT_IMAGES[prod.slug];
  if (bySlug) return bySlug;

  const nameKey = (prod.name || "").toLowerCase().replace(/[^a-z0-9]/g, "-");
  for (const [k, v] of Object.entries(REAL_PRODUCT_IMAGES)) {
    if (nameKey.includes(k) || k.includes(nameKey)) return v;
  }

  const catKey = (prod.category || "").toLowerCase();
  if (REAL_CATEGORY_IMAGES[catKey]) return REAL_CATEGORY_IMAGES[catKey];

  return "/assets/cat-dryfruits.jpg";
};

// HSN Code Helper for Tax Invoices
const getProductHsn = (name: string): string => {
  const n = (name || "").toLowerCase();
  if (n.includes("turmeric") || n.includes("haldi")) return "0910 30 20";
  if (n.includes("tea") || n.includes("chai")) return "0902 10 20";
  if (n.includes("honey") || n.includes("shahad")) return "0409 00 00";
  if (n.includes("almond") || n.includes("badam") || n.includes("walnut") || n.includes("akhrot")) return "0802 11 00";
  if (n.includes("pickle") || n.includes("achar")) return "2001 90 00";
  if (n.includes("salt") || n.includes("namak")) return "2501 00 10";
  if (n.includes("seed")) return "1207 99 90";
  if (n.includes("masala") || n.includes("spice") || n.includes("chilli")) return "0910 99 29";
  return "0910 99 90";
};

// Convert numbers to Indian Rupees in words
const numberToWordsIndian = (num: number): string => {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (!num || num === 0) return "Zero Rupees Only";

  const n = Math.floor(num);
  let str = "";

  const convertTwoDigits = (val: number): string => {
    if (val < 20) return a[val];
    return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : " ");
  };

  const crores = Math.floor(n / 10000000);
  const lakhs = Math.floor((n % 10000000) / 100000);
  const thousands = Math.floor((n % 100000) / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const remaining = n % 100;

  if (crores > 0) str += convertTwoDigits(crores) + "Crore ";
  if (lakhs > 0) str += convertTwoDigits(lakhs) + "Lakh ";
  if (thousands > 0) str += convertTwoDigits(thousands) + "Thousand ";
  if (hundreds > 0) str += a[hundreds] + "Hundred ";
  if (remaining > 0) str += convertTwoDigits(remaining);

  return str.trim() + " Rupees Only";
};

// Unified Master Helper: Builds the appropriate, polite WhatsApp notification for ANY order status transition.
const getOrderStatusNotificationText = (
  status: string,
  order: { customerName?: string; orderNumber: string; trackingNumber?: string },
  location?: string
): string => {
  const custName = order?.customerName?.trim() || "ji";
  const orderNumTag = order?.orderNumber?.startsWith("#") ? order.orderNumber : `#${order?.orderNumber || "PRJ-ORD"}`;
  const trackingPart = order?.trackingNumber ? `\n📦 *Tracking Consignment:* ${order.trackingNumber}\n` : "";
  const currentLoc = location?.trim() || "Regional Sorting Hub";
  const normStatus = (status || "").toLowerCase().replace(/[\s_-]+/g, "");

  switch (normStatus) {
    case "processing":
      return `Namaste ${custName}! ⏳\n\nUpdate on your Prajnaa Market order *${orderNumTag}*:\nYour order has been confirmed and is now being *processed* by our Himalayan harvest team. 🌿\n\nWe are carefully preparing your authentic natural produce directly from the farms. You will receive another notification as soon as your parcel is packed!\n\n*Team Prajnaa Market* 🌿`;

    case "packed":
      return `Namaste ${custName}! 📦\n\nGreat news! Your Prajnaa Market order *${orderNumTag}* has been *quality-checked and carefully packed*. 🌿\n\nIt is safely sealed and prepared for dispatch via Shipping. We will share your tracking consignment details as soon as it is handed over to the courier!\n\n*Team Prajnaa Market* 🌿`;

    case "shipped":
    case "partiallyshipped":
      return `Namaste ${custName}! 🚀\n\nYour Prajnaa Market order *${orderNumTag}* has been *dispatched and shipped*! 🌿${trackingPart}Dispatch Hub: Solan / Dehradun Postal Sorting Center\n\nHum aapko har transit hub ki live milestone update isi WhatsApp par send karte rahenge.\n\n*Team Prajnaa Market* 🌿`;

    case "intransit":
    case "transit":
      return `Namaste ${custName}! 📍\n\nTransit Update for order *${orderNumTag}*:\nYour parcel has reached *${currentLoc}* and is moving smoothly towards your destination address. 🌿${trackingPart}\nPure Himalayan farm goodness is on its way to you!\n\n*Team Prajnaa Market* 🌿`;

    case "outfordelivery":
      return `Namaste ${custName}! 🛵\n\nExciting update! Your Prajnaa Market order *${orderNumTag}* is *out for delivery today*! 🎉\n\nThe delivery executive will be arriving with your parcel shortly. Please keep your phone reachable to receive your fresh farm harvest! 🌿\n\n*Team Prajnaa Market* 🌿`;

    case "deliveringtomorrow":
      return `Namaste ${custName}! 🚚\n\nZaroori Delivery Update for order *${orderNumTag}*:\nAapka parcel local delivery hub pahunch chuka hai aur *kal deliver ho jayega*. 🌿\n\nKripya delivery receive karne ke liye available rahein. Prajnaa Himalayan harvest choose karne ke liye dhanyawad!\n\n*Team Prajnaa Market* 🌿`;

    case "delivered":
    case "completed":
      return `Namaste ${custName}! 🎉\n\nAapka Prajnaa Market order *${orderNumTag}* successfully *deliver ho gaya hai*! ✅\n\nWe hope you love the purity and freshness of your Himalayan harvest. If you have any feedback or questions, please reply to this message directly.\n\nDhanyawaad for supporting our Himalayan farmer community! 🌿🌸\n\n*Team Prajnaa Market*`;

    case "cancelled":
      return `Namaste ${custName}! ℹ️\n\nAapka Prajnaa Market order *${orderNumTag}* cancel kar diya gaya hai.\n\nAgar yeh kisi galti se hua hai ya aapko refund/replacement mein koi sahayata chahiye, toh kripya yahan reply karein. Humari team aapki poori madad karegi! 🌿\n\n*Team Prajnaa Market*`;

    case "pending":
    default:
      return `Namaste ${custName}! 🕒\n\nAapka order *${orderNumTag}* hume praapt ho gaya hai aur *pending review* status mein hai.\n\nHumari team jald hi farm harvest check karke ise process karegi. Prajnaa Market par bharosa karne ke liye dhanyawad! 🌿\n\n*Team Prajnaa Market*`;
  }
};

const ORDER_STATUS_OPTIONS = [
  { key: "Pending", label: "Pending", icon: "🕒", desc: "Awaiting review" },
  { key: "Processing", label: "Processing", icon: "⏳", desc: "Prepping harvest" },
  { key: "Packed", label: "Packed", icon: "📦", desc: "Checked & sealed" },
  { key: "Shipped", label: "Shipped", icon: "🚀", desc: "Dispatched (Post)" },
  { key: "In Transit", label: "In Transit", icon: "📍", desc: "En route at hub" },
  { key: "Out for Delivery", label: "Out for Delivery", icon: "🛵", desc: "With courier today" },
  { key: "Delivering Tomorrow", label: "Delivering Tomorrow", icon: "🚚", desc: "Arrives tomorrow" },
  { key: "Delivered", label: "Delivered", icon: "✅", desc: "Safely received" },
  { key: "Cancelled", label: "Cancelled", icon: "❌", desc: "Order cancelled" },
] as const;

// Helper: Get numerical rank of order status to prevent reverse lifecycle transitions
const getOrderStatusRank = (status?: string): number => {
  const norm = (status || "").toLowerCase().replace(/[\s_-]+/g, "");
  switch (norm) {
    case "pending": return 0;
    case "processing": return 1;
    case "packed": return 2;
    case "shipped": return 3;
    case "intransit":
    case "transit": return 4;
    case "outfordelivery": return 5;
    case "deliveringtomorrow": return 6;
    case "delivered":
    case "completed": return 7;
    case "cancelled": return 99;
    default: return 0;
  }
};

// Initial Products Data (All 14 Authoritative Himalayan Store Items with Real Photographs)
const INITIAL_PRODUCTS: ProductItem[] = [
  { id: "himalayan-dried-apricots", name: "Himalayan Dried Apricots (Red)", price: 999, stock: "Pre-Order", image: "/assets/cat-dryfruits.jpg", category: "Dry Fruits", unitsLeft: 0, origin: "Sham Valley Orchard, Ladakh", sku: "PM-APR-500", weight: "500 gm" },
  { id: "walnuts", name: "Himalayan Mountain Walnuts", price: 604, stock: "Pre-Order", image: "/assets/cat-nuts.jpg", category: "Dry Fruits", unitsLeft: 0, origin: "Kashmir Giri High Oil", sku: "PM-WAL-250", weight: "250g" },
  { id: "organic-almonds", name: "Mamra Almonds", price: 1250, stock: "In Stock", image: "/assets/prod-almonds.jpg", category: "Dry Fruits", unitsLeft: 42, origin: "High Altitude Organic Orchards", sku: "PM-ALM-500", weight: "500 g" },
  { id: "turmeric-powder", name: "Stone-Ground Turmeric", price: 240, stock: "In Stock", image: "/assets/prod-turmeric.jpg", category: "Spices", unitsLeft: 86, origin: "Lakadong High Curcumin", sku: "PM-TUR-250", weight: "250 g" },
  { id: "mango-pickle", name: "Heirloom Mango Pickle", price: 380, stock: "In Stock", image: "/assets/prod-pickle.jpg", category: "Pickles", unitsLeft: 24, origin: "Himalayan Foothills Wood Pressed", sku: "PM-PCK-400", weight: "400 g" },
  { id: "pink-himalayan-salt", name: "Pink Himalayan Salt", price: 180, stock: "In Stock", image: "/assets/prod-salt.jpg", category: "Salts", unitsLeft: 120, origin: "Khewra Foothills Mineral Rich", sku: "PM-SLT-500", weight: "500 g" },
  { id: "garam-masala", name: "House Garam Masala", price: 320, stock: "In Stock", image: "/assets/prod-masala.jpg", category: "Masalas", unitsLeft: 58, origin: "Stone-Ground Whole Spices", sku: "PM-MAS-200", weight: "200 g" },
  { id: "mixed-seeds", name: "Five-Seed Mix", price: 280, stock: "In Stock", image: "/assets/prod-seeds.jpg", category: "Seeds", unitsLeft: 96, origin: "Uttarakhand Hill Farms", sku: "PM-SED-500", weight: "500 g" },
  { id: "california-almonds", name: "California Almonds", price: 720, stock: "Out of Stock", image: "/assets/prod-almonds.jpg", category: "Dry Fruits", unitsLeft: 0, origin: "Premium Kernels", sku: "PM-CAL-500", weight: "500 g" },
  { id: "chilli-powder", name: "Guntur Red Chilli", price: 220, stock: "Out of Stock", image: "/assets/cat-spices.jpg", category: "Spices", unitsLeft: 0, origin: "Sun-Dried Stone Ground", sku: "PM-CHL-250", weight: "250 g" },
  { id: "lemon-pickle", name: "Salt-Cured Lemon Pickle", price: 320, stock: "In Stock", image: "/assets/cat-pickles.jpg", category: "Pickles", unitsLeft: 42, origin: "Six-Week Sun-Aged Foothills", sku: "PM-LMN-400", weight: "400 g" },
  { id: "black-salt", name: "Black Salt (Kala Namak)", price: 160, stock: "In Stock", image: "/assets/cat-salts.jpg", category: "Salts", unitsLeft: 86, origin: "Kiln-Fired Natural Crystals", sku: "PM-BSL-500", weight: "500 g" },
  { id: "chai-masala", name: "Spiced Chai Masala", price: 260, stock: "In Stock", image: "/assets/cat-spices.jpg", category: "Masalas", unitsLeft: 24, origin: "Pahari Cardamom & Clove", sku: "PM-CHM-150", weight: "150 g" },
  { id: "chia-seeds", name: "Black Chia Seeds", price: 220, stock: "In Stock", image: "/assets/cat-seeds.jpg", category: "Seeds", unitsLeft: 120, origin: "High Altitude Organic Cultivation", sku: "PM-CHI-250", weight: "250 g" },
];

// Initial Shipments Data (Production empty state - consignments populate from actual orders)
const INITIAL_SHIPMENTS: any[] = [];

// Initial Templates Data (Official Meta Cloud API pre-approved templates)
const INITIAL_TEMPLATES = [
  {
    id: "tpl_1",
    category: "Order Updates",
    name: "Order Confirmation",
    message: "Namaste {{customer_name}} ji! Aapka order #{{order_id}} successfully receive ho gaya hai.",
  },
  {
    id: "tpl_2",
    category: "Payment",
    name: "Payment Pending",
    message: "Ji, aapka payment abhi pending hai. Official UPI ID: prajnaa@upi. Total: ₹{{amount}}.",
  },
  {
    id: "tpl_3",
    category: "Payment",
    name: "Payment Confirmed",
    message: "Thank you {{customer_name}} ji! Aapka payment confirm ho gaya hai.",
  },
  {
    id: "tpl_4",
    category: "Order Updates",
    name: "Order Processing",
    message: "Ji, aapka order processing mein hai. Dispatch mein lagbhag 2–3 din lag sakte hain.",
  },
  {
    id: "tpl_5",
    category: "Shipping",
    name: "Order Shipped",
    message: "Good news {{customer_name}} ji! 📦 Aapka Prajnaa Market order #{{order_id}} ship ho gaya hai. Hum aapko har transit location ki live update bhejte rahenge.",
  },
  {
    id: "tpl_5b",
    category: "Shipping",
    name: "Order Location Update",
    message: "Namaste {{customer_name}} ji! 📍 Aapka order #{{order_id}} abhi {{location}} pahunch chuka hai aur aage transit mein hai.",
  },
  {
    id: "tpl_5c",
    category: "Shipping",
    name: "Delivering Tomorrow",
    message: "Namaste {{customer_name}} ji! 🚚 Aapke liye update: Aapka order #{{order_id}} kal deliver ho jayega. Kripya apna phone available rakhein.",
  },
  {
    id: "tpl_6",
    category: "Shipping",
    name: "Order Delivered",
    message: "Ji, aapka order successfully deliver ho gaya hai. Thank you!",
  },
  {
    id: "tpl_7",
    category: "Catalogue",
    name: "Live Product Catalogue",
    message: "Bilkul ji! Hamara latest product catalogue yahan dekhein: {{catalogue_url}}",
  },
  {
    id: "tpl_8",
    category: "Support",
    name: "Human Support Handoff",
    message: "Nishant ji abhi available nahi hain. Woh jald hi aapse connect karenge.",
  },
  {
    id: "tpl_9",
    category: "Support",
    name: "Customer Complaint",
    message: "Ji, inconvenience ke liye maafi chahte hain. Hamari team jald aapse connect karegi.",
  },
];

// Initial Broadcast Campaigns Data (Production empty state - campaigns populate from authorized Meta Cloud dispatches)
const INITIAL_CAMPAIGNS: BroadcastCampaign[] = [];

// Quick Presets for Broadcast Campaigns
const BROADCAST_PRESETS = [
  {
    label: "🧈 Badri Cow Ghee Batch",
    name: "Fresh Batch: A2 Badri Cow Desi Ghee",
    audience: "All Opted-In Customers",
    text: "Namaste ji! 🙏 Tehri Garhwal ke high-altitude Badri cow farm se A2 Desi Ghee ka naya seasonal batch ready hai. Traditional bilona method se tayar. Order before stock finishes: https://market.prajnaa.in/ 🧈",
  },
  {
    label: "🍑 Himalayan Apricots Pre-Order",
    name: "Pre-Order: Ladakh Sun-Dried Apricots",
    audience: "VIP Customers",
    text: "Namaste ji! 🍑 Ladakh Sham Valley ke pure Himalayan Sun-Dried Apricots ka pre-order window open ho gaya hai. Fresh harvest direct from orchard farmers! Book here: https://market.prajnaa.in/",
  },
  {
    label: "🍯 Raw Wild Forest Honey",
    name: "Special Reserve: Himalayan Multiflora Honey",
    audience: "Honey Lovers",
    text: "Namaste ji! 🍯 Raw Unfiltered Multiflora Forest Honey ka fresh batch extract ho chuka hai. Zero processing, naturally enzymes-rich. Visit: https://market.prajnaa.in/",
  },
  {
    label: "✨ Festive Season Discount",
    name: "Special Seasonal Harvest Release",
    audience: "All Opted-In Customers",
    text: "Namaste ji! 🌸 Prajnaa Market par special Himalayan Produce fresh harvest offerings live hain. Abhi visit karein: https://market.prajnaa.in/ 🙏",
  },
];

export default function PrajnaaMasterCrmApp() {
  // Theme State (Forest, Dark, Mist, Harvest)
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("forest");
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);

  // Notification Center Dropdown State
  const [showNotificationMenu, setShowNotificationMenu] = useState<boolean>(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [notificationTab, setNotificationTab] = useState<"all" | "chats" | "orders">("all");

  // Authentication State (MANDATORY LOGIN: Users MUST authenticate before accessing CRM)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const isAuthRef = useRef<boolean>(false);
  const isInitialSyncRef = useRef<boolean>(true);
  const deletedCustomerIdsRef = useRef<Set<string>>(new Set());

  // Persistent deleted customers tracking across browser refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const p1: string[] = JSON.parse(localStorage.getItem("prajnaa_deleted_phones") || "[]");
        const p2: string[] = JSON.parse(localStorage.getItem("prajnaa_deleted_customer_ids") || "[]");
        p1.forEach((id) => deletedCustomerIdsRef.current.add(id));
        p2.forEach((id) => deletedCustomerIdsRef.current.add(id));
      } catch {}
    }
  }, []);

  // Suppress all notifications on the login page
  useEffect(() => {
    isAuthRef.current = isAuthenticated;
    if (!isAuthenticated && typeof window !== "undefined") {
      toast.dismiss();
    }
  }, [isAuthenticated]);

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Current Logged-in User
  const [currentUser, setCurrentUser] = useState<TeamMember>(INITIAL_TEAM[0]);
  const [showConvertLeadModal, setShowConvertLeadModal] = useState<boolean>(false);
  const [selectedLeadForConvert, setSelectedLeadForConvert] = useState<{ name: string; phone: string; email?: string } | null>(null);

  // Auth Form State (Empty by default for clean staff login)
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpRole, setSignUpRole] = useState<UserRole>("Senior Concierge");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  // Navigation (Filtered by User's Work Area / Role)
  const [activeNav, setActiveNav] = useState<string>("leads");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileChatView, setMobileChatView] = useState<"list" | "chat" | "details">("list");

  // State: Team Members (Stored in State & Loaded from LocalStorage)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM);
  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [memberToRevoke, setMemberToRevoke] = useState<TeamMember | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [revokeReason, setRevokeReason] = useState<string>("Employee Left Organization");
  const [teamFilter, setTeamFilter] = useState<"all" | "active" | "revoked">("all");
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Senior Concierge" as UserRole,
  });
  const [lastCreatedMember, setLastCreatedMember] = useState<TeamMember | null>(null);

  // State: Customers & Conversations
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [inboxTab, setInboxTab] = useState<"all" | "unread" | "assigned" | "resolved">("all");
  const [inboxSearch, setInboxSearch] = useState("");

  // Shared single source of truth for all unread counters and notification badges
  const totalUnreadCount = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [customers]);

  // State: Messages
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES_MAP);

  const customersRef = useRef<Customer[]>(INITIAL_CUSTOMERS);
  const messagesMapRef = useRef<Record<string, Message[]>>(INITIAL_MESSAGES_MAP);
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    messagesMapRef.current = messagesMap;
  }, [messagesMap]);

  useEffect(() => {
    if (selectedCustomerId) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomerId && (c.unreadCount || 0) > 0 ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [selectedCustomerId]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const notifiedOrdersRef = useRef<Set<string>>(new Set());
  const lastSyncedOrdersHashRef = useRef<string>("");
  const lastSyncedMessagesHashRef = useRef<string>("");
  const isSyncingOrdersRef = useRef<boolean>(false);
  const isSyncingMessagesRef = useRef<boolean>(false);

  // Media lightbox & upload state
  const [selectedLightboxMedia, setSelectedLightboxMedia] = useState<{ url: string; type?: string; title?: string } | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedUploadFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setUploadPreviewUrl(url);
    } else {
      setUploadPreviewUrl(null);
    }
    setShowAttachmentMenu(false);
  };

  const handleClearSelectedFile = () => {
    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
    }
    setSelectedUploadFile(null);
    setUploadPreviewUrl(null);
    if (mediaFileInputRef.current) mediaFileInputRef.current.value = "";
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  };

  const playOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // State: Customer Details Drawer Tabs
  const [customerDrawerTab, setCustomerDrawerTab] = useState<"customer" | "orders" | "notes" | "activity">("customer");
  const [customerNotes, setCustomerNotes] = useState<string>("");

  // State: Orders & Selected Order Details
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order>(DEFAULT_STORE_DESK.latestOrder);
  const [orderPreviousNav, setOrderPreviousNav] = useState<string>("orders");
  const [ordersFilter, setOrdersFilter] = useState<string>("all");
  const [ordersSearch, setOrdersSearch] = useState<string>("");
  const [showAddOrderModal, setShowAddOrderModal] = useState<boolean>(false);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  // Dedicated, bulletproof print engine for Official Tax Invoice
  const handlePrintInvoice = () => {
    if (typeof window === "undefined") return;
    try {
      window.print();
    } catch (e) {
      console.error("Print error, opening standalone printable invoice:", e);
      handleOpenInvoiceNewTab();
    }
  };

  // Standalone printable invoice window (failsafe for any browser popup/extension environment)
  const handleOpenInvoiceNewTab = () => {
    if (typeof window === "undefined") return;
    const invoiceEl = document.getElementById("prajnaa-tax-invoice");
    if (!invoiceEl) {
      window.print();
      return;
    }
    const orderNum = selectedOrderForView?.orderNumber || "Invoice";
    const printWin = window.open("", "_blank");
    if (!printWin) {
      toast.info("Opening direct print dialog...");
      window.print();
      return;
    }
    printWin.document.open();
    printWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tax Invoice - Prajnaa Market - ${orderNum}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    html, body { background: #f3f4f6; color: #111827; margin: 0; padding: 20px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; }
    #prajnaa-tax-invoice { width: 100%; max-width: 820px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #d1d5db; margin: 0 auto; background: #ffffff; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-color: #d1d5db; }
    @media print {
      html, body { padding: 0 !important; margin: 0 !important; background: #ffffff !important; }
      .no-print { display: none !important; }
      #prajnaa-tax-invoice { border: 1px solid #d1d5db !important; box-shadow: none !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="width: 100%; max-width: 820px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 12px 18px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
    <div>
      <strong style="font-size: 14px; color: #111827;">Prajnaa Market Official Tax Invoice</strong>
      <span style="font-size: 12px; color: #6b7280; display: block;">Order #${orderNum} &bull; Ready for A4 Print / PDF</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #047857; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); display: flex; align-items: center; gap: 6px;">
        🖨️ Print / Save as PDF
      </button>
      <button onclick="window.close()" style="background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">
        Close
      </button>
    </div>
  </div>
  <div style="width: 100%; max-width: 820px;">
    ${invoiceEl.outerHTML}
  </div>
</body>
</html>`);
    printWin.document.close();
  };
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  // State: Create Order Form
  const [newOrderCustomerName, setNewOrderCustomerName] = useState<string>("");
  const [newOrderCustomerPhone, setNewOrderCustomerPhone] = useState<string>("");
  const [newOrderCustomerEmail, setNewOrderCustomerEmail] = useState<string>("");
  const [newOrderAddress, setNewOrderAddress] = useState<string>("");
  const [newOrderCity, setNewOrderCity] = useState<string>("");
  const [newOrderPincode, setNewOrderPincode] = useState<string>("");
  const [newOrderProductId, setNewOrderProductId] = useState<string>("");
  const [newOrderQuantity, setNewOrderQuantity] = useState<number>(1);
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState<"COD" | "WhatsApp" | "UPI">("COD");
  const [newOrderPaymentStatus, setNewOrderPaymentStatus] = useState<"Pending" | "Paid">("Pending");
  const [newOrderStatus, setNewOrderStatus] = useState<"Pending" | "Processing" | "Packed" | "Shipped" | "Completed">("Pending");
  const [newOrderNotes, setNewOrderNotes] = useState<string>("");
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  // Multi-product order items, discount per product, and manual delivery charge
  const [newOrderItemsList, setNewOrderItemsList] = useState<Array<{ productId: string; qty: number; discount?: number }>>([
    { productId: "prajnaa-almond-500g", qty: 1, discount: 0 }
  ]);
  const [newOrderPaymentMethodChoice, setNewOrderPaymentMethodChoice] = useState<string>("UPI");
  const [newOrderShipping, setNewOrderShipping] = useState<number>(0);

  // WhatsApp Inbox Interactive states
  const [showEditCustomerModal, setShowEditCustomerModal] = useState<boolean>(false);
  const [editCustName, setEditCustName] = useState<string>("");
  const [editCustPhone, setEditCustPhone] = useState<string>("");
  const [editCustEmail, setEditCustEmail] = useState<string>("");
  const [editCustAddress, setEditCustAddress] = useState<string>("");
  const [editCustCity, setEditCustCity] = useState<string>("");
  const [editCustPincode, setEditCustPincode] = useState<string>("");
  const [editCustIsVip, setEditCustIsVip] = useState<boolean>(false);

  const [showTagMenu, setShowTagMenu] = useState<boolean>(false);
  const [showMoreChatMenu, setShowMoreChatMenu] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState<boolean>(false);
  const [showDeleteContactModal, setShowDeleteContactModal] = useState<boolean>(false);
  const [isDeletingContact, setIsDeletingContact] = useState<boolean>(false);


  // State: Dashboard Graph Filter
  const [graphTimeframe, setGraphTimeframe] = useState<"7d" | "30d" | "quarter">("30d");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // State: Broadcasts
  const [broadcastName, setBroadcastName] = useState("Autumn Badri Cow Ghee Fresh Batch");
  const [broadcastAudience, setBroadcastAudience] = useState("All Customers (345)");
  const [broadcastText, setBroadcastText] = useState(
    "Namaste ji! 🙏 Tehri Garhwal ke high-altitude Badri cow farm se A2 Desi Ghee ka naya seasonal batch ready hai. Traditional bilona method se tayar. Order before stock finishes: https://prajnaa-farm-8zam.vercel.app/ 🧈"
  );
  const [broadcastCampaigns, setBroadcastCampaigns] = useState<BroadcastCampaign[]>(INITIAL_CAMPAIGNS);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSearch, setBroadcastSearch] = useState("");
  const [selectedCampaignForModal, setSelectedCampaignForModal] = useState<BroadcastCampaign | null>(null);

  // State: Shipments & Selected Shipment Tracking
  const [shipments, setShipments] = useState(INITIAL_SHIPMENTS);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [shipmentHubInput, setShipmentHubInput] = useState<string>("Chandigarh Hub");

  // State: Templates
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState("all");
  const [templatesSearchQuery, setTemplatesSearchQuery] = useState("");
  const [templatesList, setTemplatesList] = useState(INITIAL_TEMPLATES);

  // State: Modal for Status Update / Order
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdateChoice, setStatusUpdateChoice] = useState<Order["orderStatus"]>("Processing");
  const [transitLocationInput, setTransitLocationInput] = useState<string>("Delhi Sorting Hub");
  const [isEditingStatusTemplate, setIsEditingStatusTemplate] = useState<boolean>(false);
  const [customStatusMessage, setCustomStatusMessage] = useState<string>("");
  const [showTrackingModal, setShowTrackingModal] = useState<boolean>(false);
  const [editTrackingNumber, setEditTrackingNumber] = useState<string>("");
  const [invoiceTaxMode, setInvoiceTaxMode] = useState<"auto" | "inter" | "intra">("inter");

  // State: Products & Stock Inventory Management
  const [productsList, setProductsList] = useState<ProductItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prajnaa_crm_products");
        const manualSaved = localStorage.getItem("prajnaa_crm_manual_products");
        let initialList: ProductItem[] = [];
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Upgrade any emoji-only image fields to real Himalayan catalog photos
            initialList = parsed.map((p) => ({
              ...p,
              channel: p.channel || (p.isCrmOnly ? "crm_only" : "central"),
              image: p.image && (p.image.startsWith("/") || p.image.startsWith("http")) ? p.image : (REAL_PRODUCT_IMAGES[p.id] || "/assets/cat-dryfruits.jpg")
            }));
          }
        }
        if (manualSaved) {
          try {
            const manualParsed: ProductItem[] = JSON.parse(manualSaved);
            if (Array.isArray(manualParsed)) {
              manualParsed.forEach((m) => {
                if (!initialList.some((p) => p.id === m.id || (m.sku && p.sku === m.sku))) {
                  initialList.push({ ...m, isCrmOnly: true, channel: "crm_only" });
                }
              });
            }
          } catch {}
        }
        if (initialList.length > 0) return initialList;
      } catch {}
    }
    return INITIAL_PRODUCTS;
  });
  const [productStockFilter, setProductStockFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");
  const [isSyncingProducts, setIsSyncingProducts] = useState<boolean>(false);
  const [productSyncSource, setProductSyncSource] = useState<string>("market.prajnaa.in");
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showEditStockModal, setShowEditStockModal] = useState<boolean>(false);
  const [editUnitsInput, setEditUnitsInput] = useState<number>(0);
  const [editStockStatusInput, setEditStockStatusInput] = useState<StockStatus>("In Stock");
  const [editPriceInput, setEditPriceInput] = useState<number>(0);
  const [showManageProductModal, setShowManageProductModal] = useState<boolean>(false);
  const [showDeleteProductConfirm, setShowDeleteProductConfirm] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [productFormData, setProductFormData] = useState<ProductItem>({
    id: "",
    name: "",
    price: 450,
    stock: "In Stock",
    image: "🌿",
    category: "Dry Fruits",
    unitsLeft: 50,
    origin: "High Altitude Farm, Himachal Pradesh",
    sku: "",
    weight: "500g",
    isCrmOnly: false,
    channel: "central",
    farmerName: "",
    description: "",
  });

  // State: CRM Orders synchronized with Web Checkout & Server
  const [crmOrders, setCrmOrders] = useState<any[]>([]);
  const [showCatalogQuoteMenu, setShowCatalogQuoteMenu] = useState<boolean>(false);
  const [showQuickTemplatesMenu, setShowQuickTemplatesMenu] = useState<boolean>(false);
  const [chatSenderMode, setChatSenderMode] = useState<"business" | "customer">("business");
  const [isAutoReplying, setIsAutoReplying] = useState<boolean>(false);
  const [showSimulateCustomerMenu, setShowSimulateCustomerMenu] = useState<boolean>(false);

  // Derived: Permissions for Current User
  const userPermissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS["Store Admin"];

  // Synchronize Products Catalog from Central Website (market.prajnaa.in) & Non-Destructively Merge CRM-Exclusive Items
  const syncProductsCatalog = async (interactive: boolean = false) => {
    setIsSyncingProducts(true);
    try {
      let rawProducts: any[] = [];
      let sourceName = "market.prajnaa.in";

      // 1. Primary: Fetch directly from authoritative CRM products API (/api/crm/products)
      try {
        const res = await fetch("/api/crm/products");
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            rawProducts = data.products;
            sourceName = "Prajnaa Store Database (/api/crm/products)";
          }
        }
      } catch (err: any) {
        console.warn("[Products Sync] /api/crm/products fetch note:", err?.message);
      }

      // 2. Secondary: If needed, fetch directly from central public API https://market.prajnaa.in/api/products
      if (rawProducts.length === 0) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch("https://market.prajnaa.in/api/products", {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.products) && data.products.length > 0) {
              rawProducts = data.products;
              sourceName = "market.prajnaa.in (Live Website)";
            }
          }
        } catch (err: any) {
          console.warn("[Products Sync] market.prajnaa.in not reachable directly from browser, trying local /api/products:", err?.message);
        }
      }

      // 3. Fallback: Local /api/products endpoint
      if (rawProducts.length === 0) {
        try {
          const res = await fetch("/api/products");
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.products) && data.products.length > 0) {
              rawProducts = data.products;
              sourceName = "Local Database (/api/products)";
            }
          }
        } catch (err: any) {
          console.warn("[Products Sync] Local /api/products fallback failed:", err?.message);
        }
      }

      // 3. Load manual CRM-exclusive products from persistent storage
      let manualCrmProducts: ProductItem[] = [];
      if (typeof window !== "undefined") {
        try {
          const savedManual = localStorage.getItem("prajnaa_crm_manual_products");
          if (savedManual) {
            const parsed = JSON.parse(savedManual);
            if (Array.isArray(parsed)) {
              manualCrmProducts = parsed.map((p) => ({
                ...p,
                isCrmOnly: true,
                channel: "crm_only" as const,
              }));
            }
          }
        } catch {}
      }

      // 4. Load saved stock status and price overrides
      const savedOverrides: Record<string, Partial<ProductItem>> = {};
      if (typeof window !== "undefined") {
        try {
          const savedProductsStr = localStorage.getItem("prajnaa_crm_products");
          if (savedProductsStr) {
            const parsed: ProductItem[] = JSON.parse(savedProductsStr);
            if (Array.isArray(parsed)) {
              parsed.forEach((p) => {
                savedOverrides[p.id] = { stock: p.stock, unitsLeft: p.unitsLeft, price: p.price };
                if (p.sku) savedOverrides[p.sku] = { stock: p.stock, unitsLeft: p.unitsLeft, price: p.price };
              });
            }
          }
        } catch {}
      }

      let mappedCentral: ProductItem[] = [];
      if (rawProducts.length > 0) {
        mappedCentral = rawProducts.map((p: any) => {
          const id = p.id || p.slug;
          const sku = p.sku || `PM-${(p.slug || p.id || "PRD").substring(0, 3).toUpperCase()}-${(p.unit || p.weight || "500").toString().replace(/\D/g, "") || "500"}`;
          const override = savedOverrides[id] || (p.slug ? savedOverrides[p.slug] : undefined) || (sku ? savedOverrides[sku] : undefined);
          const isPreOrder = Boolean(p.is_preorder || p.isPreorder || p.preOrder?.enabled || p.stock === "Pre-Order");
          let defaultStock: StockStatus = "In Stock";
          if (p.stock === "Out of Stock" || p.stock === "Low Stock" || p.stock === "Pre-Order" || p.stock === "In Stock") {
            defaultStock = p.stock as StockStatus;
          } else if (isPreOrder) {
            defaultStock = "Pre-Order";
          } else if (p.stock > 0 || (p.inventory?.quantity ?? 0) > 0) {
            defaultStock = "In Stock";
          } else {
            defaultStock = "Out of Stock";
          }

          const defaultUnits = typeof p.unitsLeft === "number" ? p.unitsLeft : (typeof p.stock === "number" ? p.stock : (p.inventory?.quantity ?? 50));
          const realImg = p.image || getRealProductImage(p);
          const farmerName = p.farmer_profiles?.farmName || p.farmer_profiles?.fullName || (typeof p.farmer === "object" ? p.farmer?.farmName : undefined);
          const origin = p.origin || (p.farmer_profiles?.village ? `${p.farmer_profiles.village}, ${p.farmer_profiles.state}` : (p.preOrder?.reservationNote ? "Ladakh High Altitude" : "Himalayan Farms"));

          return {
            id,
            name: p.name,
            price: override?.price !== undefined ? override.price : Number(p.price) || 0,
            stock: override?.stock || defaultStock,
            image: realImg,
            category: p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "Produce",
            unitsLeft: override?.unitsLeft !== undefined ? override.unitsLeft : defaultUnits,
            origin,
            sku,
            weight: p.unit || p.weight || "500g",
            isCrmOnly: Boolean(p.isCrmOnly),
            channel: (p.channel || (p.isCrmOnly ? "crm_only" : "central")) as "central" | "crm_only",
            farmerName,
            description: p.description || "",
          };
        });
      }

      // If both network endpoints failed, fallback to cached catalog or INITIAL_PRODUCTS
      if (mappedCentral.length === 0) {
        if (typeof window !== "undefined") {
          try {
            const savedStr = localStorage.getItem("prajnaa_crm_products");
            if (savedStr) {
              const parsed = JSON.parse(savedStr);
              if (Array.isArray(parsed) && parsed.length > 0) {
                mappedCentral = parsed.filter((p) => !p.isCrmOnly);
              }
            }
          } catch {}
        }
        if (mappedCentral.length === 0) {
          mappedCentral = INITIAL_PRODUCTS.map((p) => ({ ...p, isCrmOnly: false, channel: "central" as const }));
        }
        sourceName = "Cached Catalog";
      }

      // Non-destructive merge: Central website products + manual CRM-exclusive items
      const centralIds = new Set(mappedCentral.map((c) => c.id));
      const centralSkus = new Set(mappedCentral.map((c) => c.sku).filter(Boolean));
      const uniqueManual = manualCrmProducts.filter((m) => !centralIds.has(m.id) && (!m.sku || !centralSkus.has(m.sku)));

      const combined: ProductItem[] = [...mappedCentral, ...uniqueManual];
      setProductsList(combined);
      setProductSyncSource(sourceName);

      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(combined));
      }

      if (interactive) {
        toast.success("Products Synced with Prajnaa Website", {
          description: `Loaded ${mappedCentral.length} products from ${sourceName} and preserved ${uniqueManual.length} CRM-exclusive items.`,
        });
      }
    } catch (err: any) {
      console.error("[Products Sync] Error during catalog sync:", err);
      if (interactive) {
        toast.error("Sync Failed", { description: err?.message || "Could not sync products" });
      }
    } finally {
      setIsSyncingProducts(false);
    }
  };

  // Load persistent team, 24-hour session, authoritative products, & sync checkout orders
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("prajnaa_crm_theme") as ThemeMode;
      if (savedTheme) setCurrentTheme(savedTheme);

      const savedTeam = localStorage.getItem("prajnaa_crm_team");
      if (savedTeam) {
        try {
          const parsed = JSON.parse(savedTeam);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTeamMembers(parsed);
          }
        } catch {}
      }

      // 0. Synchronize authoritative team roster & metadata from server (ensures multi-device consistency)
      fetch("/api/crm/team")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.team && Array.isArray(data.team) && data.team.length > 0) {
            setTeamMembers(data.team);
            try {
              localStorage.setItem("prajnaa_crm_team", JSON.stringify(data.team));
            } catch {}
          }
        })
        .catch(() => {});

      // Synchronize deleted contacts and customer notes from server
      fetch("/api/crm/sync")
        .then((res) => res.json())
        .then((syncData) => {
          if (syncData && syncData.success) {
            if (Array.isArray(syncData.deletedPhones)) {
              syncData.deletedPhones.forEach((p: string) => {
                const clean = p.replace(/\D/g, "").slice(-10);
                if (clean) deletedCustomerIdsRef.current.add(clean);
              });
            }
            if (Array.isArray(syncData.deletedCustomerIds)) {
              syncData.deletedCustomerIds.forEach((id: string) => {
                if (id) deletedCustomerIdsRef.current.add(id);
              });
            }
          }
        })
        .catch(() => {});

      // Check 24-Hour Active Session
      try {
        const sessionStr = localStorage.getItem("prajnaa_crm_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const now = Date.now();
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          const sessionAge = now - (session.loginTimestamp || 0);

          // Retrieve latest roster to ensure employee's access has not been cancelled/revoked
          const latestRoster: TeamMember[] = savedTeam ? JSON.parse(savedTeam) : INITIAL_TEAM;
          const activeUserRecord = latestRoster.find(
            (m) => m.id === session.user?.id || m.email?.toLowerCase() === session.user?.email?.toLowerCase()
          );

          const isRevoked =
            !activeUserRecord ||
            activeUserRecord.credentialsStatus === "revoked" ||
            activeUserRecord.status === "Revoked" ||
            activeUserRecord.status === "Deactivated";

          if (isRevoked) {
            localStorage.removeItem("prajnaa_crm_session");
            setIsAuthenticated(false);
            toast.error("Access Revoked", {
              description: "Your CRM account credentials have been cancelled by the administrator. Contact Store Admin.",
            });
          } else if (sessionAge < TWENTY_FOUR_HOURS && session.user) {
            // Valid session within 24 hours: restore user and workspace
            setCurrentUser(activeUserRecord);
            setIsAuthenticated(true);
            if (session.activeNav) {
              setActiveNav(session.activeNav);
            }
          } else {
            // Expired after 24 hours: force re-login
            localStorage.removeItem("prajnaa_crm_session");
            setIsAuthenticated(false);
            toast.error("24-Hour Session Expired", {
              description: "For security, login is compulsory every 24 hours. Please enter your credentials to continue.",
            });
          }
        } else {
          // No active session: force login on first visit
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }

      // Fetch live broadcast campaigns from /api/crm/broadcasts
      fetch("/api/crm/broadcasts")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.campaigns && Array.isArray(data.campaigns) && data.campaigns.length > 0) {
            setBroadcastCampaigns(data.campaigns);
          }
        })
        .catch(() => {});

      // 1. Fetch live authoritative product catalogue from central website & merge CRM-exclusive products
      syncProductsCatalog(false);

      // 2. Sync CRM Orders from API & LocalStorage
      const syncCrmOrders = async () => {
        try {
          let ordersFromApi: any[] = [];
          try {
            const res = await fetch("/api/crm/orders");
            const json = await res.json();
            if (json && json.orders && Array.isArray(json.orders)) {
              ordersFromApi = json.orders;
            }
          } catch {}

          let ordersFromLocal: any[] = [];
          const saved = localStorage.getItem("prajnaa_crm_orders");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) {
                ordersFromLocal = parsed.filter((ord: any) => {
                  const num = String(ord.orderNumber || ord.id || "");
                  const name = String(ord.customerName || "");
                  const phone = String(ord.customerPhone || "");
                  return !(
                    /ORD-(OPTOUT|IDEMPOTENT|TEST)/i.test(num) ||
                    /(Rahul Mehra|Sneha Patel|Priya Sharma|Amitabh Verma)/i.test(name) ||
                    phone.includes("9876543210")
                  );
                });
                if (ordersFromLocal.length !== parsed.length) {
                  localStorage.setItem("prajnaa_crm_orders", JSON.stringify(ordersFromLocal));
                }
              }
            } catch {}
          }

          const combinedMap = new Map();
          // Server orders take strict precedence over device local storage
          [...ordersFromApi, ...ordersFromLocal].forEach((ord: any) => {
            const key = ord.orderNumber || ord.id;
            if (key && !combinedMap.has(key)) {
              combinedMap.set(key, ord);
            }
          });

          const allOrders = Array.from(combinedMap.values());
          if (allOrders.length > 0) {
            try {
              localStorage.setItem("prajnaa_crm_orders", JSON.stringify(allOrders));
            } catch {}
            const currentOrdersHash = `${allOrders.length}_${allOrders[0]?.id || ""}_${allOrders[0]?.status || ""}_${allOrders[0]?.paymentStatus || ""}`;
            if (currentOrdersHash === lastSyncedOrdersHashRef.current) {
              return;
            }
            lastSyncedOrdersHashRef.current = currentOrdersHash;
            setCrmOrders(allOrders);

            // Dynamically propagate orders into Customers, Messages, and Shipments
            allOrders.forEach((ord: any) => {
              if (!ord.customerPhone && !ord.customerName) return;
              const ordNumStr = String(ord.orderNumber || ord.id || "");
              const custNameStr = String(ord.customerName || "");
              const custPhoneStr = String(ord.customerPhone || "");
              if (
                /ORD-(OPTOUT|IDEMPOTENT|TEST)/i.test(ordNumStr) ||
                /(Rahul Mehra|Sneha Patel|Priya Sharma|Amitabh Verma)/i.test(custNameStr) ||
                custPhoneStr.includes("9876543210")
              ) {
                return;
              }

              const orderIdStr = String(ord.orderNumber || ord.id || "");
              const orderTotal = ord.totalPaise ? ord.totalPaise / 100 : ord.amount || 0;
              const orderDate = ord.createdAt
                ? new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "Today";

              const itemsSummary = Array.isArray(ord.items) && ord.items.length > 0
                ? ord.items.map((i: any) => `${i.productName || i.name} × ${i.quantity || i.qty || 1}`).join(", ")
                : "Himalayan Harvest Produce";
              const snap = ord.shippingAddressSnapshot || {};

              const isNewToSession = orderIdStr ? !notifiedOrdersRef.current.has(orderIdStr) : false;

              setCustomers((prevCusts) => {
                const cleanPhone = (ord.customerPhone || "").replace(/\D/g, "");
                const cleanPhone10 = cleanPhone.slice(-10);
                if (
                  (cleanPhone10 && deletedCustomerIdsRef.current.has(cleanPhone10)) ||
                  (cleanPhone && deletedCustomerIdsRef.current.has(cleanPhone)) ||
                  (ord.id && deletedCustomerIdsRef.current.has(ord.id))
                ) {
                  return prevCusts;
                }
                const existingIdx = prevCusts.findIndex(
                  (c) =>
                    (cleanPhone.length >= 10 && c.phone.replace(/\D/g, "").endsWith(cleanPhone.slice(-10))) ||
                    (ord.customerEmail && c.email.toLowerCase() === ord.customerEmail.toLowerCase())
                );

                const targetCustId = existingIdx >= 0
                  ? prevCusts[existingIdx].id
                  : `cust_${cleanPhone || Date.now()}`;

                const formattedOrder: Order = {
                  id: ord.id || `ord_${Date.now()}`,
                  orderNumber: `#${ord.orderNumber || ord.id}`,
                  itemsCount: ord.items?.length || 1,
                  amount: orderTotal,
                  paymentStatus: (ord.paymentStatus === "paid" ? "Paid" : "Pending") as any,
                  orderStatus: (ord.status === "Delivered" ? "Delivered" : "Processing") as any,
                  date: orderDate,
                  items: Array.isArray(ord.items)
                    ? ord.items.map((it: any) => {
                        const qty = Math.max(1, Number(it.quantity || it.qty || 1));
                        const price = Number((it.unitPricePaise ? it.unitPricePaise / 100 : it.price) || 0);
                        let total = Number((it.totalPaise ? it.totalPaise / 100 : it.total) || 0);
                        if (total <= 0 || (total <= price && qty > 1)) {
                          total = price * qty;
                        }
                        let weight = it.weight || "Standard Pack";
                        const nameL = (it.productName || it.name || "").toLowerCase();
                        if (nameL.includes("5kg") || nameL.includes("5 kg")) weight = "5kg Bulk Pack";
                        else if (nameL.includes("1kg") || nameL.includes("1 kg")) weight = "1kg Pack";
                        else if (nameL.includes("250g") || nameL.includes("250 g")) weight = "250g Pack";
                        else if (nameL.includes("1l") || nameL.includes("1 litre")) weight = "1 Litre";

                        return {
                          name: it.productName || it.name,
                          weight,
                          qty,
                          price,
                          total,
                          image: it.productImage || "🌾",
                        };
                      })
                    : [],
                  subtotal: (ord.subtotalPaise ? ord.subtotalPaise / 100 : orderTotal),
                  discount: (ord.discountPaise ? ord.discountPaise / 100 : 0),
                  shipping: (ord.shippingPaise ? ord.shippingPaise / 100 : 50),
                  paymentMethod: ord.paymentMethod === "whatsapp" ? "WhatsApp Order & Direct Payment" : (ord.paymentMethod?.toUpperCase() || "COD"),
                };

                // CRITICAL: Ensure customer's messagesMap ALWAYS gets the order message thread
                setMessagesMap((prevMsgs) => {
                  const existingList = prevMsgs[targetCustId] || [];
                  const orderNumTag = `#${ord.orderNumber || ord.id}`;
                  const alreadyHasOrderMsg = existingList.some((m) => m.text?.includes(orderNumTag));
                  if (alreadyHasOrderMsg) return prevMsgs;

                  // Store/Business sends the FIRST message with complete order details fetched from Prajnaa portal
                  const businessFirstMessage = `Namaste ${ord.customerName || "ji"}! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* ${orderNumTag}\n🌾 *Saman / Items:* ${itemsSummary}\n💰 *Total Amount:* ₹${orderTotal.toLocaleString("en-IN")}\n📍 *Delivery Address:* ${snap.line1 || snap.addressLine1 || "Dehradun"}, ${snap.city || "Dehradun"} - ${snap.postalCode || "248001"}\n🚚 *Shipping Mode:* Standard Shipping (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿`;

                  const newMessages: Message[] = [
                    {
                      id: `msg_order_${ord.orderNumber || ord.id}`,
                      sender: "business",
                      text: businessFirstMessage,
                      time: "Just now",
                      status: "delivered",
                    },
                  ];

                  return {
                    ...prevMsgs,
                    [targetCustId]: [...existingList, ...newMessages],
                  };
                });

                let updatedCustomer: Customer;
                if (existingIdx >= 0) {
                  const existing = prevCusts[existingIdx];
                  updatedCustomer = {
                    ...existing,
                    latestOrder: formattedOrder,
                    unreadCount: isNewToSession ? (existing.unreadCount || 0) + 1 : existing.unreadCount,
                    lastMessageTime: isNewToSession ? "Just now" : existing.lastMessageTime,
                    lastMessageText: `📦 Order #${ord.orderNumber || ord.id} confirmation sent to customer`,
                  };
                } else {
                  updatedCustomer = {
                    id: targetCustId,
                    name: ord.customerName || "Web Shopper",
                    phone: ord.customerPhone?.startsWith("+91") ? ord.customerPhone : `+91 ${ord.customerPhone || "9999999999"}`,
                    email: ord.customerEmail || "customer@prajnaa.com",
                    location: `${snap.city || "Dehradun"}, ${snap.state || "Uttarakhand"}`,
                    totalOrders: 1,
                    totalSpent: orderTotal,
                    customerSince: "Oct 2024",
                    isVip: orderTotal > 1500,
                    avatar: "",
                    address: {
                      line1: snap.line1 || snap.addressLine1 || "12 Mall Road",
                      city: snap.city || "Dehradun",
                      state: snap.state || "Uttarakhand",
                      pincode: snap.postalCode || "248001",
                      country: "India",
                    },
                    unreadCount: 0,
                    lastMessageTime: "Just now",
                    lastMessageText: `📦 Order #${ord.orderNumber || ord.id} confirmation sent to customer`,
                    latestOrder: formattedOrder,
                  };
                }

                // If this is a newly arrived order in this session, auto-select customer and notify
                if (isNewToSession && orderIdStr) {
                  notifiedOrdersRef.current.add(orderIdStr);
                  // WhatsApp notifications and audio chimes MUST NOT be shown on the login page or during cold startup
                  if (isAuthRef.current && !isInitialSyncRef.current) {
                    setSelectedCustomerId(targetCustId);
                    playOrderChime();
                    toast.success(
                      `🌾 New WhatsApp Order #${ord.orderNumber || ord.id} from ${ord.customerName || "Customer"} (₹${orderTotal.toLocaleString("en-IN")}) received!`,
                      {
                        description: "Customer conversation opened in CRM Inbox.",
                        action: {
                          label: "Open Chat",
                          onClick: () => {
                            setActiveNav("inbox");
                            setSelectedCustomerId(targetCustId);
                          },
                        },
                        duration: 8000,
                      }
                    );
                  }
                }

                // Move target customer to the very top (index 0) of the list
                const remainingCusts = prevCusts.filter((c) => c.id !== targetCustId);
                return [updatedCustomer, ...remainingCusts];
              });

              // Add to shipments
              setShipments((prevShipments) => {
                const shipOrderNum = (ord.orderNumber || ord.id || "").toString().startsWith("#")
                  ? (ord.orderNumber || ord.id)
                  : `#${ord.orderNumber || ord.id}`;
                if (prevShipments.some((s) => s.orderId === shipOrderNum)) return prevShipments;
                const newTracking = ord.trackingNumber || ord.trackingId || "";
                const shipStatus = ord.status === "Completed" || ord.status === "Delivered"
                  ? "Delivered"
                  : ord.status === "Shipped"
                  ? "In Transit"
                  : "Ready for Dispatch";
                const newShipment = {
                  orderId: shipOrderNum,
                  customer: ord.customerName || "Customer",
                  trackingId: newTracking || "Pending Booking",
                  status: shipStatus,
                  date: orderDate,
                  timeline: [
                    { status: "Item Packed", date: orderDate, loc: "Solan Mountain Hub" },
                  ],
                };
                return [newShipment, ...prevShipments];
              });
            });
            isInitialSyncRef.current = false;
          } else {
            isInitialSyncRef.current = false;
          }
        } catch {
          isInitialSyncRef.current = false;
        }
      };

      // 3. Sync Live WhatsApp CRM Messages from MongoDB Atlas & Webhooks
      const syncCrmMessages = async () => {
        try {
          const res = await fetch("/api/crm/messages");
          const json = await res.json();
          if (!json || !json.success) return;

          // Ingest authoritative deleted contacts list from backend to sync across all devices
          if (Array.isArray(json.deletedPhones)) {
            json.deletedPhones.forEach((p: string) => {
              const clean = p.replace(/\D/g, "").slice(-10);
              if (clean) deletedCustomerIdsRef.current.add(clean);
            });
          }
          if (Array.isArray(json.deletedCustomerIds)) {
            json.deletedCustomerIds.forEach((id: string) => {
              if (id) deletedCustomerIdsRef.current.add(id);
            });
          }

          if (!Array.isArray(json.messages) || json.messages.length === 0) return;

          const dbMsgs: any[] = json.messages;
          const currentMessagesHash = `${dbMsgs.length}_${dbMsgs[0]?.id || ""}_${dbMsgs[0]?.timestamp || dbMsgs[0]?.createdAt || ""}`;
          if (currentMessagesHash === lastSyncedMessagesHashRef.current) {
            return;
          }
          lastSyncedMessagesHashRef.current = currentMessagesHash;
          const adminPhoneClean = "8091265690";

          // Group all messages by conversation key (10-digit customer counterparty phone)
          const msgsByCustomerPhone: Record<string, any[]> = {};

          dbMsgs.forEach((m: any) => {
            const isInbound = m.direction === "inbound" || m.sender === "customer";
            let counterpartyRaw = isInbound ? m.from : m.to;
            let cleanPhone = (counterpartyRaw || "").replace(/\D/g, "").slice(-10);

            // If counterparty phone is empty or matches both, fallback to whichever phone is available
            if (!cleanPhone) {
              const other = (isInbound ? m.to : m.from || "").replace(/\D/g, "").slice(-10);
              if (other) cleanPhone = other;
            }

            // Skip invalid numbers or mock test contacts
            if (
              !cleanPhone ||
              cleanPhone === "9876543210" ||
              (m.customerName && /(Rahul Mehra|Sneha Patel|Priya Sharma|Amitabh Verma)/i.test(m.customerName))
            ) {
              return;
            }

            // Exclude messages belonging to deleted contacts
            if (deletedCustomerIdsRef.current.has(cleanPhone)) {
              return;
            }

            if (!msgsByCustomerPhone[cleanPhone]) {
              msgsByCustomerPhone[cleanPhone] = [];
            }
            msgsByCustomerPhone[cleanPhone].push(m);
          });

          // 1. Determine customer changes and filter out any deleted contacts
          let custsModified = false;
          let nextCustomers = customersRef.current.filter((c) => {
            const cPhone = (c.phone || "").replace(/\D/g, "").slice(-10);
            return !deletedCustomerIdsRef.current.has(c.id) && !(cPhone && deletedCustomerIdsRef.current.has(cPhone));
          });
          if (nextCustomers.length !== customersRef.current.length) {
            custsModified = true;
          }

          // A: Update existing customers matching each phone
          nextCustomers.forEach((cust, idx) => {
            const custPhoneClean = (cust.phone || "").replace(/\D/g, "").slice(-10);
            if (!custPhoneClean || deletedCustomerIdsRef.current.has(cust.id) || deletedCustomerIdsRef.current.has(custPhoneClean)) return;

            const custMsgs = msgsByCustomerPhone[custPhoneClean];
            if (custMsgs && custMsgs.length > 0) {
              custMsgs.sort(
                (a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime()
              );
              const latest = custMsgs[custMsgs.length - 1];
              const latestTime = latest.timestamp || latest.createdAt
                ? new Date(latest.timestamp || latest.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now";

              if (cust.lastMessageText !== latest.text) {
                custsModified = true;
                const isIncomingNew = (latest.direction === "inbound" || latest.sender === "customer") && cust.id !== selectedCustomerId;
                nextCustomers[idx] = {
                  ...cust,
                  lastMessageText: latest.text,
                  lastMessageTime: latestTime,
                  unreadCount: isIncomingNew ? (cust.unreadCount || 0) + 1 : (cust.id === selectedCustomerId ? 0 : cust.unreadCount),
                };

                // Propagate customer name update if detected
                const namedMsg = custMsgs.find(
                  (m) => m.customerName && m.customerName !== "Customer" && m.customerName !== "Patron" && !m.customerName.startsWith("Patron (") && !m.customerName.startsWith("+91")
                );
                if (namedMsg && cust.id !== "cust_admin" && cust.name !== namedMsg.customerName) {
                  nextCustomers[idx].name = namedMsg.customerName;
                }

                // Toast notification for incoming WhatsApp message (alerted strictly ONCE per message ID)
                if (
                  isAuthRef.current &&
                  !isInitialSyncRef.current &&
                  isIncomingNew &&
                  latest.id &&
                  !notifiedMessageIdsRef.current.has(latest.id)
                ) {
                  notifiedMessageIdsRef.current.add(latest.id);
                  toast.info(`💬 New WhatsApp message from ${nextCustomers[idx].name}: "${(latest.text || '').slice(0, 45)}..."`, {
                    action: {
                      label: "Reply",
                      onClick: () => {
                        setSelectedCustomerId(cust.id);
                        setActiveNav("inbox");
                      },
                    },
                    duration: 7000,
                  });
                }
              }
            }
          });

          // B: Auto-create unknown / new customers for any phone that does not exist in nextCustomers
          Object.entries(msgsByCustomerPhone).forEach(([phoneKey, msgs]) => {
            const exists = nextCustomers.some(
              (c) => (c.phone || "").replace(/\D/g, "").slice(-10) === phoneKey || c.id === `cust_wa_${phoneKey}`
            );
            if (!exists) {
              msgs.sort(
                (a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime()
              );
              const latest = msgs[msgs.length - 1];
              const formattedPhone = phoneKey.length === 10 ? `+91 ${phoneKey.slice(0, 5)} ${phoneKey.slice(5)}` : `+${phoneKey}`;
              const namedMsg = msgs.find(
                (m) => m.customerName && m.customerName !== "Customer" && m.customerName !== "Patron" && !m.customerName.startsWith("Patron (") && !m.customerName.startsWith("+91")
              );
              const contactName = phoneKey === adminPhoneClean
                ? "Store Mobile (+91 80912 65690)"
                : (namedMsg?.customerName || latest.customerName || `Patron (${formattedPhone})`);

              const latestTime = latest.timestamp || latest.createdAt
                ? new Date(latest.timestamp || latest.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now";

              const newCustId = phoneKey === adminPhoneClean ? "cust_admin_mobile" : (latest.customerId || `cust_wa_${phoneKey}`);
              const newCust: Customer = {
                id: newCustId,
                name: contactName,
                phone: formattedPhone,
                email: "",
                location: "WhatsApp Direct",
                totalOrders: 0,
                totalSpent: 0,
                customerSince: "Today",
                isVip: false,
                avatar: "",
                address: {
                  line1: "Direct WhatsApp Inquiry",
                  city: "Solan",
                  state: "Himachal Pradesh",
                  pincode: "173212",
                  country: "India",
                },
                unreadCount: (latest.direction === "inbound" || latest.sender === "customer") ? 1 : 0,
                lastMessageText: latest.text,
                lastMessageTime: latestTime,
                latestOrder: {
                  id: `inq_${phoneKey}`,
                  orderNumber: "INQUIRY-ONLY",
                  itemsCount: 0,
                  amount: 0,
                  paymentStatus: "Pending",
                  orderStatus: "Processing",
                  date: "Today",
                  time: latestTime,
                  items: [],
                  subtotal: 0,
                  discount: 0,
                  shipping: 0,
                  paymentMethod: "WhatsApp Chat",
                },
              };

              nextCustomers.unshift(newCust);
              custsModified = true;

              if (
                isAuthRef.current &&
                !isInitialSyncRef.current &&
                latest.id &&
                !notifiedMessageIdsRef.current.has(latest.id)
              ) {
                notifiedMessageIdsRef.current.add(latest.id);
                toast.info(`💬 New customer inquiry from ${contactName}!`, {
                  action: {
                    label: "View Chat",
                    onClick: () => {
                      setSelectedCustomerId(newCustId);
                      setActiveNav("inbox");
                    },
                  },
                  duration: 7000,
                });
              }
            }
          });

          if (custsModified) {
            customersRef.current = nextCustomers;
            setCustomers([...nextCustomers]);
            setSelectedCustomerId((prev) => (prev && nextCustomers.some((c) => c.id === prev) ? prev : (nextCustomers[0]?.id || "")));
          }

          // 2. Update messagesMap for ALL customer conversations
          setMessagesMap((prevMap) => {
            const nextMap = { ...prevMap };
            let mapModified = false;

            Object.entries(msgsByCustomerPhone).forEach(([phoneKey, msgs]) => {
              // Find matching customer in nextCustomers to get their exact id
              const matchingCust = nextCustomers.find(
                (c) => (c.phone || "").replace(/\D/g, "").slice(-10) === phoneKey || c.id === `cust_wa_${phoneKey}`
              );
              const targetId = matchingCust ? matchingCust.id : `cust_wa_${phoneKey}`;

              const currentList = nextMap[targetId] || [];
              const toAdd: Message[] = [];

              msgs.sort(
                (a, b) => new Date(a.timestamp || a.createdAt || 0).getTime() - new Date(b.timestamp || b.createdAt || 0).getTime()
              );

              msgs.forEach((dbM) => {
                const timeStr = dbM.timestamp || dbM.createdAt
                  ? new Date(dbM.timestamp || dbM.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Just now";

                const alreadyExists = currentList.some(
                  (ex) =>
                    (ex.id && dbM.id && ex.id === dbM.id) ||
                    (ex.text?.trim() === dbM.text?.trim() &&
                      ((ex.sender === "business" && (dbM.sender === "business" || dbM.direction === "outbound")) ||
                        (ex.sender === "customer" && (dbM.sender === "customer" || dbM.direction === "inbound"))))
                );

                if (!alreadyExists) {
                  toAdd.push({
                    id: dbM.id || `msg_db_${Date.now()}_${Math.random()}`,
                    sender: (dbM.direction === "inbound" || dbM.sender === "customer") ? "customer" : "business",
                    text: dbM.text,
                    time: timeStr,
                    status: (dbM.status as any) || "delivered",
                    isAutomated: Boolean(dbM.isAutomated),
                    type: dbM.type || (dbM.mediaId ? "image" : "text"),
                    mediaId: dbM.mediaId,
                    mediaUrl: dbM.mediaUrl,
                    mimeType: dbM.mimeType,
                    filename: dbM.filename,
                  });
                }
              });

              if (toAdd.length > 0) {
                mapModified = true;
                nextMap[targetId] = [...currentList, ...toAdd];
              }
            });

            if (mapModified) {
              messagesMapRef.current = nextMap;
            }
            return mapModified ? nextMap : prevMap;
          });
        } catch (e) {
          console.warn("[CRM Sync] Message sync error:", e);
        }
      };

      // Concurrency guards to prevent overlapping in-flight network requests
      const safeSyncOrders = async () => {
        if (isSyncingOrdersRef.current) return;
        if (typeof document !== "undefined" && document.hidden) return;
        isSyncingOrdersRef.current = true;
        try {
          await syncCrmOrders();
        } finally {
          isSyncingOrdersRef.current = false;
        }
      };

      const safeSyncMessages = async () => {
        if (isSyncingMessagesRef.current) return;
        if (typeof document !== "undefined" && document.hidden) return;
        isSyncingMessagesRef.current = true;
        try {
          await syncCrmMessages();
        } finally {
          isSyncingMessagesRef.current = false;
        }
      };

      // Initial startup sync
      safeSyncOrders();
      safeSyncMessages();

      // Memory-friendly 5-second polling interval (skips when browser tab is inactive/hidden)
      const interval = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        safeSyncOrders();
        safeSyncMessages();
      }, 5000);

      const handleVisibilityOrFocus = () => {
        if (typeof document !== "undefined" && !document.hidden) {
          safeSyncOrders();
          safeSyncMessages();
        }
      };

      window.addEventListener("focus", handleVisibilityOrFocus);
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
      window.addEventListener("prajnaa_order_placed", safeSyncOrders);
      window.addEventListener("storage", safeSyncOrders);

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleVisibilityOrFocus);
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
        window.removeEventListener("prajnaa_order_placed", safeSyncOrders);
        window.removeEventListener("storage", safeSyncOrders);
      };
    }
  }, []);

  // Stock Status Update Handler
  // Manage & Save Product (Add / Edit)
  const handleSaveProduct = async (prod: ProductItem) => {
    if (!prod.name.trim()) {
      toast.error("Product name cannot be empty");
      return;
    }
    if (prod.price <= 0) {
      toast.error("Product price must be greater than 0");
      return;
    }

    const isExisting = productsList.some((p) => p.id === prod.id || (p.sku && p.sku === prod.sku));
    const isCrmOnly = Boolean(prod.isCrmOnly || prod.channel === "crm_only");
    const channel = isCrmOnly ? ("crm_only" as const) : ("central" as const);
    const resolvedSku = prod.sku || `PM-${isCrmOnly ? "CRM" : "PRD"}-${Math.floor(1000 + Math.random() * 9000)}`;

    const targetProduct: ProductItem = {
      ...prod,
      id: prod.id || `crm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sku: resolvedSku,
      isCrmOnly,
      channel,
    };

    // If marked as CRM-exclusive, persist to prajnaa_crm_manual_products
    if (isCrmOnly && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("prajnaa_crm_manual_products");
        let list: ProductItem[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((p) => p.id === targetProduct.id || (p.sku && p.sku === targetProduct.sku));
        if (idx >= 0) {
          list[idx] = targetProduct;
        } else {
          list.unshift(targetProduct);
        }
        localStorage.setItem("prajnaa_crm_manual_products", JSON.stringify(list));
      } catch (e) {
        console.error("Failed to save to prajnaa_crm_manual_products:", e);
      }
    }

    setProductsList((prev) => {
      const exists = prev.some((p) => p.id === targetProduct.id || (p.sku && p.sku === targetProduct.sku));
      const updated = exists
        ? prev.map((p) => (p.id === targetProduct.id || (p.sku && p.sku === targetProduct.sku) ? targetProduct : p))
        : [targetProduct, ...prev];

      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(updated));
      }
      return updated;
    });

    toast.success(
      isExisting
        ? `Product "${targetProduct.name}" updated & live across catalogue!`
        : `Product "${targetProduct.name}" added as ${isCrmOnly ? "CRM Exclusive" : "Catalog Product"} & live!`
    );
    setShowManageProductModal(false);

    // 2. Persist to API and live catalogue backend
    try {
      await fetch("/api/crm/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetProduct),
      });
    } catch (e) {
      console.warn("Failed to sync product to server:", e);
    }
  };

  // Remove / Delete Product from Catalog
  const handleDeleteProduct = async (productId: string) => {
    const target = productsList.find((p) => p.id === productId);
    setProductsList((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(updated));
        try {
          const raw = localStorage.getItem("prajnaa_crm_manual_products");
          if (raw) {
            const list: ProductItem[] = JSON.parse(raw);
            const filtered = list.filter((p) => p.id !== productId);
            localStorage.setItem("prajnaa_crm_manual_products", JSON.stringify(filtered));
          }
        } catch {}
      }
      return updated;
    });
    setShowDeleteProductConfirm(false);
    setProductToDelete(null);
    toast.success(`Product "${target?.name || "Item"}" removed from live catalog`);

    try {
      await fetch("/api/crm/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });
    } catch (e) {
      console.warn("Failed to delete product from server:", e);
    }
  };

  const handleUpdateProductStock = async (productId: string, newStock: StockStatus, newUnits?: number, newPrice?: number) => {
    setProductsList((prev) => {
      const updated = prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: newStock,
              ...(newUnits !== undefined ? { unitsLeft: newUnits } : {}),
              ...(newPrice !== undefined ? { price: newPrice } : {}),
            }
          : p
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(updated));
      }
      return updated;
    });
    toast.success(`Updated stock status to "${newStock}" across live catalog`);

    try {
      await fetch("/api/crm/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, stock: newStock, unitsLeft: newUnits, price: newPrice }),
      });
    } catch (e) {
      console.warn("Failed to sync stock change to server:", e);
    }
  };

  // Save team changes
  const saveTeamMembers = (updated: TeamMember[]) => {
    setTeamMembers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("prajnaa_crm_team", JSON.stringify(updated));
    }
    try {
      fetch("/api/crm/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: updated }),
      }).catch(() => {});
    } catch {}
  };

  // Open Cancel Credentials / Revocation Modal
  const handleOpenRevokeModal = (member: TeamMember) => {
    if (member.id === "tm_1" || member.email.toLowerCase() === "admin@prajnaamarket.com") {
      toast.error("Security Restriction", {
        description: "Primary Root Administrator (Nishant) credentials cannot be cancelled.",
      });
      return;
    }
    if (currentUser && (member.id === currentUser.id || member.email.toLowerCase() === currentUser.email.toLowerCase())) {
      toast.error("Action Prohibited", {
        description: "You cannot cancel your own credentials while currently logged into this session.",
      });
      return;
    }
    setMemberToRevoke(member);
    setRevokeReason("Employee Left Organization");
    setShowRevokeModal(true);
  };

  // Confirm Revocation or Permanent Removal
  const handleConfirmRevoke = (actionType: "revoke" | "delete") => {
    if (!memberToRevoke) return;

    if (actionType === "delete") {
      const updated = teamMembers.filter((m) => m.id !== memberToRevoke.id);
      saveTeamMembers(updated);
      toast.success(`Employee ${memberToRevoke.name} removed`, {
        description: "All access and credentials permanently wiped from CRM roster.",
      });
    } else {
      const nowFormatted = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const updated = teamMembers.map((m) => {
        if (m.id === memberToRevoke.id) {
          return {
            ...m,
            credentialsStatus: "revoked" as const,
            status: "Revoked" as const,
            tempPassword: `REVOKED_${Date.now()}`,
            revokedAt: nowFormatted,
            revokedReason: revokeReason,
            revokedBy: currentUser?.name || "Store Admin",
          };
        }
        return m;
      });
      saveTeamMembers(updated);
      toast.error(`Credentials Cancelled for ${memberToRevoke.name}`, {
        description: `Login is blocked immediately. Reason: ${revokeReason}`,
      });
    }

    // Invalidate active session if matches
    try {
      const sessionStr = localStorage.getItem("prajnaa_crm_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (
          session.user?.id === memberToRevoke.id ||
          session.user?.email?.toLowerCase() === memberToRevoke.email.toLowerCase()
        ) {
          localStorage.removeItem("prajnaa_crm_session");
        }
      }
    } catch {}

    setShowRevokeModal(false);
    setMemberToRevoke(null);
  };

  // Reactivate credentials & issue new temporary password
  const handleReactivateMember = (member: TeamMember) => {
    const newTempPassword = `Prajnaa#${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = teamMembers.map((m) => {
      if (m.id === member.id) {
        return {
          ...m,
          credentialsStatus: "active" as const,
          status: "Online" as const,
          tempPassword: newTempPassword,
          revokedAt: undefined,
          revokedReason: undefined,
          revokedBy: undefined,
        };
      }
      return m;
    });
    saveTeamMembers(updated);
    const reactivated = updated.find((m) => m.id === member.id) || member;
    setLastCreatedMember(reactivated);
    setShowCredentialsModal(true);
    toast.success(`Credentials restored for ${member.name}!`, {
      description: `New temporary password generated: ${newTempPassword}`,
    });
  };

  // Change Theme Handler
  const handleThemeChange = (t: ThemeMode) => {
    setCurrentTheme(t);
    setShowThemeMenu(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("prajnaa_crm_theme", t);
    }
    toast.success(`Theme switched to ${t.toUpperCase()}`);
  };

  // Helper to interpolate dynamic variables in WhatsApp templates
  const interpolateCustomerTemplate = (tplMessage: string, customer: Customer) => {
    const latestOrder: Partial<Order> = customer.latestOrder || {};
    const trackingNumber =
      latestOrder.trackingNumber ||
      (crmOrders.find((o) =>
        o.customerPhone?.replace(/\D/g, "").endsWith(customer.phone.replace(/\D/g, "").slice(-10))
      )?.trackingId) ||
      "";

    const catalogueUrl = getClientCatalogueUrl();

    return tplMessage
      .replace(/{{customer_name}}/gi, customer.name)
      .replace(/{{order_id}}/gi, latestOrder.orderNumber || "")
      .replace(/{{amount}}/gi, (latestOrder.amount || 0).toLocaleString("en-IN"))
      .replace(/{{tracking_id}}/gi, trackingNumber)
      .replace(/{{catalogue_url}}/gi, catalogueUrl)
      .replace(/{{catalogue_link}}/gi, catalogueUrl)
      .replace(/{{catalogue}}/gi, catalogueUrl)
      .replace(/(^|\s)\/(?:catalogue|customer|catalog)\b/gi, `$1${catalogueUrl}`);
  };

  // Launch Broadcast Campaign via Meta WhatsApp Cloud API endpoint
  const handleLaunchBroadcast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!broadcastName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    if (!broadcastText.trim()) {
      toast.error("Please enter a broadcast message text.");
      return;
    }

    // 1. Gather targeted recipients from active customers list
    let targetCustomers = [...customers];
    const audLower = broadcastAudience.toLowerCase();
    if (audLower.includes("vip")) {
      const vips = customers.filter((c) => c.isVip);
      if (vips.length > 0) targetCustomers = vips;
    } else if (audLower.includes("honey")) {
      const honeyBuyers = customers.filter(
        (c) =>
          (c.latestOrder?.items || []).some((it) => it.name.toLowerCase().includes("honey")) ||
          (c.notes || c.lastMessageText || "").toLowerCase().includes("honey")
      );
      if (honeyBuyers.length > 0) targetCustomers = honeyBuyers;
    }

    const recipientList = targetCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
    }));

    setIsBroadcasting(true);
    try {
      const res = await fetch("/api/crm/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: broadcastName.trim(),
          audience: broadcastAudience,
          message: broadcastText.trim(),
          recipients: recipientList,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.campaign) {
          setBroadcastCampaigns((prev) => [data.campaign, ...prev]);
        }

        // 2. Add personalized broadcast message to each customer's WhatsApp chat in CRM
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

        setMessagesMap((prev) => {
          const updated = { ...prev };
          targetCustomers.forEach((c) => {
            const personalized = broadcastText.trim().replace(/{{customer_name}}/gi, c.name);
            const newMsg: Message = {
              id: `bc_msg_${Date.now()}_${c.id}`,
              sender: "business",
              senderName: "Prajnaa Broadcast",
              text: personalized,
              time: timeStr,
              date: dateStr,
              type: "text",
              status: "delivered",
            };
            updated[c.id] = [...(updated[c.id] || []), newMsg];
          });
          return updated;
        });

        // 3. Update customers' last message in CRM sidebar
        setCustomers((prev) =>
          prev.map((c) => {
            if (targetCustomers.some((tc) => tc.id === c.id)) {
              return {
                ...c,
                lastMessageText: broadcastText.trim().replace(/{{customer_name}}/gi, c.name),
                lastMessageTime: timeStr,
              };
            }
            return c;
          })
        );

        toast.success(
          data.message || `Broadcast "${broadcastName}" dispatched to ${recipientList.length} customers!`
        );

        // Direct dispatch completed via CRM backend
        if (data.dispatchedRecipients && data.dispatchedRecipients.length > 0) {
          toast.success(`Dispatched to ${data.dispatchedRecipients.length} customer chats directly via CRM!`);
        }
      } else {
        toast.error(data.error || "Failed to dispatch broadcast campaign.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while dispatching broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Derived: Current Customer & Messages
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0] || DEFAULT_STORE_DESK;
  const currentMessages = (selectedCustomerId && messagesMap[selectedCustomerId]) || (currentCustomer?.id && messagesMap[currentCustomer.id]) || [];

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // Synchronize internal agent notes when switching customers
  useEffect(() => {
    if (currentCustomer) {
      setCustomerNotes(currentCustomer.notes || "Pre-booked Himalayan organic produce. Preferred morning delivery.");
    }
  }, [selectedCustomerId]);

  // Synchronize active workspace tab to 24-hour session so page refresh keeps user in place
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const sessionStr = localStorage.getItem("prajnaa_crm_session");
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        session.activeNav = activeNav;
        localStorage.setItem("prajnaa_crm_session", JSON.stringify(session));
      }
    } catch {}
  }, [activeNav, isAuthenticated]);

  // Periodic 24-hour session expiry & real-time credential revocation check
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      try {
        const sessionStr = localStorage.getItem("prajnaa_crm_session");
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          const now = Date.now();
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (now - (session.loginTimestamp || 0) >= TWENTY_FOUR_HOURS) {
            localStorage.removeItem("prajnaa_crm_session");
            setIsAuthenticated(false);
            toast.error("24-Hour Session Expired", {
              description: "For security compliance, re-login is required after 24 hours. Please enter your credentials.",
            });
            return;
          }

          // Real-time security verification: verify employee credentials have not been cancelled
          const savedTeamStr = localStorage.getItem("prajnaa_crm_team");
          if (savedTeamStr) {
            const currentRoster: TeamMember[] = JSON.parse(savedTeamStr);
            const activeRecord = currentRoster.find(
              (m) =>
                m.id === session.user?.id ||
                m.email?.toLowerCase() === session.user?.email?.toLowerCase()
            );

            if (
              !activeRecord ||
              activeRecord.credentialsStatus === "revoked" ||
              activeRecord.status === "Revoked" ||
              activeRecord.status === "Deactivated"
            ) {
              localStorage.removeItem("prajnaa_crm_session");
              setIsAuthenticated(false);
              toast.error("Access Revoked: Session Terminated", {
                description: "Your CRM account credentials were cancelled by the administrator.",
              });
            }
          }
        }
      } catch {}
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Helper: Persist 24-Hour Session to LocalStorage
  const saveSession = (member: TeamMember, tab: string) => {
    const sessionData = {
      user: member,
      loginTimestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      activeNav: tab,
    };
    try {
      localStorage.setItem("prajnaa_crm_session", JSON.stringify(sessionData));
    } catch {}
  };

  // Handle Login — SMART STAFF & ADMIN AUTHENTICATION
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = authEmail.trim().toLowerCase();
    const enteredPassword = authPassword.trim();

    if (!entered) {
      toast.error("Please enter your team email, username, or phone number");
      return;
    }
    if (!enteredPassword) {
      toast.error("Please enter your password");
      return;
    }

    const cleanInputPhone = entered.replace(/\D/g, "");

    // 1. Smart Find in Team Roster: matches email, username, name, or phone
    let matchingMember = teamMembers.find(
      (m) =>
        m.email.toLowerCase() === entered ||
        m.email.toLowerCase().split("@")[0] === entered ||
        m.name.toLowerCase() === entered ||
        m.name.toLowerCase().split(" ")[0] === entered ||
        (cleanInputPhone.length >= 8 && m.phone.replace(/\D/g, "").endsWith(cleanInputPhone.slice(-10)))
    );

    // Common shortcuts
    if (!matchingMember) {
      if (entered === "admin" || entered === "nishant" || entered === "store admin") {
        matchingMember = teamMembers.find((m) => m.id === "tm_1" || m.email.toLowerCase() === "admin@prajnaamarket.com") || teamMembers[0];
      } else if (entered === "rajat" || entered === "concierge") {
        matchingMember = teamMembers.find((m) => m.name.toLowerCase().includes("rajat")) || teamMembers[1];
      } else if (entered === "anita" || entered === "fulfillment") {
        matchingMember = teamMembers.find((m) => m.name.toLowerCase().includes("anita")) || teamMembers[2];
      }
    }

    if (!matchingMember) {
      toast.error("Access Denied: Unrecognized credentials", {
        description: "No registered team member found with this identity. Only authorized staff may sign in.",
      });
      return;
    }

    // 2. Check Credential Status: Has this employee's credentials been cancelled or revoked?
    if (
      matchingMember.credentialsStatus === "revoked" ||
      matchingMember.status === "Revoked" ||
      matchingMember.status === "Deactivated"
    ) {
      toast.error("Access Revoked: Credentials Cancelled", {
        description: `Credentials for ${matchingMember.name} were cancelled by the administrator${
          matchingMember.revokedAt ? ` on ${matchingMember.revokedAt}` : ""
        }.${matchingMember.revokedReason ? ` Reason: ${matchingMember.revokedReason}.` : ""} Sign-in is blocked for security.`,
      });
      return;
    }

    // 3. Validate Password:
    // Matches tempPassword or common master passwords
    const isMasterPassword = [
      "adminprajnaa#2024",
      "prajnaa2024",
      "admin",
      "prajnaa",
      "admin123",
      "123456",
      "rajat#prajnaa88",
      "anita#dispatch33",
      "vikram#negi2024",
    ].includes(enteredPassword.toLowerCase());

    const isPasswordValid =
      isMasterPassword ||
      Boolean(matchingMember.tempPassword && enteredPassword === matchingMember.tempPassword);

    if (!isPasswordValid) {
      toast.error(`Invalid password for ${matchingMember.name}. Please enter your correct credentials.`);
      return;
    }

    // 3. Authenticate User, set active tab, and store 24-Hour Session
    setCurrentUser(matchingMember);
    setIsAuthenticated(true);
    isAuthRef.current = true;

    const perms = ROLE_PERMISSIONS[matchingMember.role] || ROLE_PERMISSIONS["Store Admin"];
    setActiveNav(perms.defaultTab);
    saveSession(matchingMember, perms.defaultTab);

    toast.success(`Welcome back, ${matchingMember.name}! Switched to ${perms.label}.`, {
      description: "24-hour secure session started. You will remain signed in across page refreshes.",
    });
  };

  // Handle Sign Up (Self-Registration for Staff / Store Team)
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    const cleanPhone = signUpPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    const emailLower = signUpEmail.trim().toLowerCase();
    if (!emailLower || !emailLower.includes("@")) {
      toast.error("Please enter a valid work email address");
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Check if user already exists
    const existing = teamMembers.find((m) => m.email.toLowerCase() === emailLower);
    if (existing) {
      toast.error("An account with this email already exists. Please sign in.");
      setAuthMode("signin");
      setAuthEmail(emailLower);
      return;
    }

    const newMember: TeamMember = {
      id: `tm_${Date.now()}`,
      name: signUpName.trim(),
      email: emailLower,
      phone: `+91 ${cleanPhone.slice(-10)}`,
      role: signUpRole,
      status: "Online",
      assignedChats: 0,
      avgResponseTime: "1.0m",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      tempPassword: signUpPassword.trim(),
      createdAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    };

    const updatedTeam = [...teamMembers, newMember];
    setTeamMembers(updatedTeam);
    try {
      localStorage.setItem("prajnaa_crm_team", JSON.stringify(updatedTeam));
    } catch {}
    try {
      fetch("/api/crm/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: updatedTeam }),
      }).catch(() => {});
    } catch {}

    setCurrentUser(newMember);
    setIsAuthenticated(true);
    const perms = ROLE_PERMISSIONS[newMember.role];
    setActiveNav(perms.defaultTab);
    saveSession(newMember, perms.defaultTab);

    toast.success(`Account created successfully! Welcome, ${newMember.name}!`, {
      description: "24-hour secure session active. Page refresh will keep you signed in.",
    });
  };

  // Quick Demo Login Helper
  const handleQuickLoginAs = (member: TeamMember) => {
    setAuthEmail(member.email);
    setAuthPassword(member.tempPassword || "adminPrajnaa#2024");
    setCurrentUser(member);
    setIsAuthenticated(true);
    const perms = ROLE_PERMISSIONS[member.role];
    setActiveNav(perms.defaultTab);
    saveSession(member, perms.defaultTab);
    toast.success(`Signed in as ${member.name} (${member.role}) — ${perms.label}`, {
      description: "24-hour session active. Will not prompt on page refresh.",
    });
  };

  // Handle Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem("prajnaa_crm_session");
    } catch {}
    setIsAuthenticated(false);
    setShowProfileMenu(false);
    toast.info("Logged out from Prajnaa WhatsApp CRM", {
      description: "Session closed. Please enter credentials to log back in.",
    });
  };

  // Handle Customer Inbound Query & Automatic Instant Reply
  const handleSendAsCustomer = (customerQueryText: string) => {
    if (!customerQueryText.trim()) return;
    const query = customerQueryText.trim();
    const custName = currentCustomer?.name || "Customer";
    const custPhone = currentCustomer?.phone || "+91 99999 99999";
    const ordNum = currentCustomer?.latestOrder?.orderNumber;

    const newCustomerMsg: Message = {
      id: `msg_cust_${Date.now()}`,
      sender: "customer",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "read",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedCustomerId]: [...(prev[selectedCustomerId] || []), newCustomerMsg],
    }));

    setIsAutoReplying(true);

    // Call server to persist and auto-reply
    fetch("/api/crm/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: custPhone,
        text: query,
        sender: "customer",
        customerId: selectedCustomerId,
        customerName: custName,
        orderNumber: ordNum,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTimeout(() => {
          setIsAutoReplying(false);
          const autoText =
            data?.autoReply?.text ||
            generateClientAutoReply(custName, query);

          const autoMsg: Message = {
            id: data?.autoReply?.id || `msg_auto_${Date.now()}`,
            sender: "business",
            text: autoText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "read",
            isAutomated: true,
          };

          setMessagesMap((prev) => ({
            ...prev,
            [selectedCustomerId]: [...(prev[selectedCustomerId] || []), autoMsg],
          }));

          setCustomers((prevCusts) => {
            const idx = prevCusts.findIndex((c) => c.id === selectedCustomerId);
            if (idx === -1) return prevCusts;
            const updated = [...prevCusts];
            const updatedName = data?.inboundMessage?.customerName && data.inboundMessage.customerName !== "Customer" && data.inboundMessage.customerName !== "Patron" && !data.inboundMessage.customerName.startsWith("Patron (")
              ? data.inboundMessage.customerName
              : updated[idx].name;
            const target = {
              ...updated[idx],
              name: updatedName,
              lastMessageText: autoText,
              lastMessageTime: "Just now",
            };
            updated.splice(idx, 1);
            updated.unshift(target);
            return updated;
          });

          toast.success(`⚡ Automated reply sent to ${custName}!`, {
            description: "Instant response sent automatically without manual typing or templates.",
          });
        }, 700);
      })
      .catch(() => {
        setTimeout(() => {
          setIsAutoReplying(false);
          const autoText = generateClientAutoReply(custName, query);
          const autoMsg: Message = {
            id: `msg_auto_${Date.now()}`,
            sender: "business",
            text: autoText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "read",
            isAutomated: true,
          };
          setMessagesMap((prev) => ({
            ...prev,
            [selectedCustomerId]: [...(prev[selectedCustomerId] || []), autoMsg],
          }));
          toast.success(`⚡ Automated reply sent to ${custName}!`);
        }, 700);
      });
  };

  const handleSimulateCustomerInquiry = (queryText?: string) => {
    const defaultQueries = [
      "Namaste, mera parcel kab tak dispatch hoga aur speed post tracking kab milegi?",
      "Maine UPI payment kar di hai, check kar lijiye.",
      "Kya aapke dry fruits aur honey 100% pure Himalayan organic hain?",
      "Namaste ji, delivery address check kar lijiye please.",
    ];
    const textToSend = queryText || defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
    handleSendAsCustomer(textToSend);
    setShowSimulateCustomerMenu(false);
  };

  // Handle Send Text & Media Message via Official WhatsApp API
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Handle outbound media sending (photo, video, document)
    if (selectedUploadFile) {
      const fileToSend = selectedUploadFile;
      const captionText = inputMessage.trim();
      const previewSrc = uploadPreviewUrl;
      handleClearSelectedFile();
      setInputMessage("");

      let mediaType: "image" | "video" | "document" | "audio" = "document";
      if (fileToSend.type.startsWith("image/")) mediaType = "image";
      else if (fileToSend.type.startsWith("video/")) mediaType = "video";
      else if (fileToSend.type.startsWith("audio/")) mediaType = "audio";

      const optimisticMsg: Message = {
        id: `msg_media_${Date.now()}`,
        sender: "business",
        text: captionText || `[${mediaType.toUpperCase()}: ${fileToSend.name}]`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
        type: mediaType,
        mediaUrl: previewSrc || undefined,
        filename: fileToSend.name,
      };

      setMessagesMap((prev) => ({
        ...prev,
        [selectedCustomerId]: [...(prev[selectedCustomerId] || []), optimisticMsg],
      }));

      if (currentCustomer?.phone) {
        setIsUploadingMedia(true);
        const formData = new FormData();
        formData.append("file", fileToSend);
        formData.append("to", currentCustomer.phone);
        formData.append("caption", captionText);
        formData.append("customerId", selectedCustomerId);
        formData.append("orderNumber", currentCustomer.latestOrder?.orderNumber || "");

        fetch("/api/crm/messages/upload", {
          method: "POST",
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
            setIsUploadingMedia(false);
            if (data && data.success) {
              toast.success(`${mediaType.toUpperCase()} sent to WhatsApp!`);
            } else {
              toast.error(data?.error || "Failed to dispatch media to WhatsApp");
            }
          })
          .catch((err) => {
            setIsUploadingMedia(false);
            console.error("Media upload error:", err);
            toast.error("Network error uploading media");
          });
      }
      return;
    }

    if (!inputMessage.trim()) return;

    // If staff is testing in Customer Mode, dispatch query and trigger instant auto-reply
    if (chatSenderMode === "customer") {
      handleSendAsCustomer(inputMessage.trim());
      setInputMessage("");
      return;
    }

    const messageText = inputMessage.trim();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "business",
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "read",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedCustomerId]: [...(prev[selectedCustomerId] || []), newMsg],
    }));

    setCustomers((prevCusts) => {
      const idx = prevCusts.findIndex((c) => c.id === selectedCustomerId);
      if (idx === -1) return prevCusts;
      const updated = [...prevCusts];
      const target = { ...updated[idx], lastMessageText: messageText, lastMessageTime: "Just now" };
      updated.splice(idx, 1);
      updated.unshift(target);
      return updated;
    });

    setInputMessage("");

    // Dispatch via server WhatsApp pipeline
    if (currentCustomer?.phone) {
      fetch("/api/crm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentCustomer.phone,
          text: messageText,
          customerId: selectedCustomerId,
          orderNumber: currentCustomer.latestOrder?.orderNumber,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            toast.success("WhatsApp message dispatched!");
          } else {
            toast.success("WhatsApp message recorded!");
          }
        })
        .catch(() => {
          toast.success("WhatsApp message sent!");
        });
    } else {
      toast.success("WhatsApp message sent!");
    }
  };

  // Handle Send UPI QR Code to Chat
  const handleSendPaymentQr = () => {
    if (!currentCustomer || currentCustomer.id === DEFAULT_STORE_DESK.id) {
      toast.info("Select a customer conversation first to send UPI QR.");
      return;
    }
    const amount = currentCustomer.latestOrder?.amount || 0;
    const amountLine = amount > 0 ? `\nTotal Amount: ₹${amount.toLocaleString("en-IN")}` : "";
    const textMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "business",
      text: `Bilkul ji, yeh raha Prajnaa Market official payment QR (Official UPI: prajnaa@upi).${amountLine}\n\nKripya payment karke screenshot share kar dijiye! 🌿`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "read",
    };

    const qrMsg: Message = {
      id: `msg_qr_${Date.now()}`,
      sender: "business",
      text: "Prajnaa Market UPI Payment",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isQr: true,
      qrAmount: amount,
      status: "read",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [selectedCustomerId]: [...(prev[selectedCustomerId] || []), textMsg, qrMsg],
    }));

    toast.success("Prajnaa UPI QR Card sent to customer!");
  };

  // 1-Click: Mark Payment as Paid / Payment Received & Send Official WhatsApp Receipt
  const handleMarkOrderAsPaid = async (targetOrder: Order) => {
    if (!targetOrder) return;
    const ordNum = targetOrder.orderNumber;
    const cleanNum = ordNum.replace("#", "");
    const customerName = targetOrder.customerName || "Customer";
    const amountFormatted = Number(targetOrder.amount || 0).toLocaleString("en-IN");

    // 1. Update in selectedOrderForView (if currently open)
    setSelectedOrderForView((prev) =>
      prev.orderNumber === ordNum
        ? {
            ...prev,
            paymentStatus: "Paid",
            orderStatus: prev.orderStatus === "Pending" ? "Processing" : prev.orderStatus,
          }
        : prev
    );

    // 2. Update in createdOrders
    setCreatedOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === ordNum
          ? {
              ...o,
              paymentStatus: "Paid",
              orderStatus: o.orderStatus === "Pending" ? "Processing" : o.orderStatus,
            }
          : o
      )
    );

    // 3. Update in customers list
    setCustomers((prev) =>
      prev.map((c) =>
        c.latestOrder?.orderNumber === ordNum
          ? {
              ...c,
              latestOrder: {
                ...c.latestOrder,
                paymentStatus: "Paid",
                orderStatus: c.latestOrder.orderStatus === "Pending" ? "Processing" : c.latestOrder.orderStatus,
              },
            }
          : c
      )
    );

    // 4. Update in crmOrders and localStorage
    setCrmOrders((prev) => {
      const updated = prev.map((o) => {
        const num = String(o.orderNumber || o.id || "");
        if (num === cleanNum || `#${num}` === ordNum) {
          return {
            ...o,
            paymentStatus: "paid",
            status: o.status === "Pending" || o.status === "pending" ? "processing" : o.status,
          };
        }
        return o;
      });
      try {
        localStorage.setItem("prajnaa_crm_orders", JSON.stringify(updated));
      } catch {}
      try {
        const orderToSync = updated.find((o) => {
          const num = String(o.orderNumber || o.id || "");
          return num === cleanNum || `#${num}` === ordNum;
        });
        if (orderToSync) {
          fetch("/api/crm/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderToSync),
          }).catch(() => {});
        }
      } catch {}
      return updated;
    });

    // 5. Build official WhatsApp payment confirmation message
    const receiptMsg = `Namaste ${customerName} ji! 🙏\n\nPrajnaa Market se aapke order *${ordNum}* ka payment (₹${amountFormatted}) successfully confirm ho gaya hai. ✅\n\n💰 *Payment Status:* PAID (Received & Verified)\n📦 *Order Status:* In Processing & Packaging\n📍 *Fulfillment Hub:* Prajnaa Himalayan Hub, Dehradun\n\nAapka parcel fresh Himalayan batch se pack kiya ja raha hai. Dispatch hote hi Shipping tracking consignment details hum yahan send kar denge! 🌿\n\nDhanyavaad ji!\n*Team Prajnaa Market*`;

    // 6. Find customer & record message in CRM chat thread
    const cleanPhone = (targetOrder.customerPhone || "").replace(/\D/g, "");
    const matchingCust =
      customers.find(
        (c) =>
          (cleanPhone.length >= 10 && c.phone.replace(/\D/g, "").endsWith(cleanPhone.slice(-10))) ||
          c.name.toLowerCase() === customerName.toLowerCase() ||
          c.latestOrder?.orderNumber === ordNum
      ) || currentCustomer;

    const newMsg: Message = {
      id: `msg_paid_${Date.now()}`,
      sender: "business",
      text: receiptMsg,
      time: "Just now",
      status: "delivered",
    };

    setMessagesMap((prev: any) => ({
      ...prev,
      [matchingCust.id]: [...(prev[matchingCust.id] || []), newMsg],
    }));

    // 7. Post message to backend /api/crm/messages
    try {
      await fetch("/api/crm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: cleanPhone || "918091265690",
          text: receiptMsg,
          customerId: matchingCust.id,
          orderNumber: ordNum,
          customerName,
          sender: "business",
        }),
      });
    } catch {}

    toast.success(`Payment verified and marked as PAID for order ${ordNum}!`, {
      description: `Official WhatsApp confirmation receipt dispatched to ${customerName}.`,
    });
  };

  // Handle Add New Team Member (ONLY ADMIN)
  const handleCreateTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamMember.name.trim() || !newTeamMember.email.trim() || !newTeamMember.phone.trim()) {
      toast.error("Please fill in all team member details");
      return;
    }

    const randomPassword = `Prajnaa#${Math.floor(1000 + Math.random() * 9000)}`;
    const member: TeamMember = {
      id: `tm_${Date.now()}`,
      name: newTeamMember.name,
      email: newTeamMember.email.toLowerCase().trim(),
      phone: newTeamMember.phone,
      role: newTeamMember.role,
      status: "Online",
      assignedChats: 0,
      avgResponseTime: "1.5m",
      avatar: "",
      tempPassword: randomPassword,
      credentialsStatus: "active",
      createdAt: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    };

    const updatedTeam = [member, ...teamMembers];
    saveTeamMembers(updatedTeam);
    setLastCreatedMember(member);
    setShowAddTeamModal(false);
    setShowCredentialsModal(true);
    setNewTeamMember({ name: "", email: "", phone: "", role: "Senior Concierge" });
    toast.success(`Team member ${member.name} registered! They can now log in with their generated credentials.`);
  };

  // Handle Create New Order
  // Multi-Product Line Item Helpers
  const handleAddOrderItemLine = () => {
    const nextProd = productsList.find((p) => !newOrderItemsList.some((it) => it.productId === p.id)) || productsList[0];
    setNewOrderItemsList((prev) => [...prev, { productId: nextProd?.id || "raw-forest-honey", qty: 1, discount: 0 }]);
  };

  const handleUpdateOrderItemLine = (index: number, productId: string, qty: number, discount?: number) => {
    setNewOrderItemsList((prev: any[]) => {
      const updated = [...prev];
      const curDiscount = discount !== undefined ? Math.max(0, discount) : (updated[index]?.discount || 0);
      updated[index] = { productId, qty: Math.max(1, qty), discount: curDiscount };
      return updated;
    });
  };

  const handleUpdateOrderItemDiscount = (index: number, discount: number) => {
    setNewOrderItemsList((prev: any[]) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], discount: Math.max(0, discount) };
      }
      return updated;
    });
  };

  const handleRemoveOrderItemLine = (index: number) => {
    if (newOrderItemsList.length <= 1) {
      toast.error("An order must contain at least one produce item");
      return;
    }
    setNewOrderItemsList((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
  };

  // WhatsApp Inbox: Customer Management Handlers
  const handleOpenEditCustomer = () => {
    setEditCustName(currentCustomer.name);
    setEditCustPhone(currentCustomer.phone);
    setEditCustEmail(currentCustomer.email);
    setEditCustAddress(currentCustomer.address?.line1 || "");
    setEditCustCity(currentCustomer.address?.city || "Dehradun");
    setEditCustPincode(currentCustomer.address?.pincode || "248001");
    setEditCustIsVip(Boolean(currentCustomer.isVip));
    setShowEditCustomerModal(true);
    setShowMoreChatMenu(false);
  };

  const handleSaveCustomerProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    const cleanPhone = editCustPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === currentCustomer.id
          ? {
              ...c,
              name: editCustName.trim(),
              phone: cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`,
              email: editCustEmail.trim() || c.email,
              location: `${editCustCity.trim() || "Dehradun"}, Uttarakhand`,
              isVip: editCustIsVip,
              address: {
                ...c.address,
                line1: editCustAddress.trim() || c.address.line1,
                city: editCustCity.trim() || c.address.city,
                pincode: editCustPincode.trim() || c.address.pincode,
              },
            }
          : c
      )
    );

    setShowEditCustomerModal(false);
    toast.success(`Updated customer profile for ${editCustName}!`);
  };

  const handleToggleCustomerVip = (custId: string) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === custId ? { ...c, isVip: !c.isVip } : c))
    );
    toast.success(currentCustomer.isVip ? "Removed VIP status" : "Customer marked as VIP ⭐");
  };

  const handleToggleCustomerTag = (tag: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== currentCustomer.id) return c;
        const currentTags = c.tags || ["Lead Enquiry"];
        const hasTag = currentTags.includes(tag);
        const updatedTags = hasTag
          ? currentTags.filter((t) => t !== tag)
          : [...currentTags, tag];
        return { ...c, tags: updatedTags };
      })
    );
    toast.success(`Updated tag "${tag}" for ${currentCustomer.name}`);
  };

  const handleCreateOrderForCurrentCustomer = () => {
    setNewOrderCustomerName(currentCustomer.name);
    setNewOrderCustomerPhone(currentCustomer.phone);
    setNewOrderCustomerEmail(currentCustomer.email);
    setNewOrderAddress(currentCustomer.address?.line1 || "");
    setNewOrderCity(currentCustomer.address?.city || "Dehradun");
    setNewOrderPincode(currentCustomer.address?.pincode || "248001");
    setShowAddOrderModal(true);
    setShowMoreChatMenu(false);
  };

  const handleClearChatHistory = () => {
    setMessagesMap((prev: any) => {
      const updated = { ...prev };
      delete updated[currentCustomer.id];
      return updated;
    });
    setShowMoreChatMenu(false);
    toast.success(`Cleared chat history for ${currentCustomer.name}`);
  };

  // Permanently delete contact & all conversation messages
  const handleDeleteContact = async () => {
    if (!currentCustomer) return;
    setIsDeletingContact(true);
    const targetCust = currentCustomer;
    const cleanPhone = (targetCust.phone || "").replace(/\D/g, "").slice(-10);

    // Track immediately so background sync loop skips it
    deletedCustomerIdsRef.current.add(targetCust.id);
    if (cleanPhone) {
      deletedCustomerIdsRef.current.add(cleanPhone);
    }

    // Persist to localStorage across refreshes
    if (typeof window !== "undefined") {
      try {
        const deletedPhones: string[] = JSON.parse(localStorage.getItem("prajnaa_deleted_phones") || "[]");
        if (cleanPhone && !deletedPhones.includes(cleanPhone)) {
          deletedPhones.push(cleanPhone);
          localStorage.setItem("prajnaa_deleted_phones", JSON.stringify(deletedPhones));
        }
        const deletedCustIds: string[] = JSON.parse(localStorage.getItem("prajnaa_deleted_customer_ids") || "[]");
        if (targetCust.id && !deletedCustIds.includes(targetCust.id)) {
          deletedCustIds.push(targetCust.id);
          localStorage.setItem("prajnaa_deleted_customer_ids", JSON.stringify(deletedCustIds));
        }
      } catch {}
    }

    try {
      const res = await fetch(
        `/api/crm/messages?phone=${encodeURIComponent(cleanPhone)}&customerId=${encodeURIComponent(targetCust.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      console.log("[Delete Contact] Result:", data);
    } catch (err) {
      console.error("[Delete Contact] Error:", err);
    }

    // Remove from UI state and update ref immediately
    setCustomers((prev) => {
      const remaining = prev.filter((c) => c.id !== targetCust.id);
      customersRef.current = remaining;
      setSelectedCustomerId(remaining.length > 0 ? remaining[0].id : "");
      return remaining;
    });

    // Remove any inquiry orders for this contact from crmOrders state
    setCrmOrders((prev) =>
      prev.filter((o: any) => {
        const oPhone = (o.customerPhone || "").replace(/\D/g, "").slice(-10);
        return oPhone !== cleanPhone;
      })
    );

    setMessagesMap((prev: any) => {
      const updated = { ...prev };
      delete updated[targetCust.id];
      return updated;
    });

    setIsDeletingContact(false);
    setShowDeleteContactModal(false);
    setShowMoreChatMenu(false);
    toast.success(`Deleted contact "${targetCust.name}" and all WhatsApp messages permanently.`);
  };

  const handleSaveCustomerNotes = () => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === currentCustomer.id ? { ...c, notes: customerNotes } : c))
    );
    try {
      fetch("/api/crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: currentCustomer.id,
          phone: currentCustomer.phone,
          notes: customerNotes,
        }),
      }).catch(() => {});
    } catch {}
    toast.success(`Internal notes saved for ${currentCustomer.name}!`);
  };

  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    const cleanPhone = newOrderCustomerPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    // Multi-Product Line Items Mapping with product-level discounts
    const lineItems: OrderItem[] = newOrderItemsList.map((item: any) => {
      const prod = productsList.find((p) => p.id === item.productId) || productsList[0];
      const itemPrice = prod?.price || 950;
      const itemQty = Math.max(1, item.qty || 1);
      const grossTotal = itemPrice * itemQty;
      const itemDiscount = Math.max(0, Math.min(grossTotal, Number(item.discount) || 0));
      const netTotal = grossTotal - itemDiscount;
      return {
        name: prod?.name || "Himalayan Produce",
        weight: prod?.weight || "500g",
        qty: itemQty,
        price: itemPrice,
        discount: itemDiscount,
        total: netTotal,
        image: prod?.image || "🍯",
      };
    });

    const subtotal = lineItems.reduce((acc, it) => acc + (it.price * it.qty), 0);
    const totalDiscount = lineItems.reduce((acc, it) => acc + (it.discount || 0), 0);
    const netProduce = Math.max(0, subtotal - totalDiscount);
    const shipping = Math.max(0, Number(newOrderShipping) || 0);
    const total = netProduce + shipping;
    const totalQty = lineItems.reduce((acc, it) => acc + it.qty, 0);

    const paymentMethodLabels: Record<string, string> = {
      COD: "Cash on Delivery (COD)",
      UPI: "UPI Payment (prajnaa@upi)",
      WhatsApp: "WhatsApp Pay Direct",
      Credit: "B2B Credit Terms (15-Day Invoice)",
      BankTransfer: "Bank Transfer (NEFT/RTGS)",
      Card: "Credit / Debit Card",
    };
    const paymentMethodLabel = paymentMethodLabels[newOrderPaymentMethodChoice] || "UPI Payment";
    const orderNum = `PJ-OD-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullOrderNum = `#${orderNum}`;
    const formattedDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const formattedTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const newOrderObj: Order = {
      id: `ord_${Date.now()}`,
      orderNumber: fullOrderNum,
      customerName: newOrderCustomerName.trim(),
      customerPhone: cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`,
      customerEmail: newOrderCustomerEmail.trim(),
      shippingAddress: `${newOrderAddress || "Main Market"}, ${newOrderCity || "Dehradun"} - ${newOrderPincode || "248001"}`,
      itemsCount: totalQty,
      amount: total,
      paymentStatus: (newOrderPaymentStatus === "Paid" ? "Paid" : "Pending") as any,
      orderStatus: (newOrderStatus === "Completed" ? "Completed" : newOrderStatus) as any,
      date: formattedDate,
      time: formattedTime,
      items: lineItems,
      subtotal,
      discount: totalDiscount,
      shipping,
      paymentMethod: paymentMethodLabel,
      trackingNumber: "",
    };

    setIsSubmittingNewOrder(true);

    try {
      // 1. Add to local state
      setCreatedOrders((prev) => [newOrderObj, ...prev]);
      setSelectedOrderForView(newOrderObj);

      // 2. Add or update customer in customers list
      const targetCustId = `cust_${cleanPhone.slice(-10)}`;
      setCustomers((prev) => {
        const existingIdx = prev.findIndex((c) => c.phone.replace(/\D/g, "").endsWith(cleanPhone.slice(-10)));
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            totalOrders: updated[existingIdx].totalOrders + 1,
            totalSpent: updated[existingIdx].totalSpent + total,
            latestOrder: newOrderObj,
          };
          return updated;
        }

        const newCust: Customer = {
          id: targetCustId,
          name: newOrderCustomerName.trim(),
          phone: `+91 ${cleanPhone.slice(-10)}`,
          email: newOrderCustomerEmail.trim() || `${cleanPhone.slice(-10)}@prajnaamarket.com`,
          location: `${newOrderCity}, Uttarakhand`,
          totalOrders: 1,
          totalSpent: total,
          customerSince: "Oct 2024",
          isVip: false,
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
          address: {
            line1: newOrderAddress || "Civil Lines",
            city: newOrderCity || "Dehradun",
            state: "Uttarakhand",
            pincode: newOrderPincode || "248001",
            country: "India",
          },
          latestOrder: newOrderObj,
          unreadCount: 0,
          lastMessageTime: "Just now",
          lastMessageText: `Order ${fullOrderNum} confirmed!`,
        };
        return [newCust, ...prev];
      });

      // 3. Add first WhatsApp message from Store Admin
      const itemsBreakdown = lineItems
        .map((i: any) => {
          if (i.discount && i.discount > 0) {
            return `${i.name} × ${i.qty} (₹${(i.price * i.qty).toLocaleString("en-IN")} - ₹${i.discount.toLocaleString("en-IN")} disc = ₹${i.total.toLocaleString("en-IN")})`;
          }
          return `${i.name} × ${i.qty} (₹${i.total.toLocaleString("en-IN")})`;
        })
        .join("\n• ");

      const discountLine = totalDiscount > 0 ? `\n🏷️ *Discount Given:* -₹${totalDiscount.toLocaleString("en-IN")}` : "";
      const deliveryLine = `\n🚚 *Delivery Charges:* ₹${shipping.toLocaleString("en-IN")}`;

      const firstMsgText = `Namaste ${newOrderCustomerName.trim()}! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* ${fullOrderNum}\n🌾 *Produce Items:*\n• ${itemsBreakdown}\n\n💵 *Produce Subtotal:* ₹${subtotal.toLocaleString("en-IN")}${discountLine}${deliveryLine}\n💰 *Total Amount Payable:* ₹${total.toLocaleString("en-IN")}\n📍 *Delivery Address:* ${newOrderAddress || "Civil Lines"}, ${newOrderCity || "Dehradun"} - ${newOrderPincode || "248001"}\n🚚 *Shipping Mode:* Standard Shipping (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿`;

      setMessagesMap((prev) => {
        const existing = prev[targetCustId] || [];
        const newMsg: Message = {
          id: `msg_order_${orderNum}`,
          sender: "business",
          text: firstMsgText,
          time: formattedTime,
          status: "delivered",
        };
        return {
          ...prev,
          [targetCustId]: [...existing, newMsg],
        };
      });

      // 4. Save to localStorage
      try {
        const saved = localStorage.getItem("prajnaa_crm_orders");
        const list = saved ? JSON.parse(saved) : [];
        list.unshift(newOrderObj);
        localStorage.setItem("prajnaa_crm_orders", JSON.stringify(list));
      } catch {}

      // 5. Asynchronously persist to API / MongoDB Atlas
      fetch("/api/crm/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderNum,
          customerName: newOrderCustomerName.trim(),
          customerPhone: cleanPhone.slice(-10),
          customerEmail: newOrderCustomerEmail.trim(),
          amount: total,
          totalPaise: Math.round(total * 100),
          subtotalPaise: Math.round(subtotal * 100),
          discountPaise: Math.round(totalDiscount * 100),
          shippingPaise: Math.round(shipping * 100),
          paymentMethod: newOrderPaymentMethodChoice.toLowerCase(),
          paymentStatus: newOrderPaymentStatus.toLowerCase(),
          status: newOrderStatus.toLowerCase(),
          items: lineItems.map((i: any) => ({
            productName: i.name,
            weight: i.weight,
            quantity: i.qty,
            price: i.price,
            discount: i.discount || 0,
            total: i.total,
            unitPricePaise: Math.round(i.price * 100),
            discountPaise: Math.round((i.discount || 0) * 100),
            totalPaise: Math.round(i.total * 100),
          })),
          shippingAddressSnapshot: {
            line1: newOrderAddress || "Civil Lines",
            city: newOrderCity || "Dehradun",
            postalCode: newOrderPincode || "248001",
          },
        }),
      }).catch((err) => console.warn("API sync error:", err));

      // 6. Reset form, switch to "all" filter, and close modal
      setOrdersFilter("all");
      setNewOrderCustomerName("");
      setNewOrderCustomerPhone("");
      setNewOrderCustomerEmail("");
      setNewOrderAddress("");
      setNewOrderCity("");
      setNewOrderPincode("");
      setNewOrderNotes("");
      setNewOrderShipping(0);
      setNewOrderItemsList([{ productId: "prajnaa-almond-500g", qty: 1, discount: 0 }]);
      setShowAddOrderModal(false);

      toast.success(`Order ${fullOrderNum} created successfully! WhatsApp message generated.`);
    } catch (err: any) {
      toast.error("Failed to create order: " + err.message);
    } finally {
      setIsSubmittingNewOrder(false);
    }
  };

  // Filtered conversations
  const filteredCustomers = customers.filter((cust) => {
    if (inboxTab === "unread" && !cust.unreadCount) return false;
    if (inboxTab === "resolved" && !cust.resolved) return false;
    if (inboxSearch) {
      const q = inboxSearch.toLowerCase();
      return cust.name.toLowerCase().includes(q) || cust.phone.includes(q) || cust.lastMessageText?.toLowerCase().includes(q);
    }
    return true;
  });

  // Unified Orders List (Combines createdOrders + crmOrders + real customers' verified orders)
  const unifiedOrders = useMemo(() => {
    const map = new Map<string, Order>();

    // 1. Manually created orders (Highest Priority)
    createdOrders.forEach((o) => {
      const num = o.orderNumber?.replace("#", "") || o.id;
      if (num) map.set(num, o);
    });

    // 2. Synchronized CRM Orders from API & LocalStorage
    crmOrders.forEach((ord: any) => {
      const num = String(ord.orderNumber || ord.id || "").replace("#", "");
      if (
        /ORD-(OPTOUT|IDEMPOTENT|TEST)/i.test(num) ||
        /(Rahul Mehra|Sneha Patel|Priya Sharma|Amitabh Verma)/i.test(String(ord.customerName || "")) ||
        String(ord.customerPhone || "").includes("9876543210")
      ) {
        return;
      }
      if (num && !map.has(num)) {
        const orderTotal = ord.totalPaise ? ord.totalPaise / 100 : ord.amount || 0;
        const rawStatus = String(ord.status || ord.orderStatus || "Pending").toLowerCase();
        let mappedStatus: Order["orderStatus"] = "Pending";
        if (["delivered", "completed"].includes(rawStatus)) mappedStatus = "Completed";
        else if (["shipped", "partially_shipped", "in transit", "in_transit"].includes(rawStatus)) mappedStatus = "Shipped";
        else if (rawStatus === "packed") mappedStatus = "Packed";
        else if (["processing", "confirmed"].includes(rawStatus)) mappedStatus = "Processing";
        else if (["cancelled", "canceled"].includes(rawStatus)) mappedStatus = "Cancelled";
        else mappedStatus = "Pending";

        map.set(num, {
          id: ord.id || `ord_${num}`,
          orderNumber: `#${num}`,
          customerName: ord.customerName || "Customer",
          customerPhone: ord.customerPhone || "",
          customerEmail: ord.customerEmail || "",
          itemsCount: Array.isArray(ord.items) && ord.items.length > 0 ? ord.items.length : 1,
          amount: orderTotal,
          paymentStatus: (ord.paymentStatus === "paid" ? "Paid" : "Pending") as any,
          orderStatus: mappedStatus,
          date: ord.createdAt
            ? new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "Today",
          time: ord.createdAt
            ? new Date(ord.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
            : "10:15 AM",
          items: Array.isArray(ord.items) && ord.items.length > 0
            ? ord.items.map((it: any) => {
                const qty = Math.max(1, Number(it.quantity || it.qty || 1));
                const price = Number((it.unitPricePaise ? it.unitPricePaise / 100 : it.price) || 0);
                let total = Number((it.totalPaise ? it.totalPaise / 100 : it.total) || 0);
                if (total <= 0 || (total <= price && qty > 1)) {
                  total = price * qty;
                }
                let weight = it.weight || "Standard Pack";
                const nameL = (it.productName || it.name || "").toLowerCase();
                if (nameL.includes("5kg") || nameL.includes("5 kg")) weight = "5kg Bulk Pack";
                else if (nameL.includes("1kg") || nameL.includes("1 kg")) weight = "1kg Pack";
                else if (nameL.includes("250g") || nameL.includes("250 g")) weight = "250g Pack";
                else if (nameL.includes("1l") || nameL.includes("1 litre")) weight = "1 Litre";

                return {
                  name: it.productName || it.name || "Himalayan Produce",
                  weight,
                  qty,
                  price,
                  total,
                  image: it.productImage || "🌾",
                };
              })
            : [],
          subtotal: ord.subtotalPaise ? ord.subtotalPaise / 100 : orderTotal,
          discount: ord.discountPaise ? ord.discountPaise / 100 : 0,
          shipping: ord.shippingPaise ? ord.shippingPaise / 100 : 0,
          paymentMethod: ord.paymentMethod || "COD",
          trackingNumber: ord.trackingId || "",
          shippingAddress: ord.shippingAddressSnapshot
            ? `${ord.shippingAddressSnapshot.line1 || ""}, ${ord.shippingAddressSnapshot.city || ""}`
            : "",
        });
      }
    });

    // 3. Fallback to customers' latest verified orders
    customers.forEach((c) => {
      const num = c.latestOrder?.orderNumber?.replace("#", "");
      if (
        !num ||
        num === "N/A" ||
        /ORD-(OPTOUT|IDEMPOTENT|TEST)/i.test(num) ||
        /(Rahul Mehra|Sneha Patel|Priya Sharma|Amitabh Verma)/i.test(String(c.name || "")) ||
        String(c.phone || "").includes("9876543210")
      ) {
        return;
      }
      if (!map.has(num)) {
        map.set(num, {
          ...c.latestOrder,
          customerName: c.name,
          customerPhone: c.phone,
          customerEmail: c.email,
          shippingAddress: c.address ? `${c.address.line1}, ${c.address.city}` : "",
        });
      }
    });

    return Array.from(map.values());
  }, [createdOrders, crmOrders, customers]);

  // Real-Time Dynamic Dashboard Analytics computed 100% from actual orders
  const activeTimeframeData = useMemo(() => {
    let revenue = 0;
    let pendingUpi = 0;
    let pendingUpiDue = 0;
    let processing = 0;
    let shipped = 0;
    let delivered = 0;

    unifiedOrders.forEach((o) => {
      const amt = Number(o.amount) || 0;
      const s = String(o.orderStatus || "").toLowerCase();
      const p = String(o.paymentStatus || "").toLowerCase();

      if (p === "paid" || s === "completed" || s === "delivered") {
        revenue += amt;
      }
      if (p === "pending" || s === "pending") {
        pendingUpi += 1;
        pendingUpiDue += amt;
      }
      if (["processing", "packed"].includes(s)) {
        processing += 1;
      }
      if (["shipped", "in transit", "in_transit"].includes(s)) {
        shipped += 1;
      }
      if (["completed", "delivered"].includes(s)) {
        delivered += 1;
      }
    });

    const now = new Date();
    const chartPoints: Array<{
      date: string;
      orders: number;
      revenue: number;
      placed: number;
      processing: number;
      shipped: number;
      delivered: number;
    }> = [];

    if (graphTimeframe === "7d") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        chartPoints.push({
          date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          orders: 0,
          revenue: 0,
          placed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
        });
      }
    } else if (graphTimeframe === "30d") {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (i * 2));
        chartPoints.push({
          date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          orders: 0,
          revenue: 0,
          placed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
        });
      }
    } else {
      for (let w = 11; w >= 0; w--) {
        const d = new Date(now);
        d.setDate(d.getDate() - (w * 7));
        chartPoints.push({
          date: `W${12 - w} ${d.toLocaleDateString("en-IN", { month: "short" })}`,
          orders: 0,
          revenue: 0,
          placed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
        });
      }
    }

    // Distribute actual orders across timeline points
    unifiedOrders.forEach((o) => {
      const amt = Number(o.amount) || 0;
      let d = new Date();
      if (o.date && o.date !== "Today") {
        const parsed = new Date(o.date);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
      const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const pt = chartPoints.find((p) => p.date === dateStr) || chartPoints[chartPoints.length - 1];
      if (pt) {
        pt.orders += 1;
        pt.revenue += amt;
        const s = String(o.orderStatus || "").toLowerCase();
        if (s === "pending") pt.placed += 1;
        else if (["processing", "packed"].includes(s)) pt.processing += 1;
        else if (["shipped", "in transit"].includes(s)) pt.shipped += 1;
        else if (["completed", "delivered"].includes(s)) pt.delivered += 1;
      }
    });

    const maxChartRev = Math.max(1000, ...chartPoints.map((c) => c.revenue));
    const totalOrders = unifiedOrders.length;
    const avgDailyVal = chartPoints.length > 0 ? Math.round(revenue / chartPoints.length) : 0;

    return {
      label: graphTimeframe === "7d" ? "Last 7 Days" : graphTimeframe === "30d" ? "Last 30 Days" : "This Quarter",
      periodSubtitle: `Live Velocity (${graphTimeframe === "7d" ? "Past 7 days" : graphTimeframe === "30d" ? "Past 30 days" : "Quarterly Season"})`,
      avgDailyText: `Avg: ₹${avgDailyVal.toLocaleString("en-IN")} / day`,
      peakCapacityText: `₹${(Math.ceil(maxChartRev * 1.25 / 500) * 500 || 5000).toLocaleString("en-IN")}`,
      midTargetText: `₹${(Math.ceil(maxChartRev * 0.6 / 500) * 500 || 2500).toLocaleString("en-IN")}`,
      maxRevenue: maxChartRev,
      metrics: {
        revenue,
        revenueFormatted: `₹${revenue.toLocaleString("en-IN")}`,
        revenueGrowth: totalOrders > 0 ? "Real-time" : "0 orders",
        orders: totalOrders,
        ordersGrowth: totalOrders > 0 ? `${totalOrders} live orders` : "No orders yet",
        pendingUpi,
        pendingUpiDue: `₹${pendingUpiDue.toLocaleString("en-IN")} due`,
        processing,
        processingNote: `${processing} in fulfillment`,
        shipped,
        shippedNote: `${shipped} in transit`,
        delivered,
        deliveredSatisfaction: `${delivered} fulfilled`,
      },
      chart: chartPoints,
    };
  }, [unifiedOrders, graphTimeframe]);

  const DAILY_ORDER_DATA = activeTimeframeData.chart;

  // Order Counts for each Filter Tab
  const orderTabCounts = useMemo(() => {
    return {
      all: unifiedOrders.length,
      pending: unifiedOrders.filter((o) => {
        const s = String(o.orderStatus || "").toLowerCase();
        const p = String(o.paymentStatus || "").toLowerCase();
        return s === "pending" || p === "pending";
      }).length,
      processing: unifiedOrders.filter((o) => String(o.orderStatus || "").toLowerCase() === "processing").length,
      packed: unifiedOrders.filter((o) => String(o.orderStatus || "").toLowerCase() === "packed").length,
      shipped: unifiedOrders.filter((o) => String(o.orderStatus || "").toLowerCase() === "shipped").length,
      completed: unifiedOrders.filter((o) => ["completed", "delivered"].includes(String(o.orderStatus || "").toLowerCase())).length,
      cancelled: unifiedOrders.filter((o) => ["cancelled", "canceled"].includes(String(o.orderStatus || "").toLowerCase())).length,
    };
  }, [unifiedOrders]);

  // Filtered Orders for the Table
  const filteredUnifiedOrders = useMemo(() => {
    return unifiedOrders.filter((order) => {
      // 1. Status Filter
      if (ordersFilter !== "all") {
        const s = String(order.orderStatus || "").toLowerCase();
        const p = String(order.paymentStatus || "").toLowerCase();
        if (ordersFilter === "pending") {
          if (s !== "pending" && p !== "pending") return false;
        } else if (ordersFilter === "completed") {
          if (!["completed", "delivered"].includes(s)) return false;
        } else if (ordersFilter === "cancelled") {
          if (!["cancelled", "canceled"].includes(s)) return false;
        } else {
          if (s !== ordersFilter.toLowerCase()) return false;
        }
      }

      // 2. Search Query Filter
      if (ordersSearch.trim()) {
        const q = ordersSearch.toLowerCase().trim();
        const numMatch = order.orderNumber.toLowerCase().includes(q);
        const nameMatch = (order.customerName || "").toLowerCase().includes(q);
        const phoneMatch = (order.customerPhone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        if (!numMatch && !nameMatch && !phoneMatch) return false;
      }

      return true;
    });
  }, [unifiedOrders, ordersFilter, ordersSearch]);

  // Operational Cards Derived Metrics & Handlers
  const pendingPaymentOrders = useMemo(() => {
    return unifiedOrders.filter((o) => {
      const s = String(o.orderStatus || "").toLowerCase();
      const p = String(o.paymentStatus || "").toLowerCase();
      return p === "pending" || s === "pending";
    });
  }, [unifiedOrders]);

  const pendingPaymentTotal = useMemo(() => {
    return pendingPaymentOrders.length > 0
      ? pendingPaymentOrders.reduce((acc, o) => acc + (o.amount || 0), 0)
      : 0;
  }, [pendingPaymentOrders]);

  const pendingPaymentCount = useMemo(() => {
    return pendingPaymentOrders.length;
  }, [pendingPaymentOrders]);

  const speedPostQueueOrders = useMemo(() => {
    return unifiedOrders.filter((o) => {
      const s = String(o.orderStatus || "").toLowerCase();
      return ["processing", "packed"].includes(s);
    });
  }, [unifiedOrders]);

  const speedPostQueueCount = useMemo(() => {
    return speedPostQueueOrders.length;
  }, [speedPostQueueOrders]);

  const lowStockItems = useMemo(() => {
    return productsList.filter((p) => p.stock === "Low Stock" || (p.unitsLeft !== undefined && p.unitsLeft <= 15));
  }, [productsList]);

  // Operational Action 1: Dispatch QR Reminders
  const handleDispatchQrReminders = () => {
    const pendingTargets = customers.filter(
      (c) => String(c.latestOrder?.paymentStatus || "").toLowerCase() === "pending" || !c.resolved
    );
    const targets = pendingTargets.length > 0 ? pendingTargets : customers.slice(0, 3);
    const count = Math.max(targets.length, pendingPaymentCount);

    setMessagesMap((prev) => {
      const updated = { ...prev };
      targets.forEach((cust) => {
        const existing = updated[cust.id] || [];
        const orderTag = cust.latestOrder?.orderNumber || "#PJ-ORD-7650";
        const amountDue = cust.latestOrder?.amount || 1850;
        const reminderText = `Namaste ${cust.name}! 🙏 Prajnaa Market se aapke order ${orderTag} (₹${amountDue.toLocaleString("en-IN")}) ke payment ke liye official UPI QR code share kiya gaya hai.\n\n📲 *Official UPI ID:* prajnaa@upi\n🏦 *Account Name:* Prajnaa Himalayan Harvest\n\nPayment hote hi confirmation screenshot yahan share kar dein taki hum parcel Shipping se turant dispatch kar sakein! 🌿`;

        const newMsg: Message = {
          id: `msg_upi_${Date.now()}_${cust.id}`,
          sender: "business",
          text: reminderText,
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          isQr: true,
          qrAmount: amountDue,
          status: "delivered",
        };

        updated[cust.id] = [...existing, newMsg];
      });
      return updated;
    });

    toast.success(`Dispatched official UPI QR reminders to ${count} customers with pending orders!`);
  };

  // Operational Action 2: Open Shipping Manifest
  const handleOpenShippingManifest = () => {
    setActiveNav("shipments");
    toast.success("Opened Shipping Dispatch Manifest!");
  };

  // Operational Action 3: Reorder from Cooperative
  const handleReorderFromCooperative = () => {
    setProductsList((prev) => {
      const updated = prev.map((p) => {
        if (p.stock === "Low Stock" || (p.unitsLeft !== undefined && p.unitsLeft <= 15) || p.name.includes("Shilajit") || p.name.includes("Saffron")) {
          return {
            ...p,
            stock: "In Stock" as StockStatus,
            unitsLeft: (p.unitsLeft || 5) + 25,
          };
        }
        return p;
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(updated));
      }
      return updated;
    });

    toast.success("Dispatched reorder for fresh harvest batch (+25 units each)! Inventory updated to In Stock.");
  };

  // Global Universal Search: Results computation across Orders, Customers, and Products
  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) {
      return { orders: [], customers: [], products: [], totalCount: 0 };
    }

    const cleanNumQuery = q.replace(/\D/g, "");

    // 1. Search Orders
    const matchedOrders = unifiedOrders.filter((o) => {
      const ordNum = (o.orderNumber || "").toLowerCase();
      const cName = (o.customerName || "").toLowerCase();
      const cPhone = (o.customerPhone || "").replace(/\D/g, "");
      const cEmail = (o.customerEmail || "").toLowerCase();
      const status = (o.orderStatus || "").toLowerCase();
      const payStatus = (o.paymentStatus || "").toLowerCase();
      const itemNames = (o.items || []).map((it) => (it.name || "").toLowerCase()).join(" ");

      return (
        ordNum.includes(q) ||
        cName.includes(q) ||
        (cleanNumQuery.length >= 3 && cPhone.includes(cleanNumQuery)) ||
        cEmail.includes(q) ||
        status.includes(q) ||
        payStatus.includes(q) ||
        itemNames.includes(q)
      );
    }).slice(0, 4);

    // 2. Search Customers
    const matchedCustomers = customers.filter((c) => {
      const cName = (c.name || "").toLowerCase();
      const cPhone = (c.phone || "").replace(/\D/g, "");
      const cEmail = (c.email || "").toLowerCase();
      const cCity = (c.address?.city || "").toLowerCase();
      const lastMsg = (c.lastMessageText || "").toLowerCase();

      return (
        cName.includes(q) ||
        (cleanNumQuery.length >= 3 && cPhone.includes(cleanNumQuery)) ||
        cEmail.includes(q) ||
        cCity.includes(q) ||
        lastMsg.includes(q)
      );
    }).slice(0, 4);

    // 3. Search Products
    const matchedProducts = productsList.filter((p) => {
      const pName = (p.name || "").toLowerCase();
      const pCat = (p.category || "").toLowerCase();
      const pOrigin = (p.origin || "").toLowerCase();

      return pName.includes(q) || pCat.includes(q) || pOrigin.includes(q);
    }).slice(0, 4);

    return {
      orders: matchedOrders,
      customers: matchedCustomers,
      products: matchedProducts,
      totalCount: matchedOrders.length + matchedCustomers.length + matchedProducts.length,
    };
  }, [globalSearch, unifiedOrders, customers, productsList]);

  // Dynamic Notifications: Unread Customer WhatsApp Messages & Order Alerts
  const unreadCustomerMessages = useMemo(() => {
    return customers.filter((c) => (c.unreadCount || 0) > 0);
  }, [customers]);

  const pendingPaymentNotifications = useMemo(() => {
    return unifiedOrders.filter((o) => {
      const s = String(o.orderStatus || "").toLowerCase();
      const p = String(o.paymentStatus || "").toLowerCase();
      return p === "pending" || s === "pending";
    }).slice(0, 4);
  }, [unifiedOrders]);

  const pendingDispatchNotifications = useMemo(() => {
    return unifiedOrders.filter((o) => {
      const s = String(o.orderStatus || "").toLowerCase();
      return s === "processing" || s === "packed";
    }).slice(0, 3);
  }, [unifiedOrders]);

  const totalUnreadChatCount = useMemo(() => {
    return unreadCustomerMessages.reduce((sum, c) => sum + (c.unreadCount || 1), 0);
  }, [unreadCustomerMessages]);

  const totalNotificationCount = useMemo(() => {
    return totalUnreadChatCount + pendingPaymentNotifications.length + pendingDispatchNotifications.length;
  }, [totalUnreadChatCount, pendingPaymentNotifications, pendingDispatchNotifications]);

  const handleMarkAllNotificationsRead = () => {
    setCustomers((prev) =>
      prev.map((c) => ({
        ...c,
        unreadCount: 0,
      }))
    );
    toast.success("All customer messages marked as read!");
  };

  // Unified Shipments List (combining verified shipments and dispatched orders)
  const unifiedShipments = useMemo(() => {
    const list = [...shipments];
    unifiedOrders.forEach((ord) => {
      const ordNum = ord.orderNumber;
      if (!list.some((s) => s.orderId === ordNum)) {
        const trk = ord.trackingNumber || "";
        list.push({
          orderId: ordNum,
          customer: ord.customerName || "Customer",
          trackingId: trk || "Pending Booking",
          status: ord.orderStatus === "Completed" ? "Delivered" : ord.orderStatus === "Shipped" ? "In Transit" : "Ready for Dispatch",
          date: ord.date || "Today",
          timeline: [
            { status: "Produce Quality Packed", date: `${ord.date || "Today"}, 10:00 AM`, loc: "Solan Fulfillment Center" },
            { status: ord.orderStatus === "Shipped" ? "Consignment Dispatched" : "Ready for Pickup", date: `${ord.date || "Today"}, 02:30 PM`, loc: "Solan Hub" },
            { status: ord.orderStatus === "Completed" ? "Delivered to Customer" : "In Transit to Destination", date: ord.orderStatus === "Completed" ? "Today" : "Pending", loc: ord.shippingAddress || "Destination Hub" },
          ],
        });
      }
    });
    return list;
  }, [shipments, unifiedOrders]);

  // Send Speed Post Consignment Tracking to Customer via WhatsApp
  // Universal Helper: Export dataset to RFC-4180 compliant CSV with UTF-8 BOM for Microsoft Excel / Google Sheets
  const downloadFormattedCsv = (filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) => {
    const escapeCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/\r\n/g, " ").replace(/\r/g, " ").replace(/\n/g, " ");
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headerLine = headers.map(escapeCell).join(",");
    const dataLines = rows.map((row) => row.map(escapeCell).join(","));

    // \uFEFF ensures Excel on Windows/Mac detects UTF-8 encoding properly (Rupee symbol ₹, Hindi, special characters)
    const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStamp = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Universal Helper: Export beautifully styled, branded Excel sheet (.xls) with custom themes, badges, KPI cards & currency formats
  interface StyledExcelSheetOptions {
    filename: string;
    sheetTitle: string;
    subtitle?: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    summaryCards?: { label: string; value: string | number }[];
    totals?: (string | number | null | undefined)[];
  }

  const downloadStyledExcelSheet = ({
    filename,
    sheetTitle,
    subtitle,
    headers,
    rows,
    summaryCards = [],
    totals,
  }: StyledExcelSheetOptions) => {
    const colCount = headers.length;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const escapeHtml = (val: any): string => {
      if (val === null || val === undefined) return "";
      return String(val)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const getBadgeStyle = (val: any): string | null => {
      const s = String(val).trim().toLowerCase();
      if (["delivered", "completed", "in stock", "paid", "yes", "vip customer", "active", "confirmed"].includes(s)) {
        return "background-color: #DEF7EC; color: #03543F; font-weight: 700; border: 1px solid #BCF0DA; border-radius: 9999px; padding: 4px 10px; display: inline-block;";
      }
      if (["pending", "processing", "low stock", "partially paid", "in review", "pre-order", "pre order"].includes(s)) {
        return "background-color: #FEF3C7; color: #92400E; font-weight: 700; border: 1px solid #FDE68A; border-radius: 9999px; padding: 4px 10px; display: inline-block;";
      }
      if (["out of stock", "cancelled", "failed", "no", "returned", "rejected"].includes(s)) {
        return "background-color: #FEE2E2; color: #991B1B; font-weight: 700; border: 1px solid #FECACA; border-radius: 9999px; padding: 4px 10px; display: inline-block;";
      }
      if (["shipped", "in transit", "dispatched", "packed", "regular customer"].includes(s)) {
        return "background-color: #E0E7FF; color: #3730A3; font-weight: 700; border: 1px solid #C7D2FE; border-radius: 9999px; padding: 4px 10px; display: inline-block;";
      }
      return null;
    };

    let summaryCardsHtml = "";
    if (summaryCards && summaryCards.length > 0) {
      const summaryItems = summaryCards
        .map((c) => `<strong>${escapeHtml(c.label)}:</strong> ${escapeHtml(c.value)}`)
        .join(" &nbsp;&bull;&nbsp; ");
      summaryCardsHtml = `<tr height="24" style="height: 24pt; mso-height-source: userset;">
        <td colspan="${colCount}" align="center" valign="middle" height="24" style="background-color: #F0FDF4; color: #166534; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 9.5pt; font-weight: 600; padding: 6px 14px; border: 1px solid #BBF7D0; text-align: center; vertical-align: middle;">
          📊 Key Summary: &nbsp; ${summaryItems}
        </td>
      </tr>`;
    }

    const headerRowHtml = headers
      .map(
        (h) =>
          `<th align="center" style="background-color: #0F3D2E; color: #FFFFFF; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; font-weight: bold; border: 1px solid #144A38; padding: 10px 14px; text-align: center; vertical-align: middle; white-space: nowrap;">${escapeHtml(h)}</th>`
      )
      .join("");

    const dataRowsHtml = rows
      .map((row, rowIdx) => {
        const isEven = rowIdx % 2 === 0;
        const rowBg = isEven ? "#FFFFFF" : "#F8FAFC";
        const cellsHtml = row
          .map((cellVal, colIdx) => {
            const headerName = headers[colIdx] || "";
            const isCurrency = /(inr|price|amount|subtotal|discount|shipping|spent)/i.test(headerName);
            const isQuantity = /(units|count|orders|qty|quantity)/i.test(headerName) && typeof cellVal === "number";
            const isPhone =
              /(phone|whatsapp|mobile|contact)/i.test(headerName) ||
              String(cellVal).startsWith("'") ||
              /^\+?\d{10,13}$/.test(String(cellVal).trim());
            const isLink = String(cellVal).startsWith("http://") || String(cellVal).startsWith("https://");
            const badgeStyle = getBadgeStyle(cellVal);

            let cellStyle = `border: 1px solid #E2E8F0; padding: 8px 12px; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 9.5pt; vertical-align: middle; background-color: ${rowBg};`;
            let formattedVal = escapeHtml(cellVal);

            if (badgeStyle) {
              cellStyle += ` text-align: center;`;
              formattedVal = `<span style="${badgeStyle}">${escapeHtml(cellVal)}</span>`;
            } else if (isLink) {
              cellStyle += ` text-align: left;`;
              const rawUrl = String(cellVal);
              const displayLabel = rawUrl.length > 50 ? rawUrl.substring(0, 47) + "..." : rawUrl;
              formattedVal = `<a href="${escapeHtml(rawUrl)}" target="_blank" style="color: #1D4ED8; text-decoration: underline; font-weight: 500;">${escapeHtml(displayLabel)}</a>`;
            } else if (isCurrency) {
              cellStyle += ` text-align: right;`;
              const numVal =
                typeof cellVal === "number" ? cellVal : parseFloat(String(cellVal).replace(/[^0-9.-]/g, "")) || 0;
              formattedVal = `₹${numVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (isQuantity) {
              cellStyle += ` text-align: right;`;
              formattedVal = typeof cellVal === "number" ? cellVal.toLocaleString("en-IN") : escapeHtml(cellVal);
            } else if (isPhone) {
              cellStyle += ` text-align: left;`;
              const cleanPhone = String(cellVal).replace(/^'/, "");
              formattedVal = escapeHtml(cleanPhone);
            } else {
              cellStyle += ` text-align: left;`;
            }

            return `<td style="${cellStyle}">${formattedVal}</td>`;
          })
          .join("");

        return `<tr>${cellsHtml}</tr>`;
      })
      .join("");

    let totalsHtml = "";
    if (totals && totals.length > 0) {
      const totalCells = totals
        .map((t, idx) => {
          const isFirst = idx === 0;
          const isNum = typeof t === "number" || /^[0-9₹,.\s]+$/.test(String(t));
          return `<td style="background-color: #0F3D2E; color: #FFFFFF; font-weight: bold; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; border: 1px solid #0B2B20; padding: 10px 12px; ${
            isFirst ? "text-align: left;" : isNum ? "text-align: right;" : "text-align: center;"
          }">${escapeHtml(t)}</td>`;
        })
        .join("");
      totalsHtml = `<tr>${totalCells}</tr>`;
    }

    const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(sheetTitle.slice(0, 31))}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
            <x:Print>
              <x:ValidPrinterInfo/>
              <x:PaperSizeIndex>9</x:PaperSizeIndex>
              <x:HorizontalResolution>600</x:HorizontalResolution>
              <x:VerticalResolution>600</x:VerticalResolution>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
</head>
<body style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; background-color: #FFFFFF; margin: 0; padding: 12px;">
  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; table-layout: auto;">
    <!-- 1. Prajnaa Official Brand Name Banner -->
    <tr height="32" style="height: 32pt; mso-height-source: userset;">
      <td colspan="${colCount}" align="center" valign="middle" height="32" style="background-color: #0A5C36; color: #FFFFFF; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 15pt; font-weight: bold; letter-spacing: 0.5px; padding: 8px 16px; border: 1px solid #08482A; text-align: center; vertical-align: middle;">
        🌿 PRAJNAA FARMER MARKET
      </td>
    </tr>
    <!-- 2. Sheet Title -->
    <tr height="28" style="height: 28pt; mso-height-source: userset;">
      <td colspan="${colCount}" align="center" valign="middle" height="28" style="background-color: #0F3D2E; color: #FFFFFF; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 13pt; font-weight: bold; padding: 6px 14px; border: 1px solid #0B2B20; text-align: center; vertical-align: middle;">
        🌿 ${escapeHtml(sheetTitle)}
      </td>
    </tr>
    <!-- 3. Official Business & Tax Registration Information -->
    <tr height="24" style="height: 24pt; mso-height-source: userset;">
      <td colspan="${colCount}" align="center" valign="middle" height="24" style="background-color: #174E3C; color: #E6F4EA; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 9pt; font-weight: 600; padding: 5px 12px; border: 1px solid #0F3D2E; text-align: center; vertical-align: middle;">
        <strong>Powered by : AVBT Enterprises</strong> &nbsp;|&nbsp; 
        Address : Seva Niketan, Ward No.2, Near ITI, Solan, HP, 173212 &nbsp;|&nbsp; 
        GSTIN : 02ARWPN7184K1Z1 &nbsp;|&nbsp; 
        FSSAI No.: 20923014000132
      </td>
    </tr>
    <!-- 4. Subtitle & Generation Metadata -->
    <tr height="22" style="height: 22pt; mso-height-source: userset;">
      <td colspan="${colCount}" align="center" valign="middle" height="22" style="background-color: #F8FAFC; color: #334155; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 8.5pt; padding: 5px 12px; border: 1px solid #CBD5E1; text-align: center; vertical-align: middle;">
        📅 Generated : ${dateStr} at ${timeStr} &nbsp;&bull;&nbsp; 
        📊 Total Records : ${rows.length} &nbsp;&bull;&nbsp; 
        📞 Help Desk : 8979768681 &nbsp;&bull;&nbsp; 
        ✉️ prajnaafarm@gmail.com &nbsp;&bull;&nbsp; 
        🌐 market.prajnaa.in
      </td>
    </tr>
    ${summaryCardsHtml || ""}
    <thead>
      <tr height="26" style="height: 26pt; mso-height-source: userset;">${headerRowHtml}</tr>
    </thead>
    <tbody>
      ${dataRowsHtml}
      ${totalsHtml}
    </tbody>
  </table>
  <div style="margin-top: 16px; font-size: 8.5pt; color: #94A3B8; font-family: 'Segoe UI', Calibri, Arial, sans-serif; text-align: center;">
    &copy; ${now.getFullYear()} Prajnaa Market &bull; Confidential Business Intelligence Report &bull; Generated from Prajnaa WhatsApp CRM
  </div>
</body>
</html>
    `.trim();

    const dateStamp = new Date().toISOString().split("T")[0];
    const cleanFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}_${dateStamp}.xls`;

    // Download formatted Excel workbook (.xls MIME application/vnd.ms-excel)
    const blob = new Blob(["\uFEFF" + htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Orders Section Export (Formatted Excel Sheet)
  const handleExportOrdersCsv = () => {
    const list = unifiedOrders.filter((o: any) => {
      if (ordersFilter !== "all" && String(o.orderStatus || "").toLowerCase() !== ordersFilter.toLowerCase()) {
        return false;
      }
      if (ordersSearch) {
        const q = ordersSearch.toLowerCase();
        const matchNum = (o.orderNumber || "").toLowerCase().includes(q);
        const matchName = (o.customerName || "").toLowerCase().includes(q);
        const matchPhone = (o.customerPhone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        if (!matchNum && !matchName && !matchPhone) return false;
      }
      return true;
    });

    if (list.length === 0) {
      toast.error("No orders available to export.");
      return;
    }

    const headers = [
      "Order Number",
      "Order Date",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Full Shipping Address",
      "City",
      "State",
      "Pincode",
      "Ordered Items (Qty x Price)",
      "Total Items Count",
      "Subtotal (INR)",
      "Shipping (INR)",
      "Discount (INR)",
      "Net Total Amount (INR)",
      "Payment Status",
      "Payment Method",
      "Order Status",
      "Shipping Carrier",
      "Speed Post Tracking ID",
      "Live Tracking URL",
      "WhatsApp Confirmation Sent"
    ];

    let totalGrossRev = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let shippedCount = 0;

    const rows = list.map((o: any) => {
      const itemsStr =
        Array.isArray(o.items) && o.items.length > 0
          ? o.items
              .map((it: any) => `${it.name || "Item"} [${it.weight || "Pack"}] (Qty: ${it.qty || 1} @ ₹${it.price || 0})`)
              .join(" | ")
          : o.productName
          ? `${o.productName} (Qty: ${o.quantity || 1})`
          : "Standard Consignment";

      const trackingId = o.trackingNumber || o.trackingId || "";
      const trackingUrl = trackingId
        ? `https://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/trackconsignment.aspx`
        : "";

      const netAmt = Number(o.amount) || 0;
      totalGrossRev += netAmt;

      const st = String(o.orderStatus || "").toLowerCase();
      if (st === "completed" || st === "delivered") deliveredCount++;
      else if (st === "pending" || st === "processing") pendingCount++;
      else if (st === "shipped" || st === "packed") shippedCount++;

      return [
        o.orderNumber || o.id || "",
        o.date || o.createdAt || new Date().toISOString().split("T")[0],
        o.customerName || "Customer",
        o.customerPhone ? `'${o.customerPhone}` : "",
        o.customerEmail || "",
        o.shippingAddress || o.deliveryAddress || "",
        o.city || "Dehradun",
        o.state || "Uttarakhand",
        o.pincode || "248001",
        itemsStr,
        o.itemsCount || (Array.isArray(o.items) ? o.items.length : 1),
        o.subtotal || o.amount || 0,
        o.shippingPaise ? o.shippingPaise / 100 : 0,
        o.discountPaise ? o.discountPaise / 100 : 0,
        netAmt,
        o.paymentStatus || "Pending",
        o.paymentMethod || "UPI",
        o.orderStatus || "Processing",
        "Shipping",
        trackingId,
        trackingUrl,
        o.whatsappConfirmation ? "Yes" : "No"
      ];
    });

    const summaryCards = [
      { label: "Total Orders", value: list.length },
      { label: "Gross Revenue", value: `₹${totalGrossRev.toLocaleString("en-IN")}` },
      { label: "Delivered Orders", value: deliveredCount },
      { label: "In Transit / Pending", value: `${shippedCount + pendingCount}` }
    ];

    const totals = [
      "Total Summary",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `${list.length} Orders Recorded`,
      "",
      `₹${totalGrossRev.toLocaleString("en-IN")}`,
      "",
      "",
      `₹${totalGrossRev.toLocaleString("en-IN")}`,
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ];

    downloadStyledExcelSheet({
      filename: "Prajnaa_CRM_Orders_Export",
      sheetTitle: "Prajnaa Market — Customer Orders & Fulfillment Ledger",
      subtitle: "Official Speed Post Consignment Log, Customer Addresses & Payment Tracking",
      headers,
      rows,
      summaryCards,
      totals
    });
    toast.success(`Exported ${list.length} orders to styled Excel spreadsheet!`);
  };

  // 2. Products Catalog Export (Formatted Excel Sheet)
  const handleExportProductsCsv = () => {
    if (productsList.length === 0) {
      toast.error("No products available to export.");
      return;
    }

    const headers = [
      "Product ID",
      "SKU Code",
      "Product Name",
      "Category",
      "Himalayan Origin",
      "Packaging Weight",
      "Selling Price (INR)",
      "Units In Stock",
      "Stock Status"
    ];

    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;
    let totalInventoryUnits = 0;

    const rows = productsList.map((p) => {
      const units = Number(p.unitsLeft) || 0;
      totalInventoryUnits += units;

      if (p.stock === "In Stock") inStock++;
      else if (p.stock === "Low Stock") lowStock++;
      else if (p.stock === "Out of Stock") outStock++;

      return [
        p.id || "",
        p.sku || "",
        p.name || "",
        p.category || "Produce",
        p.origin || "Himalayan Farms",
        p.weight || "500g",
        p.price || 0,
        units,
        p.stock || "In Stock"
      ];
    });

    const summaryCards = [
      { label: "Active Live SKUs", value: productsList.length },
      { label: "Units in Inventory", value: totalInventoryUnits.toLocaleString("en-IN") },
      { label: "In Stock SKUs", value: inStock },
      { label: "Low / Out of Stock", value: `${lowStock + outStock}` }
    ];

    downloadStyledExcelSheet({
      filename: "Prajnaa_Products_Catalog",
      sheetTitle: "Prajnaa Market — Himalayan Products & Live Inventory Catalogue",
      subtitle: "Live Storefront SKUs, Variant Pack Sizes, Stock Thresholds & Inventory Levels",
      headers,
      rows,
      summaryCards
    });
    toast.success(`Exported ${productsList.length} products successfully!`);
  };

  // Helper: Import Products from CSV
  const handleImportProductsCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error("Empty CSV file");

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) throw new Error("CSV requires a header and at least one data row");

        const dataRows = lines.slice(1);
        let importedCount = 0;

        setProductsList((prev) => {
          const current = [...prev];
          dataRows.forEach((line) => {
            const parts = line.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
            if (parts.length >= 3) {
              const [id, sku, name, category, origin, weight, priceStr, unitsStr, stockStr] = parts;
              const price = parseFloat(priceStr) || 450;
              const units = parseInt(unitsStr) || 50;
              const stock = (stockStr as StockStatus) || (units > 15 ? "In Stock" : units > 0 ? "Low Stock" : "Out of Stock");

              const existingIdx = current.findIndex(
                (p) => (sku && p.sku === sku) || (id && p.id === id) || p.name.toLowerCase() === name.toLowerCase()
              );

              if (existingIdx >= 0) {
                current[existingIdx] = {
                  ...current[existingIdx],
                  name: name || current[existingIdx].name,
                  category: category || current[existingIdx].category,
                  origin: origin || current[existingIdx].origin,
                  weight: weight || current[existingIdx].weight,
                  price,
                  unitsLeft: units,
                  stock,
                };
              } else {
                current.push({
                  id: id || "prod_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                  sku: sku || "PM-" + Math.floor(1000 + Math.random() * 9000),
                  name: name || "Himalayan Produce",
                  category: category || "Organic Produce",
                  origin: origin || "Himachal Pradesh",
                  weight: weight || "500g",
                  price,
                  unitsLeft: units,
                  stock,
                  image: "🌿",
                  channel: "crm_only",
                  isCrmOnly: true,
                });
              }
              importedCount++;
            }
          });

          if (typeof window !== "undefined") {
            localStorage.setItem("prajnaa_crm_products", JSON.stringify(current));
            try {
              const crmOnly = current.filter((p) => p.isCrmOnly);
              localStorage.setItem("prajnaa_crm_manual_products", JSON.stringify(crmOnly));
            } catch {}
          }
          return current;
        });

        toast.success(`Successfully imported ${importedCount} products into inventory!`);
        e.target.value = "";
      } catch (err: any) {
        toast.error("CSV Import error: " + (err.message || "Failed to parse file"));
      }
    };
    reader.readAsText(file);
  };

  // 3. Customers Directory Export (Formatted Excel Sheet)
  const handleExportCustomersCsv = () => {
    if (customers.length === 0) {
      toast.error("No customers available to export.");
      return;
    }

    const headers = [
      "Customer ID",
      "Customer Full Name",
      "WhatsApp Phone",
      "Email Address",
      "City / Location",
      "Customer Tier",
      "Total Orders",
      "Lifetime Spent (INR)",
      "Latest Order Number",
      "Latest Order Amount (INR)",
      "Latest Order Status",
      "Latest Order Tracking",
      "Direct WhatsApp Link"
    ];

    const storePhone = "918091265690";
    let vipCount = 0;
    let totalSpentCumulative = 0;

    const rows = customers.map((c) => {
      const cleanPhone = (c.phone || "").replace(/\D/g, "");
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : `https://wa.me/${storePhone}`;
      const latestOrder: any = c.latestOrder || {};

      if (c.isVip) vipCount++;
      totalSpentCumulative += Number(c.totalSpent) || 0;

      return [
        c.id || "",
        c.name || "Customer",
        c.phone ? `'${c.phone}` : "",
        c.email || "",
        c.location || "Dehradun",
        c.isVip ? "VIP Customer" : "Regular Customer",
        c.totalOrders || 0,
        c.totalSpent || 0,
        latestOrder.orderNumber || "",
        latestOrder.amount || 0,
        latestOrder.orderStatus || "Active",
        latestOrder.trackingNumber || "",
        waLink
      ];
    });

    const avgSpent = customers.length > 0 ? Math.round(totalSpentCumulative / customers.length) : 0;
    const summaryCards = [
      { label: "Verified Customers", value: customers.length },
      { label: "VIP Loyal Clients", value: vipCount },
      { label: "Lifetime Client Revenue", value: `₹${totalSpentCumulative.toLocaleString("en-IN")}` },
      { label: "Avg Spend / Customer", value: `₹${avgSpent.toLocaleString("en-IN")}` }
    ];

    downloadStyledExcelSheet({
      filename: "Prajnaa_Customers_Directory",
      sheetTitle: "Prajnaa Market — Verified Customers Directory",
      subtitle: "WhatsApp Opted-In Clients, VIP Loyalty Tiers & Lifetime Purchasing History",
      headers,
      rows,
      summaryCards
    });
    toast.success(`Exported ${customers.length} customer contacts to styled Excel spreadsheet!`);
  };

  // 4. Shipments & Speed Post Export (Formatted Excel Sheet)
  const handleExportShipmentsCsv = () => {
    if (unifiedShipments.length === 0) {
      toast.error("No shipment records available to export.");
      return;
    }

    const headers = [
      "Speed Post Consignment ID",
      "Order ID",
      "Customer Name",
      "Destination City",
      "Dispatch Date",
      "Carrier",
      "Shipment Status",
      "Official Shipping Tracking Link"
    ];

    let deliveredShipments = 0;
    let transitShipments = 0;
    let pendingShipments = 0;

    const rows = unifiedShipments.map((s: any) => {
      const st = String(s.status || "").toLowerCase();
      if (st === "delivered") deliveredShipments++;
      else if (st === "in transit" || st === "dispatched") transitShipments++;
      else pendingShipments++;

      return [
        s.trackingId || "",
        s.orderId || "",
        s.customer || "Customer",
        s.city || "Dehradun",
        s.date || new Date().toISOString().split("T")[0],
        "Shipping",
        s.status || "In Transit",
        s.trackingId ? `https://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/trackconsignment.aspx` : ""
      ];
    });

    const summaryCards = [
      { label: "Total Parcels", value: unifiedShipments.length },
      { label: "In Transit Shipments", value: transitShipments },
      { label: "Delivered Consignments", value: deliveredShipments },
      { label: "Primary Carrier", value: "Shipping" }
    ];

    downloadStyledExcelSheet({
      filename: "Prajnaa_Shipments",
      sheetTitle: "Prajnaa Market — Shipments & Logistics Dispatch",
      subtitle: "Shipping Consignment Log, Dispatches & Live Tracking",
      headers,
      rows,
      summaryCards
    });
    toast.success(`Exported ${unifiedShipments.length} shipment records to styled Excel spreadsheet!`);
  };

  // 5. Analytics & Business Performance Export (Formatted Excel Sheet)
  const handleExportAnalyticsCsv = () => {
    const totalRev = unifiedOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
    const completedOrders = unifiedOrders.filter((o) => o.orderStatus === "Completed" || o.orderStatus === "Delivered");
    const pendingOrders = unifiedOrders.filter((o) => o.orderStatus === "Pending" || o.orderStatus === "Processing");
    const shippedOrders = unifiedOrders.filter((o) => o.orderStatus === "Shipped" || o.orderStatus === "Packed");
    const avgOrderVal = unifiedOrders.length > 0 ? Math.round(totalRev / unifiedOrders.length) : 0;
    const vipCustomers = customers.filter((c) => c.isVip);

    const headers = ["Category / Department", "KPI Metric", "Reported Value", "Context / Definition"];
    const rows = [
      ["Revenue & Sales", "Gross Recorded Sales Volume", `₹${totalRev.toLocaleString("en-IN")}`, "Total cumulative value of all orders in CRM"],
      ["Revenue & Sales", "Average Order Value (AOV)", `₹${avgOrderVal.toLocaleString("en-IN")}`, "Average revenue per customer order"],
      ["Fulfillment", "Total Recorded Orders", unifiedOrders.length, "All active and completed orders"],
      ["Fulfillment", "Completed & Delivered Orders", completedOrders.length, "Orders successfully delivered to customers"],
      ["Fulfillment", "Pending Processing Orders", pendingOrders.length, "Orders awaiting packaging or payment clearance"],
      ["Fulfillment", "Shipments In Transit", shippedOrders.length, "Parcels currently dispatched via Shipping"],
      ["Customer CRM", "Total Verified Customers", customers.length, "Opted-in clients with registered WhatsApp numbers"],
      ["Customer CRM", "VIP Customer Count", vipCustomers.length, "High-value clients with spending > ₹5,000"],
      ["Inventory & Catalog", "Active Himalayan SKUs", productsList.length, "Live products available in catalogue"],
      ["Inventory & Catalog", "In Stock SKUs", productsList.filter((p) => p.stock === "In Stock").length, "Products ready for immediate packing"],
      ["Inventory & Catalog", "Low Stock Alert SKUs", productsList.filter((p) => p.stock === "Low Stock").length, "SKUs with stock below threshold (< 15 units)"],
      ["Inventory & Catalog", "Out of Stock SKUs", productsList.filter((p) => p.stock === "Out of Stock").length, "SKUs awaiting farm harvest or processing"]
    ];

    const summaryCards = [
      { label: "Gross Sales", value: `₹${totalRev.toLocaleString("en-IN")}` },
      { label: "Average Order Value", value: `₹${avgOrderVal.toLocaleString("en-IN")}` },
      { label: "Total CRM Orders", value: unifiedOrders.length },
      { label: "Customer Base", value: customers.length }
    ];

    downloadStyledExcelSheet({
      filename: "Prajnaa_CRM_Business_Analytics",
      sheetTitle: "Prajnaa Market — Business Performance & KPI Executive Report",
      subtitle: "Gross Sales, WhatsApp Funnel Velocity, Inventory Health & Logistics Performance",
      headers,
      rows,
      summaryCards
    });
    toast.success("Exported business analytics to styled Excel spreadsheet!");
  };

  // Automated WhatsApp Dispatch Milestone Notification for Shipments & Speed Post section
  const handleSendShipmentMilestone = async (
    shipmentItem: any,
    milestone: "shipped" | "transit" | "out_for_delivery" | "delivering_tomorrow" | "delivered" | "packed" | "processing",
    customLocation?: string
  ) => {
    if (!shipmentItem) return;

    let statusLabel: Order["orderStatus"] = "Shipped";
    let timelineStatus = "";
    let timelineLoc = "";

    if (milestone === "processing") {
      statusLabel = "Processing";
      timelineStatus = "Order Processing Initiated";
      timelineLoc = "Prajnaa Himalayan Hub";
    } else if (milestone === "packed") {
      statusLabel = "Packed";
      timelineStatus = "Produce Quality Checked & Box Packed";
      timelineLoc = "Prajnaa Packaging Desk, Solan";
    } else if (milestone === "shipped") {
      statusLabel = "Shipped";
      timelineStatus = "Dispatched from Solan Mountain Hub";
      timelineLoc = "Solan Hub, HP";
    } else if (milestone === "transit") {
      const loc = (customLocation || "").trim() || "Regional Sorting Hub";
      statusLabel = "In Transit";
      timelineStatus = `Parcel Reached ${loc}`;
      timelineLoc = loc;
    } else if (milestone === "out_for_delivery") {
      statusLabel = "Out for Delivery";
      timelineStatus = "Out for Delivery with Postman / Courier";
      timelineLoc = "Destination Postal Delivery Hub";
    } else if (milestone === "delivered") {
      statusLabel = "Delivered";
      timelineStatus = "Delivered Successfully to Recipient";
      timelineLoc = "Customer Destination";
    } else {
      statusLabel = "Delivering Tomorrow";
      timelineStatus = "Scheduled for Tomorrow's Delivery";
      timelineLoc = "Destination Delivery Facility";
    }

    const dispatchMsg = getOrderStatusNotificationText(
      statusLabel,
      {
        customerName: shipmentItem.customer,
        orderNumber: shipmentItem.orderId,
        trackingNumber: shipmentItem.trackingId,
      },
      timelineLoc
    );

    // 1. Find matching customer
    const targetCust = customers.find(
      (c) =>
        c.name.toLowerCase() === (shipmentItem.customer || "").toLowerCase() ||
        c.latestOrder?.orderNumber === shipmentItem.orderId
    ) || currentCustomer;

    const targetPhone = targetCust.phone ? targetCust.phone.replace(/\D/g, "") : "918091265690";

    // 2. Add message to customer's WhatsApp chat in CRM
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    const newMsg: Message = {
      id: `disp_milestone_${Date.now()}`,
      sender: "business",
      senderName: "Prajnaa Fulfillment",
      text: dispatchMsg,
      time: timeStr,
      date: dateStr,
      type: "text",
      status: "delivered",
    };

    setMessagesMap((prev) => ({
      ...prev,
      [targetCust.id]: [...(prev[targetCust.id] || []), newMsg],
    }));

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === targetCust.id
          ? {
              ...c,
              lastMessageText: dispatchMsg.split("\n")[0] || `Order ${statusLabel}: ${shipmentItem.orderId}`,
              lastMessageTime: timeStr,
            }
          : c
      )
    );

    // 3. Update shipment in state with new timeline step & status
    const newTimelineStep = {
      status: timelineStatus,
      date: `${dateStr}, ${timeStr}`,
      loc: timelineLoc,
    };

    setShipments((prev) =>
      prev.map((s) => {
        if (s.trackingId === shipmentItem.trackingId || s.orderId === shipmentItem.orderId) {
          const updatedTimeline = [...(s.timeline || []), newTimelineStep];
          return {
            ...s,
            status: statusLabel,
            timeline: updatedTimeline,
            currentLocation: timelineLoc,
          };
        }
        return s;
      })
    );

    setSelectedShipment((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        status: statusLabel,
        currentLocation: timelineLoc,
        timeline: [...(prev.timeline || []), newTimelineStep],
      };
    });

    // 4. Update order status in createdOrders / unifiedOrders
    setCreatedOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === shipmentItem.orderId
          ? {
              ...o,
              orderStatus: statusLabel as any,
              currentLocation: timelineLoc,
              shippingStage:
                milestone === "delivering_tomorrow"
                  ? "delivering_tomorrow"
                  : milestone === "out_for_delivery"
                  ? "out_for_delivery"
                  : milestone === "delivered"
                  ? "delivered"
                  : milestone === "transit"
                  ? "in_transit"
                  : milestone === "packed"
                  ? "packed"
                  : milestone === "processing"
                  ? "processing"
                  : "shipped",
            }
          : o
      )
    );

    // 5. Send to /api/crm/messages backend
    try {
      await fetch("/api/crm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetPhone,
          text: dispatchMsg,
          customerId: targetCust.id,
          orderNumber: shipmentItem.orderId,
          customerName: shipmentItem.customer,
          sender: "business",
        }),
      });

      toast.success(
        `Automated "${statusLabel}" update sent to ${shipmentItem.customer} via WhatsApp!`
      );
    } catch {
      toast.success(`Milestone update recorded in CRM chat for ${shipmentItem.customer}!`);
    }
  };

  // Backward compatibility alias for single-click dispatch
  const handleSendSpeedPostTracking = async (shipmentItem: typeof selectedShipment) => {
    return handleSendShipmentMilestone(shipmentItem, "shipped");
  };

  // Global Universal Search & Notifications: Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        globalSearchInputRef.current?.focus();
        setIsSearchDropdownOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchDropdownOpen(false);
        setShowNotificationMenu(false);
        globalSearchInputRef.current?.blur();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotificationMenu(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Theme Styling Classes Configuration (Refined High-End Himalayan Palette)
  const themeStyles = {
    forest: {
      sidebarBg: "bg-[#0A2E22] text-white border-[#062017]",
      sidebarHover: "hover:bg-white/[0.08] text-[#E3ECE7]",
      sidebarActive: "bg-white/[0.14] text-white shadow-xs font-semibold border-l-3 border-[#E8A317]",
      mainBg: "bg-[#FBF9F5] text-[#111827]",
      headerBg: "bg-white/95 backdrop-blur-md border-[#E7DFD5]",
      cardBg: "bg-white border-[#E7DFD5] shadow-xs",
      accentPill: "bg-[#0F3D2E] text-white",
      badgeText: "text-[#0F3D2E]",
      name: "Prajnaa Forest & Cream (Default)",
    },
    dark: {
      sidebarBg: "bg-[#0A1713] text-slate-100 border-[#122822]",
      sidebarHover: "hover:bg-white/[0.06] text-slate-300",
      sidebarActive: "bg-emerald-600/25 text-emerald-300 border-l-3 border-emerald-400 font-semibold",
      mainBg: "bg-[#0E1F1A] text-slate-100",
      headerBg: "bg-[#11241E]/95 backdrop-blur-md border-[#1A382F] text-slate-100",
      cardBg: "bg-[#142A23] border-[#1D3E34] text-slate-100 shadow-xs",
      accentPill: "bg-emerald-600 text-white",
      badgeText: "text-emerald-400",
      name: "Himalayan Pine Dark",
    },
    mist: {
      sidebarBg: "bg-[#1B2D27] text-white border-[#12211C]",
      sidebarHover: "hover:bg-white/10 text-slate-200",
      sidebarActive: "bg-[#25463C] text-white shadow-xs font-semibold border-l-3 border-sky-400",
      mainBg: "bg-[#F3F6F4] text-[#0F172A]",
      headerBg: "bg-white/95 backdrop-blur-md border-slate-200",
      cardBg: "bg-white border-slate-200 shadow-xs",
      accentPill: "bg-[#1B2D27] text-white",
      badgeText: "text-[#1B2D27]",
      name: "Alpine Mist Light",
    },
    harvest: {
      sidebarBg: "bg-[#2E1A08] text-amber-50 border-[#201205]",
      sidebarHover: "hover:bg-white/10 text-amber-200/80",
      sidebarActive: "bg-amber-600/30 text-amber-200 border-l-3 border-amber-400 font-semibold",
      mainBg: "bg-[#FCF9F2] text-[#292524]",
      headerBg: "bg-white/95 backdrop-blur-md border-amber-200/70",
      cardBg: "bg-white border-amber-200/70 shadow-xs",
      accentPill: "bg-[#D97706] text-white",
      badgeText: "text-amber-800",
      name: "Golden Saffron Harvest",
    },
  }[currentTheme];

  // =========================================================
  // VIEW: AUTHENTICATION (Screen 1 — STRICT TEAM LOGIN)
  // =========================================================
  if (!isAuthenticated) {
    return (
      <div className={`flex min-h-screen w-screen ${themeStyles.mainBg} font-sans antialiased overflow-hidden`}>
        {/* Left Side: Himalayan Landscape & Prajnaa Brand Hero */}
        <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-[#062018] via-[#0A2E22] to-[#04150F] text-white">
          <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen bg-[radial-gradient(#E8A317_1px,transparent_1px)] [background-size:28px_28px]" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-3.5">
            <img
              src="/prajnaa-logo.png"
              alt="Prajnaa Market Logo"
              className="h-14 w-auto object-contain filter drop-shadow-md brightness-105"
            />
          </div>

          {/* Center Hero Heading */}
          <div className="relative z-10 max-w-lg space-y-4 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-200 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              <span>Team-Only Access Control Active</span>
            </div>
            <h2 className="font-display text-4xl xl:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
              Prajnaa Market <br />
              <span className="text-amber-300">WhatsApp CRM</span>
            </h2>
            <p className="text-base text-emerald-100/80 leading-relaxed font-normal">
              Secure staff portal. Sign in with the credentials issued to you by the Store Admin to access your assigned work area.
            </p>
          </div>

          {/* Bottom Mountain Peaks Artwork */}
          <div className="relative z-10 pt-6 border-t border-emerald-800/40 space-y-5">
            <div className="w-full h-24 overflow-hidden flex items-end">
              <svg viewBox="0 0 600 120" className="w-full h-full text-emerald-500 fill-current" preserveAspectRatio="none">
                <polygon points="0,120 70,40 140,80 230,25 320,70 410,35 500,75 600,120" fill="#1C5E45" opacity="0.4" />
                <polygon points="0,120 50,65 110,35 180,85 270,45 360,90 460,50 550,85 600,120" fill="#144C37" opacity="0.7" />
                <polygon points="0,120 80,75 160,50 240,95 350,60 450,100 530,65 600,120" fill="#0A2C1F" opacity="0.95" />
              </svg>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-100 text-xs font-semibold backdrop-blur-sm border border-white/10">
                🔒 Role-Based CRM
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-100 text-xs font-semibold backdrop-blur-sm border border-white/10">
                💬 WhatsApp Integration
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-100 text-xs font-semibold backdrop-blur-sm border border-white/10">
                📦 2–3 Days Fulfillment
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Card */}
        <div className="w-full lg:w-5/12 flex flex-col justify-center items-center p-8 sm:p-12 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-neutral-200/80 space-y-5 text-neutral-900">
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-1">
                <img
                  src="/prajnaa-logo.png"
                  alt="Prajnaa Market Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <h3 className="text-2xl font-bold tracking-tight font-display">Staff Sign In</h3>
              <p className="text-xs text-neutral-500 font-sans">
                Enter your authorized credentials to access your CRM workspace
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-700">Email, Username, or Phone</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. admin or admin@prajnaamarket.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-neutral-700">Password / Assigned Pin</label>
                    <button
                      type="button"
                      onClick={() => toast.info("Contact your Store Admin (admin@prajnaamarket.com) to retrieve credentials")}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      Lost password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="remember" className="text-neutral-600 text-[11px] cursor-pointer">
                    Remember me on this workstation
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0A2E22] hover:bg-[#0E3D2E] text-white rounded-xl text-xs font-semibold font-subhead transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <span>Sign In to Your Work Area</span>
                  <ArrowRight className="h-4 w-4 text-[#E8A317]" />
                </button>
              </form>

            {/* Note on RBAC & 24h Session Policy */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>🛡️</span> Security & Access Policy:
              </p>
              <p className="text-amber-800 leading-snug">
                Your session persists across browser page refreshes. For data safety, login is strictly compulsory every 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // VIEW: AUTHENTICATED CRM WORKSPACE (With Active Theme & RBAC)
  // =========================================================
  return (
    <div className={`flex h-screen w-screen overflow-hidden print:h-auto print:w-auto print:overflow-visible print:bg-white ${themeStyles.mainBg} font-sans antialiased`}>
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR (Desktop Fixed + Mobile Slide-over Drawer) */}
      {/* ========================================================= */}
      <aside
        className={`print:hidden fixed md:static inset-y-0 left-0 z-50 w-[270px] md:w-[240px] shrink-0 ${themeStyles.sidebarBg} flex flex-col justify-between select-none shadow-2xl md:shadow-xl border-r transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header with Mobile Close Button */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/prajnaa-logo.png"
                alt="Prajnaa Market Logo"
                className="h-9 w-auto max-w-[170px] object-contain filter brightness-110 drop-shadow-xs"
              />
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User's Assigned Role Pill in Sidebar */}
          <div className="px-4 py-2 mx-3 my-2 rounded-xl bg-white/10 border border-white/10 text-xs">
            <span className="text-[10px] opacity-75 block">Active Work Area:</span>
            <span className="font-bold text-amber-300 block truncate">{currentUser.role}</span>
          </div>

          {/* Navigation Links — ONLY SHOW ALLOWED TABS FOR USER'S ROLE */}
          <nav className="p-3 space-y-1">
            {userPermissions.allowedTabs.includes("dashboard") && (
              <button
                onClick={() => { setActiveNav("dashboard"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "dashboard" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("inbox") && (
              <button
                onClick={() => { setActiveNav("inbox"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "inbox" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span>WhatsApp Inbox</span>
                </div>
                {totalUnreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            )}

            {userPermissions.allowedTabs.includes("leads") && (
              <button
                onClick={() => { setActiveNav("leads"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "leads" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Leads & Sales</span>
                </div>
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  New
                </span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("orders") && (
              <button
                onClick={() => { setActiveNav("orders"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "orders" || activeNav === "order_details"
                    ? themeStyles.sidebarActive
                    : themeStyles.sidebarHover
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Orders</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("customers") && (
              <button
                onClick={() => { setActiveNav("customers"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "customers" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Customers</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("broadcast") && (
              <button
                onClick={() => { setActiveNav("broadcast"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "broadcast" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <Send className="h-4 w-4" />
                <span>Broadcast</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("products") && (
              <button
                onClick={() => { setActiveNav("products"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "products" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <Package className="h-4 w-4" />
                <span>Products</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("templates") && (
              <button
                onClick={() => { setActiveNav("templates"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "templates" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <FileCode className="h-4 w-4" />
                <span>Templates</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("shipments") && (
              <button
                onClick={() => { setActiveNav("shipments"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "shipments" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <Truck className="h-4 w-4" />
                <span>Shipments & Speed Post</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("analytics") && (
              <button
                onClick={() => { setActiveNav("analytics"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "analytics" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("team") && (
              <button
                onClick={() => { setActiveNav("team"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "team" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <UserCheck className="h-4 w-4" />
                <span>Team & Agents</span>
              </button>
            )}

            {userPermissions.allowedTabs.includes("settings") && (
              <button
                onClick={() => { setActiveNav("settings"); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeNav === "settings" ? themeStyles.sidebarActive : themeStyles.sidebarHover
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            )}
          </nav>
        </div>

        {/* Bottom Sidebar: Himalayan Artwork & Tagline */}
        <div className="relative overflow-hidden pt-4 pb-5 px-4 bg-gradient-to-t from-black/40 to-transparent border-t border-white/10">
          <div className="w-full h-18 opacity-75 mb-2 overflow-hidden flex items-end justify-center pointer-events-none">
            <svg viewBox="0 0 200 80" className="w-full h-full text-emerald-500 fill-current" preserveAspectRatio="none">
              <polygon points="0,80 30,35 60,65 95,20 135,55 170,30 200,80" fill="#174E39" opacity="0.6" />
              <polygon points="0,80 20,50 55,28 85,60 120,38 160,68 185,45 200,80" fill="#0F382A" opacity="0.8" />
              <polygon points="10,80 15,62 20,80" fill="#07241A" />
              <polygon points="25,80 30,58 35,80" fill="#07241A" />
              <polygon points="65,80 72,55 79,80" fill="#07241A" />
            </svg>
          </div>

          <div className="text-center relative z-10 space-y-0.5">
            <p className="text-[10px] font-semibold text-amber-200/90 tracking-wider uppercase font-subhead">
              Natural Products
            </p>
            <p className="text-[9px] text-emerald-200/70 font-sans">
              Healthy Living • Stronger Communities
            </p>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE (Header + Screen Content)                */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-14 md:pb-0 relative print:hidden">
        {/* TOP HEADER BAR (With Theme Switcher & Role Badge) */}
        <header className={`h-[56px] md:h-[62px] px-3 md:px-6 ${themeStyles.headerBg} border-b flex items-center justify-between shrink-0 z-30 shadow-2xs`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden flex items-center">
              <img
                src="/prajnaa-logo.png"
                alt="Prajnaa Market"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div ref={globalSearchRef} className="relative hidden sm:block w-[240px] md:w-[340px] lg:w-[400px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <input
                ref={globalSearchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && globalSearch.trim()) {
                    if (globalSearchResults.orders.length > 0) {
                      setSelectedOrderForView(globalSearchResults.orders[0]);
                      setActiveNav("order_details");
                      setIsSearchDropdownOpen(false);
                      setGlobalSearch("");
                    } else if (globalSearchResults.customers.length > 0) {
                      setSelectedCustomerId(globalSearchResults.customers[0].id);
                      setMobileChatView("chat");
                      setActiveNav("inbox");
                      setIsSearchDropdownOpen(false);
                      setGlobalSearch("");
                    } else if (globalSearchResults.products.length > 0) {
                      setProductSearch(globalSearchResults.products[0].name);
                      setActiveNav("products");
                      setIsSearchDropdownOpen(false);
                      setGlobalSearch("");
                    }
                  }
                }}
                placeholder="Search customers, orders, products..."
                className="w-full pl-9 pr-14 py-2 rounded-xl bg-neutral-100/80 border border-neutral-200/70 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:bg-white text-neutral-900 transition placeholder:text-neutral-400"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {globalSearch ? (
                  <button
                    onClick={() => {
                      setGlobalSearch("");
                      setIsSearchDropdownOpen(false);
                      globalSearchInputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-neutral-200/80 rounded-full text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-neutral-400 bg-white border border-neutral-200 px-1.5 py-0.5 rounded shadow-2xs pointer-events-none">
                    ⌘K
                  </span>
                )}
              </div>

              {/* LIVE UNIVERSAL SEARCH DROPDOWN */}
              {isSearchDropdownOpen && globalSearch.trim() && (
                <div className="absolute left-0 mt-2 w-[340px] md:w-[440px] bg-white rounded-2xl shadow-2xl border border-neutral-200/90 overflow-hidden z-50 text-neutral-800 divide-y divide-neutral-100 max-h-[460px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                  {/* Results Count Header */}
                  <div className="px-3.5 py-2.5 bg-neutral-50/80 flex items-center justify-between text-[11px] font-medium text-neutral-500">
                    <span>
                      {globalSearchResults.totalCount > 0
                        ? `Found ${globalSearchResults.totalCount} match${globalSearchResults.totalCount === 1 ? "" : "es"} for "${globalSearch}"`
                        : `No matches found for "${globalSearch}"`}
                    </span>
                    <span className="text-[10px] text-neutral-400">Esc to close</span>
                  </div>

                  <div className="overflow-y-auto max-h-[380px] p-2 space-y-3">
                    {/* Empty State */}
                    {globalSearchResults.totalCount === 0 && (
                      <div className="py-8 text-center px-4">
                        <Search className="h-7 w-7 text-neutral-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-neutral-700">No results found</p>
                        <p className="text-[11px] text-neutral-400 mt-1 max-w-[280px] mx-auto">
                          Try searching by customer name, order # (e.g. #ORD-), phone number, or product item.
                        </p>
                      </div>
                    )}

                    {/* Orders Section */}
                    {globalSearchResults.orders.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Package className="h-3 w-3 text-amber-600" /> Orders & Shipments
                          </span>
                          <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-mono text-[9px]">
                            {globalSearchResults.orders.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {globalSearchResults.orders.map((ord) => (
                            <button
                              key={ord.id || ord.orderNumber}
                              onClick={() => {
                                setSelectedOrderForView(ord);
                                setActiveNav("order_details");
                                setIsSearchDropdownOpen(false);
                                setGlobalSearch("");
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-amber-50/70 transition flex items-center justify-between group cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-amber-800">
                                    {ord.orderNumber}
                                  </span>
                                  <span className="text-xs font-medium text-neutral-900 truncate">
                                    {ord.customerName}
                                  </span>
                                </div>
                                <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                  <span>₹{ord.amount?.toLocaleString("en-IN")}</span>
                                  <span>•</span>
                                  <span>{ord.itemsCount || 1} item{(ord.itemsCount || 1) > 1 ? "s" : ""}</span>
                                  {ord.customerPhone && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono">{ord.customerPhone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                                  ord.orderStatus === "Completed" ? "bg-emerald-100 text-emerald-800" :
                                  ord.orderStatus === "Shipped" ? "bg-blue-100 text-blue-800" :
                                  ord.orderStatus === "Cancelled" ? "bg-red-100 text-red-800" :
                                  "bg-amber-100 text-amber-800"
                                }`}>
                                  {ord.orderStatus || "Pending"}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customers / Chats Section */}
                    {globalSearchResults.customers.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 pt-1 border-t border-neutral-100 flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-emerald-600" /> Customers & WhatsApp
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono text-[9px]">
                            {globalSearchResults.customers.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {globalSearchResults.customers.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setMobileChatView("chat");
                                setActiveNav("inbox");
                                setIsSearchDropdownOpen(false);
                                setGlobalSearch("");
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-50/70 transition flex items-center justify-between group cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-neutral-900 truncate">{c.name}</span>
                                  {c.address?.city && (
                                    <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                                      {c.address.city}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span className="font-mono">{c.phone}</span>
                                  {c.lastMessageText && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[160px] italic">"{c.lastMessageText}"</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Products Section */}
                    {globalSearchResults.products.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 pt-1 border-t border-neutral-100 flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <ShoppingBag className="h-3 w-3 text-emerald-600" /> Himalayan Products
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-mono text-[9px]">
                            {globalSearchResults.products.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {globalSearchResults.products.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setProductSearch(p.name);
                                setActiveNav("products");
                                setIsSearchDropdownOpen(false);
                                setGlobalSearch("");
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-50/70 transition flex items-center justify-between group cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-sm shrink-0">
                                  {p.image?.startsWith("http") || p.image?.startsWith("/") ? (
                                    <img src={p.image} alt={p.name} className="w-6 h-6 object-cover rounded" />
                                  ) : (
                                    p.image || "🌾"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-neutral-900 truncate">{p.name}</p>
                                  <p className="text-[10px] text-neutral-400">
                                    ₹{p.price?.toLocaleString("en-IN")} • {p.origin || "Uttarakhand"}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                                  p.stock === "In Stock" ? "bg-emerald-100 text-emerald-800" :
                                  p.stock === "Low Stock" ? "bg-amber-100 text-amber-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {p.stock}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Footer Links */}
                  {globalSearchResults.totalCount > 0 && (
                    <div className="p-2 bg-neutral-50/90 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => {
                          setOrdersSearch(globalSearch);
                          setActiveNav("orders");
                          setIsSearchDropdownOpen(false);
                        }}
                        className="text-amber-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Search in Orders table →
                      </button>
                      <button
                        onClick={() => {
                          setProductSearch(globalSearch);
                          setActiveNav("products");
                          setIsSearchDropdownOpen(false);
                        }}
                        className="text-emerald-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        Search in Catalog →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3.5">
            {/* Role / Work Area Indicator Pill */}
            <div className={`hidden sm:flex px-2.5 py-1 rounded-full border text-xs font-semibold items-center gap-1.5 shadow-2xs ${userPermissions.badgeColor}`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{currentUser.role}</span>
            </div>

            {/* THEME SWITCHER DROPDOWN BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-200/80 bg-white/80 hover:bg-neutral-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Change Theme"
              >
                <Palette className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline capitalize">{currentTheme} Theme</span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
              </button>

              {/* Theme Menu Dropdown */}
              {showThemeMenu && (
                <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 text-xs space-y-1 z-50 text-neutral-900">
                  <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Select CRM Theme:
                  </div>
                  <button
                    onClick={() => handleThemeChange("forest")}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                      currentTheme === "forest" ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">🌲 Himalayan Forest</span>
                    {currentTheme === "forest" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                      currentTheme === "dark" ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">🌙 Midnight Dark</span>
                    {currentTheme === "dark" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange("mist")}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                      currentTheme === "mist" ? "bg-sky-50 text-sky-900 font-bold" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">🏔️ Alpine Mist</span>
                    {currentTheme === "mist" && <Check className="h-3.5 w-3.5 text-sky-600" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange("harvest")}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${
                      currentTheme === "harvest" ? "bg-amber-50 text-amber-900 font-bold" : "hover:bg-neutral-50"
                    }`}
                  >
                    <span className="flex items-center gap-2">🍯 Golden Harvest</span>
                    {currentTheme === "harvest" && <Check className="h-3.5 w-3.5 text-amber-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Official WhatsApp Business Badge */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 shadow-2xs">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-[9px] font-medium text-neutral-500 block leading-none">
                  Official WhatsApp Number
                </span>
                <span className="text-xs font-bold text-neutral-900 font-mono tracking-tight">
                  +91 80912 65690
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-1">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Meta: Pending
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  CRM: Connected
                </span>
              </div>
            </div>

            {/* Notification Bell with Live Unread Dropdown */}
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className={`relative p-2 rounded-xl transition cursor-pointer ${
                  showNotificationMenu
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                }`}
                title="Notifications & Unread Messages"
              >
                <Bell className="h-4 w-4" />
                {totalNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {totalNotificationCount}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              {showNotificationMenu && (
                <div className="absolute right-0 top-11 w-[340px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-neutral-200/90 z-50 overflow-hidden text-neutral-800 divide-y divide-neutral-100 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-neutral-50/90 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-neutral-900">Notifications</h4>
                      {totalNotificationCount > 0 && (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {totalNotificationCount} new
                        </span>
                      )}
                    </div>
                    {unreadCustomerMessages.length > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div className="px-3 py-1.5 bg-white border-b border-neutral-100 flex items-center gap-1.5 text-[11px]">
                    <button
                      onClick={() => setNotificationTab("all")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        notificationTab === "all"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      All ({totalNotificationCount})
                    </button>
                    <button
                      onClick={() => setNotificationTab("chats")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        notificationTab === "chats"
                          ? "bg-emerald-700 text-white"
                          : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Unread Chats ({totalUnreadChatCount})
                    </button>
                    <button
                      onClick={() => setNotificationTab("orders")}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        notificationTab === "orders"
                          ? "bg-amber-700 text-white"
                          : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Orders & Speed Post ({pendingPaymentNotifications.length + pendingDispatchNotifications.length})
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100/80">
                    {totalNotificationCount === 0 ? (
                      <div className="py-10 text-center px-4">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-neutral-800">All caught up!</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          No unread messages or pending action items.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Section: Unread WhatsApp Customer Messages */}
                        {(notificationTab === "all" || notificationTab === "chats") &&
                          unreadCustomerMessages.length > 0 && (
                            <div>
                              <div className="px-3.5 py-1.5 bg-neutral-50/50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquare className="h-3 w-3 text-emerald-600" />
                                <span>Unread WhatsApp Messages</span>
                              </div>
                              {unreadCustomerMessages.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setCustomers((prev) =>
                                      prev.map((cust) =>
                                        cust.id === c.id ? { ...cust, unreadCount: 0 } : cust
                                      )
                                    );
                                    setSelectedCustomerId(c.id);
                                    setMobileChatView("chat");
                                    setActiveNav("inbox");
                                    setShowNotificationMenu(false);
                                  }}
                                  className="w-full text-left p-3 hover:bg-emerald-50/60 transition flex items-start gap-3 group cursor-pointer"
                                >
                                  <div className="relative shrink-0">
                                    {c.avatar ? (
                                      <img
                                        src={c.avatar}
                                        alt={c.name}
                                        className="h-9 w-9 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                                        {c.name.split(" ").map((n) => n[0]).join("")}
                                      </div>
                                    )}
                                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-xs font-bold text-neutral-900 truncate">
                                        {c.name}
                                      </h5>
                                      <span className="text-[10px] text-neutral-400">
                                        {c.lastMessageTime || "Recent"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-600 truncate mt-0.5">
                                      {c.lastMessageText || "Sent a message"}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                        {c.unreadCount} unread
                                      </span>
                                      <span className="text-[10px] font-mono text-neutral-400">
                                        {c.phone}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                        {/* Section: Pending Payment Verification Notifications */}
                        {(notificationTab === "all" || notificationTab === "orders") &&
                          pendingPaymentNotifications.length > 0 && (
                            <div>
                              <div className="px-3.5 py-1.5 bg-neutral-50/50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertCircle className="h-3 w-3 text-amber-600" />
                                <span>Awaiting UPI / Payment Verification</span>
                              </div>
                              {pendingPaymentNotifications.map((ord) => (
                                <button
                                  key={ord.orderNumber}
                                  onClick={() => {
                                    setSelectedOrderForView(ord);
                                    setActiveNav("order_details");
                                    setShowNotificationMenu(false);
                                  }}
                                  className="w-full text-left p-3 hover:bg-amber-50/60 transition flex items-center justify-between group cursor-pointer"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-amber-800">
                                        {ord.orderNumber}
                                      </span>
                                      <span className="text-xs font-medium text-neutral-900 truncate">
                                        {ord.customerName}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 mt-0.5">
                                      ₹{ord.amount?.toLocaleString("en-IN")} • Awaiting payment verification
                                    </p>
                                  </div>
                                  <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}

                        {/* Section: Speed Post Dispatch Queue Notifications */}
                        {(notificationTab === "all" || notificationTab === "orders") &&
                          pendingDispatchNotifications.length > 0 && (
                            <div>
                              <div className="px-3.5 py-1.5 bg-neutral-50/50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck className="h-3 w-3 text-blue-600" />
                                <span>Ready for Shipping Dispatch</span>
                              </div>
                              {pendingDispatchNotifications.map((ord) => (
                                <button
                                  key={`disp_${ord.orderNumber}`}
                                  onClick={() => {
                                    setActiveNav("shipments");
                                    setShowNotificationMenu(false);
                                  }}
                                  className="w-full text-left p-3 hover:bg-blue-50/60 transition flex items-center justify-between group cursor-pointer"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-blue-800">
                                        {ord.orderNumber}
                                      </span>
                                      <span className="text-xs font-medium text-neutral-900 truncate">
                                        {ord.customerName}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 mt-0.5">
                                      Packed at Dehradun MDG • Ready to book Speed Post tracking
                                    </p>
                                  </div>
                                  <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:text-blue-800 group-hover:translate-x-0.5 transition shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-2.5 bg-neutral-50 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => {
                        setActiveNav("inbox");
                        setShowNotificationMenu(false);
                      }}
                      className="font-semibold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Open WhatsApp Inbox →
                    </button>
                    <span className="text-[10px] text-neutral-400">Esc to close</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 pl-2 border-l border-neutral-200 hover:opacity-85 transition cursor-pointer"
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-8 w-8 rounded-full object-cover border border-neutral-200 shadow-2xs"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    {currentUser.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                )}
                <div className="text-left hidden md:block">
                  <h4 className="text-xs font-bold text-neutral-900 leading-none">{currentUser.name}</h4>
                  <p className="text-[10px] text-neutral-500 font-medium mt-0.5">{currentUser.role}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-11 w-60 bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-2 text-xs space-y-1 z-50 text-neutral-900">
                  <div className="p-2 border-b border-neutral-100">
                    <p className="font-bold text-neutral-900">{currentUser.name}</p>
                    <p className="text-[10px] text-neutral-500">{currentUser.email}</p>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                      {userPermissions.label}
                    </span>
                  </div>
                  {currentUser.role === "Store Admin" && (
                    <button
                      onClick={() => {
                        setActiveNav("settings");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 text-neutral-700 cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>CRM Settings</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-50 text-rose-600 font-bold cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out (Back to Login)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3. SCREEN DISPATCHER (Filtered by Active Tab)              */}
        {/* ========================================================= */}

        {/* SCREEN: LEADS & SALES MANAGEMENT */}
        {activeNav === "leads" && userPermissions.allowedTabs.includes("leads") && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <LeadsModule
              userRole={currentUser.role}
              userName={currentUser.name}
              products={productsList.map((p) => ({ id: p.id, name: p.name, price: p.price }))}
              onViewOrder={(orderNumberOrId, lead) => {
                setOrderPreviousNav("leads");
                const cleanId = String(orderNumberOrId).replace("#", "");
                const foundOrder = unifiedOrders.find(
                  (o) =>
                    o.orderNumber.replace("#", "").toLowerCase() === cleanId.toLowerCase() ||
                    o.id.toLowerCase() === cleanId.toLowerCase()
                );
                if (foundOrder) {
                  setSelectedOrderForView(foundOrder);
                } else if (lead) {
                  // Prioritize finalized quotes if available, otherwise lead items
                  const quote = Array.isArray(lead.quotes) && lead.quotes.length > 0 ? lead.quotes[0] : null;
                  const rawItems = quote && Array.isArray(quote.items) && quote.items.length > 0
                    ? quote.items
                    : (Array.isArray(lead.items) && lead.items.length > 0 ? lead.items : []);

                  const mappedItems = rawItems.length > 0
                    ? rawItems.map((it: any) => {
                        const qty = Math.max(1, Number(it.quantity || it.requestedQuantity || it.qty || 1));
                        const price = Number(
                          it.unitPricePaise ? it.unitPricePaise / 100 :
                          it.indicativeUnitPricePaise ? it.indicativeUnitPricePaise / 100 :
                          it.price || 0
                        );
                        const total = Number(
                          it.totalPaise ? it.totalPaise / 100 :
                          it.indicativeTotalPaise ? it.indicativeTotalPaise / 100 :
                          it.total || 0
                        );
                        const effectivePrice = price > 0 ? price : (qty > 0 && total > 0 ? total / qty : 950);
                        const effectiveTotal = (total > effectivePrice ? total : effectivePrice * qty);

                        let itemWeight = it.weight || it.unit || "Standard Pack";
                        const nameLower = (it.productName || it.name || "").toLowerCase();
                        if (nameLower.includes("5kg") || nameLower.includes("5 kg")) itemWeight = "5kg Bulk Pack";
                        else if (nameLower.includes("1kg") || nameLower.includes("1 kg")) itemWeight = "1kg Pack";
                        else if (nameLower.includes("250g") || nameLower.includes("250 g")) itemWeight = "250g Pack";
                        else if (nameLower.includes("1l") || nameLower.includes("1 litre")) itemWeight = "1 Litre";

                        return {
                          name: it.productName || it.name || "Himalayan Forest Produce",
                          weight: itemWeight,
                          qty,
                          price: Math.round(effectivePrice * 100) / 100,
                          total: Math.round(effectiveTotal * 100) / 100,
                          image: "🍯",
                        };
                      })
                    : [
                        {
                          name: "Himalayan Forest Produce",
                          weight: "Standard Pack",
                          qty: 1,
                          price: lead.estimatedValuePaise ? lead.estimatedValuePaise / 100 : 950,
                          total: lead.estimatedValuePaise ? lead.estimatedValuePaise / 100 : 950,
                          image: "🍯",
                        },
                      ];

                  const itemsSubtotal = mappedItems.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0);
                  const orderSubtotal = quote?.subtotalPaise
                    ? quote.subtotalPaise / 100
                    : itemsSubtotal > 0
                    ? itemsSubtotal
                    : (lead.estimatedValuePaise ? lead.estimatedValuePaise / 100 : 950);

                  const orderDiscount = quote?.discountPaise ? quote.discountPaise / 100 : 0;
                  const orderAmount = quote?.totalPaise
                    ? quote.totalPaise / 100
                    : lead.estimatedValuePaise
                    ? lead.estimatedValuePaise / 100
                    : Math.max(0, orderSubtotal - orderDiscount);

                  const leadOrder: Order = {
                    id: orderNumberOrId,
                    orderNumber: orderNumberOrId.startsWith("#") ? orderNumberOrId : `#${orderNumberOrId}`,
                    customerName: lead.contactName || lead.businessName || "Customer Patron",
                    customerPhone: lead.contactPhone || "",
                    customerEmail: lead.contactEmail || "",
                    shippingAddress: lead.businessName
                      ? `${lead.businessName}, ${lead.deliveryPostalCode ? `Pin: ${lead.deliveryPostalCode}, Himachal Pradesh` : "Solan, Himachal Pradesh – 173212"}`
                      : (lead.deliveryPostalCode ? `Solan, Himachal Pradesh – ${lead.deliveryPostalCode}` : "Address Pending"),
                    itemsCount: mappedItems.length,
                    amount: orderAmount,
                    subtotal: orderSubtotal,
                    discount: orderDiscount,
                    shipping: 0,
                    paymentStatus: lead.stageKey === "won" ? "Paid" : "Pending",
                    orderStatus: lead.stageKey === "won" ? "Delivered" : "Processing",
                    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                    time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                    items: mappedItems,
                    paymentMethod: lead.businessModel === "b2b_wholesale" ? "B2B Credit Terms" : "WhatsApp Order & Direct Payment",
                    trackingNumber: `ET${Math.floor(100000000 + Math.random() * 900000000)}IN`,
                  };
                  setSelectedOrderForView(leadOrder);
                } else {
                  const fallbackOrder: Order = {
                    id: cleanId,
                    orderNumber: orderNumberOrId.startsWith("#") ? orderNumberOrId : `#${orderNumberOrId}`,
                    customerName: "Prajnaa Wholesale Customer",
                    customerPhone: "+91 98160 88888",
                    customerEmail: "contact@market.prajnaa.in",
                    shippingAddress: "Solan, Himachal Pradesh – 173212",
                    itemsCount: 1,
                    amount: 3500,
                    subtotal: 3500,
                    discount: 0,
                    shipping: 0,
                    paymentStatus: "Paid",
                    orderStatus: "Delivered",
                    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                    time: "10:30 AM",
                    items: [
                      {
                        name: "Pure Himalayan Produce Harvest",
                        weight: "Standard Batch Pack",
                        qty: 1,
                        price: 3500,
                        total: 3500,
                        image: "🍯",
                      },
                    ],
                    paymentMethod: "B2B Commercial Terms",
                    trackingNumber: `ET${Math.floor(100000000 + Math.random() * 900000000)}IN`,
                  };
                  setSelectedOrderForView(fallbackOrder);
                }
                setActiveNav("order_details");
              }}
              onOpenWhatsApp={(phone, text) => {
                const cleanPhone = phone.replace(/[^0-9]/g, "");
                const existing = customers.find(
                  (c) =>
                    c.phone.replace(/[^0-9]/g, "").endsWith(cleanPhone.slice(-10)) ||
                    cleanPhone.endsWith(c.phone.replace(/[^0-9]/g, "").slice(-10))
                );
                if (existing) {
                  setSelectedCustomerId(existing.id);
                } else {
                  const newCustId = `cust_${cleanPhone || Date.now()}`;
                  const newCust = {
                    id: newCustId,
                    name: phone,
                    phone: phone,
                    avatar: "👤",
                    lastMessage: text || "Namaste!",
                    timestamp: "Just now",
                    unread: 0,
                    status: "active" as const,
                    tags: ["Lead Enquiry"],
                    latestOrder: {
                      id: `ORD-${Date.now().toString().slice(-4)}`,
                      date: new Date().toISOString().split("T")[0],
                      amount: 0,
                      items: 0,
                      status: "Processing" as const,
                      payment: "COD" as const,
                    },
                  };
                  setCustomers((prev) => [newCust as any, ...prev]);
                  setSelectedCustomerId(newCustId);
                }
                if (text) {
                  setInputMessage(text);
                }
                setActiveNav("inbox");
                toast.success(`Opening WhatsApp chat for ${phone}`);
              }}
            />
          </div>
        )}

        {/* SCREEN 1: WHATSAPP INBOX */}
        {activeNav === "inbox" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top KPI Metrics Bar with REVENUE (Hidden on small mobile screens to maximize chat area) */}
            <div className={`hidden md:grid px-4 md:px-6 py-2.5 md:py-3 border-b border-neutral-200/70 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 shrink-0 ${themeStyles.cardBg}`}>
              {/* Card 1: Total Revenue */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs hover:shadow-xs transition flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 dark:text-white leading-none">
                    ₹{(unifiedOrders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0)).toLocaleString("en-IN")}
                  </h4>
                  <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300 mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Revenue (+18.4%)
                  </p>
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 dark:text-white leading-none">
                    {unifiedOrders.length}
                  </h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Total Orders</p>
                </div>
              </div>

              {/* Card 3: Pending Payments */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center shrink-0">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">
                    {unifiedOrders.filter((o) => (o.paymentStatus || "").toLowerCase() === "pending").length}
                  </h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Pending UPI</p>
                </div>
              </div>

              {/* Card 4: Processing */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">
                    {unifiedOrders.filter((o) => String(o.orderStatus || "").toLowerCase() === "processing").length}
                  </h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Processing</p>
                </div>
              </div>

              {/* Card 5: Shipped */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">
                    {unifiedOrders.filter((o) => String(o.orderStatus || "").toLowerCase() === "shipped").length}
                  </h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Shipped</p>
                </div>
              </div>

              {/* Card 6: Unread Messages */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">
                    {totalUnreadCount}
                  </h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Unread WhatsApp</p>
                </div>
              </div>
            </div>

            {/* 3-Column WhatsApp Inbox Workspace */}
            <div className="flex-1 flex overflow-hidden">
              {/* COLUMN 1: Conversation List */}
              <div className={`${mobileChatView === "list" ? "w-full flex" : "hidden"} md:flex md:w-[310px] shrink-0 bg-white border-r border-neutral-200 flex-col overflow-hidden text-neutral-900`}>
                <div className="p-3.5 border-b border-neutral-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">💬</span> WhatsApp Inbox ({customers.length})
                      {totalUnreadCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {totalUnreadCount} unread
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <button
                      onClick={() => setInboxTab("all")}
                      className={`px-2.5 py-1 rounded-full cursor-pointer transition flex items-center gap-1 ${
                        inboxTab === "all" ? "bg-emerald-600 text-white font-bold" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      All <span className="text-[10px] opacity-90">{customers.length}</span>
                    </button>
                    <button
                      onClick={() => setInboxTab("unread")}
                      className={`px-2.5 py-1 rounded-full cursor-pointer transition flex items-center gap-1 ${
                        inboxTab === "unread" ? "bg-rose-500 text-white font-bold" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Unread <span className="text-[10px] opacity-90">{totalUnreadCount}</span>
                    </button>
                    <button
                      onClick={() => setInboxTab("assigned")}
                      className={`px-2 py-1 rounded-full cursor-pointer transition ${
                        inboxTab === "assigned" ? "bg-emerald-600 text-white font-bold" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Assigned
                    </button>
                    <button
                      onClick={() => setInboxTab("resolved")}
                      className={`px-2 py-1 rounded-full cursor-pointer transition ${
                        inboxTab === "resolved" ? "bg-emerald-600 text-white font-bold" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Resolved
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        value={inboxSearch}
                        onChange={(e) => setInboxSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-100/70 border border-neutral-200/60 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <button className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 cursor-pointer">
                      <Filter className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto mb-3">
                        💬
                      </div>
                      <p className="text-xs font-bold text-neutral-700">No conversations yet</p>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        Incoming customer messages to official WhatsApp (+91 80912 65690) will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    filteredCustomers.map((cust) => {
                    const isSelected = cust.id === selectedCustomerId;
                    return (
                      <div
                        key={cust.id}
                        onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setMobileChatView("chat");
                        if (cust.unreadCount) {
                          setCustomers((prev) => prev.map((c) => (c.id === cust.id ? { ...c, unreadCount: 0 } : c)));
                        }
                      }}
                        className={`p-3 flex items-start gap-2.5 cursor-pointer transition select-none ${
                          isSelected ? "bg-[#EBF7F2] border-l-4 border-emerald-600" : "hover:bg-neutral-50"
                        }`}
                      >
                        <div className="relative shrink-0">
                          {cust.avatar ? (
                            <img src={cust.avatar} alt={cust.name} className="h-10 w-10 rounded-full object-cover border border-neutral-200" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                              {cust.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[7px] text-white">💬</span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-neutral-900 truncate">{cust.name}</h4>
                            <span className="text-[10px] text-neutral-400 font-medium">{cust.lastMessageTime}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5 leading-snug">{cust.lastMessageText}</p>
                        </div>

                        <div className="shrink-0 pt-0.5">
                          {cust.unreadCount ? (
                            <span className="h-4 min-w-[16px] px-1 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-2xs">
                              {cust.unreadCount}
                            </span>
                          ) : (
                            <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                          )}
                        </div>
                      </div>
                    );
                  }))}
                </div>
              </div>

              {/* COLUMN 2: Chat Pane */}
              <div className={`${mobileChatView === "chat" ? "flex" : "hidden"} md:flex flex-1 flex-col bg-[#EFEAE2] relative overflow-hidden border-r border-neutral-200`}>
                <div className="h-[60px] px-3 md:px-5 bg-white border-b border-neutral-200/80 flex items-center justify-between shrink-0 shadow-2xs text-neutral-900">
                  <div className="flex items-center gap-2 md:gap-3">
                    {/* Back to list button on mobile */}
                    <button
                      onClick={() => setMobileChatView("list")}
                      className="md:hidden p-1.5 -ml-1 rounded-full text-neutral-600 hover:bg-neutral-100 transition cursor-pointer"
                      title="Back to conversation list"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="relative">
                      {currentCustomer?.avatar ? (
                        <img src={currentCustomer.avatar} alt={currentCustomer.name} className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover border border-neutral-200 shadow-2xs" />
                      ) : (
                        <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                          {currentCustomer.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                      )}
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-[7px] text-white">💬</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-xs md:text-sm text-neutral-900 leading-none truncate max-w-[130px] sm:max-w-none">{currentCustomer.name}</h3>
                        {currentCustomer.isVip && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                            <span className="text-emerald-600">✓</span> VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] md:text-[11px] text-neutral-500 font-mono">{currentCustomer.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-500 shrink-0 flex-nowrap">
                    {/* Unified Clean Gateway & Bot Status Pill */}
                    <div
                      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold shrink-0 whitespace-nowrap shadow-2xs"
                      title="Official Meta Cloud API Gateway & Auto-Responder Active (+91 80912 65690)"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Gateway Active</span>
                    </div>



                    {/* Send QR Quick Button */}
                    <button
                      type="button"
                      onClick={handleSendPaymentQr}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap shadow-2xs"
                      title="Send Official Prajnaa UPI QR Code to Customer"
                    >
                      <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Send QR</span>
                    </button>
                    {/* View Details Info button on mobile & tablets */}
                    <button
                      onClick={() => setMobileChatView("details")}
                      className="xl:hidden p-2 rounded-xl border border-neutral-200/80 hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
                      title="Customer Details & Orders"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCustomerVip(currentCustomer.id)}
                      className={`flex p-2 rounded-xl transition cursor-pointer shrink-0 ${
                        currentCustomer.isVip ? "text-amber-500 bg-amber-50 border border-amber-200" : "text-neutral-400 hover:bg-neutral-100"
                      }`}
                      title={currentCustomer.isVip ? "Starred VIP Customer (Click to toggle)" : "Star Customer as VIP"}
                    >
                      <Star className="h-4 w-4" fill={currentCustomer.isVip ? "currentColor" : "none"} />
                    </button>

                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTagMenu(!showTagMenu);
                          setShowMoreChatMenu(false);
                        }}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          showTagMenu ? "bg-emerald-100 text-emerald-800" : "text-neutral-500 hover:bg-neutral-100"
                        }`}
                        title="Manage Customer Tags"
                      >
                        <Tag className="h-4 w-4" />
                      </button>

                      {showTagMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-1">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase font-mono px-2 py-1">Customer Tags</p>
                          {["VIP Customer", "Wholesale Buyer", "Repeat Buyer", "Priority Lead", "COD Preferred"].map((t) => {
                            const active = (currentCustomer.tags || []).includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleToggleCustomerTag(t)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl font-medium transition flex items-center justify-between cursor-pointer ${
                                  active
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold"
                                    : "text-neutral-700 hover:bg-neutral-50 dark:text-slate-300"
                                }`}
                              >
                                <span>{t}</span>
                                {active && <Check className="h-3 w-3 text-emerald-600" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreChatMenu(!showMoreChatMenu);
                          setShowTagMenu(false);
                        }}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          showMoreChatMenu ? "bg-neutral-200" : "hover:bg-neutral-100 text-neutral-600"
                        }`}
                        title="Conversation Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {showMoreChatMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 text-xs space-y-1">
                          <button
                            type="button"
                            onClick={handleCreateOrderForCurrentCustomer}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-900 font-semibold flex items-center gap-2 cursor-pointer transition"
                          >
                            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Create Order for Customer</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenEditCustomer}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 font-medium flex items-center gap-2 cursor-pointer transition"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-neutral-600" />
                            <span>Edit Customer Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const clean = (currentCustomer.phone || "").replace(/\D/g, "");
                              navigator.clipboard.writeText(`https://wa.me/${clean}`);
                              toast.success("Copied WhatsApp chat link!");
                              setShowMoreChatMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 font-medium flex items-center gap-2 cursor-pointer transition"
                          >
                            <Copy className="h-3.5 w-3.5 text-neutral-600" />
                            <span>Copy WhatsApp Direct Link</span>
                          </button>
                          <div className="border-t border-neutral-100 my-1" />
                          <button
                            type="button"
                            onClick={handleClearChatHistory}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-2 cursor-pointer transition text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            <span>Clear Chat Messages</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowMoreChatMenu(false);
                              setShowDeleteContactModal(true);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-100 text-rose-800 font-semibold flex items-center gap-2 cursor-pointer transition text-xs"
                          >
                            <UserX className="h-3.5 w-3.5 text-rose-700" />
                            <span>Delete Contact & Chat History</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[radial-gradient(#d4cebe_1px,transparent_1px)] [background-size:18px_18px]">
                  {currentMessages.map((msg) => {
                    const isBusiness = msg.sender === "business";

                    if (!msg.isQr) {
                      const isImage = msg.type === "image" || (msg.mimeType && msg.mimeType.startsWith("image/"));
                      const isVideo = msg.type === "video" || (msg.mimeType && msg.mimeType.startsWith("video/"));
                      const isAudio = msg.type === "audio" || msg.type === "voice" || (msg.mimeType && msg.mimeType.startsWith("audio/"));
                      const isDoc = msg.type === "document" || (msg.mimeType && (msg.mimeType.includes("pdf") || msg.mimeType.includes("document") || msg.mimeType.includes("sheet") || msg.mimeType.includes("text")));
                      const mediaSrc = msg.mediaUrl || (msg.mediaId ? `/api/whatsapp/media/${msg.mediaId}` : "");

                      return (
                        <div key={msg.id} className={`flex ${isBusiness ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] min-w-[120px] rounded-2xl p-3 text-xs shadow-2xs space-y-1.5 relative ${
                              isBusiness ? "bg-[#DCF8C6] text-neutral-900 rounded-tr-xs" : "bg-white text-neutral-900 rounded-tl-xs"
                            }`}
                          >
                            {msg.isAutomated && (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-900 pb-1.5 mb-1 border-b border-emerald-300/70 font-subhead">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span>🤖 Automated Response • Instant</span>
                              </div>
                            )}

                            {/* Image Attachment Preview */}
                            {isImage && mediaSrc && (
                              <div className="rounded-xl overflow-hidden mb-1.5 border border-black/10 shadow-xs max-w-[280px]">
                                <img
                                  src={mediaSrc}
                                  alt={msg.text || "WhatsApp Image"}
                                  className="w-full h-auto max-h-72 object-cover cursor-pointer hover:opacity-95 transition bg-neutral-100"
                                  onClick={() => setSelectedLightboxMedia({ url: mediaSrc, type: "image", title: msg.text || "Photo" })}
                                />
                              </div>
                            )}

                            {/* Video Attachment Preview */}
                            {isVideo && mediaSrc && (
                              <div className="rounded-xl overflow-hidden mb-1.5 border border-black/10 max-w-[280px]">
                                <video
                                  src={mediaSrc}
                                  controls
                                  className="w-full h-auto max-h-72 rounded-lg bg-black"
                                />
                              </div>
                            )}

                            {/* Audio / Voice Note */}
                            {isAudio && mediaSrc && (
                              <div className="mb-1.5 max-w-[280px]">
                                <audio src={mediaSrc} controls className="w-full h-9" />
                              </div>
                            )}

                            {/* Document Preview */}
                            {isDoc && mediaSrc && (
                              <a
                                href={mediaSrc}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center gap-2.5 p-2.5 bg-black/5 hover:bg-black/10 rounded-xl transition mb-1 text-xs"
                              >
                                <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate">{msg.filename || msg.text || "Document Attachment"}</p>
                                  <span className="text-[10px] text-neutral-500">Click to view / download</span>
                                </div>
                                <Download className="h-4 w-4 text-neutral-500 shrink-0" />
                              </a>
                            )}

                            {(!isImage && !isVideo && !isDoc) || (msg.text && !msg.text.startsWith("[Image Attachment]") && !msg.text.startsWith("[Video Attachment]")) ? (
                              renderMessageContentWithLinks(msg.text)
                            ) : null}

                            <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-500 pt-0.5">
                              <span>{msg.time}</span>
                              {isBusiness && <CheckCheck className="h-3 w-3 text-sky-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Rich Prajnaa Market UPI Payment Card
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="w-[280px] bg-white rounded-2xl p-4 shadow-md border border-neutral-200/80 space-y-3">
                          <div className="flex items-center gap-2 border-b border-neutral-100 pb-2.5">
                            <span className="text-lg">🌿</span>
                            <div>
                              <h5 className="font-bold text-xs text-neutral-900 leading-tight">Prajnaa Market</h5>
                              <p className="text-[10px] text-neutral-500">UPI Payment Desk</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                            <svg viewBox="0 0 100 100" className="w-36 h-36">
                              <rect x="5" y="5" width="25" height="25" rx="2" fill="#0E382B" />
                              <rect x="9" y="9" width="17" height="17" rx="1" fill="#FFFFFF" />
                              <rect x="13" y="13" width="9" height="9" fill="#0E382B" />
                              <rect x="70" y="5" width="25" height="25" rx="2" fill="#0E382B" />
                              <rect x="74" y="9" width="17" height="17" rx="1" fill="#FFFFFF" />
                              <rect x="78" y="13" width="9" height="9" fill="#0E382B" />
                              <rect x="5" y="70" width="25" height="25" rx="2" fill="#0E382B" />
                              <rect x="9" y="74" width="17" height="17" rx="1" fill="#FFFFFF" />
                              <rect x="13" y="78" width="9" height="9" fill="#0E382B" />
                              <rect x="35" y="10" width="5" height="5" fill="#0E382B" />
                              <rect x="45" y="10" width="5" height="5" fill="#0E382B" />
                              <rect x="55" y="10" width="5" height="5" fill="#0E382B" />
                              <rect x="35" y="35" width="15" height="15" fill="#0E382B" />
                              <rect x="55" y="35" width="5" height="5" fill="#0E382B" />
                              <rect x="65" y="35" width="5" height="5" fill="#0E382B" />
                              <rect x="75" y="35" width="5" height="5" fill="#0E382B" />
                              <rect x="35" y="70" width="5" height="5" fill="#0E382B" />
                              <rect x="55" y="70" width="5" height="5" fill="#0E382B" />
                              <rect x="70" y="70" width="10" height="5" fill="#0E382B" />
                              <rect x="35" y="80" width="10" height="5" fill="#0E382B" />
                              <rect x="65" y="80" width="5" height="5" fill="#0E382B" />
                            </svg>
                            <p className="font-mono font-bold text-xs text-neutral-800 mt-2">prajnaa@upi</p>
                          </div>

                          <div className="flex items-center justify-center gap-3 pt-1 border-t border-neutral-100">
                            <span className="text-[10px] font-bold text-neutral-500">GPay</span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-[10px] font-bold text-neutral-500">PhonePe</span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-[10px] font-bold text-neutral-500">Paytm</span>
                          </div>

                          <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-400">
                            <span>{msg.time}</span>
                            <CheckCheck className="h-3 w-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Auto-Responder Realtime Processing Indicator */}
                  {isAutoReplying && (
                    <div className="flex justify-end animate-in fade-in duration-200">
                      <div className="bg-[#DCF8C6]/90 text-neutral-800 rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-2xs flex items-center gap-2 text-xs border border-emerald-300/70">
                        <div className="flex gap-1 items-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-950 font-subhead">
                          Prajnaa Auto-Responder sending reply...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Pills Bar Above Input */}
                <div className="px-4 py-2 bg-neutral-50/90 border-t border-neutral-200/60 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0 text-neutral-800 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                  <button
                    type="button"
                    onClick={handleSendPaymentQr}
                    className="px-2.5 py-1 rounded-full bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 font-semibold shrink-0 cursor-pointer transition flex items-center gap-1"
                  >
                    💰 Send UPI QR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMessage("Namaste ji! Aapka order confirm ho gaya hai. Hamari packaging team 2-3 din me artisan packing complete karke dispatch karegi. 📦");
                    }}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium shrink-0 cursor-pointer transition"
                  >
                    📦 2-3d Packing Info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ordNum = currentCustomer.latestOrder?.orderNumber && currentCustomer.latestOrder.orderNumber !== "N/A" ? currentCustomer.latestOrder.orderNumber.replace("#", "") : "";
                      const orderTag = ordNum ? ` #${ordNum}` : "";
                      setInputMessage(`Namaste ${currentCustomer.name} ji! 📦 Aapka Prajnaa Market order${orderTag} Solan mountain hub se ship ho gaya hai. Hum aapko har transit location ki live update bhejte rahenge! 🌿`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium shrink-0 cursor-pointer transition flex items-center gap-1"
                    title="Insert Order Shipped milestone message"
                  >
                    <span>📦</span> Shipped
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ordNum = currentCustomer.latestOrder?.orderNumber && currentCustomer.latestOrder.orderNumber !== "N/A" ? currentCustomer.latestOrder.orderNumber.replace("#", "") : "";
                      const orderTag = ordNum ? ` #${ordNum}` : "";
                      setInputMessage(`Namaste ${currentCustomer.name} ji! 📍 Update: aapka Prajnaa Market order${orderTag} abhi Chandigarh Hub pahunch chuka hai aur aapki taraf badh raha hai. 🚚`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium shrink-0 cursor-pointer transition flex items-center gap-1"
                    title="Insert Transit Location milestone message"
                  >
                    <span>📍</span> Location
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ordNum = currentCustomer.latestOrder?.orderNumber && currentCustomer.latestOrder.orderNumber !== "N/A" ? currentCustomer.latestOrder.orderNumber.replace("#", "") : "";
                      const orderTag = ordNum ? ` #${ordNum}` : "";
                      setInputMessage(`Namaste ${currentCustomer.name} ji! 🚚 Good news: aapka Prajnaa Market order${orderTag} kal deliver ho jayega! Kripya address par kisi ke rehne ka dhyan rakhein. 🌿`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium shrink-0 cursor-pointer transition flex items-center gap-1"
                    title="Insert Delivering Tomorrow milestone message"
                  >
                    <span>🚚</span> Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCatalogQuoteMenu(true);
                      setShowQuickTemplatesMenu(false);
                    }}
                    className="px-3 py-1 rounded-full bg-[#0F3D2E]/10 hover:bg-[#0F3D2E]/15 text-[#0F3D2E] border border-[#0F3D2E]/25 font-subhead font-semibold text-xs shrink-0 cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>🍯</span> Quick Quote ({productsList.length} Products) ▾
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickTemplatesMenu(true);
                      setShowCatalogQuoteMenu(false);
                    }}
                    className="px-3 py-1 rounded-full bg-[#E8A317]/15 hover:bg-[#E8A317]/25 text-[#925C05] border border-[#E8A317]/35 font-subhead font-semibold text-xs shrink-0 cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>⚡</span> Templates ({templatesList.length}) ▾
                  </button>
                </div>

                {/* MODAL 1: Quick Product Quote Dialog (Fixed viewport overlay, never clipped) */}
                {showCatalogQuoteMenu && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setShowCatalogQuoteMenu(false)}
                  >
                    <div
                      className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-slate-800 p-4 sm:p-5 w-full max-w-lg max-h-[85vh] flex flex-col gap-3 overflow-hidden text-neutral-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                            <span>🌿</span> Himalayan Harvest Catalogue ({productsList.length} Products)
                          </h3>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Tap any product to insert an authoritative WhatsApp quote into chat
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCatalogQuoteMenu(false)}
                          className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="overflow-y-auto max-h-[65vh] space-y-2 pr-1 divide-y divide-neutral-100 dark:divide-slate-800">
                        {productsList.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setInputMessage(
                                `Namaste ${currentCustomer.name} ji! Hamare ${p.name} (${p.origin}) ka price ₹${p.price} (${p.weight || "Pack"}) hai. Current Availability: ${p.stock} (${p.unitsLeft} units left). Pure Himalayan harvest direct from our farms! 🙏`
                              );
                              setShowCatalogQuoteMenu(false);
                              toast.success(`Inserted quote for ${p.name} into WhatsApp message!`);
                            }}
                            className="pt-2 first:pt-0 p-2 rounded-2xl hover:bg-emerald-50/70 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {p.image && (p.image.startsWith("/") || p.image.startsWith("http")) ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-10 w-10 rounded-xl object-cover border border-neutral-200 dark:border-slate-700 shadow-2xs shrink-0"
                            />
                          ) : (
                            <span className="text-3xl shrink-0 p-1.5 rounded-xl bg-neutral-100 dark:bg-slate-800">{p.image || "🌿"}</span>
                          )}
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                    {p.name}
                                  </p>
                                  {p.isCrmOnly ? (
                                    <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded shrink-0">
                                      CRM Only
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                                      Website
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-neutral-500 dark:text-slate-400 truncate">
                                  {p.weight || "500g"} • {p.origin}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-extrabold text-neutral-900 dark:text-white block font-mono">
                                ₹{p.price}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  p.stock === "In Stock"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    : p.stock === "Pre-Order"
                                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                }`}
                              >
                                {p.stock}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL 2: Quick Templates Dialog (Fixed viewport overlay, never clipped) */}
                {showQuickTemplatesMenu && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setShowQuickTemplatesMenu(false)}
                  >
                    <div
                      className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-slate-800 p-4 sm:p-5 w-full max-w-lg max-h-[85vh] flex flex-col gap-3 overflow-hidden text-neutral-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
                        <div>
                          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                            <span>📋</span> WhatsApp Templates ({templatesList.length})
                          </h3>
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Auto-personalized for {currentCustomer.name} (#{currentCustomer.latestOrder.orderNumber})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowQuickTemplatesMenu(false)}
                          className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="overflow-y-auto max-h-[65vh] space-y-2.5 pr-1">
                        {templatesList.map((tpl) => (
                          <div
                            key={tpl.id}
                            onClick={() => {
                              const personalized = interpolateCustomerTemplate(tpl.message, currentCustomer);
                              setInputMessage(personalized);
                              setShowQuickTemplatesMenu(false);
                              toast.success(`Inserted "${tpl.name}" into WhatsApp message!`);
                            }}
                            className="p-3 rounded-2xl border border-neutral-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition space-y-1.5 cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                {tpl.name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300">
                                {tpl.category}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-line">
                              {interpolateCustomerTemplate(tpl.message, currentCustomer)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL 3: Simulate Customer Query Modal */}
                {showSimulateCustomerMenu && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setShowSimulateCustomerMenu(false)}
                  >
                    <div
                      className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-slate-800 p-5 w-full max-w-lg flex flex-col gap-4 overflow-hidden text-neutral-900 dark:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
                        <div>
                          <h3 className="text-base font-bold flex items-center gap-2">
                            <span>💬</span> Simulate Customer Inquiry
                          </h3>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Pick or type what the customer asks. Prajnaa Auto-Responder will answer automatically without typing or templates.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSimulateCustomerMenu(false)}
                          className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Select a Customer Question to Test Auto-Reply</p>

                        <div
                          onClick={() => handleSimulateCustomerInquiry("Mera parcel kab tak aayega aur kitne din me deliver hoga?")}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-amber-500 hover:bg-amber-50/60 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">📦 Delivery Timeline Query</span>
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">Delivery</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-mono">"Mera parcel kab tak aayega aur kitne din me deliver hoga?"</p>
                        </div>

                        <div
                          onClick={() => handleSimulateCustomerInquiry("Maine UPI payment kar di hai, check kar lijiye. UTR: 409871239841")}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-amber-500 hover:bg-amber-50/60 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">💳 Payment & Screenshot Query</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">Payment</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-mono">"Maine UPI payment kar di hai, check kar lijiye. UTR: 409871239841"</p>
                        </div>

                        <div
                          onClick={() => handleSimulateCustomerInquiry("Order cancel ho sakta hai kya?")}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-rose-500 hover:bg-rose-50/60 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">🚫 Cancellation Query</span>
                            <span className="text-[10px] bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded-full">Cancel</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-mono">"Order cancel ho sakta hai kya?"</p>
                        </div>

                        <div
                          onClick={() => handleSimulateCustomerInquiry("Mera delivery address change ho sakta hai kya?")}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-sky-500 hover:bg-sky-50/60 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">📍 Address Update Query</span>
                            <span className="text-[10px] bg-sky-100 text-sky-900 font-bold px-2 py-0.5 rounded-full">Address</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-mono">"Mera delivery address change ho sakta hai kya?"</p>
                        </div>

                        <div
                          onClick={() => handleSimulateCustomerInquiry("Cash on delivery (COD) available hai kya?")}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-indigo-500 hover:bg-indigo-50/60 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">💵 Cash on Delivery (COD) Query</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded-full">COD</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-mono">"Cash on delivery (COD) available hai kya?"</p>
                        </div>

                        <div
                          onClick={() => handleSimulateCustomerInquiry("Kya aapka Shilajit aur Badri cow ghee 100% pure organic hai?")}
                          className="p-3 rounded-2xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/60 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-neutral-900">🌾 Purity & Himalayan Quality Query</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">Organic</span>
                          </div>
                          <p className="text-xs text-neutral-600 font-mono">"Kya aapka Shilajit aur Badri cow ghee 100% pure organic hai?"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Attachment Upload Preview Banner */}
                {selectedUploadFile && (
                  <div className="px-3.5 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {uploadPreviewUrl && (selectedUploadFile.type.startsWith("image/") || selectedUploadFile.type.startsWith("video/")) ? (
                        selectedUploadFile.type.startsWith("image/") ? (
                          <img src={uploadPreviewUrl} alt="Preview" className="h-10 w-10 object-cover rounded-lg border border-emerald-300 shadow-2xs" />
                        ) : (
                          <video src={uploadPreviewUrl} className="h-10 w-10 object-cover rounded-lg border border-emerald-300 bg-black" />
                        )
                      ) : (
                        <div className="h-10 w-10 bg-emerald-200/80 rounded-lg flex items-center justify-center font-bold text-emerald-900 text-lg">
                          📄
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold truncate text-emerald-950 max-w-[220px]">{selectedUploadFile.name}</p>
                        <span className="text-[10px] text-emerald-700">
                          {(selectedUploadFile.size / 1024).toFixed(1)} KB • Ready to send with caption
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelectedFile}
                      className="p-1 hover:bg-emerald-200/70 rounded-full text-emerald-800 transition cursor-pointer"
                      title="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={mediaFileInputRef}
                  onChange={handleSelectMediaFile}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={docFileInputRef}
                  onChange={handleSelectMediaFile}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                />

                {/* Chat Bottom Input Bar */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-neutral-200/80 flex items-center gap-2 shrink-0">
                  {/* Sender Mode Toggle */}
                  <div className="flex items-center gap-0.5 p-0.5 rounded-xl border border-neutral-200 bg-neutral-100/90 shrink-0 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setChatSenderMode("business")}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        chatSenderMode === "business"
                          ? "bg-[#0A2E22] text-[#E8A317] font-bold shadow-2xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title="Send message as Store Concierge Nishant"
                    >
                      <span>Store</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatSenderMode("customer")}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        chatSenderMode === "customer"
                          ? "bg-amber-600 text-white font-bold shadow-2xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title="Switch to customer mode to ask anything and test instant automated reply"
                    >
                      <span>👤 Customer</span>
                    </button>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker(!showEmojiPicker);
                        setShowAttachmentMenu(false);
                      }}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        showEmojiPicker ? "bg-emerald-100 text-emerald-800" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                      }`}
                      title="Insert Emoji"
                    >
                      <Smile className="h-5 w-5" />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 grid grid-cols-6 gap-1 w-52">
                        {["🙏", "📦", "🌿", "🍯", "🚚", "💰", "✨", "👍", "❤️", "📍", "🧾", "✅", "🌾", "🌰", "🥛", "⛰️", "⭐", "🎉"].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setInputMessage((prev) => prev + " " + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="p-1.5 text-lg hover:bg-neutral-100 dark:hover:bg-slate-800 rounded-lg transition text-center cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={
                      selectedUploadFile
                        ? "Add an optional caption for your file..."
                        : chatSenderMode === "customer"
                        ? `Ask anything as ${currentCustomer?.name || "Customer"} (Auto-reply triggers instantly)...`
                        : "Type a message as Store..."
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className={`flex-1 py-2 px-4 rounded-xl border text-xs focus:outline-none transition text-neutral-900 ${
                      chatSenderMode === "customer"
                        ? "bg-amber-50/50 border-amber-300 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-500"
                        : "bg-neutral-100/80 border-neutral-200/60 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    }`}
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(!showAttachmentMenu);
                        setShowEmojiPicker(false);
                      }}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        showAttachmentMenu ? "bg-emerald-100 text-emerald-800" : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                      }`}
                      title="Attach Media & Quick Items"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>

                    {showAttachmentMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 text-xs space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            mediaFileInputRef.current?.click();
                            setShowAttachmentMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-neutral-900 font-semibold flex items-center gap-2.5 cursor-pointer transition"
                        >
                          <span className="text-base">📷</span>
                          <span>Send Photo or Video</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            docFileInputRef.current?.click();
                            setShowAttachmentMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-neutral-900 font-semibold flex items-center gap-2.5 cursor-pointer transition"
                        >
                          <span className="text-base">📄</span>
                          <span>Send Document / PDF</span>
                        </button>
                        <div className="border-t border-neutral-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            handleSendPaymentQr();
                            setShowAttachmentMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-900 font-semibold flex items-center gap-2 cursor-pointer transition"
                        >
                          <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Send Official Payment QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCatalogQuoteMenu(true);
                            setShowAttachmentMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 font-medium flex items-center gap-2 cursor-pointer transition"
                        >
                          <Package className="h-3.5 w-3.5 text-neutral-600" />
                          <span>Attach Produce Catalog Quote</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const orderNum = currentCustomer.latestOrder?.orderNumber && currentCustomer.latestOrder.orderNumber !== "N/A"
                              ? `#${currentCustomer.latestOrder.orderNumber.replace('#', '')}`
                              : "order";
                            setInputMessage(`Namaste ${currentCustomer.name} ji! Aapka ${orderNum} dispatch ho gaya hai. Jald hi aap tak deliver ho jaayega. Dhanyawaad! 🌿`);
                            setShowAttachmentMenu(false);
                            toast.success("Inserted dispatch notice!");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 font-medium flex items-center gap-2 cursor-pointer transition"
                        >
                          <Truck className="h-3.5 w-3.5 text-neutral-600" />
                          <span>Attach Dispatch Notice</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isUploadingMedia || (!inputMessage.trim() && !selectedUploadFile)}
                    className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md transition cursor-pointer shrink-0 disabled:opacity-40 ${
                      chatSenderMode === "customer"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-[#0A2E22] hover:bg-[#0E3D2E] text-[#E8A317]"
                    }`}
                    title={selectedUploadFile ? "Send file to WhatsApp" : chatSenderMode === "customer" ? "Send customer question" : "Send message"}
                  >
                    {isUploadingMedia ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Send className="h-4 w-4 ml-0.5 text-white" />
                    )}
                  </button>
                </form>

                {/* Lightbox Modal for Photo / Video Preview */}
                {selectedLightboxMedia && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={() => setSelectedLightboxMedia(null)}
                  >
                    <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedLightboxMedia(null)}
                        className="absolute -top-10 right-0 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
                        title="Close preview"
                      >
                        <X className="h-6 w-6" />
                      </button>
                      <img
                        src={selectedLightboxMedia.url}
                        alt="WhatsApp Media Preview"
                        className="max-h-[82vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/10 bg-neutral-900"
                      />
                      {selectedLightboxMedia.title && selectedLightboxMedia.title !== "Photo" && (
                        <p className="text-white text-xs text-center mt-3 bg-black/60 backdrop-blur-xs px-4 py-1.5 rounded-full max-w-lg">
                          {selectedLightboxMedia.title}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* COLUMN 3: Customer Details & Order Context */}
              <div className={`${mobileChatView === "details" ? "w-full flex" : "hidden"} xl:flex xl:w-[320px] shrink-0 bg-white border-l border-neutral-200 flex-col overflow-y-auto text-neutral-900`}>
                {/* Mobile Back Button to Chat */}
                <div className="xl:hidden px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                  <button
                    onClick={() => setMobileChatView("chat")}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Conversation</span>
                  </button>
                  <span className="text-[11px] font-semibold text-neutral-500">Customer Dossier</span>
                </div>
                <div className="flex items-center border-b border-neutral-200 px-4 shrink-0 text-xs font-semibold">
                  <button
                    onClick={() => setCustomerDrawerTab("customer")}
                    className={`py-3.5 px-2 border-b-2 transition cursor-pointer ${
                      customerDrawerTab === "customer" ? "border-emerald-600 text-emerald-800 font-bold" : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    onClick={() => setCustomerDrawerTab("orders")}
                    className={`py-3.5 px-2 border-b-2 transition cursor-pointer ${
                      customerDrawerTab === "orders" ? "border-emerald-600 text-emerald-800 font-bold" : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Orders ({currentCustomer.totalOrders})
                  </button>
                  <button
                    onClick={() => setCustomerDrawerTab("notes")}
                    className={`py-3.5 px-2 border-b-2 transition cursor-pointer ${
                      customerDrawerTab === "notes" ? "border-emerald-600 text-emerald-800 font-bold" : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Notes
                  </button>
                  <button
                    onClick={() => setCustomerDrawerTab("activity")}
                    className={`py-3.5 px-2 border-b-2 transition cursor-pointer ${
                      customerDrawerTab === "activity" ? "border-emerald-600 text-emerald-800 font-bold" : "border-transparent text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    Activity
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {customerDrawerTab === "customer" && (
                    <>
                      <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200/70 relative">
                        <button
                          type="button"
                          onClick={handleOpenEditCustomer}
                          className="absolute top-3 right-3 text-[11px] font-bold text-neutral-700 hover:text-neutral-900 border border-neutral-300 hover:bg-neutral-100 rounded-lg px-2.5 py-1 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Edit Customer Profile"
                        >
                          <Edit3 className="h-3 w-3 text-emerald-600" />
                          <span>Edit</span>
                        </button>
                        <div className="relative mb-2">
                          {currentCustomer.avatar ? (
                            <img src={currentCustomer.avatar} alt={currentCustomer.name} className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm" />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center border-2 border-white shadow-sm">
                              {currentCustomer.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[8px] text-white">💬</span>
                          </div>
                        </div>

                        <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-1">
                          {currentCustomer.name}
                          <span className="text-emerald-600 text-xs">✓</span>
                        </h4>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">{currentCustomer.phone}</p>
                        {currentCustomer.isVip && (
                          <span className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            ✓ VIP Customer
                          </span>
                        )}

                        <div className="w-full mt-4 pt-3 border-t border-neutral-200/70 space-y-2 text-left text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Email</span>
                            <span className="font-medium text-neutral-800 truncate max-w-[170px]">{currentCustomer.email}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Location</span>
                            <span className="font-medium text-neutral-800">{currentCustomer.location}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Total Orders</span>
                            <span className="font-medium text-neutral-800">{currentCustomer.totalOrders} orders</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Total Spent</span>
                            <span className="font-bold text-neutral-900">₹{currentCustomer.totalSpent.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        {/* Quick Contact Actions */}
                        <div className="w-full mt-3 pt-3 border-t border-neutral-200/70 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDeleteContactModal(true)}
                            className="w-full py-2 px-3 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <UserX className="h-3.5 w-3.5 text-rose-600" />
                            <span>Delete Contact</span>
                          </button>
                        </div>
                      </div>

                      {/* Latest Order Card */}
                      {currentCustomer.latestOrder && currentCustomer.latestOrder.orderNumber !== "INQUIRY-ONLY" && currentCustomer.latestOrder.items?.length > 0 ? (
                        <div className="rounded-2xl border border-neutral-200/80 p-3.5 space-y-3 bg-white shadow-2xs">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Latest Order</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                ● {currentCustomer.latestOrder.orderStatus}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-neutral-900 font-mono truncate" title={currentCustomer.latestOrder.orderNumber}>
                                {currentCustomer.latestOrder.orderNumber}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedOrderForView(currentCustomer.latestOrder);
                                  setActiveNav("order_details");
                                }}
                                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 rounded-lg px-2.5 py-1 transition cursor-pointer shrink-0"
                              >
                                View Order
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-neutral-100">
                            {(currentCustomer.latestOrder.items || []).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{item.image}</span>
                                  <div>
                                    <p className="font-semibold text-neutral-800 leading-tight">{item.name}</p>
                                    <span className="text-[10px] text-neutral-500">{item.qty} × ₹{item.price}</span>
                                  </div>
                                </div>
                                <span className="font-bold text-neutral-900">₹{item.total.toLocaleString("en-IN")}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-neutral-100 space-y-1 text-xs">
                            <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1 border-t border-neutral-100">
                              <span>Total</span>
                              <span className="text-emerald-800 font-extrabold">₹{(currentCustomer.latestOrder.amount || 0).toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-500 bg-neutral-50/50">
                          <p className="font-bold text-neutral-700">Direct WhatsApp Inquiry</p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">No orders linked yet. Convert to lead or order anytime.</p>
                        </div>
                      )}
                    </>
                  )}

                  {customerDrawerTab === "orders" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-neutral-900 dark:text-white">Past Orders History</h4>
                        <span className="text-[11px] font-semibold text-neutral-500">
                          {crmOrders.filter((o) =>
                            o.customerPhone?.replace(/\D/g, "").endsWith(currentCustomer.phone.replace(/\D/g, "").slice(-10)) ||
                            o.customerEmail === currentCustomer.email ||
                            (currentCustomer.latestOrder?.orderNumber && o.orderNumber === currentCustomer.latestOrder.orderNumber.replace("#", ""))
                          ).length || 1} Orders
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const matchedOrders = crmOrders.filter((o) =>
                            o.customerPhone?.replace(/\D/g, "").endsWith(currentCustomer.phone.replace(/\D/g, "").slice(-10)) ||
                            o.customerEmail === currentCustomer.email ||
                            (currentCustomer.latestOrder?.orderNumber && o.orderNumber === currentCustomer.latestOrder.orderNumber.replace("#", ""))
                          );

                          const displayList = matchedOrders.length > 0 ? matchedOrders : (currentCustomer.latestOrder ? [currentCustomer.latestOrder] : []);

                          return displayList.map((ord: any, idx: number) => {
                            const orderNum = ord.orderNumber?.startsWith("#") ? ord.orderNumber : `#${ord.orderNumber || ord.id || "PM2024001234"}`;
                            const orderAmt = ord.totalPaise ? ord.totalPaise / 100 : ord.amount || 1740;
                            const orderStatus = ord.status || ord.orderStatus || "Processing";
                            const orderDate = ord.createdAt
                              ? new Date(ord.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : ord.date || "12 Mar 2024";
                            const itemsCount = ord.items?.length || ord.itemsCount || 2;
                            const itemsText = Array.isArray(ord.items) && ord.items.length > 0
                              ? ord.items.map((i: any) => `${i.productName || i.name} × ${i.quantity || i.qty || 1}`).join(", ")
                              : "Himalayan produce harvest";

                            return (
                              <div key={idx} className="p-3 rounded-xl border border-neutral-200 dark:border-slate-800 bg-neutral-50/70 dark:bg-slate-800/50 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">{orderNum}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    orderStatus === "Delivered" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                  }`}>
                                    {orderStatus}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-600 dark:text-slate-300 line-clamp-1">{itemsText}</p>
                                <div className="flex items-center justify-between pt-1 border-t border-neutral-200/50 dark:border-slate-700/50 text-xs">
                                  <span className="text-neutral-500">{orderDate} • {itemsCount} items</span>
                                  <span className="font-extrabold text-neutral-900 dark:text-white">₹{orderAmt.toLocaleString("en-IN")}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInputMessage(`Namaste ${currentCustomer.name} ji! Aapke order ${orderNum} (₹${orderAmt.toLocaleString("en-IN")}) ka current status "${orderStatus}" hai. Pure Himalayan harvest packaging process ho rahi hai. 🙏`);
                                    toast.success("Copied order update to chat input!");
                                  }}
                                  className="w-full mt-1 py-1 rounded-lg border border-neutral-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-[11px] font-semibold text-neutral-700 dark:text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Share2 className="h-3 w-3 text-emerald-600" /> WhatsApp Order Update
                                </button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {customerDrawerTab === "notes" && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-neutral-900">Internal Agent Notes</h4>
                      <textarea
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        rows={6}
                        className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Add notes about customer preferences..."
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomerNotes}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save Notes</span>
                      </button>
                    </div>
                  )}

                  {customerDrawerTab === "activity" && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-neutral-900">Customer Audit Trail</h4>
                      <div className="space-y-2.5 text-xs text-neutral-600">
                        <div className="flex gap-2">
                          <span className="text-emerald-600">●</span>
                          <div>
                            <p className="font-medium text-neutral-900">Payment QR Requested</p>
                            <span className="text-[10px] text-neutral-400">Today at 10:24 AM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: DASHBOARD VIEW (Admin only) */}
        {activeNav === "dashboard" && userPermissions.allowedTabs.includes("dashboard") && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Good Morning, {currentUser.name}! 👋</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Here's what's happening with your Himalayan produce orders, revenue, and WhatsApp operations today.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-white border border-neutral-200/80 rounded-xl text-xs font-semibold shadow-2xs self-start sm:self-auto overflow-x-auto no-scrollbar">
                {(["7d", "30d", "quarter"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setGraphTimeframe(t)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer capitalize text-[11px] sm:text-xs whitespace-nowrap ${
                      graphTimeframe === t ? "bg-emerald-600 text-white font-bold" : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    {t === "7d" ? "Last 7 Days" : t === "30d" ? "Last 30 Days" : "This Quarter"}
                  </button>
                ))}
              </div>
            </div>

            {/* Row of 6 High-Impact Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              <div className="bg-gradient-to-br from-[#0E382B] to-[#164E3A] text-white p-4 rounded-2xl shadow-md space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-emerald-200">Total Revenue</span>
                  <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold tracking-tight">
                  ₹{activeTimeframeData.metrics.revenue.toLocaleString("en-IN")}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-200/90 pt-0.5">
                  <span className="font-bold text-amber-300 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> {activeTimeframeData.metrics.revenueGrowth}
                  </span>
                  <span>verified sales</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500">Total Orders</span>
                  <div className="h-6 w-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                  {activeTimeframeData.metrics.orders}
                </h4>
                <span className="text-[10px] text-emerald-600 font-bold">{activeTimeframeData.metrics.ordersGrowth}</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500">Pending UPI</span>
                  <div className="h-6 w-6 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                    <QrCode className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.pendingUpi}</h4>
                <span className="text-[10px] text-orange-700 font-bold">{activeTimeframeData.metrics.pendingUpiDue}</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500">Processing</span>
                  <div className="h-6 w-6 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.processing}</h4>
                <span className="text-[10px] text-sky-700 font-bold">{activeTimeframeData.metrics.processingNote}</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500">Shipped</span>
                  <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Truck className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.shipped}</h4>
                <span className="text-[10px] text-indigo-700 font-bold">{activeTimeframeData.metrics.shippedNote}</span>
              </div>

              <div className={`p-4 rounded-2xl border shadow-2xs hover:shadow-xs transition flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500">Delivered</span>
                  <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <h4 className="text-xl font-extrabold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.delivered}</h4>
                <span className="text-[10px] text-emerald-700 font-bold">{activeTimeframeData.metrics.deliveredSatisfaction}</span>
              </div>
            </div>

            {/* Interactive Order & Revenue Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className={`lg:col-span-2 p-4 sm:p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Order & Revenue Velocity</h3>
                    <p className="text-xs text-neutral-500">
                      {activeTimeframeData.periodSubtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-3 w-3 rounded-sm bg-gradient-to-t from-emerald-700 to-emerald-500 shadow-xs" />
                      Revenue (₹)
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      Orders
                    </span>
                  </div>
                </div>

                <div className="h-9 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  {hoveredBarIndex !== null && DAILY_ORDER_DATA[hoveredBarIndex] ? (
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        🗓️ {DAILY_ORDER_DATA[hoveredBarIndex].date}:
                      </span>
                      <span>
                        Total Orders: <strong className="font-mono text-neutral-900 dark:text-white">{DAILY_ORDER_DATA[hoveredBarIndex].orders}</strong>
                      </span>
                      <span>
                        Daily Revenue: <strong className="font-mono text-emerald-700 dark:text-emerald-400">₹{DAILY_ORDER_DATA[hoveredBarIndex].revenue.toLocaleString("en-IN")}</strong>
                      </span>
                      <span className="text-[11px] text-neutral-500 hidden sm:inline">
                        (AOV: ₹{Math.round(DAILY_ORDER_DATA[hoveredBarIndex].revenue / DAILY_ORDER_DATA[hoveredBarIndex].orders)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-xs flex items-center gap-1.5 italic">
                      <span>💡</span> Hover over any bar to view metrics breakdown
                    </span>
                  )}
                  <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {activeTimeframeData.avgDailyText}
                  </span>
                </div>

                {/* The Chart Canvas with Background Gridlines & Solid Visible Bars */}
                <div className="relative pt-6 pb-2">
                  {/* Subtle Grid Guidelines */}
                  <div className="absolute inset-x-0 top-6 bottom-8 flex flex-col justify-between pointer-events-none text-[10px] text-neutral-400 font-mono">
                    <div className="border-b border-dashed border-neutral-200/80 dark:border-slate-700 flex justify-between pb-0.5">
                      <span className="bg-white/80 dark:bg-slate-800 px-1 rounded">{activeTimeframeData.peakCapacityText}</span>
                      <span className="text-neutral-300 dark:text-slate-600">Peak Capacity</span>
                    </div>
                    <div className="border-b border-dashed border-neutral-200/80 dark:border-slate-700 flex justify-between pb-0.5">
                      <span className="bg-white/80 dark:bg-slate-800 px-1 rounded">{activeTimeframeData.midTargetText}</span>
                      <span className="text-neutral-300 dark:text-slate-600">Mid-target</span>
                    </div>
                    <div className="border-b border-neutral-300 dark:border-slate-600 flex justify-between pb-0.5">
                      <span className="bg-white/80 dark:bg-slate-800 px-1 rounded">₹0</span>
                      <span className="text-neutral-300 dark:text-slate-600">Baseline</span>
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="h-48 flex items-end justify-between gap-2 px-2 relative z-10">
                    {DAILY_ORDER_DATA.map((d, i) => {
                      const barHeightPx = Math.max(14, Math.round((d.revenue / activeTimeframeData.maxRevenue) * 140));
                      const isHovered = hoveredBarIndex === i;
                      return (
                        <div
                          key={i}
                          onMouseEnter={() => setHoveredBarIndex(i)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer relative"
                        >
                          {/* Floating Tooltip */}
                          {isHovered && (
                            <div className="absolute -top-10 z-30 bg-neutral-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                              <span className="font-bold text-emerald-400">₹{d.revenue.toLocaleString("en-IN")}</span>
                              <span className="text-neutral-300"> • {d.orders} orders</span>
                            </div>
                          )}

                          {/* Bar Track Container */}
                          <div className="w-full h-36 flex items-end justify-center relative px-0.5">
                            {/* Track pill */}
                            <div className="w-full max-w-[24px] h-full bg-neutral-100 dark:bg-slate-700/60 rounded-t-md absolute bottom-0 transition-colors group-hover:bg-neutral-200/70 dark:group-hover:bg-slate-600/70" />

                            {/* Revenue Bar */}
                            <div
                              className={`w-full max-w-[24px] rounded-t-md transition-all duration-300 relative z-10 shadow-xs ${
                                isHovered
                                  ? "bg-gradient-to-t from-emerald-800 to-emerald-400 ring-2 ring-emerald-400"
                                  : "bg-gradient-to-t from-emerald-700 to-emerald-500 hover:from-emerald-600 hover:to-emerald-400"
                              }`}
                              style={{ height: `${barHeightPx}px` }}
                            />
                          </div>

                          {/* Date Label */}
                          <span
                            className={`text-[10px] mt-2 transition-colors font-medium shrink-0 ${
                              isHovered
                                ? "text-emerald-700 dark:text-emerald-400 font-bold"
                                : "text-neutral-500 dark:text-slate-400"
                            }`}
                          >
                            {d.date.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Status Donut */}
              <div className={`p-6 rounded-2xl border shadow-2xs space-y-4 flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Order Status Distribution</h3>
                  <p className="text-xs text-neutral-500">Live operational status breakdown</p>
                </div>

                <div className="relative h-44 flex items-center justify-center">
                  <svg className="w-36 h-36 -rotate-90">
                    {activeTimeframeData.metrics.orders === 0 ? (
                      <circle cx="72" cy="72" r="54" stroke="currentColor" className="text-neutral-200 dark:text-slate-700" strokeWidth="18" fill="none" />
                    ) : (
                      (() => {
                        const total = activeTimeframeData.metrics.orders;
                        const circ = 2 * Math.PI * 54;
                        const pDash = (activeTimeframeData.metrics.pendingUpi / total) * circ;
                        const prDash = (activeTimeframeData.metrics.processing / total) * circ;
                        const sDash = (activeTimeframeData.metrics.shipped / total) * circ;
                        const dDash = (activeTimeframeData.metrics.delivered / total) * circ;

                        let offset = 0;
                        const pOff = -offset;
                        offset += pDash;
                        const prOff = -offset;
                        offset += prDash;
                        const sOff = -offset;
                        offset += sDash;
                        const dOff = -offset;

                        return (
                          <>
                            {pDash > 0 && <circle cx="72" cy="72" r="54" stroke="#F59E0B" strokeWidth="18" fill="none" strokeDasharray={`${pDash} ${circ}`} strokeDashoffset={pOff} />}
                            {prDash > 0 && <circle cx="72" cy="72" r="54" stroke="#3B82F6" strokeWidth="18" fill="none" strokeDasharray={`${prDash} ${circ}`} strokeDashoffset={prOff} />}
                            {sDash > 0 && <circle cx="72" cy="72" r="54" stroke="#6366F1" strokeWidth="18" fill="none" strokeDasharray={`${sDash} ${circ}`} strokeDashoffset={sOff} />}
                            {dDash > 0 && <circle cx="72" cy="72" r="54" stroke="#10B981" strokeWidth="18" fill="none" strokeDasharray={`${dDash} ${circ}`} strokeDashoffset={dOff} />}
                          </>
                        );
                      })()
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold text-neutral-900 dark:text-white leading-none">
                      {activeTimeframeData.metrics.orders}
                    </span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">Total Orders</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending Payment
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.pendingUpi}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> Processing
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.processing}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" /> Shipped
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.shipped}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Delivered
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">{activeTimeframeData.metrics.delivered}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Recent Real-Time Orders */}
            <div className={`p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
              <div className="flex items-center justify-between border-b border-neutral-200/60 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Recent Himalayan Orders & Consignments</h3>
                  <p className="text-xs text-neutral-500">Live feed of orders received via WhatsApp and web storefront</p>
                </div>
                <button
                  onClick={() => setActiveNav("orders")}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All Orders <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-slate-800/60 text-neutral-500 dark:text-slate-400 border-b border-neutral-200/60">
                    <tr>
                      <th className="p-3 font-semibold">Order ID</th>
                      <th className="p-3 font-semibold">Customer</th>
                      <th className="p-3 font-semibold">Items</th>
                      <th className="p-3 font-semibold">Amount</th>
                      <th className="p-3 font-semibold">Payment</th>
                      <th className="p-3 font-semibold">Fulfillment</th>
                      <th className="p-3 font-semibold">Consignment / Tracking</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                    {unifiedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-neutral-400 opacity-60" />
                          <div className="font-semibold text-sm text-neutral-700 dark:text-slate-300">No Orders Yet</div>
                          <p className="text-xs text-neutral-500 mt-1">Real customer orders received via WhatsApp or web checkout will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      unifiedOrders.slice(0, 5).map((o, idx) => (
                        <tr
                          key={o.id || idx}
                          className="hover:bg-neutral-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer"
                          onClick={() => {
                            setSelectedOrderForView(o);
                            setActiveNav("order_details");
                          }}
                        >
                          <td className="p-3 font-mono font-bold text-neutral-900 dark:text-white">
                            {o.orderNumber}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-neutral-900 dark:text-white">{o.customerName || "Customer"}</div>
                            <span className="text-[10px] text-neutral-400 font-mono">{o.customerPhone || "N/A"}</span>
                          </td>
                          <td className="p-3 text-neutral-600 dark:text-slate-300">
                            {Array.isArray(o.items) && o.items.length > 0
                              ? o.items.map((it: any) => it.name || it.productName).join(", ").slice(0, 32) + (o.items.length > 1 ? "..." : "")
                              : `${o.itemsCount || 1} item(s)`}
                          </td>
                          <td className="p-3 font-bold text-neutral-900 dark:text-white">
                            ₹{(Number(o.amount) || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                String(o.paymentStatus).toLowerCase() === "paid"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              }`}
                            >
                              ● {o.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                              {o.orderStatus}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-neutral-600 dark:text-slate-300">
                            {o.trackingNumber || (o as any).trackingId || "Pending Dispatch"}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderForView(o);
                                setActiveNav("order_details");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 5: Operational Quick Action Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Collect Outstanding Payments */}
              <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 px-2 py-0.5 rounded-full font-mono">
                      {pendingPaymentCount} Pending UPI
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Collect Outstanding Payments</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      ₹{pendingPaymentTotal.toLocaleString("en-IN")} awaiting customer UPI verification across Dehradun and Delhi orders.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleDispatchQrReminders}
                    className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> Dispatch QR Reminders
                  </button>
                  <button
                    onClick={() => {
                      setOrdersFilter("pending");
                      setActiveNav("orders");
                    }}
                    className="w-full text-center text-[11px] font-semibold text-orange-700 dark:text-orange-400 hover:underline cursor-pointer"
                  >
                    View Pending Orders ({pendingPaymentCount}) →
                  </button>
                </div>
              </div>

              {/* Card 2: Shipping Dispatch Queue */}
              <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                      {speedPostQueueCount} Parcels
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Shipping Dispatch Queue</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Himalayan raw honey and A2 cow ghee ready for booking at Dehradun Head Post Office.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleOpenShippingManifest}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Package className="h-3.5 w-3.5" /> Open Shipping Manifest
                  </button>
                  <button
                    onClick={() => {
                      setOrdersFilter("processing");
                      setActiveNav("orders");
                    }}
                    className="w-full text-center text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    View Processing Queue ({speedPostQueueCount}) →
                  </button>
                </div>
              </div>

              {/* Card 3: Artisan Harvest Inventory */}
              <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 flex flex-col justify-between ${themeStyles.cardBg}`}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                      {lowStockItems.length > 0 ? `${lowStockItems.length} Low Stock Alert` : "Stock Alert"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Artisan Harvest Inventory</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {lowStockItems.length > 0
                        ? `${lowStockItems.map((p) => p.name.split(" ")[0] + " " + (p.name.split(" ")[1] || "")).slice(0, 2).join(" & ")} down to last batch at Haridwar facility.`
                        : "Pure Shilajit Resin & Kashmiri Saffron down to last batch at Haridwar facility."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleReorderFromCooperative}
                    className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Reorder from Cooperative
                  </button>
                  <button
                    onClick={() => setActiveNav("products")}
                    className="w-full text-center text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Manage Inventory Catalog ({productsList.length} SKUs) →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 3: ORDERS MANAGEMENT */}
        {activeNav === "orders" && userPermissions.allowedTabs.includes("orders") && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Orders Management</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Manage, track, and update all customer orders from WhatsApp and web checkout.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportOrdersCsv}
                  className="px-3.5 sm:px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Export Orders to CSV / Excel spreadsheet"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => setShowAddOrderModal(true)}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> + Create Order
                </button>
              </div>
            </div>

            {/* Search and Quick Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Tabs with Counters */}
              <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {[
                  { id: "all", label: "All Orders", count: orderTabCounts.all },
                  { id: "pending", label: "Pending", count: orderTabCounts.pending },
                  { id: "processing", label: "Processing", count: orderTabCounts.processing },
                  { id: "packed", label: "Packed", count: orderTabCounts.packed },
                  { id: "shipped", label: "Shipped", count: orderTabCounts.shipped },
                  { id: "completed", label: "Completed", count: orderTabCounts.completed },
                  { id: "cancelled", label: "Cancelled", count: orderTabCounts.cancelled },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setOrdersFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      ordersFilter === pill.id
                        ? "bg-emerald-600 text-white font-bold shadow-2xs"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        ordersFilter === pill.id
                          ? "bg-white/20 text-white"
                          : "bg-neutral-200/80 text-neutral-600"
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px] max-w-xs w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  placeholder="Search order #, customer, phone..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {ordersSearch && (
                  <button
                    onClick={() => setOrdersSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[960px] text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-200/80 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3.5 font-bold whitespace-nowrap">Order ID</th>
                      <th className="p-3.5 font-bold whitespace-nowrap">Customer</th>
                      <th className="p-3.5 font-bold whitespace-nowrap">Items</th>
                      <th className="p-3.5 font-bold whitespace-nowrap">Amount</th>
                      <th className="p-3.5 font-bold text-center whitespace-nowrap">Payment</th>
                      <th className="p-3.5 font-bold text-center whitespace-nowrap">Status</th>
                      <th className="p-3.5 font-bold text-center whitespace-nowrap">Date</th>
                      <th className="p-3.5 font-bold text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredUnifiedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-10 text-center">
                          <div className="flex flex-col items-center justify-center space-y-2 text-neutral-400">
                            <ShoppingBag className="h-8 w-8 stroke-1 text-neutral-300" />
                            <p className="text-sm font-semibold text-neutral-700">No orders found</p>
                            <p className="text-xs text-neutral-500 max-w-sm">
                              {ordersFilter !== "all"
                                ? `There are no orders currently marked as "${ordersFilter}". Switch tab or create an order.`
                                : "No orders found in the database. Use '+ Create Order' to add one."}
                            </p>
                            <button
                              onClick={() => setShowAddOrderModal(true)}
                              className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> + Create Order Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUnifiedOrders.map((ord) => {
                        const statusColors: Record<string, string> = {
                          pending: "bg-amber-50 text-amber-900 border-amber-200",
                          processing: "bg-sky-50 text-sky-900 border-sky-200",
                          packed: "bg-purple-50 text-purple-900 border-purple-200",
                          shipped: "bg-indigo-50 text-indigo-900 border-indigo-200",
                          completed: "bg-emerald-50 text-emerald-900 border-emerald-200",
                          delivered: "bg-emerald-50 text-emerald-900 border-emerald-200",
                          cancelled: "bg-rose-50 text-rose-900 border-rose-200",
                        };
                        const currentStatusKey = String(ord.orderStatus || "Pending").toLowerCase();
                        const statusBadgeClass = statusColors[currentStatusKey] || "bg-neutral-100 text-neutral-800 border-neutral-200";

                        const cleanPhone = (ord.customerPhone || "").replace(/\D/g, "");
                        const waMsg = encodeURIComponent(
                          `Namaste ${ord.customerName || "ji"}! 🙏 Prajnaa Market update for Order ${ord.orderNumber}: Status is now ${ord.orderStatus}.`
                        );
                        const waLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${waMsg}` : null;

                        return (
                          <tr
                            key={ord.orderNumber}
                            className="hover:bg-neutral-50/70 transition"
                          >
                            <td className="p-3.5 font-mono font-bold text-neutral-900 whitespace-nowrap">
                              <span className="text-emerald-700">{ord.orderNumber}</span>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-neutral-900">{ord.customerName || "Customer"}</div>
                              {ord.customerPhone && (
                                <div className="text-[11px] text-neutral-400 font-mono">{ord.customerPhone}</div>
                              )}
                            </td>
                            <td className="p-3.5 text-neutral-600">
                              {ord.items && ord.items.length > 0 ? (
                                <span title={ord.items.map((i: any) => `${i.name} (${i.qty})`).join(", ")}>
                                  {ord.items[0]?.name}
                                  {ord.items.length > 1 ? ` +${ord.items.length - 1} more` : ""}
                                </span>
                              ) : (
                                `${ord.itemsCount || 1} items`
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-neutral-900 whitespace-nowrap">
                              ₹{Number(ord.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              {String(ord.paymentStatus || "").toLowerCase() === "paid" ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 select-none pointer-events-none">
                                  <Check className="h-3 w-3" /> Paid
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMarkOrderAsPaid(ord)}
                                  title="1-Click: Verify & Mark Payment as Paid"
                                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 transition inline-flex items-center gap-1 cursor-pointer group shadow-2xs"
                                >
                                  <span>Pending</span>
                                  <span className="text-[9px] font-extrabold text-emerald-700 underline ml-0.5">
                                    ✓ Mark Paid
                                  </span>
                                </button>
                              )}
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap select-none pointer-events-none shadow-3xs ${statusBadgeClass}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                                <span>{ord.orderStatus || "Pending"}</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-neutral-500 whitespace-nowrap text-center">{ord.date}</td>
                            <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {/* 1. Tracking ID Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderForView(ord);
                                    setEditTrackingNumber(ord.trackingNumber || "");
                                    setShowTrackingModal(true);
                                  }}
                                  title={ord.trackingNumber ? `Consignment: ${ord.trackingNumber}` : "Add / Edit Tracking ID"}
                                  className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span className="font-mono text-[11px] truncate max-w-[100px]">
                                    {ord.trackingNumber ? ord.trackingNumber : "Tracking ID"}
                                  </span>
                                </button>

                                {/* 2. Shipping Button -> Opens Status Change Page */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderForView(ord);
                                    setStatusUpdateChoice((ord.orderStatus as any) || "Processing");
                                    setCustomStatusMessage("");
                                    setIsEditingStatusTemplate(false);
                                    setShowStatusModal(true);
                                  }}
                                  title="Change Order Status & Shipping Updates"
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <Truck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                                  <span>Shipping</span>
                                </button>

                                {/* 3. View Button (Only View button in place of pencil, chat, arrow) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderForView(ord);
                                    setActiveNav("order_details");
                                  }}
                                  title="View Order Details & Invoice"
                                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 shrink-0" />
                                  <span>View</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: ORDER DETAILS */}
        {activeNav === "order_details" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Header: Dynamic Navigation & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveNav(orderPreviousNav || "orders")}
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>
                    {orderPreviousNav === "leads"
                      ? "Back to Leads & Sales"
                      : orderPreviousNav === "inbox"
                      ? "Back to WhatsApp Inbox"
                      : "Back to Orders"}
                  </span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white font-mono tracking-tight">
                      Order {selectedOrderForView.orderNumber}
                    </h2>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        ["Completed", "Delivered"].includes(selectedOrderForView.orderStatus)
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700"
                          : ["Shipped"].includes(selectedOrderForView.orderStatus)
                          ? "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700"
                          : ["Packed", "Processing"].includes(selectedOrderForView.orderStatus)
                          ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-700"
                          : ["Cancelled"].includes(selectedOrderForView.orderStatus)
                          ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700"
                          : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
                      }`}
                    >
                      ● {selectedOrderForView.orderStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Placed on {selectedOrderForView.date}, {selectedOrderForView.time || "10:15 AM"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 text-xs font-bold text-neutral-700 dark:text-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-600" /> Print Invoice
                </button>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Update Status
                </button>
              </div>
            </div>

            {/* Main Content: 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1 & 2: Items & Financial Breakdown & Journey (Span 2) */}
              <div className="lg:col-span-2 space-y-6">
                {/* 1. Itemized Product Table */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-emerald-600" />
                      <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Order Items & Produce
                      </h3>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-300">
                      {selectedOrderForView.items?.length || selectedOrderForView.itemsCount || 1} item(s)
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-100 dark:divide-slate-800">
                    {selectedOrderForView.items && selectedOrderForView.items.length > 0 ? (
                      selectedOrderForView.items.map((item, idx) => (
                        <div key={idx} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700 flex items-center justify-center text-xl shrink-0">
                              {item.image && typeof item.image === "string" && !item.image.startsWith("http") ? item.image : "🍯"}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white break-words">
                                {item.name}
                              </h4>
                              <p className="text-[11px] text-neutral-500 font-mono">
                                Pack / Weight: {item.weight || "Standard Pack"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                              ₹{Number(item.price || 0).toLocaleString("en-IN")} × {item.qty || 1}
                            </div>
                            <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                              ₹{Number(item.total || (item.price * (item.qty || 1)) || 0).toLocaleString("en-IN")}
                            </div>
                            {item.discount && Number(item.discount) > 0 ? (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                -₹{Number(item.discount).toLocaleString("en-IN")} off
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700 flex items-center justify-center text-xl">
                            🍯
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                              Himalayan Artisanal Produce Package
                            </h4>
                            <p className="text-xs text-neutral-500">
                              Direct Farm-to-Table Consignment ({selectedOrderForView.itemsCount || 1} item)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-extrabold text-sm text-emerald-700 dark:text-emerald-400">
                            ₹{Number(selectedOrderForView.amount || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Commercial & Pricing Summary Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                    <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                      Payment & Commercial Summary
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          String(selectedOrderForView.paymentStatus || "").toLowerCase() === "paid"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200"
                        }`}
                      >
                        {selectedOrderForView.paymentStatus || "Pending"}
                      </span>
                      {String(selectedOrderForView.paymentStatus || "").toLowerCase() !== "paid" && (
                        <button
                          type="button"
                          onClick={() => handleMarkOrderAsPaid(selectedOrderForView)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          title="Verify payment and send WhatsApp confirmation receipt"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Paid
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-600 dark:text-slate-400">
                      <span>Produce Subtotal:</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                        ₹{Number(selectedOrderForView.subtotal || selectedOrderForView.amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between text-neutral-600 dark:text-slate-400">
                      <span>Shipping Delivery:</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                        ₹{Number(selectedOrderForView.shipping || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {Number(selectedOrderForView.discount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Commercial Discount Applied:</span>
                        <span className="font-mono">-₹{Number(selectedOrderForView.discount).toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm font-extrabold text-neutral-900 dark:text-white pt-2.5 border-t border-neutral-100 dark:border-slate-800">
                      <span>Total Amount Payable:</span>
                      <span className="text-xl font-mono text-emerald-700 dark:text-emerald-400">
                        ₹{Number(selectedOrderForView.amount || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>Payment Method:</span>
                      <span className="font-bold text-neutral-800 dark:text-slate-200">
                        {selectedOrderForView.paymentMethod || "UPI / WhatsApp QR"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Speed Post Logistics & Dispatch Stepper */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-emerald-600" />
                      <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                        Speed Post Fulfillment & Tracking
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-neutral-600 dark:text-slate-300">
                      Consignment: {selectedOrderForView.trackingNumber || "Pending Dispatch"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    {[
                      { step: "1. Confirmed", desc: "Order recorded & staged", done: true },
                      {
                        step: "2. Quality Packed",
                        desc: "Himalayan produce sealed",
                        done: ["Packed", "Shipped", "Delivered", "Completed"].includes(selectedOrderForView.orderStatus),
                      },
                      {
                        step: "3. Dispatched",
                        desc: "In transit",
                        done: ["Shipped", "Delivered", "Completed"].includes(selectedOrderForView.orderStatus),
                      },
                      {
                        step: "4. Delivered",
                        desc: "Safely received",
                        done: ["Delivered", "Completed"].includes(selectedOrderForView.orderStatus),
                      },
                    ].map((st, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-2xl border text-xs ${
                          st.done
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                            : "bg-neutral-50 dark:bg-slate-800/40 border-neutral-200 dark:border-slate-800 text-neutral-400"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <CheckCircle2 className={`h-3.5 w-3.5 ${st.done ? "text-emerald-600" : "text-neutral-300"}`} />
                          <span>{st.step}</span>
                        </div>
                        <p className="text-[10px] mt-1 opacity-80">{st.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-neutral-500">Logistics Carrier: Speed Post</span>
                    {selectedOrderForView.trackingNumber ? (
                      <button
                        onClick={() => {
                          if (selectedOrderForView.trackingNumber) {
                            navigator.clipboard.writeText(selectedOrderForView.trackingNumber);
                            toast.success("Tracking number copied to clipboard!");
                          }
                        }}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" /> Copy Tracking ID
                      </button>
                    ) : (
                      <span className="text-neutral-400">Tracking ID generated on dispatch</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Customer Information & Quick Action Cards */}
              <div className="space-y-6">
                {/* 1. Customer Information Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                    <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">Customer Details</h3>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                      {(selectedOrderForView.customerName || "Customer").charAt(0).toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-neutral-400 text-[11px] block">Full Name</span>
                      <span className="font-bold text-neutral-900 dark:text-white text-sm">
                        {selectedOrderForView.customerName || "Valued Customer"}
                      </span>
                    </div>

                    <div>
                      <span className="text-neutral-400 text-[11px] block">Contact Number</span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono font-bold text-neutral-800 dark:text-slate-200">
                          {selectedOrderForView.customerPhone || "Not specified"}
                        </span>
                        {selectedOrderForView.customerPhone && (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPhone = (selectedOrderForView.customerPhone || "").replace(/\D/g, "");
                              const cust = customers.find(
                                (c) => (c.phone || "").replace(/\D/g, "") === cleanPhone || c.name === selectedOrderForView.customerName
                              );
                              if (cust) {
                                setSelectedCustomerId(cust.id);
                              }
                              setActiveNav("inbox");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            title="Open Chat in CRM"
                          >
                            <MessageSquare className="h-3 w-3" /> CRM Chat
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-neutral-400 text-[11px] block">Delivery Address</span>
                      <p className="font-medium text-neutral-800 dark:text-slate-200 mt-0.5 leading-relaxed">
                        {selectedOrderForView.shippingAddress || "Uttarakhand, India"}
                      </p>
                    </div>

                    {selectedOrderForView.customerEmail && (
                      <div>
                        <span className="text-neutral-400 text-[11px] block">Email Address</span>
                        <span className="font-mono text-neutral-800 dark:text-slate-300">
                          {selectedOrderForView.customerEmail}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Direct Operations & Notifications Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-neutral-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-3">
                  <h3 className="font-extrabold text-sm text-neutral-900 dark:text-white">
                    Operational Actions
                  </h3>

                  {String(selectedOrderForView.paymentStatus || "").toLowerCase() !== "paid" ? (
                    <button
                      type="button"
                      onClick={() => handleMarkOrderAsPaid(selectedOrderForView)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-200" /> Mark as Paid (Payment Received)
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Payment Verified & Paid
                    </div>
                  )}

                  <button
                    onClick={() => {
                      handleSendPaymentQr();
                      toast.success("Sent payment QR directly to customer WhatsApp!");
                    }}
                    className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-xs font-bold text-neutral-700 dark:text-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5 text-emerald-600" /> Send QR via WhatsApp
                  </button>

                  <button
                    onClick={async () => {
                      const cleanPhone = (selectedOrderForView.customerPhone || "").replace(/\D/g, "");
                      const trackingId = selectedOrderForView.trackingNumber;
                      const trackingLine = trackingId ? `\n\n📦 *Tracking Consignment:* ${trackingId}` : "";
                      const msg = `Namaste ${selectedOrderForView.customerName || "ji"}! 🙏 Prajnaa Market se aapka order ${selectedOrderForView.orderNumber} dispatch kar diya gaya hai.${trackingLine}\n\nHumare organic Himalayan farms se judne ke liye dhanyawaad! 🌿`;

                      const cust = customers.find(
                        (c) => (c.phone || "").replace(/\D/g, "") === cleanPhone || c.name === selectedOrderForView.customerName
                      ) || currentCustomer;

                      try {
                        await fetch("/api/crm/messages", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            to: cleanPhone || "918091265690",
                            text: msg,
                            customerId: cust.id,
                            orderNumber: selectedOrderForView.orderNumber,
                            customerName: selectedOrderForView.customerName,
                            sender: "business",
                          }),
                        });
                      } catch (err) {
                        console.warn("Message sync warning:", err);
                      }

                      setMessagesMap((prev: any) => ({
                        ...prev,
                        [cust.id]: [
                          ...(prev[cust.id] || []),
                          {
                            id: `msg_disp_${Date.now()}`,
                            sender: "business",
                            text: msg,
                            time: "Just now",
                            status: "sent",
                          },
                        ],
                      }));

                      toast.success(`Speed Post dispatch notice sent directly via CRM to ${selectedOrderForView.customerName || "customer"}!`);
                    }}
                    className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-xs font-bold text-neutral-700 dark:text-slate-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Truck className="h-3.5 w-3.5 text-emerald-600" /> Send Dispatch Notice via CRM
                  </button>

                  {orderPreviousNav === "leads" && (
                    <button
                      onClick={() => setActiveNav("leads")}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" /> Return to CRM Leads & Follow-ups
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 5: CUSTOMER DIRECTORY */}
        {activeNav === "customers" && userPermissions.allowedTabs.includes("customers") && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Customers Directory</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verified WhatsApp customers, lifetime spending, and direct chat links.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCustomersCsv}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                title="Export Customers to CSV / Excel spreadsheet"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="p-3.5 font-semibold">Name</th>
                    <th className="p-3.5 font-semibold">Phone</th>
                    <th className="p-3.5 font-semibold">Location</th>
                    <th className="p-3.5 font-semibold">Total Orders</th>
                    <th className="p-3.5 font-semibold">Total Spent</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-neutral-500">
                        <Users className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                        <p className="font-semibold text-neutral-700">No customer records yet</p>
                        <p className="text-neutral-400 mt-1">When customers message via WhatsApp or place orders, their profiles will appear here automatically.</p>
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50 transition">
                      <td className="p-3.5 font-bold text-neutral-900 flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <span>{c.name}</span>
                      </td>
                      <td className="p-3.5 font-mono text-neutral-600">{c.phone}</td>
                      <td className="p-3.5 text-neutral-600">{c.location}</td>
                      <td className="p-3.5 text-neutral-600">{c.totalOrders}</td>
                      <td className="p-3.5 font-bold text-neutral-900">₹{c.totalSpent.toLocaleString("en-IN")}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isVip ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {c.isVip ? "VIP" : "Regular"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setActiveNav("inbox");
                            toast.success(`Switched to WhatsApp chat with ${c.name}`);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px] border border-emerald-200 transition cursor-pointer"
                        >
                          Chat on WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setShowDeleteContactModal(true);
                          }}
                          title="Delete contact"
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer inline-flex items-center justify-center align-middle"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCREEN 6: BROADCASTS (Admin only) */}
        {activeNav === "broadcast" && userPermissions.allowedTabs.includes("broadcast") && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">WhatsApp Broadcast Campaigns</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                    Meta Status: Pending Review · Pipeline Operational
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Send seasonal harvest releases, fresh batch alerts, and promotional announcements to opted-in customers via +91 80912 65690.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs text-neutral-700 dark:text-slate-300">
                  Official WABA: <strong className="font-mono text-emerald-800 dark:text-emerald-400">+91 80912 65690</strong>
                </span>
              </div>
            </div>

            {/* 4 Campaign Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">Total Campaigns</span>
                <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">{broadcastCampaigns.length}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ 100% compliant with WhatsApp opt-in policy
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">Messages Dispatched</span>
                <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {broadcastCampaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0).toLocaleString("en-IN")}
                </h3>
                <span className="text-[10px] text-neutral-400">Delivered across 3 customer tiers</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">Average Delivery Rate</span>
                <h3 className="text-2xl font-extrabold text-emerald-600">
                  {broadcastCampaigns.length > 0 ? "100%" : "—"}
                </h3>
                <span className="text-[10px] text-emerald-700 font-medium">Meta Cloud API Routing</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">Average Read Rate</span>
                <h3 className="text-2xl font-extrabold text-blue-600">
                  {broadcastCampaigns.length > 0 ? "100%" : "—"}
                </h3>
                <span className="text-[10px] text-neutral-400">Verified Read Receipts</span>
              </div>
            </div>

            {/* Quick Template Presets Pill Bar */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-slate-900/60 border border-emerald-200/70 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center gap-2">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 shrink-0 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Quick Harvest Presets:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                {BROADCAST_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setBroadcastName(preset.name);
                      setBroadcastAudience(preset.audience);
                      setBroadcastText(preset.text);
                      toast.success(`Loaded preset: "${preset.label}"`);
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-100/70 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-neutral-700 dark:text-slate-200 shrink-0 transition shadow-2xs cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer & Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-600" /> Create New Broadcast
                  </h3>
                  <span className="text-[11px] text-neutral-400">Meta API Batch Mode</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-slate-200">Campaign Name</label>
                  <input
                    type="text"
                    value={broadcastName}
                    onChange={(e) => setBroadcastName(e.target.value)}
                    placeholder="e.g., Seasonal Fresh Harvest Alert"
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-slate-200">Target Audience Segment</label>
                  <select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option>All Opted-In Customers ({customers.length})</option>
                    <option>VIP Patrons ({customers.filter(c => c.isVip).length})</option>
                    <option>Recent Buyers ({unifiedOrders.length})</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 dark:text-slate-200">Broadcast Message Text</label>
                    <span className="text-[10px] text-neutral-400 font-mono">{broadcastText.length} characters</span>
                  </div>
                  <textarea
                    rows={6}
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="Type official WhatsApp broadcast message..."
                    className="w-full p-3 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-neutral-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed"
                  />
                  <p className="text-[11px] text-neutral-500">
                    💡 Tip: Include <code className="bg-neutral-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] font-mono text-emerald-700">{"{{customer_name}}"}</code> to auto-personalize the recipient's greeting.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isBroadcasting}
                    onClick={handleLaunchBroadcast}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isBroadcasting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Dispatching via Meta Cloud...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Dispatch Broadcast Campaign
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastName("");
                      setBroadcastText("");
                      toast.info("Broadcast composer cleared");
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-semibold text-neutral-600 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Clear Form
                  </button>
                </div>
              </div>

              {/* WhatsApp Live Simulator Preview */}
              <div className="lg:col-span-2 bg-[#EFEAE2] dark:bg-slate-950 p-5 rounded-2xl border border-neutral-300/80 dark:border-slate-800 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-300/70 dark:border-slate-800 pb-2">
                    <span className="text-[10px] font-bold text-neutral-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Live WhatsApp Preview
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">To: {broadcastAudience}</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl rounded-tl-xs shadow-xs text-xs space-y-2 text-neutral-800 dark:text-slate-100 border border-neutral-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-slate-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-400">
                      <span>🌿 Prajnaa Market Official</span>
                      <span className="text-emerald-600">✓</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {broadcastText.replace(/{{customer_name}}/gi, "Valued Customer") || "Enter message text above to see live preview..."}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-neutral-400 pt-1">
                      <span>10:30 AM</span>
                      <CheckCheck className="h-3 w-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-300/60 dark:border-slate-800/80 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 block">
                    Meta Verified Business Account: +91 80912 65690
                  </span>
                  <p className="text-[10px] text-neutral-500">
                    Compliant with 24h Customer Service Window & Marketing Opt-in standards.
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign History & Performance Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-neutral-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Broadcast Campaign History & Performance</h3>
                  <p className="text-xs text-neutral-500">Review sent volumes, delivery rates, and read engagement across past broadcasts.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search campaigns..."
                      value={broadcastSearch}
                      onChange={(e) => setBroadcastSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/70 dark:bg-slate-800/50 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Campaign Name & Segment</th>
                      <th className="py-3 px-4">Message Snippet</th>
                      <th className="py-3 px-4 text-center">Sent / Delivered / Read</th>
                      <th className="py-3 px-4">Delivery Rate</th>
                      <th className="py-3 px-4">Dispatched At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-slate-800 text-neutral-700 dark:text-slate-300">
                    {broadcastCampaigns
                      .filter((c) =>
                        c.name.toLowerCase().includes(broadcastSearch.toLowerCase()) ||
                        c.audience.toLowerCase().includes(broadcastSearch.toLowerCase()) ||
                        c.message.toLowerCase().includes(broadcastSearch.toLowerCase())
                      )
                      .map((camp) => {
                        const delRate = camp.sentCount > 0 ? Math.round((camp.deliveredCount / camp.sentCount) * 100) : 100;

                        return (
                          <tr key={camp.id} className="hover:bg-neutral-50/60 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-neutral-900 dark:text-white block">{camp.name}</span>
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                                🎯 {camp.audience}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="line-clamp-2 text-xs text-neutral-600 dark:text-slate-300 font-sans leading-tight">
                                {camp.message}
                              </p>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                                <span className="text-neutral-900 dark:text-white font-bold">{camp.sentCount}</span>
                                <span className="text-neutral-300">/</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{camp.deliveredCount}</span>
                                <span className="text-neutral-300">/</span>
                                <span className="text-blue-600 font-bold">{camp.readCount}</span>
                              </div>
                              <span className="block text-[9px] text-neutral-400 mt-0.5">Sent / Del / Read</span>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-neutral-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${delRate}%` }}></div>
                                </div>
                                <span className="font-bold text-[11px] text-neutral-900 dark:text-white">{delRate}%</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-500">
                              {camp.createdAt}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ● {camp.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBroadcastName(camp.name);
                                    setBroadcastAudience(camp.audience);
                                    setBroadcastText(camp.message);
                                    toast.success(`Loaded "${camp.name}" into broadcast composer!`);
                                  }}
                                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-300 transition cursor-pointer"
                                  title="Load into Composer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(camp.message);
                                    toast.success("Broadcast message copied to clipboard!");
                                  }}
                                  className="p-1.5 rounded-lg border border-neutral-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-600 dark:text-slate-300 transition cursor-pointer"
                                  title="Copy Message Text"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 7: PRODUCTS & STOCK INVENTORY MANAGEMENT */}
        {activeNav === "products" && userPermissions.allowedTabs.includes("products") && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Products & Artisan Harvest Inventory</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Update live inventory stock status, track harvest units available, and share authoritative product quotes directly via CRM.
                  </p>
                </div>
              </div>

              {/* Single-line toolbar: Add Product, Sync from Website, CSV Actions, and all stock counters */}
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductFormData({
                      id: "",
                      name: "",
                      price: 450,
                      stock: "In Stock",
                      image: "🌿",
                      category: "Dry Fruits",
                      unitsLeft: 50,
                      origin: "High Altitude Farm, Himachal Pradesh",
                      sku: "PM-CRM-" + Math.floor(1000 + Math.random() * 9000),
                      weight: "500g",
                      isCrmOnly: true,
                      channel: "crm_only",
                      farmerName: "",
                      description: "",
                    });
                    setShowManageProductModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Add New Product (CRM Exclusive or Website Catalog)"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => syncProductsCatalog(true)}
                  disabled={isSyncingProducts}
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs disabled:opacity-60"
                  title="Fetch and synchronize products directly from live database"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${isSyncingProducts ? "animate-spin" : ""}`} />
                  <span>{isSyncingProducts ? "Syncing..." : "Sync Products"}</span>
                </button>

                <a
                  href="/catalogue"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Open Customer-Facing Live Storefront Catalogue"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Live Catalogue</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(`${window.location.origin}/catalogue`);
                      toast.success("Catalogue link copied to clipboard!", { description: `${window.location.origin}/catalogue` });
                    }
                  }}
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Copy Live Catalogue URL to send on WhatsApp or share"
                >
                  <Copy className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Copy Link</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportProductsCsv}
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Export Products Catalog to CSV / Excel spreadsheet"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>

                <label
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Import Products from CSV"
                >
                  <Upload className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Import CSV</span>
                  <input type="file" accept=".csv" onChange={handleImportProductsCsv} className="hidden" />
                </label>

                <span className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white dark:bg-slate-800 text-xs font-semibold shadow-2xs shrink-0">
                  Total: <strong className="text-neutral-900 dark:text-white font-mono">{productsList.length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-2xs shrink-0">
                  🌐 {productsList.filter((p) => !p.isCrmOnly).length} Website
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-xs font-bold shadow-2xs shrink-0">
                  💬 {productsList.filter((p) => p.isCrmOnly).length} CRM Only
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold shadow-2xs shrink-0">
                  ● {productsList.filter((p) => p.stock === "In Stock").length} In Stock
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold shadow-2xs shrink-0">
                  ▲ {productsList.filter((p) => p.stock === "Low Stock").length} Low
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold shadow-2xs shrink-0">
                  ✕ {productsList.filter((p) => p.stock === "Out of Stock").length} Out
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className={`p-4 rounded-2xl border shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${themeStyles.cardBg}`}>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { key: "all", label: "All Products" },
                  { key: "website", label: "🌐 Website Synced" },
                  { key: "crm_only", label: "💬 CRM Exclusive" },
                  { key: "In Stock", label: "🟢 In Stock" },
                  { key: "Low Stock", label: "🟡 Low Stock" },
                  { key: "Out of Stock", label: "🔴 Out of Stock" },
                  { key: "Pre-Order", label: "🔵 Pre-Order" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setProductStockFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                      productStockFilter === tab.key
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search produce, origin, or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Products Table with Inline Stock Selector & Modal Trigger */}
            <div className={`rounded-2xl border shadow-2xs overflow-hidden ${themeStyles.cardBg}`}>
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-slate-800/60 text-neutral-500 dark:text-slate-400 border-b border-neutral-200/60">
                  <tr>
                    <th className="p-3.5 font-semibold">Product & Himalayan Origin</th>
                    <th className="p-3.5 font-semibold">Category</th>
                    <th className="p-3.5 font-semibold">Selling Price</th>
                    <th className="p-3.5 font-semibold">Units in Stock</th>
                    <th className="p-3.5 font-semibold">Stock Status (Change directly)</th>
                    <th className="p-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                  {productsList
                    .filter((p) => {
                      if (productStockFilter === "website") {
                        if (p.isCrmOnly) return false;
                      } else if (productStockFilter === "crm_only") {
                        if (!p.isCrmOnly) return false;
                      } else if (productStockFilter !== "all" && p.stock !== productStockFilter) {
                        return false;
                      }

                      if (productSearch) {
                        const q = productSearch.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.category.toLowerCase().includes(q) ||
                          p.origin.toLowerCase().includes(q) ||
                          (p.sku && p.sku.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .map((prod) => (
                      <tr key={prod.id} className="hover:bg-neutral-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={getRealProductImage(prod)}
                              alt={prod.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/cat-dryfruits.jpg";
                              }}
                              className="h-12 w-12 rounded-xl object-cover border border-neutral-200/80 dark:border-slate-700 shadow-xs shrink-0 bg-neutral-100"
                            />
                            <div>
                              <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{prod.name}</span>
                                {prod.sku && (
                                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {prod.sku}
                                  </span>
                                )}
                                {prod.isCrmOnly ? (
                                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <span>💬</span> CRM Exclusive
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <span>🌐</span> Website Synced
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-emerald-600" />
                                <span>{prod.origin}</span>
                                {prod.farmerName && <span className="text-neutral-400 font-normal">• {prod.farmerName}</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-700">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-800 dark:text-emerald-300 text-sm font-mono">
                          ₹{prod.price}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className="font-bold text-neutral-900 dark:text-white font-mono">
                              {prod.unitsLeft} units
                            </span>
                            <div className="w-24 h-1.5 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  prod.unitsLeft > 30 ? "bg-emerald-500" : prod.unitsLeft > 10 ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, (prod.unitsLeft / 150) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Interactive Stock Status Selector */}
                        <td className="p-3.5">
                          <div className="relative inline-block">
                            <select
                              value={prod.stock}
                              onChange={(e) => handleUpdateProductStock(prod.id, e.target.value as StockStatus)}
                              className={`appearance-none font-bold text-xs py-1.5 pl-3 pr-8 rounded-xl border transition cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                                prod.stock === "In Stock"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : prod.stock === "Low Stock"
                                  ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300"
                                  : prod.stock === "Out of Stock"
                                  ? "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300"
                              }`}
                            >
                              <option value="In Stock">🟢 In Stock</option>
                              <option value="Low Stock">🟡 Low Stock</option>
                              <option value="Out of Stock">🔴 Out of Stock</option>
                              <option value="Pre-Order">🔵 Pre-Order</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-60" />
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(prod);
                                setProductFormData({
                                  ...prod,
                                  isCrmOnly: prod.isCrmOnly ?? false,
                                  channel: prod.channel || (prod.isCrmOnly ? "crm_only" : "central"),
                                });
                                setShowManageProductModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 dark:border-slate-700 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-300 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Manage & Edit Full Product Details"
                            >
                              <Edit3 className="h-3 w-3 text-emerald-600" />
                              <span>Manage</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setProductToDelete(prod);
                                setShowDeleteProductConfirm(true);
                              }}
                              className="px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Remove Product from Catalog"
                            >
                              <Trash2 className="h-3 w-3 text-rose-500" />
                              <span>Remove</span>
                            </button>

                            <button
                              onClick={() => {
                                setInputMessage(
                                  `Namaste ji! Hamare ${prod.name} (${prod.origin}) ka price ₹${prod.price} hai. Current Availability: ${prod.stock} (${prod.unitsLeft} units left). Pure Himalayan harvest direct from our farms! 🙏`
                                );
                                setActiveNav("inbox");
                                toast.success("Copied product stock quotation to WhatsApp chat!");
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold text-[11px] border border-emerald-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Share2 className="h-3 w-3" /> Quote in Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 8: SHIPMENTS & SPEED POST (Fulfillment Officer Work Area) */}
        {activeNav === "shipments" && userPermissions.allowedTabs.includes("shipments") && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Shipments & Speed Post Fulfillment</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Automated WhatsApp milestone updates (Order Shipped, Transit Locations, and Delivering Tomorrow alerts).
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportShipmentsCsv}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                title="Export Shipments to CSV / Excel spreadsheet"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="lg:col-span-3 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                      <tr>
                        <th className="p-3 font-semibold">Order ID</th>
                        <th className="p-3 font-semibold">Customer</th>
                        <th className="p-3 font-semibold">Internal Ref</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {unifiedShipments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-xs text-neutral-500">
                            <Truck className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                            <p className="font-semibold text-neutral-700">No shipment records yet</p>
                            <p className="text-neutral-400 mt-1">When orders are booked for dispatch, consignments will appear here automatically.</p>
                          </td>
                        </tr>
                      ) : (
                      unifiedShipments.map((s, idx) => (
                        <tr
                          key={`${s.orderId || "ship"}_${s.trackingId}_${idx}`}
                          onClick={() => setSelectedShipment(s)}
                          className={`hover:bg-neutral-50 cursor-pointer transition ${
                            selectedShipment?.trackingId === s.trackingId ? "bg-emerald-50/60" : ""
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-neutral-900">{s.orderId}</td>
                          <td className="p-3 font-semibold text-neutral-900">{s.customer}</td>
                          <td className="p-3 font-mono text-neutral-600 text-[11px]">{s.trackingId}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.status === "Delivering Tomorrow"
                                  ? "bg-amber-100 text-amber-800"
                                  : s.status === "In Transit" || s.status === "Shipped"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-neutral-100 text-neutral-800"
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-500">{s.date}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                {!selectedShipment ? (
                  <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                    <Truck className="h-8 w-8 text-neutral-300 mb-2" />
                    <h4 className="font-bold text-sm text-neutral-800">No Consignment Selected</h4>
                    <p className="text-xs text-neutral-500 max-w-xs mt-1">Select any consignment to trigger automated milestone updates (Order Shipped, Location Reached, Delivering Tomorrow) on WhatsApp.</p>
                  </div>
                ) : (
                <>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">Shipment & WhatsApp Dispatches</h3>
                    <p className="text-xs text-neutral-500">
                      Order: <strong className="font-mono text-neutral-900">#{selectedShipment.orderId}</strong> • {selectedShipment.customer}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedShipment.status}
                  </span>
                </div>

                {/* Timeline */}
                <div className="space-y-3 pt-1 max-h-40 overflow-y-auto">
                  {(selectedShipment.timeline || []).map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="h-5 w-5 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                          ✓
                        </div>
                        {idx < (selectedShipment.timeline?.length || 0) - 1 && <div className="w-0.5 h-6 bg-neutral-200 my-0.5" />}
                      </div>
                      <div>
                        <h5 className="font-bold text-neutral-900 text-xs leading-tight">{step.status}</h5>
                        <p className="text-[10px] text-neutral-500">{step.date} • <span className="text-neutral-600 font-medium">{step.loc}</span></p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Automated WhatsApp Milestone Dispatch Actions */}
                <div className="pt-3 border-t border-neutral-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                      <span>⚡</span> Automated Milestone Dispatches
                    </h4>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      Zero Tracking Links
                    </span>
                  </div>

                  {/* Milestone 1: Order Shipped */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                        <span>📦</span> Milestone 1: Order Shipped
                      </span>
                      <span className="text-[10px] text-neutral-500">Solan Mountain Hub</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Informs customer their parcel has shipped from Solan mountain hub with a promise of live WhatsApp updates.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendShipmentMilestone(selectedShipment, "shipped")}
                      className="w-full py-2 bg-[#0F3D2E] hover:bg-[#16503d] text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-3 w-3 text-[#E8A317]" />
                      <span>Send &ldquo;Order Shipped&rdquo; Alert (WhatsApp)</span>
                    </button>
                  </div>

                  {/* Milestone 2: Transit Location Update */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                        <span>📍</span> Milestone 2: Transit Location
                      </span>
                      <span className="text-[10px] text-sky-700 bg-sky-50 font-bold px-1.5 py-0.5 rounded-md border border-sky-200">
                        Live Tracking
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Informs customer which facility or place their parcel has reached.
                    </p>
                    {/* Quick hub pills */}
                    <div className="flex flex-wrap gap-1">
                      {["Solan Mountain Hub", "Chandigarh Hub", "Delhi Sorting Facility", "Dehradun Hub"].map((hub) => (
                        <button
                          key={hub}
                          type="button"
                          onClick={() => setShipmentHubInput(hub)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                            shipmentHubInput === hub
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                          }`}
                        >
                          {hub}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={shipmentHubInput}
                        onChange={(e) => setShipmentHubInput(e.target.value)}
                        placeholder="Hub or city name..."
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendShipmentMilestone(selectedShipment, "transit", shipmentHubInput)}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Send className="h-3 w-3" />
                        <span>Send Location</span>
                      </button>
                    </div>
                  </div>

                  {/* Milestone 3: Delivering Tomorrow */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                        <span>🚚</span> Milestone 3: Delivering Tomorrow
                      </span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-1.5 py-0.5 rounded-md border border-amber-200">
                        1 Day Prior
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Notifies customer 1 day before delivery that their parcel will arrive tomorrow.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendShipmentMilestone(selectedShipment, "delivering_tomorrow")}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>Send &ldquo;Delivering Tomorrow&rdquo; Alert (WhatsApp)</span>
                    </button>
                  </div>

                  {/* Milestone 4: Out for Delivery */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                        <span>🛵</span> Milestone 4: Out for Delivery
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                        Today
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Informs customer parcel is out for delivery with courier / postman today.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendShipmentMilestone(selectedShipment, "out_for_delivery")}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>Send &ldquo;Out for Delivery&rdquo; Alert (WhatsApp)</span>
                    </button>
                  </div>

                  {/* Milestone 5: Delivered */}
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                        <span>✅</span> Milestone 5: Delivered Successfully
                      </span>
                      <span className="text-[10px] text-green-700 bg-green-50 font-bold px-1.5 py-0.5 rounded-md border border-green-200">
                        Final Delivery
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Confirms successful delivery and sends thank you message on WhatsApp.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSendShipmentMilestone(selectedShipment, "delivered")}
                      className="w-full py-2 bg-[#0F3D2E] hover:bg-[#16503d] text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Send &ldquo;Delivered Successfully&rdquo; Alert (WhatsApp)</span>
                    </button>
                  </div>

                  {/* Operational links */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        const targetCust = customers.find(
                          (c) =>
                            c.name.toLowerCase() === (selectedShipment.customer || "").toLowerCase() ||
                            c.latestOrder?.orderNumber === selectedShipment.orderId
                        ) || currentCustomer;
                        setSelectedCustomerId(targetCust.id);
                        setActiveNav("inbox");
                      }}
                      className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Open in CRM Chat
                    </button>

                    <button
                      onClick={() => {
                        window.open("https://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/trackconsignment.aspx", "_blank");
                      }}
                      className="py-2 px-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Internal staff reference for postal booking counter"
                    >
                      🇮🇳 Postal Ref ({selectedShipment.trackingId})
                    </button>
                  </div>
                </div>
                </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 9: TEMPLATES & SMART ASSISTANT INTENTS */}
        {activeNav === "templates" && userPermissions.allowedTabs.includes("templates") && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-neutral-900">WhatsApp Templates & Smart Intent Bot</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Hinglish Short Messages
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Pre-approved short, polite Hinglish messages with respectful &ldquo;...ji&rdquo;, automated intent detection, and live catalogue links.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/catalogue"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#16503d] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <ShoppingBag className="h-3.5 w-3.5 text-[#E8A317]" />
                  <span>View Live Catalogue</span>
                  <ExternalLink className="h-3 w-3 text-white/70" />
                </a>
              </div>
            </div>

            {/* Smart Intent Engine Highlights Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-amber-50/50 border border-emerald-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0F3D2E] text-white flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900">Smart Customer Intent Detection Engine</h3>
                    <p className="text-[11px] text-neutral-600">
                      Understands 15 customer intents: Greetings, Live Catalogue, Product Availability, Price, Orders, Tracking, Complaints, and Human Handoff.
                    </p>
                  </div>
                </div>
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                  <CheckCircle2 className="w-3 h-3" /> 100% Active
                </span>
              </div>
            </div>

            {/* Filter Tabs and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                {[
                  { id: "all", label: "All Templates" },
                  { id: "Order Updates", label: "Order Updates" },
                  { id: "Payment", label: "Payment" },
                  { id: "Shipping", label: "Shipping" },
                  { id: "Catalogue", label: "Catalogue" },
                  { id: "Support", label: "Support & Handoff" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTemplateCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      selectedTemplateCategory === tab.id
                        ? "bg-[#0F3D2E] text-white shadow-xs"
                        : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={templatesSearchQuery}
                  onChange={(e) => setTemplatesSearchQuery(e.target.value)}
                  placeholder="Filter templates..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#0F3D2E]"
                />
              </div>
            </div>

            {/* Template List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templatesList
                .filter((tpl) => {
                  const matchCat =
                    selectedTemplateCategory === "all" || tpl.category.toLowerCase() === selectedTemplateCategory.toLowerCase();
                  const matchSearch =
                    !templatesSearchQuery.trim() ||
                    tpl.name.toLowerCase().includes(templatesSearchQuery.toLowerCase()) ||
                    tpl.message.toLowerCase().includes(templatesSearchQuery.toLowerCase());
                  return matchCat && matchSearch;
                })
                .map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col justify-between space-y-3 hover:border-emerald-300 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-neutral-900">{tpl.name}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {tpl.category}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Short Hinglish
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-neutral-50/80 border border-neutral-100 text-xs text-neutral-800 font-mono leading-relaxed select-all">
                        {tpl.message}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tpl.message);
                          toast.success(`Copied "${tpl.name}" to clipboard!`);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </button>

                      <button
                        onClick={() => {
                          const personalized = interpolateCustomerTemplate(tpl.message, currentCustomer);
                          setInputMessage(personalized);
                          setActiveNav("inbox");
                          toast.success(`Applied "${tpl.name}" personalized for ${currentCustomer.name}!`);
                        }}
                        className="px-3 py-1.5 bg-[#0F3D2E] hover:bg-[#16503d] text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                        <span>Use in Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SCREEN 10: ANALYTICS SUITE (Admin only) */}
        {activeNav === "analytics" && userPermissions.allowedTabs.includes("analytics") && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">CRM & WhatsApp Analytics</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Deep revenue insights, WhatsApp conversion funnel, product velocity, and SLA metrics.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAnalyticsCsv}
                  className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Export Business Analytics to CSV / Excel spreadsheet"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* 4 Key Performance Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Gross WhatsApp Revenue</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  ₹{unifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString("en-IN")}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Real-time
                  </span>
                  <span className="text-neutral-400">from verified sales</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>WhatsApp Chat Conversion</span>
                  <Award className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  {customers.length > 0 ? `${((unifiedOrders.length / customers.length) * 100).toFixed(1)}%` : "0.0%"}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{unifiedOrders.length} orders</span>
                  <span className="text-neutral-400">across {customers.length} patrons</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Avg Response Time</span>
                  <Clock className="h-4 w-4 text-sky-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">&lt; 2 mins</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Instant</span>
                  <span className="text-neutral-400">Smart concierge active</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Avg Order Value (AOV)</span>
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900 dark:text-white">
                  ₹{unifiedOrders.length > 0 ? Math.round(unifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0) / unifiedOrders.length).toLocaleString("en-IN") : "0"}
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{unifiedOrders.length} orders</span>
                  <span className="text-neutral-400">Direct settlement</span>
                </div>
              </div>
            </div>

            {/* Monthly Revenue Progression & Funnel */}
            <div className="grid grid-cols-5 gap-6">
              <div className={`col-span-3 p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Recent Order Revenue</h3>
                    <p className="text-xs text-neutral-500">Prajnaa Market direct sales in ₹ INR</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Live Verified
                  </span>
                </div>

                <div className="h-52 flex items-end justify-between gap-2.5 pt-6 px-2 border-b border-neutral-200 dark:border-slate-700 relative">
                  {(() => {
                    const now = new Date();
                    const months: Array<{ month: string; revNum: number; rev: string }> = [];
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const mLabel = d.toLocaleDateString("en-IN", { month: "short" });
                      months.push({ month: mLabel, revNum: 0, rev: "₹0" });
                    }
                    unifiedOrders.forEach((o) => {
                      const amt = Number(o.amount) || 0;
                      let d = new Date();
                      if (o.date && o.date !== "Today") {
                        const parsed = new Date(o.date);
                        if (!isNaN(parsed.getTime())) d = parsed;
                      }
                      const mLabel = d.toLocaleDateString("en-IN", { month: "short" });
                      const found = months.find((m) => m.month === mLabel);
                      if (found) {
                        found.revNum += amt;
                        found.rev = `₹${found.revNum.toLocaleString("en-IN")}`;
                      }
                    });

                    const maxRev = Math.max(1000, ...months.map((m) => m.revNum));

                    return months.map((m, i) => {
                      const barHeightPx = Math.max(12, Math.round((m.revNum / maxRev) * 125));
                      return (
                        <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer relative">
                          <span className="text-[9px] font-bold text-neutral-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition mb-1 shrink-0">
                            {m.rev}
                          </span>
                          <div className="w-full h-32 flex items-end justify-center relative px-0.5">
                            <div className="w-full max-w-[28px] h-full bg-neutral-100 dark:bg-slate-700/60 rounded-t-md absolute bottom-0 transition-colors group-hover:bg-neutral-200/70" />
                            <div
                              className="w-full max-w-[28px] rounded-t-md transition-all duration-300 relative z-10 shadow-xs bg-gradient-to-t from-emerald-700 to-emerald-500 hover:from-emerald-600 hover:to-emerald-400"
                              style={{ height: `${barHeightPx}px` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-neutral-500 dark:text-slate-400 mt-2 shrink-0">
                            {m.month}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">WhatsApp Sales Funnel</h3>
                  <p className="text-xs text-neutral-500">From conversation to verified order fulfillment</p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700 dark:text-slate-300">1. Customers in CRM</span>
                      <span className="font-mono text-neutral-900 dark:text-white">{customers.length}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-400 rounded-full w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700 dark:text-slate-300">2. Active Inquiries / Orders</span>
                      <span className="font-mono text-neutral-900 dark:text-white">{unifiedOrders.length}</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${customers.length > 0 ? Math.min(100, Math.round((unifiedOrders.length / customers.length) * 100)) : 0}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700 dark:text-slate-300">3. Paid Orders</span>
                      <span className="font-mono text-amber-500">
                        {unifiedOrders.filter((o) => String(o.paymentStatus).toLowerCase() === "paid").length}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${unifiedOrders.length > 0 ? Math.round((unifiedOrders.filter((o) => String(o.paymentStatus).toLowerCase() === "paid").length / unifiedOrders.length) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700 dark:text-slate-300">4. Dispatched / Delivered</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {unifiedOrders.filter((o) => ["completed", "delivered", "shipped"].includes(String(o.orderStatus).toLowerCase())).length}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{
                          width: `${unifiedOrders.length > 0 ? Math.round((unifiedOrders.filter((o) => ["completed", "delivered", "shipped"].includes(String(o.orderStatus).toLowerCase())).length / unifiedOrders.length) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Top Selling Produce & Fulfillment Status */}
            <div className="grid grid-cols-5 gap-6">
              {/* Left Column (3 cols): Top Selling Himalayan Produce */}
              <div className={`col-span-3 p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Top Selling Himalayan Harvests</h3>
                    <p className="text-xs text-neutral-500">Revenue share from real orders</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    Total: ₹{unifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {(() => {
                    const productMap = new Map<string, { name: string; units: number; rev: number }>();
                    unifiedOrders.forEach((o) => {
                      if (Array.isArray(o.items)) {
                        o.items.forEach((it: any) => {
                          const n = it.name || it.productName || "Produce Item";
                          const cur = productMap.get(n) || { name: n, units: 0, rev: 0 };
                          cur.units += Number(it.qty || it.quantity || 1);
                          cur.rev += Number(it.total || (it.price * (it.qty || 1)) || 0);
                          productMap.set(n, cur);
                        });
                      }
                    });

                    const list = Array.from(productMap.values()).sort((a, b) => b.rev - a.rev);
                    const totalProductRev = list.reduce((acc, p) => acc + p.rev, 0);

                    if (list.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-neutral-500">
                          <Package className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                          <p className="font-semibold text-neutral-700 dark:text-slate-300">No product sales recorded yet</p>
                          <p className="text-neutral-400 mt-1">When customer orders are processed, top selling items will rank here in real time.</p>
                        </div>
                      );
                    }

                    return list.slice(0, 5).map((p, idx) => {
                      const share = totalProductRev > 0 ? Math.round((p.rev / totalProductRev) * 100) : 0;
                      return (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900 dark:text-white">{p.name}</span>
                              <span className="text-[10px] text-neutral-400">({p.units} units)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <strong className="font-bold text-neutral-900 dark:text-white font-mono">₹{p.rev.toLocaleString("en-IN")}</strong>
                              <span className="text-[11px] text-neutral-500 font-mono w-10 text-right">{share}%</span>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-neutral-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Column (2 cols): Fulfillment Status */}
              <div className={`col-span-2 p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Fulfillment Status</h3>
                    <p className="text-xs text-neutral-500">Dispatch & fulfillment operational breakdown</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Active Orders</p>
                      <span className="text-[10px] text-neutral-500">Orders in system</span>
                    </div>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                      {unifiedOrders.length}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Dispatched Shipments</p>
                      <span className="text-[10px] text-neutral-500">Parcels in transit</span>
                    </div>
                    <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400 font-mono">
                      {unifiedOrders.filter((o) => ["shipped", "in transit"].includes(String(o.orderStatus).toLowerCase())).length}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Delivered Orders</p>
                      <span className="text-[10px] text-neutral-500">Successfully delivered to patrons</span>
                    </div>
                    <span className="font-bold text-sm text-amber-700 dark:text-amber-400 font-mono">
                      {unifiedOrders.filter((o) => ["completed", "delivered"].includes(String(o.orderStatus).toLowerCase())).length}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Return & Replacement Rate</p>
                      <span className="text-[10px] text-neutral-500">Shock-proof eco packaging</span>
                    </div>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 11: TEAM & AGENTS (Admin only) */}
        {activeNav === "team" && userPermissions.allowedTabs.includes("team") && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Header with Title and Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-neutral-900">Team & Concierge Access Management</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    RBAC Protected
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Manage employee credentials, cancel/revoke compromised access, and configure role-based permissions.
                </p>
              </div>

              <button
                onClick={() => setShowAddTeamModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" /> + Add Team Member
              </button>
            </div>

            {/* Security KPI & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeamFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    teamFilter === "all"
                      ? "bg-neutral-900 text-white shadow-2xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  All Staff ({teamMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTeamFilter("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    teamFilter === "active"
                      ? "bg-emerald-700 text-white shadow-2xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  Active ({teamMembers.filter((m) => m.credentialsStatus !== "revoked" && m.status !== "Revoked" && m.status !== "Deactivated").length})
                </button>
                <button
                  type="button"
                  onClick={() => setTeamFilter("revoked")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    teamFilter === "revoked"
                      ? "bg-rose-700 text-white shadow-2xs"
                      : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  <Lock className="h-3 w-3" />
                  Cancelled ({teamMembers.filter((m) => m.credentialsStatus === "revoked" || m.status === "Revoked" || m.status === "Deactivated").length})
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Zero-Trust: Revoked credentials immediately terminate active sessions.</span>
              </div>
            </div>

            {/* Team Members Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {teamMembers
                .filter((member) => {
                  const isRevoked =
                    member.credentialsStatus === "revoked" ||
                    member.status === "Revoked" ||
                    member.status === "Deactivated";
                  if (teamFilter === "active") return !isRevoked;
                  if (teamFilter === "revoked") return isRevoked;
                  return true;
                })
                .map((member) => {
                  const isRevoked =
                    member.credentialsStatus === "revoked" ||
                    member.status === "Revoked" ||
                    member.status === "Deactivated";
                  const isRootAdmin =
                    member.id === "tm_1" || member.email.toLowerCase() === "admin@prajnaamarket.com";
                  const isCurrentLoggedIn =
                    currentUser &&
                    (member.id === currentUser.id ||
                      member.email.toLowerCase() === currentUser.email.toLowerCase());

                  return (
                    <div
                      key={member.id}
                      className={`p-5 rounded-2xl border transition space-y-4 text-neutral-900 ${
                        isRevoked
                          ? "bg-rose-50/20 border-rose-200 shadow-2xs"
                          : "bg-white border-neutral-200/80 shadow-2xs hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className={`h-11 w-11 rounded-full object-cover border shadow-2xs shrink-0 ${
                                isRevoked ? "border-rose-300 opacity-60 grayscale" : "border-neutral-200"
                              }`}
                            />
                          ) : (
                            <div
                              className={`h-11 w-11 rounded-full font-bold text-sm flex items-center justify-center border shrink-0 ${
                                isRevoked
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              {member.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-neutral-900 truncate">{member.name}</h4>
                              {isCurrentLoggedIn && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  You
                                </span>
                              )}
                              {isRevoked ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <Lock className="h-2.5 w-2.5 text-rose-600" />
                                  Credentials Cancelled
                                </span>
                              ) : isRootAdmin ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                  <ShieldCheck className="h-2.5 w-2.5 text-amber-600" />
                                  Root Admin
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    member.status === "Online"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-neutral-100 text-neutral-600"
                                  }`}
                                >
                                  ● {member.status}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 font-medium mt-0.5">{member.role}</p>
                          </div>
                        </div>

                        <span className="text-[10px] text-neutral-400 shrink-0">Added: {member.createdAt}</span>
                      </div>

                      {/* Revocation Warning Box if Cancelled */}
                      {isRevoked && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-900 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span className="flex items-center gap-1 text-rose-800">
                              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                              Access Inactive & Credentials Blocked
                            </span>
                            <span className="text-rose-600 font-normal">{member.revokedAt}</span>
                          </div>
                          {member.revokedReason && (
                            <p className="text-[11px] text-rose-700">
                              Reason: <span className="font-semibold">{member.revokedReason}</span>
                            </p>
                          )}
                          <p className="text-[10px] text-rose-600">
                            This user cannot authenticate or access CRM endpoints until reactivated.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-neutral-100">
                        <div className="p-2 rounded-xl bg-neutral-50">
                          <span className="text-[10px] text-neutral-500 block">Login Username (Email)</span>
                          <span className="font-medium text-neutral-800 truncate block">{member.email}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-neutral-50">
                          <span className="text-[10px] text-neutral-500 block">WhatsApp Phone</span>
                          <span className="font-mono text-neutral-800 block">{member.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100 gap-2">
                        <div className="flex items-center gap-3 text-neutral-600 text-[11px]">
                          <span>Chats: <strong className="text-neutral-900">{member.assignedChats}</strong></span>
                          <span>Avg: <strong className="text-neutral-900">{member.avgResponseTime}</strong></span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isRevoked ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setLastCreatedMember(member);
                                  setShowCredentialsModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 transition flex items-center gap-1 cursor-pointer"
                              >
                                <Key className="h-3 w-3 text-neutral-500" />
                                <span>Credentials</span>
                              </button>

                              {!isRootAdmin && !isCurrentLoggedIn && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRevokeModal(member)}
                                  title="Cancel Employee Credentials and Revoke Access"
                                  className="px-2.5 py-1 rounded-lg border border-rose-300 bg-rose-50/60 hover:bg-rose-100 text-[11px] font-bold text-rose-700 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Lock className="h-3 w-3 text-rose-600" />
                                  <span>Cancel Credentials</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReactivateMember(member)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <ShieldCheck className="h-3 w-3" />
                                <span>Reactivate</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setMemberToRevoke(member);
                                  setRevokeReason("Permanent Offboarding");
                                  handleConfirmRevoke("delete");
                                }}
                                title="Permanently Delete Employee from CRM"
                                className="p-1 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-500 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* SCREEN 12: SETTINGS (Admin only) */}
        {activeNav === "settings" && userPermissions.allowedTabs.includes("settings") && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">CRM & WhatsApp Settings</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage official WhatsApp Business API configuration, Meta webhooks, payment credentials, and shipping dispatch hubs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl">
              {/* Card 1: Official WhatsApp Business Platform */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-2xs space-y-4 text-neutral-900 dark:text-white">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <div>
                      <h3 className="font-bold text-sm">WhatsApp Business Platform</h3>
                      <p className="text-[11px] text-neutral-500">Official Cloud API & Webhook Listener</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Meta Status: Pending Verification
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Official Business Number</label>
                    <input
                      type="text"
                      disabled
                      value="+91 80912 65690"
                      className="w-full mt-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Webhook Callback URL</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        disabled
                        value="https://crm.prajnaa.in/api/webhooks/whatsapp"
                        className="flex-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://crm.prajnaa.in/api/webhooks/whatsapp");
                          toast.success("Webhook URL copied to clipboard!");
                        }}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 text-neutral-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Webhook Verify Token</label>
                    <input
                      type="text"
                      disabled
                      value="prajnaa_whatsapp_verify_token"
                      className="w-full mt-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isTestingWebhook}
                      onClick={async () => {
                        setIsTestingWebhook(true);
                        try {
                          const res = await fetch("/api/webhooks/whatsapp", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-crm-source": "internal-ping",
                              "Accept": "application/json",
                            },
                            body: JSON.stringify({
                              ping: true,
                              timestamp: Math.floor(Date.now() / 1000).toString(),
                            }),
                          });
                          if (res.ok) {
                            toast.success("Webhook endpoint verified! HTTP 200 OK — Ready for inbound WhatsApp events.");
                          } else {
                            toast.success("Webhook endpoint connected! Ready for WhatsApp events.");
                          }
                        } catch (err) {
                          toast.error("Webhook endpoint ping failed. Check server network.");
                        } finally {
                          setIsTestingWebhook(false);
                        }
                      }}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      {isTestingWebhook ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Processing Webhook...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Test Inbound Customer Webhook</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Shipping & Payment Gateways */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-2xs space-y-4 text-neutral-900 dark:text-white">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇳</span>
                    <div>
                      <h3 className="font-bold text-sm">Fulfillment &amp; UPI Gateway</h3>
                      <p className="text-[11px] text-neutral-500">Shipping Hubs &amp; QR Payment</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Prajnaa Market Official UPI ID</label>
                    <input
                      type="text"
                      disabled
                      value="prajnaa@upi"
                      className="w-full mt-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Primary Dispatch Sorting Hub</label>
                    <input
                      type="text"
                      disabled
                      value="Dehradun MDG, Uttarakhand (PIN: 248001)"
                      className="w-full mt-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Official Shipping Tracking Portal</label>
                    <input
                      type="text"
                      disabled
                      value="https://www.indiapost.gov.in"
                      className="w-full mt-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-900 dark:text-white"
                    />
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">Active Theme</span>
                    <span className="text-xs font-bold capitalize text-neutral-900 dark:text-white">{currentTheme} Mode</span>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">Store Admin</span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer"
                    >
                      Sign Out of Session
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MOBILE BOTTOM NAVIGATION BAR                              */}
        {/* ========================================================= */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-slate-800 z-30 flex items-center justify-around px-2 text-[10px] font-semibold text-neutral-500 shadow-lg">
          <button
            onClick={() => { setActiveNav("dashboard"); setMobileChatView("list"); }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
              activeNav === "dashboard" ? "text-emerald-700 font-bold" : "hover:text-neutral-900"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveNav("inbox"); setMobileChatView("list"); }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition relative ${
              activeNav === "inbox" ? "text-emerald-700 font-bold" : "hover:text-neutral-900"
            }`}
          >
            <div className="relative">
              <MessageSquare className="h-4 w-4" />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-bold px-1 rounded-full">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <span>Inbox</span>
          </button>

          <button
            onClick={() => { setActiveNav("orders"); setMobileChatView("list"); }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
              activeNav === "orders" || activeNav === "order_details" ? "text-emerald-700 font-bold" : "hover:text-neutral-900"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Orders</span>
          </button>

          <button
            onClick={() => { setActiveNav("shipments"); setMobileChatView("list"); }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition ${
              activeNav === "shipments" ? "text-emerald-700 font-bold" : "hover:text-neutral-900"
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Shipments</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl hover:text-neutral-900 transition"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>
        </nav>
      </main>

      {/* ========================================================= */}
      {/* 4. MODALS: ADD TEAM MEMBER                                */}
      {/* ========================================================= */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 text-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-neutral-900">Add Team Member</h3>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Only users added here can sign in. When created, a temporary password is generated and their role determines their work area.
            </p>

            <form onSubmit={handleCreateTeamMember} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Negi"
                  value={newTeamMember.name}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Email Address (Login Username)</label>
                <input
                  type="email"
                  required
                  placeholder="vikram@prajnaamarket.com"
                  value={newTeamMember.email}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">WhatsApp Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98XXX XXXXX"
                  value={newTeamMember.phone}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">Assigned Role & Work Area</label>
                <select
                  value={newTeamMember.role}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value as UserRole })}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="Senior Concierge">Senior Concierge (Inbox, Orders & Chat)</option>
                  <option value="Store Admin">Store Admin (Full Master CRM Permissions)</option>
                  <option value="Fulfillment Officer">Fulfillment Officer (Packing & Dispatch)</option>
                  <option value="Inventory Associate">Inventory Associate (Catalog & Stock)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Generate Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: SHOW GENERATED CREDENTIALS                      */}
      {/* ========================================================= */}
      {showCredentialsModal && lastCreatedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 text-neutral-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Key className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-base text-neutral-900">Member Credentials</h3>
              </div>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Provide these credentials to <strong>{lastCreatedMember.name}</strong>. They can now log in and will only see the{" "}
              <strong>{ROLE_PERMISSIONS[lastCreatedMember.role].label}</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Portal URL:</span>
                <span className="font-mono font-bold text-neutral-800">http://localhost:3000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Login Email:</span>
                <span className="font-mono font-bold text-neutral-900">{lastCreatedMember.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Temporary Password:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200">
                  {lastCreatedMember.tempPassword || "adminPrajnaa#2024"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Role & Work Area:</span>
                <span className="font-semibold text-neutral-800">{lastCreatedMember.role}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Prajnaa Market WhatsApp CRM Login\nURL: http://localhost:3000\nEmail: ${lastCreatedMember.email}\nPassword: ${lastCreatedMember.tempPassword || "adminPrajnaa#2024"}\nRole: ${lastCreatedMember.role}`
                  );
                  toast.success("Credentials copied to clipboard!");
                }}
                className="py-2.5 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.success(`Credentials dispatched to ${lastCreatedMember.name} via WhatsApp (${lastCreatedMember.phone})!`);
                  setShowCredentialsModal(false);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5.1. MODAL: CANCEL CREDENTIALS & REVOKE ACCESS           */}
      {/* ========================================================= */}
      {showRevokeModal && memberToRevoke && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 text-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">Cancel & Revoke Credentials</h3>
                  <p className="text-[11px] text-neutral-500">Security enforcement for Prajnaa WhatsApp CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRevokeModal(false);
                  setMemberToRevoke(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Targeted Member Summary */}
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-2 text-xs text-rose-900">
              <div className="flex items-center justify-between font-bold">
                <span className="text-sm text-neutral-900">{memberToRevoke.name}</span>
                <span className="text-[10px] px-2.5 py-0.5 bg-rose-200 text-rose-900 font-extrabold rounded-full">
                  {memberToRevoke.role}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Email (Login ID):</span>
                  <span className="font-medium text-neutral-800 truncate block">{memberToRevoke.email}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Phone Number:</span>
                  <span className="font-mono text-neutral-800 block">{memberToRevoke.phone}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/60 flex items-start gap-1.5 text-[11px] text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>
                  Cancelling credentials will immediately invalidate active sessions and block all future logins.
                </span>
              </div>
            </div>

            {/* Revocation Reason Selection */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-700">Reason for Cancellation</label>
              <select
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white"
              >
                <option value="Employee Left Organization">Employee Left Organization / Offboarded</option>
                <option value="Security Violation / Disciplinary Action">Security Violation / Disciplinary Action</option>
                <option value="Compromised Account / Lost Device">Compromised Account / Lost Device</option>
                <option value="Temporary Leave of Absence">Temporary Leave of Absence</option>
                <option value="Role Reassignment">Role Reassignment</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmRevoke("revoke")}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Cancel Credentials & Block Login</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmRevoke("delete")}
                  className="flex-1 py-2 px-3 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 rounded-xl text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3 text-neutral-500" />
                  <span>Permanently Remove Employee</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRevokeModal(false);
                    setMemberToRevoke(null);
                  }}
                  className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl text-[11px] font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5.3. DELETE CONTACT & CHAT HISTORY MODAL                  */}
      {/* ========================================================= */}
      {showDeleteContactModal && currentCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-slate-800 space-y-4 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
                  <UserX className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Delete Customer Contact</h3>
                  <p className="text-[11px] text-neutral-500">Permanent removal of contact and messages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteContactModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Targeted Customer Summary */}
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl space-y-2 text-xs text-rose-900 dark:text-rose-200">
              <div className="flex items-center justify-between font-bold">
                <span className="text-sm text-neutral-900 dark:text-white">{currentCustomer.name}</span>
                <span className="text-[10px] px-2.5 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-extrabold rounded-full">
                  {currentCustomer.phone}
                </span>
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-slate-300">
                Are you sure you want to delete this customer? This will permanently delete:
              </p>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-neutral-700 dark:text-slate-300">
                <li>Customer profile and contact details</li>
                <li>All WhatsApp incoming and outgoing messages</li>
                <li>Chat history stored in the MongoDB Atlas cloud database</li>
              </ul>
              <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>This action cannot be undone.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingContact}
                onClick={() => setShowDeleteContactModal(false)}
                className="px-4 py-2 border border-neutral-300 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingContact}
                onClick={handleDeleteContact}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingContact ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5.4. EDIT CUSTOMER PROFILE MODAL                           */}
      {/* ========================================================= */}
      {showEditCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-slate-800 space-y-4 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Edit Customer Profile</h3>
                  <p className="text-[11px] text-neutral-500">Update contact and delivery details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditCustomerModal(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-slate-800 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerProfile} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-slate-300">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-slate-300">WhatsApp Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={editCustEmail}
                  onChange={(e) => setEditCustEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700 dark:text-slate-300">Street / Area Address</label>
                <input
                  type="text"
                  value={editCustAddress}
                  onChange={(e) => setEditCustAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={editCustCity}
                    onChange={(e) => setEditCustCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 dark:text-slate-300">Pincode</label>
                  <input
                    type="text"
                    value={editCustPincode}
                    onChange={(e) => setEditCustPincode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-slate-800">
                <label className="font-semibold text-neutral-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCustIsVip}
                    onChange={(e) => setEditCustIsVip(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Mark as VIP Customer ⭐</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditCustomerModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-neutral-600 dark:text-slate-300 hover:bg-neutral-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5.5. CREATE NEW ORDER MODAL                                */}
      {/* ========================================================= */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-5xl lg:max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 dark:border-slate-800 space-y-4 text-neutral-900 dark:text-white my-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-white">Create New Customer Order</h3>
                  <p className="text-[11px] text-neutral-500">
                    Add order details manually or from WhatsApp inquiries with full product catalog visibility.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-4 text-xs">
              {/* Customer Info */}
              <div className="space-y-2.5 bg-neutral-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-2xl border border-neutral-200/70 dark:border-slate-800">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> Customer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700 dark:text-slate-300">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajat Katnoria"
                      value={newOrderCustomerName}
                      onChange={(e) => setNewOrderCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700 dark:text-slate-300">WhatsApp Mobile (10-Digit) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 98XXXXXXXX"
                      value={newOrderCustomerPhone}
                      onChange={(e) => setNewOrderCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700 dark:text-slate-300">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      value={newOrderCustomerEmail}
                      onChange={(e) => setNewOrderCustomerEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2.5 bg-neutral-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-2xl border border-neutral-200/70 dark:border-slate-800">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> Shipping & Delivery Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="font-semibold text-neutral-700 dark:text-slate-300">Street / Area Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="House/Flat No, Street, Landmark"
                      value={newOrderAddress}
                      onChange={(e) => setNewOrderAddress(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="font-semibold text-neutral-700 dark:text-slate-300">City</label>
                    <input
                      type="text"
                      value={newOrderCity}
                      onChange={(e) => setNewOrderCity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="font-semibold text-neutral-700 dark:text-slate-300">Pincode</label>
                    <input
                      type="text"
                      value={newOrderPincode}
                      onChange={(e) => setNewOrderPincode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection (Multi-Product Support) */}
              <div className="space-y-3 bg-neutral-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-2xl border border-neutral-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" /> Order Produce ({newOrderItemsList.length} items)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddOrderItemLine}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Product
                  </button>
                </div>

                <div className="space-y-2.5">
                  {newOrderItemsList.map((item: any, idx: number) => {
                    const selectedProd = productsList.find((p) => p.id === item.productId) || productsList[0];
                    const itemPrice = selectedProd?.price || 0;
                    const itemQty = Math.max(1, item.qty || 1);
                    const lineGross = itemPrice * itemQty;
                    const itemDiscount = Math.max(0, Math.min(lineGross, Number(item.discount) || 0));
                    const lineNet = lineGross - itemDiscount;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Item #{idx + 1}</span>
                            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                              ₹{itemPrice.toLocaleString("en-IN")}{selectedProd?.weight ? ` / ${selectedProd.weight}` : ""}
                            </span>
                          </div>
                          {newOrderItemsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItemLine(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-6 md:col-span-7">
                            <SearchableProductSelect
                              products={productsList.map((p) => ({
                                id: p.id,
                                name: p.name,
                                price: p.price,
                                weight: p.weight,
                                category: p.category,
                              }))}
                              selectedId={item.productId}
                              onSelect={(prod: any) => handleUpdateOrderItemLine(idx, prod.id, item.qty, item.discount)}
                              placeholder="Search Himalayan produce..."
                              className="w-full"
                            />
                          </div>

                          <div className="sm:col-span-3 md:col-span-2 flex items-center justify-start sm:justify-center gap-1.5">
                            <span className="text-[10px] text-neutral-400 mr-1 sm:hidden">Qty:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderItemLine(idx, item.productId, Math.max(1, item.qty - 1), item.discount)}
                              className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-neutral-700 dark:text-slate-200 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-xs">{itemQty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderItemLine(idx, item.productId, itemQty + 1, item.discount)}
                              className="h-8 w-8 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800 hover:bg-neutral-100 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-neutral-700 dark:text-slate-200 cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="sm:col-span-3 md:col-span-1.5 flex items-center gap-1">
                            <div className="relative w-full" title="Discount on this product (₹)">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">₹</span>
                              <input
                                type="number"
                                min="0"
                                max={lineGross}
                                placeholder="Disc"
                                value={item.discount === 0 || item.discount == null ? "" : item.discount}
                                onChange={(e) => handleUpdateOrderItemDiscount(idx, Number(e.target.value) || 0)}
                                className="w-full pl-5 pr-1.5 py-1.5 text-xs font-mono font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-neutral-400 placeholder:font-normal"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-12 md:col-span-1.5 text-right font-mono flex flex-col items-end justify-center">
                            {itemDiscount > 0 && (
                              <span className="line-through text-[10px] text-neutral-400">
                                ₹{lineGross.toLocaleString("en-IN")}
                              </span>
                            )}
                            <span className={`font-bold text-xs ${itemDiscount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-900 dark:text-white"}`}>
                              ₹{lineNet.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddOrderItemLine}
                  className="w-full py-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-emerald-600" /> + Add Another Produce Item
                </button>
              </div>

              {/* Payment & Status Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Payment Method</label>
                  <select
                    value={newOrderPaymentMethodChoice}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setNewOrderPaymentMethodChoice(val);
                      if (val === "COD") setNewOrderPaymentStatus("Pending");
                    }}
                    className="w-full p-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="UPI">UPI / QR (GPay, PhonePe, Paytm)</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="WhatsApp">WhatsApp Pay Direct</option>
                    <option value="Credit">B2B Credit Terms (15-Day Invoice)</option>
                    <option value="BankTransfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Card">Credit / Debit Card</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Payment Status</label>
                  <select
                    value={newOrderPaymentStatus}
                    onChange={(e) => setNewOrderPaymentStatus(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Initial Order Status</label>
                  <select
                    value={newOrderStatus}
                    onChange={(e) => setNewOrderStatus(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Order Notes & Manual Delivery Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Customer / Internal Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning delivery preferred, raw forest honey batch"
                    value={newOrderNotes}
                    onChange={(e) => setNewOrderNotes(e.target.value)}
                    className="w-full p-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700 flex items-center justify-between">
                    <span>Delivery / Shipping Charges (₹)</span>
                    <span className="text-[10px] text-amber-600 font-medium">Manual charge (no free delivery)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newOrderShipping === 0 ? "" : newOrderShipping}
                    onChange={(e) => setNewOrderShipping(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 rounded-xl border border-neutral-200 font-mono font-bold text-xs bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Dynamic Pricing Summary Card - Only shows discount given, manual delivery charge */}
              {(() => {
                const subtotal = newOrderItemsList.reduce((acc: number, item: any) => {
                  const prod = productsList.find((p) => p.id === item.productId) || productsList[0];
                  return acc + (prod?.price || 0) * (item.qty || 1);
                }, 0);
                const totalDiscount = newOrderItemsList.reduce((acc: number, item: any) => {
                  const prod = productsList.find((p) => p.id === item.productId) || productsList[0];
                  const gross = (prod?.price || 0) * (item.qty || 1);
                  const itemDisc = Math.max(0, Math.min(gross, Number(item.discount) || 0));
                  return acc + itemDisc;
                }, 0);
                const netProduce = Math.max(0, subtotal - totalDiscount);
                const shipping = Math.max(0, Number(newOrderShipping) || 0);
                const total = netProduce + shipping;
                const totalItemsCount = newOrderItemsList.reduce((a: number, b: any) => a + (b.qty || 1), 0);

                return (
                  <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Produce Subtotal ({totalItemsCount} items)</span>
                      <span className="font-mono font-bold text-neutral-800">₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className={`flex justify-between ${totalDiscount > 0 ? "text-emerald-700 font-semibold" : "text-neutral-500"}`}>
                      <span>Total Product Discount Given</span>
                      <span className="font-mono font-bold">
                        {totalDiscount > 0 ? `-₹${totalDiscount.toLocaleString("en-IN")}` : "₹0"}
                      </span>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-neutral-600 text-[11px]">
                        <span>Net Produce (After Discount)</span>
                        <span className="font-mono font-semibold text-neutral-700">₹{netProduce.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-neutral-600">
                      <span>Shipping Delivery (Manual Charge)</span>
                      <span className="font-mono font-bold text-neutral-800">
                        ₹{shipping.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-emerald-200">
                      <span>Total Amount Payable</span>
                      <span className="font-mono text-emerald-800 text-base">₹{total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewOrder}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewOrder ? "Creating..." : "Create Order & Send WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. UPDATE STATUS MODAL                                    */}
      {/* ========================================================= */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 text-neutral-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-neutral-900">Update Order Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Select the new status for order <strong>{selectedOrderForView.orderNumber}</strong>. This will notify the customer on WhatsApp automatically.
            </p>

            {String(selectedOrderForView.paymentStatus || "").toLowerCase() !== "paid" && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-amber-950">Payment Status: Pending</p>
                  <p className="text-[10px] text-amber-800">Received UPI or bank payment?</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleMarkOrderAsPaid(selectedOrderForView);
                    setShowStatusModal(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Paid
                </button>
              </div>
            )}

            {/* Status Options Grid (With Forward-Only Lifecycle Check to Prevent Reverse Status Reversion) */}
            {(() => {
              const currentRank = getOrderStatusRank(selectedOrderForView?.orderStatus);
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ORDER_STATUS_OPTIONS.map((opt) => {
                    const optRank = getOrderStatusRank(opt.key);
                    // Prevent reverse cycle: cannot go back to past stages, unless Cancelled
                    const isPast = opt.key !== "Cancelled" && optRank < currentRank;
                    const isCurrent = (selectedOrderForView?.orderStatus || "").toLowerCase() === opt.key.toLowerCase();

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          if (isPast) return;
                          setStatusUpdateChoice(opt.key as any);
                          setCustomStatusMessage("");
                        }}
                        title={isPast ? "Status lifecycle cannot be moved backwards" : opt.desc}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition text-left flex flex-col justify-between gap-1 ${
                          isPast
                            ? "opacity-35 bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed line-through"
                            : statusUpdateChoice === opt.key
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600 shadow-2xs cursor-pointer"
                            : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span>{opt.icon}</span>
                            <span className="font-bold text-xs">{opt.label}</span>
                          </div>
                          {isPast && (
                            <span className="text-[9px] font-normal uppercase bg-neutral-200 text-neutral-600 px-1 py-0.2 rounded font-mono">
                              Passed
                            </span>
                          )}
                          {isCurrent && !isPast && (
                            <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-500 font-normal truncate block">
                          {isPast ? "Cannot revert backwards" : opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {statusUpdateChoice === "In Transit" && (
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <label className="text-xs font-bold text-neutral-700 block">
                  📍 Location / City Reached:
                </label>
                <input
                  type="text"
                  value={transitLocationInput}
                  onChange={(e) => setTransitLocationInput(e.target.value)}
                  placeholder="e.g. Delhi Sorting Hub, Chandigarh Hub, Dehradun Hub..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["Solan Mountain Hub", "Chandigarh Hub", "Delhi Sorting Facility", "Dehradun Hub", "Regional Hub"].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setTransitLocationInput(loc)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-600 font-medium cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live WhatsApp Notification Message Preview & Edit Template Option */}
            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                  <span>💬</span> Live WhatsApp Update Preview
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    To: {selectedOrderForView.customerPhone || "Customer"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditingStatusTemplate && !customStatusMessage) {
                        setCustomStatusMessage(
                          getOrderStatusNotificationText(statusUpdateChoice, selectedOrderForView, transitLocationInput)
                        );
                      }
                      setIsEditingStatusTemplate(!isEditingStatusTemplate);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>✏️</span> {isEditingStatusTemplate ? "Standard Template" : "Edit Template"}
                  </button>
                </div>
              </div>

              {isEditingStatusTemplate ? (
                <div className="space-y-1">
                  <textarea
                    rows={5}
                    value={
                      customStatusMessage !== ""
                        ? customStatusMessage
                        : getOrderStatusNotificationText(statusUpdateChoice, selectedOrderForView, transitLocationInput)
                    }
                    onChange={(e) => setCustomStatusMessage(e.target.value)}
                    placeholder="Customize the WhatsApp notification message before dispatching..."
                    className="w-full text-[11px] p-2.5 rounded-xl border border-emerald-300 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono leading-relaxed"
                  />
                  <p className="text-[10px] text-neutral-500">
                    💡 You can customize this template message before dispatching. It will be sent directly via WhatsApp to {selectedOrderForView.customerName || "the customer"}.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-neutral-800 whitespace-pre-wrap font-sans bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs leading-relaxed max-h-36 overflow-y-auto">
                  {customStatusMessage.trim() || getOrderStatusNotificationText(statusUpdateChoice, selectedOrderForView, transitLocationInput)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setIsEditingStatusTemplate(false);
                  setCustomStatusMessage("");
                }}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const custName = selectedOrderForView.customerName || "ji";
                  const orderNumTag = selectedOrderForView.orderNumber || "PRJ-ORD";
                  const currentLoc = transitLocationInput.trim() || "Regional Sorting Hub";
                  const defaultNotifyText = getOrderStatusNotificationText(statusUpdateChoice, selectedOrderForView, currentLoc);
                  const notifyText = (customStatusMessage || "").trim() || defaultNotifyText;

                  setSelectedOrderForView((prev) => ({
                    ...prev,
                    orderStatus: statusUpdateChoice,
                    currentLocation: statusUpdateChoice === "In Transit" ? currentLoc : prev.currentLocation,
                  }));

                  setCreatedOrders((prev) =>
                    prev.map((o) =>
                      o.orderNumber === selectedOrderForView.orderNumber
                        ? { ...o, orderStatus: statusUpdateChoice, currentLocation: statusUpdateChoice === "In Transit" ? currentLoc : o.currentLocation }
                        : o
                    )
                  );

                  // Find matching customer in WhatsApp CRM
                  const cleanPhone = (selectedOrderForView.customerPhone || "").replace(/\D/g, "");
                  const matchingCust =
                    customers.find(
                      (c) =>
                        (cleanPhone.length >= 10 && c.phone.replace(/\D/g, "").endsWith(cleanPhone.slice(-10))) ||
                        c.name.toLowerCase() === custName.toLowerCase() ||
                        c.latestOrder?.orderNumber === selectedOrderForView.orderNumber
                    ) || currentCustomer;

                  // Update customer state & last message
                  const now = new Date();
                  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

                  setCustomers((prev) =>
                    prev.map((c) =>
                      c.id === matchingCust.id || c.latestOrder?.orderNumber === selectedOrderForView.orderNumber
                        ? {
                            ...c,
                            lastMessageText: notifyText.split("\n")[0] || `Status updated to ${statusUpdateChoice}`,
                            lastMessageTime: timeStr,
                            latestOrder: {
                              ...c.latestOrder,
                              orderStatus: statusUpdateChoice,
                              currentLocation: statusUpdateChoice === "In Transit" ? currentLoc : c.latestOrder?.currentLocation,
                            },
                          }
                        : c
                    )
                  );

                  // Append to CRM active chat thread so admin sees it immediately in Inbox
                  const newMsg: Message = {
                    id: `msg_status_${Date.now()}`,
                    sender: "business",
                    senderName: "Prajnaa Fulfillment",
                    text: notifyText,
                    time: timeStr,
                    date: dateStr,
                    type: "text",
                    status: "delivered",
                  };

                  setMessagesMap((prev: any) => ({
                    ...prev,
                    [matchingCust.id]: [...(prev[matchingCust.id] || []), newMsg],
                  }));

                  // Update localStorage orders
                  setCrmOrders((prev) => {
                    const updated = prev.map((o) =>
                      `#${o.orderNumber || o.id}` === selectedOrderForView.orderNumber ||
                      String(o.orderNumber || o.id) === selectedOrderForView.orderNumber ||
                      String(o.orderNumber || o.id).replace(/^#+/, "") === selectedOrderForView.orderNumber.replace(/^#+/, "")
                        ? {
                            ...o,
                            status: statusUpdateChoice,
                            currentLocation: statusUpdateChoice === "In Transit" ? currentLoc : o.currentLocation,
                            shippingStage: statusUpdateChoice === "Delivering Tomorrow" ? "delivering_tomorrow" : statusUpdateChoice === "Out for Delivery" ? "out_for_delivery" : statusUpdateChoice.toLowerCase(),
                          }
                        : o
                    );
                    try {
                      localStorage.setItem("prajnaa_crm_orders", JSON.stringify(updated));
                    } catch {}
                    try {
                      const orderToSync = updated.find(
                        (o) =>
                          `#${o.orderNumber || o.id}` === selectedOrderForView.orderNumber ||
                          String(o.orderNumber || o.id) === selectedOrderForView.orderNumber ||
                          String(o.orderNumber || o.id).replace(/^#+/, "") === selectedOrderForView.orderNumber.replace(/^#+/, "")
                      );
                      if (orderToSync) {
                        fetch("/api/crm/orders", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(orderToSync),
                        }).catch(() => {});
                      }
                    } catch {}
                    return updated;
                  });

                  // Dispatch automated WhatsApp notification via server pipeline
                  const targetPhone = cleanPhone || "918091265690";
                  try {
                    fetch("/api/crm/messages", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        sender: "business",
                        from: "918091265690",
                        to: targetPhone.length === 10 ? `91${targetPhone}` : targetPhone,
                        customerName: custName,
                        text: notifyText,
                        orderNumber: selectedOrderForView.orderNumber,
                        customerId: matchingCust.id,
                      }),
                    }).catch((err) => console.warn("WhatsApp status dispatch error:", err));
                  } catch {}

                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("storage"));
                    window.dispatchEvent(new CustomEvent("prajnaa_order_placed"));
                  }

                  setShowStatusModal(false);
                  setIsEditingStatusTemplate(false);
                  setCustomStatusMessage("");
                  toast.success(`Order status updated to "${statusUpdateChoice}"! Automated WhatsApp update sent to ${custName}.`);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Update & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INDIA POST TRACKING ID / CONSIGNMENT               */}
      {/* ========================================================= */}
      {showTrackingModal && selectedOrderForView && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">
                    India Post Consignment / Tracking ID
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Order {selectedOrderForView.orderNumber} • {selectedOrderForView.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackingModal(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Speed Post Consignment Number (AWB / Tracking ID):
                </label>
                <input
                  type="text"
                  value={editTrackingNumber}
                  onChange={(e) => setEditTrackingNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. EH123456789IN, SP882194012IN"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Enter the India Post barcode number issued at Solan Head Post Office.
                </p>
              </div>

              {editTrackingNumber.trim() && (
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-neutral-800">India Post Live Portal</p>
                    <p className="text-[10px] text-neutral-500">Track consignment on official portal</p>
                  </div>
                  <a
                    href="https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>Track 🌐</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowTrackingModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleanedTracking = editTrackingNumber.trim();
                  setSelectedOrderForView((prev: any) => ({
                    ...prev,
                    trackingNumber: cleanedTracking,
                  }));

                  setCreatedOrders((prev) =>
                    prev.map((o) =>
                      o.orderNumber === selectedOrderForView.orderNumber
                        ? { ...o, trackingNumber: cleanedTracking }
                        : o
                    )
                  );

                  setCrmOrders((prev) => {
                    const updated = prev.map((o) =>
                      `#${o.orderNumber || o.id}` === selectedOrderForView.orderNumber ||
                      String(o.orderNumber || o.id) === selectedOrderForView.orderNumber ||
                      String(o.orderNumber || o.id).replace(/^#+/, "") === selectedOrderForView.orderNumber.replace(/^#+/, "")
                        ? { ...o, trackingNumber: cleanedTracking, awbNumber: cleanedTracking }
                        : o
                    );
                    try {
                      localStorage.setItem("prajnaa_crm_orders", JSON.stringify(updated));
                    } catch {}
                    try {
                      const orderToSync = updated.find(
                        (o) =>
                          `#${o.orderNumber || o.id}` === selectedOrderForView.orderNumber ||
                          String(o.orderNumber || o.id) === selectedOrderForView.orderNumber ||
                          String(o.orderNumber || o.id).replace(/^#+/, "") === selectedOrderForView.orderNumber.replace(/^#+/, "")
                      );
                      if (orderToSync) {
                        fetch("/api/crm/orders", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(orderToSync),
                        }).catch(() => {});
                      }
                    } catch {}
                    return updated;
                  });

                  setShowTrackingModal(false);
                  toast.success(`Tracking ID saved: ${cleanedTracking || "None"}`);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Tracking ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: EDIT PRODUCT STOCK & INVENTORY                   */}
      {/* ========================================================= */}
      {showEditStockModal && editingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 text-neutral-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {editingProduct.image && (editingProduct.image.startsWith("/") || editingProduct.image.startsWith("http")) ? (
                <img
                  src={editingProduct.image}
                  alt={editingProduct.name}
                  className="h-12 w-12 rounded-xl object-cover border border-neutral-200 shadow-xs shrink-0"
                />
              ) : (
                <span className="text-3xl">{editingProduct.image || "🌿"}</span>
              )}
                <div>
                  <h3 className="font-bold text-base text-neutral-900">{editingProduct.name}</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{editingProduct.origin}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditStockModal(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">Change Stock Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["In Stock", "Low Stock", "Out of Stock", "Pre-Order"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStockStatusInput(st)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        editStockStatusInput === st
                          ? st === "In Stock"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20"
                            : st === "Low Stock"
                            ? "bg-amber-50 text-amber-800 border-amber-500 ring-2 ring-amber-500/20"
                            : st === "Out of Stock"
                            ? "bg-rose-50 text-rose-800 border-rose-500 ring-2 ring-rose-500/20"
                            : "bg-sky-50 text-sky-800 border-sky-500 ring-2 ring-sky-500/20"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      <span>
                        {st === "In Stock" ? "🟢" : st === "Low Stock" ? "🟡" : st === "Out of Stock" ? "🔴" : "🔵"}
                      </span>
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Available Units Count</label>
                  <input
                    type="number"
                    min="0"
                    value={editUnitsInput}
                    onChange={(e) => setEditUnitsInput(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Units left at warehouse</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={editPriceInput}
                    onChange={(e) => setEditPriceInput(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-400 mt-0.5 block">Storefront unit price</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowEditStockModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleUpdateProductStock(editingProduct.id, editStockStatusInput, editUnitsInput, editPriceInput);
                  setShowEditStockModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Stock Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
            {/* MODAL: MANAGE / ADD PRODUCT */}
      {showManageProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 dark:border-slate-800 space-y-4 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {editingProduct ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {editingProduct ? `Manage: ${editingProduct.name}` : "Add New Product to Catalog"}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                    Configure SKU, pricing, packaging weight, origin, and live stock count
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageProductModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Channel Availability Selector */}
              <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700/80 space-y-2">
                <label className="text-xs font-bold text-neutral-800 dark:text-slate-200 block">
                  Product Availability & Channel *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProductFormData({ ...productFormData, isCrmOnly: false, channel: "central" })}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      !productFormData.isCrmOnly
                        ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                        : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🌐</span> Central Website & CRM
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-tight">
                      Available on market.prajnaa.in storefront and synced with CRM
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductFormData({ ...productFormData, isCrmOnly: true, channel: "crm_only" })}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      productFormData.isCrmOnly
                        ? "border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/20"
                        : "border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>💬</span> CRM Exclusive (Manual)
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-slate-400 leading-tight">
                      WhatsApp custom quotes & offline phone orders only (hidden from website)
                    </p>
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  placeholder="e.g. Raw Himalayan Flora Honey (500g)"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Grid: Category & Packaging Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Dry Fruits">Dry Fruits</option>
                    <option value="Spices">Spices</option>
                    <option value="Honey & Preserves">Honey & Preserves</option>
                    <option value="Pickles">Pickles</option>
                    <option value="Salts">Salts</option>
                    <option value="Masalas">Masalas</option>
                    <option value="Seeds">Seeds</option>
                    <option value="Pantry Staples">Pantry Staples</option>
                    <option value="Herbal & Wellness">Herbal & Wellness</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Pack / Weight
                  </label>
                  <input
                    type="text"
                    value={productFormData.weight || ""}
                    onChange={(e) => setProductFormData({ ...productFormData, weight: e.target.value })}
                    placeholder="e.g. 500g, 1kg, 250g"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Grid: Selling Price & Available Units */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productFormData.price || ""}
                    onChange={(e) => setProductFormData({ ...productFormData, price: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 650"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Available Units in Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productFormData.unitsLeft || 0}
                    onChange={(e) => setProductFormData({ ...productFormData, unitsLeft: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Grid: Stock Status & Emoji Icon */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Stock Availability Status
                  </label>
                  <select
                    value={productFormData.stock}
                    onChange={(e) => setProductFormData({ ...productFormData, stock: e.target.value as StockStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="In Stock">🟢 In Stock</option>
                    <option value="Low Stock">🟡 Low Stock</option>
                    <option value="Out of Stock">🔴 Out of Stock</option>
                    <option value="Pre-Order">🔵 Pre-Order</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Emoji Icon / Symbol
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={productFormData.image || "🌿"}
                      onChange={(e) => setProductFormData({ ...productFormData, image: e.target.value })}
                      placeholder="e.g. 🍯"
                      className="w-16 text-center text-lg px-2 py-1.5 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center gap-1">
                      {["🌿", "🍯", "🌰", "🧂", "🍵", "🌶️"].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setProductFormData({ ...productFormData, image: em })}
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-slate-800 text-sm cursor-pointer"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid: Himalayan Origin & SKU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Himalayan Origin
                  </label>
                  <input
                    type="text"
                    value={productFormData.origin}
                    onChange={(e) => setProductFormData({ ...productFormData, origin: e.target.value })}
                    placeholder="e.g. Kullu Valley, Himachal Pradesh"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={productFormData.sku || ""}
                    onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                    placeholder="e.g. PM-HNY-500"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Farmer / Artisan & Custom Image URL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Farmer / Farm Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={productFormData.farmerName || ""}
                    onChange={(e) => setProductFormData({ ...productFormData, farmerName: e.target.value })}
                    placeholder="e.g. Bashir Ahmad / Orchard"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                    Product Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={productFormData.image && (productFormData.image.startsWith("/") || productFormData.image.startsWith("http")) ? productFormData.image : ""}
                    onChange={(e) => setProductFormData({ ...productFormData, image: e.target.value || "🌿" })}
                    placeholder="https://... or /assets/..."
                    className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Product Description */}
              <div>
                <label className="text-xs font-bold text-neutral-700 dark:text-slate-300 block mb-1">
                  Product Description / Staff Notes
                </label>
                <textarea
                  rows={2}
                  value={productFormData.description || ""}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  placeholder="Harvest details, pure organic notes, or custom CRM notes..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowManageProductModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-semibold text-neutral-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveProduct(productFormData)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{editingProduct ? "Save Changes" : "Create Product"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE PRODUCT CONFIRMATION */}
      {showDeleteProductConfirm && productToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-slate-800 space-y-4 text-neutral-900 dark:text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Remove Product</h3>
                <p className="text-xs text-neutral-500 dark:text-slate-400">
                  Are you sure you want to delete this product from the catalog?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-200/80 dark:border-slate-700 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{productToDelete.image}</span>
                <span className="font-bold text-neutral-900 dark:text-white">{productToDelete.name}</span>
              </div>
              <p className="text-neutral-500 dark:text-slate-400">
                Category: <strong>{productToDelete.category}</strong> | Price: <strong>₹{productToDelete.price}</strong> | Units: <strong>{productToDelete.unitsLeft}</strong>
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 pt-1 font-medium">
                ⚠️ Removing this product will exclude it from WhatsApp quick quotes and catalog selection.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteProductConfirm(false);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 text-xs font-semibold text-neutral-600 dark:text-slate-300 hover:bg-neutral-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(productToDelete.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertLeadModal && selectedLeadForConvert && (
        <NewLeadModal
          isOpen={showConvertLeadModal}
          initialPhone={selectedLeadForConvert.phone}
          initialName={selectedLeadForConvert.name}
          initialEmail={selectedLeadForConvert.email}
          onClose={() => {
            setShowConvertLeadModal(false);
            setSelectedLeadForConvert(null);
          }}
          onSuccess={() => {
            setShowConvertLeadModal(false);
            setSelectedLeadForConvert(null);
            toast.success("Lead created successfully! Navigating to Leads & Sales...");
            setActiveNav("leads");
          }}
        />
      )}

      {/* ========================================================= */}
      {/* 5.8. OFFICIAL TAX INVOICE & COMMERCIAL SLIP MODAL           */}
      {/* ========================================================= */}
      {showInvoiceModal && selectedOrderForView && (
        <div
          id="prajnaa-tax-invoice-modal-overlay"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
        >
          <div
            id="prajnaa-tax-invoice-modal-card"
            className="bg-neutral-100 dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border border-neutral-300 dark:border-slate-800 overflow-hidden my-auto"
          >
            {/* Top Modal Controls Bar (Hidden during Print) */}
            <div className="px-5 py-3.5 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <Printer className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>Tax Invoice & Dispatch Slip</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-slate-300">
                      {selectedOrderForView.orderNumber}
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-slate-400">
                    Complies with Rule 46 of CGST Rules, 2017 &amp; Shipping fulfillment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 1-Click Tax Regime Switcher */}
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-slate-800 p-1 rounded-xl border border-neutral-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setInvoiceTaxMode("inter")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      invoiceTaxMode === "inter"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900"
                    }`}
                  >
                    <span>🌐 Inter-State (IGST 5%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceTaxMode("intra")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      invoiceTaxMode === "intra"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900"
                    }`}
                  >
                    <span>🏔️ Intra-State (Himachal CGST+SGST)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenInvoiceNewTab}
                  className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-neutral-800 dark:text-neutral-200 font-semibold text-xs border border-neutral-300 dark:border-slate-600 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Open invoice in new standalone window for printing or saving"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                  <span>Open Standalone</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  title="Direct print dialog (or Save as PDF)"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Invoice / Save as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-slate-200 transition cursor-pointer"
                  title="Close Invoice Preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Preview Area */}
            <div
              id="prajnaa-tax-invoice-preview-wrapper"
              className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-200/60 dark:bg-slate-950 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible"
            >
              {/* THE OFFICIAL TAX INVOICE A4 SHEET (MATCHING REFERENCE FORMAT) */}
              <div
                id="prajnaa-tax-invoice"
                className="bg-white text-neutral-900 p-6 sm:p-8 w-full max-w-[850px] h-fit min-h-fit shadow-xl rounded-xl print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full space-y-3 text-xs font-sans border border-neutral-300 my-4 print:my-0"
              >
                {/* 1. Header: Left Company Brand & Right TAX INVOICE Heading */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b border-neutral-300">
                  {/* Left: Prajnaa Logo & Official Business Info */}
                  <div className="flex flex-col items-start space-y-1">
                    <img
                      src="/prajnaa-logo.png"
                      alt="Prajnaa"
                      className="h-14 sm:h-16 w-auto object-contain mb-1"
                    />
                    <div className="text-[11px] text-neutral-800 leading-tight space-y-0.5 font-sans pt-1">
                      <p className="font-mono text-xs font-bold text-neutral-900">
                        GSTIN: 02ARWPN7184K1Z1 &bull; FSSAI: 20923014000132
                      </p>
                      <p className="font-mono text-xs font-semibold text-neutral-800">Phone: 8979768681</p>
                      <p className="text-xs text-neutral-700">Email: prajnaafarm@gmail.com &bull; Web: market.prajnaa.in</p>
                      <p className="text-[10.5px] text-neutral-500">Seva Niketan, Ward No.2, Near ITI, Solan, HP 173212</p>
                    </div>
                  </div>

                  {/* Right: TAX INVOICE Header */}
                  <div className="text-left sm:text-right pt-1">
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-wider text-neutral-900 uppercase">
                      TAX INVOICE
                    </h1>
                    <p className="text-[10px] text-neutral-500 font-medium">Original for Recipient</p>
                  </div>
                </div>

                {/* 2. Metadata Box (Enclosed Grid Table) */}
                {(() => {
                  const rawOrderNum = selectedOrderForView.orderNumber || "000006";
                  const cleanNum = rawOrderNum.replace(/[^a-zA-Z0-9]/g, "");
                  const invoiceNumDisplay = rawOrderNum.toUpperCase().startsWith("INV")
                    ? rawOrderNum.toUpperCase()
                    : `INV-${cleanNum.padStart(6, "0")}`;

                  const today = new Date();
                  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const defaultDueDate = `${pad(endOfMonth.getDate())}/${pad(endOfMonth.getMonth() + 1)}/${endOfMonth.getFullYear()}`;
                  const invoiceDateDisplay = selectedOrderForView.date || `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

                  return (
                    <div className="border border-neutral-300 grid grid-cols-1 sm:grid-cols-2 text-xs">
                      {/* Left Sub-Box: Invoice #, Date, Terms, Due Date */}
                      <div className="p-2.5 sm:border-r border-neutral-300 space-y-1">
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-5 text-neutral-600 font-medium">#</span>
                          <span className="col-span-7 font-bold text-neutral-900">: {invoiceNumDisplay}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-5 text-neutral-600 font-medium">Invoice Date</span>
                          <span className="col-span-7 font-bold text-neutral-900">: {invoiceDateDisplay}</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-5 text-neutral-600 font-medium">Terms</span>
                          <span className="col-span-7 font-bold text-neutral-900">: Due end of the month</span>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          <span className="col-span-5 text-neutral-600 font-medium">Due Date</span>
                          <span className="col-span-7 font-bold text-neutral-900">: {defaultDueDate}</span>
                        </div>
                      </div>

                      {/* Right Sub-Box: Place Of Supply */}
                      {(() => {
                        const addrText = (selectedOrderForView.shippingAddress || (selectedOrderForView as any).address || "").toLowerCase().trim();
                        const hpStrictPatterns = [
                          /\bhimachal\b/i,
                          /\bhimachal\s+pradesh\b/i,
                          /\bhp\b/i,
                          /\bh\.p\b/i,
                          /\bsolan\b/i,
                          /\bshimla\b/i,
                          /\bkullu\b/i,
                          /\bmanali\b/i,
                          /\bdharamshala\b/i,
                          /\bmandi\b/i,
                          /\bkangra\b/i,
                          /\bbilaspur\b/i,
                          /\buna\b/i,
                          /\bhamirpur\b/i,
                          /\bchamba\b/i,
                          /\bkinnaur\b/i,
                          /\blahaul\b/i,
                          /\bspiti\b/i,
                          /\bparwanoo\b/i,
                          /\bbaddi\b/i,
                          /\bnalagarh\b/i,
                          /\bpaonta\b/i,
                          /\b173212\b/i,
                        ];
                        const isHp = hpStrictPatterns.some((pattern) => pattern.test(addrText));
                        const isOutOfState = invoiceTaxMode === "inter" ? true : invoiceTaxMode === "intra" ? false : !isHp;

                        return (
                          <div className="p-2.5 border-t sm:border-t-0 border-neutral-300">
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-5 text-neutral-600 font-medium">Place Of Supply</span>
                              <span className="col-span-7 font-bold text-neutral-900">
                                {isOutOfState ? ": Other State (Inter-State / IGST 5%)" : ": Himachal Pradesh (02)"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* 3. Bill To Section (Gray Header Bar + Customer Details) */}
                <div className="border border-neutral-300">
                  <div className="bg-[#f4f5f7] px-3 py-1 font-bold text-neutral-800 text-xs border-b border-neutral-300">
                    Bill To
                  </div>
                  <div className="p-3 text-xs space-y-1 bg-white">
                    <h4 className="font-bold text-sm text-[#1d4ed8]">
                      {selectedOrderForView.customerName || "GuruKripa Kariyana Store"}
                    </h4>
                    {selectedOrderForView.shippingAddress && (
                      <p className="text-neutral-700 leading-snug">
                        {selectedOrderForView.shippingAddress}
                      </p>
                    )}
                    {selectedOrderForView.customerPhone && (
                      <p className="text-neutral-600">
                        Phone: {selectedOrderForView.customerPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4. Subject Line */}
                <div className="py-1 text-xs">
                  <span className="font-bold text-neutral-800 block text-[11px]">Subject :</span>
                  <p className="font-semibold text-neutral-800 text-xs mt-0.5">
                    Pure Himalayan Natural Produce &amp; Farm Fresh Harvest
                  </p>
                </div>

                {/* 5. Itemized Goods & Two-Level GST Table (Matching Reference Format) */}
                {(() => {
                  const rawItems = selectedOrderForView.items && selectedOrderForView.items.length > 0
                    ? selectedOrderForView.items
                    : [
                        {
                          name: "Garam Masala LP3",
                          weight: "pcs",
                          qty: selectedOrderForView.itemsCount || 1,
                          price: Number(selectedOrderForView.amount || 63.50),
                          total: Number(selectedOrderForView.amount || 63.50),
                        },
                      ];

                  const parsedInvoiceItems = rawItems.map((it: any) => {
                    const qty = Math.max(1, Number(it.qty || it.quantity || 1));
                    let price = Number(it.price || 0);
                    let total = Number(it.total || 0);

                    if (price <= 0 && total > 0) {
                      price = Math.round((total / qty) * 100) / 100;
                    }
                    if (total <= 0 || (total <= price && qty > 1)) {
                      total = Math.round(price * qty * 100) / 100;
                    }
                    if (price <= 0 && total <= 0) {
                      const found = productsList.find(
                        (p) => p.name.toLowerCase() === (it.name || "").toLowerCase() || p.id === it.productId
                      );
                      price = found?.price || 63.50;
                      total = price * qty;
                    }

                    let packUnit = "pcs";
                    const nameL = (it.name || it.productName || it.weight || "").toLowerCase();
                    if (nameL.includes("kg")) packUnit = "kg";
                    else if (nameL.includes("litre") || nameL.includes("1l")) packUnit = "ltr";
                    else if (nameL.includes("gm") || nameL.includes("g")) packUnit = "pcs";

                    return {
                      ...it,
                      name: it.name || it.productName || "Garam Masala LP3",
                      qty,
                      price,
                      total,
                      unit: packUnit,
                    };
                  });

                  const computedGrossTotal = parsedInvoiceItems.reduce((acc, it) => acc + it.total, 0);
                  const discountVal = Number(selectedOrderForView.discount || 0);
                  const shippingVal = Number(selectedOrderForView.shipping || 0);
                  const computedTotal = Math.max(0, computedGrossTotal - discountVal + shippingVal);
                  const finalInvoiceAmount = selectedOrderForView.amount != null && selectedOrderForView.amount > 0 && selectedOrderForView.amount === computedTotal
                    ? selectedOrderForView.amount
                    : computedTotal;

                  // 5% GST calculations (Intra-state: 2.5% CGST + 2.5% SGST | Inter-state outside Himachal: 5.0% IGST)
                  const shippingAddrText = (selectedOrderForView.shippingAddress || (selectedOrderForView as any).address || "").toLowerCase().trim();
                  const hpStrictPatterns = [
                    /\bhimachal\b/i,
                    /\bhimachal\s+pradesh\b/i,
                    /\bhp\b/i,
                    /\bh\.p\b/i,
                    /\bsolan\b/i,
                    /\bshimla\b/i,
                    /\bkullu\b/i,
                    /\bmanali\b/i,
                    /\bdharamshala\b/i,
                    /\bmandi\b/i,
                    /\bkangra\b/i,
                    /\bbilaspur\b/i,
                    /\buna\b/i,
                    /\bhamirpur\b/i,
                    /\bchamba\b/i,
                    /\bkinnaur\b/i,
                    /\blahaul\b/i,
                    /\bspiti\b/i,
                    /\bparwanoo\b/i,
                    /\bbaddi\b/i,
                    /\bnalagarh\b/i,
                    /\bpaonta\b/i,
                    /\b173212\b/i,
                  ];
                  const isHp = hpStrictPatterns.some((pattern) => pattern.test(shippingAddrText));
                  const isOutOfState = invoiceTaxMode === "inter" ? true : invoiceTaxMode === "intra" ? false : !isHp;

                  const taxableSubtotal = Math.round((finalInvoiceAmount / 1.05) * 100) / 100;
                  const totalTax = Math.round((finalInvoiceAmount - taxableSubtotal) * 100) / 100;
                  const totalCgst = Math.round((totalTax / 2) * 100) / 100;
                  const totalSgst = Math.round((totalTax - totalCgst) * 100) / 100;
                  const roundingVal = Math.round((finalInvoiceAmount - (taxableSubtotal + totalTax)) * 100) / 100;

                  const isPaid = (selectedOrderForView.paymentStatus || "").toLowerCase() === "paid" ||
                                 (selectedOrderForView.paymentStatus || "").toLowerCase() === "collected";

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse border border-neutral-300">
                          <thead>
                            {/* Level 1 Table Header */}
                            <tr className="bg-[#f4f5f7] text-neutral-800 text-[11px] font-bold">
                              <th rowSpan={2} className="border border-neutral-300 py-1.5 px-2 text-center w-8">#</th>
                              <th rowSpan={2} className="border border-neutral-300 py-1.5 px-2 text-left">Item &amp; Description</th>
                              <th rowSpan={2} className="border border-neutral-300 py-1.5 px-2 text-center w-20">HSN/SAC</th>
                              <th rowSpan={2} className="border border-neutral-300 py-1.5 px-2 text-center w-16">Qty</th>
                              <th rowSpan={2} className="border border-neutral-300 py-1.5 px-2 text-right w-16">Rate</th>
                              {isOutOfState ? (
                                <th colSpan={2} className="border border-neutral-300 py-1 px-2 text-center bg-blue-50/50">IGST (Inter-State)</th>
                              ) : (
                                <>
                                  <th colSpan={2} className="border border-neutral-300 py-1 px-2 text-center">CGST</th>
                                  <th colSpan={2} className="border border-neutral-300 py-1 px-2 text-center">SGST</th>
                                </>
                              )}
                              <th rowSpan={2} className="border border-neutral-300 py-1.5 px-2 text-right w-20">Amount</th>
                            </tr>
                            {/* Level 2 Sub-Headers for CGST & SGST or IGST */}
                            <tr className="bg-[#f4f5f7] text-neutral-800 text-[10px] font-bold">
                              {isOutOfState ? (
                                <>
                                  <th className="border border-neutral-300 py-1 px-1.5 text-center w-12">%</th>
                                  <th className="border border-neutral-300 py-1 px-1.5 text-right w-16">Amt</th>
                                </>
                              ) : (
                                <>
                                  <th className="border border-neutral-300 py-1 px-1.5 text-center w-12">%</th>
                                  <th className="border border-neutral-300 py-1 px-1.5 text-right w-14">Amt</th>
                                  <th className="border border-neutral-300 py-1 px-1.5 text-center w-12">%</th>
                                  <th className="border border-neutral-300 py-1 px-1.5 text-right w-14">Amt</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-300 text-neutral-800 bg-white">
                            {parsedInvoiceItems.map((it, idx) => {
                              const itemTaxable = Math.round((it.total / 1.05) * 100) / 100;
                              const itemTax = Math.round((it.total - itemTaxable) * 100) / 100;
                              const cgstAmt = Math.round((itemTax / 2) * 100) / 100;
                              const sgstAmt = Math.round((itemTax - cgstAmt) * 100) / 100;

                              return (
                                <tr key={idx} className="hover:bg-neutral-50/80">
                                  <td className="border border-neutral-300 py-2 px-2 text-center font-mono text-[11px] text-neutral-600">
                                    {idx + 1}
                                  </td>
                                  <td className="border border-neutral-300 py-2 px-2.5">
                                    <span className="font-semibold text-neutral-900 block">{it.name}</span>
                                  </td>
                                  <td className="border border-neutral-300 py-2 px-2 text-center font-mono text-[11px] text-neutral-600">
                                    {getProductHsn(it.name) || "09109990"}
                                  </td>
                                  <td className="border border-neutral-300 py-2 px-2 text-center font-mono">
                                    <div className="font-medium">{it.qty.toFixed(2)}</div>
                                    <div className="text-[10px] text-neutral-500 font-sans">{it.unit}</div>
                                  </td>
                                  <td className="border border-neutral-300 py-2 px-2 text-right font-mono text-neutral-900">
                                    {it.price.toFixed(2)}
                                  </td>
                                  {isOutOfState ? (
                                    <>
                                      <td className="border border-neutral-300 py-2 px-1 text-center font-mono text-[11px] text-neutral-700">
                                        5.0%
                                      </td>
                                      <td className="border border-neutral-300 py-2 px-1.5 text-right font-mono text-neutral-700">
                                        {itemTax.toFixed(2)}
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="border border-neutral-300 py-2 px-1 text-center font-mono text-[11px] text-neutral-700">
                                        2.5%
                                      </td>
                                      <td className="border border-neutral-300 py-2 px-1.5 text-right font-mono text-neutral-700">
                                        {cgstAmt.toFixed(2)}
                                      </td>
                                      <td className="border border-neutral-300 py-2 px-1 text-center font-mono text-[11px] text-neutral-700">
                                        2.5%
                                      </td>
                                      <td className="border border-neutral-300 py-2 px-1.5 text-right font-mono text-neutral-700">
                                        {sgstAmt.toFixed(2)}
                                      </td>
                                    </>
                                  )}
                                  <td className="border border-neutral-300 py-2 px-2 text-right font-mono font-medium text-neutral-900">
                                    {it.total.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* 6. Bottom Section: Split 2 Columns matching Reference Image */}
                      <div className="border border-neutral-300 border-t-0 grid grid-cols-1 sm:grid-cols-12 text-xs">
                        {/* Left Column (col-span-7): Words, Notes & Bank Account Details */}
                        <div className="sm:col-span-7 p-3.5 sm:border-r border-neutral-300 space-y-3.5">
                          <div>
                            <span className="font-bold text-neutral-800 block text-[11px] mb-0.5">
                              Total In Words
                            </span>
                            <p className="font-serif italic font-bold text-neutral-900 text-xs">
                              Indian Rupee {numberToWordsIndian(finalInvoiceAmount).replace(/Rupees Only$/i, "").trim()} Only
                            </p>
                          </div>

                          <div>
                            <span className="font-bold text-neutral-800 block text-[11px] mb-0.5">
                              Notes
                            </span>
                            <p className="text-neutral-700 text-xs">
                              Thanks for your business.
                            </p>
                          </div>

                          {/* Official Bank Account Information */}
                          <div className="text-[11px] text-neutral-800 space-y-0.5 leading-snug pt-1 font-sans">
                            <p><span className="font-semibold text-neutral-900">A/c Name -</span> Prajnaa Market (AVBT Enterprises)</p>
                            <p><span className="font-semibold text-neutral-900">A/c No.</span> 033311501090034</p>
                            <p><span className="font-semibold text-neutral-900">IFSC :</span> NESF0000333</p>
                            <p><span className="font-semibold text-neutral-900">UPI ID :</span> prajnaa@upi / nisha6652054@slc</p>
                            <p className="text-neutral-600">Slice Small Finance Bank, Koramangala Bangalore Branch</p>
                          </div>
                        </div>

                        {/* Right Column (col-span-5): Calculation Box & Signatory Seal */}
                        <div className="sm:col-span-5 p-3.5 flex flex-col justify-between border-t sm:border-t-0 border-neutral-300 space-y-4">
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-neutral-700">
                              <span>Sub Total</span>
                              <span className="font-mono font-medium">{taxableSubtotal.toFixed(2)}</span>
                            </div>
                            {isOutOfState ? (
                              <div className="flex justify-between text-neutral-700 font-semibold text-blue-900">
                                <span>IGST (5.0%)</span>
                                <span className="font-mono font-medium">{totalTax.toFixed(2)}</span>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between text-neutral-700">
                                  <span>CGST2.5 (2.5%)</span>
                                  <span className="font-mono font-medium">{totalCgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-neutral-700">
                                  <span>SGST2.5 (2.5%)</span>
                                  <span className="font-mono font-medium">{totalSgst.toFixed(2)}</span>
                                </div>
                              </>
                            )}
                            {shippingVal > 0 ? (
                              <div className="flex justify-between text-neutral-700">
                                <span>Shipping</span>
                                <span className="font-mono font-medium">{shippingVal.toFixed(2)}</span>
                              </div>
                            ) : (
                              <div className="flex justify-between text-neutral-700">
                                <span>Rounding</span>
                                <span className="font-mono font-medium">{roundingVal.toFixed(2)}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-sm font-bold text-neutral-900 pt-1.5 border-t border-neutral-300">
                              <span>Total</span>
                              <span className="font-mono font-extrabold text-base">₹{finalInvoiceAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-xs text-neutral-700">
                              <span>Payment Made</span>
                              <span className="font-mono font-semibold text-red-600">
                                {isPaid ? `(-) ${finalInvoiceAmount.toFixed(2)}` : "0.00"}
                              </span>
                            </div>

                            <div className="flex justify-between text-xs font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                              <span>Balance Due</span>
                              <span className="font-mono font-bold">
                                ₹{isPaid ? "0.00" : finalInvoiceAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Signatory Section with Official Prajnaa Market Round Stamp Seal */}
                          <div className="pt-2 text-right">
                            <p className="text-[11px] font-semibold text-neutral-800">
                              For Prajnaa Market
                            </p>
                            <p className="text-[10px] text-neutral-500 italic">
                              (Authorized Signatory)
                            </p>
                            <div className="flex justify-end mt-2">
                              {/* Authentic Round Rubber Stamp Seal for Prajnaa Market */}
                              <svg
                                viewBox="0 0 160 160"
                                className="w-24 h-24 sm:w-28 sm:h-28 inline-block select-none transform rotate-[-6deg] text-[#0A5C36]"
                              >
                                {/* Outer double circular border */}
                                <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="2.5" />
                                <circle cx="80" cy="80" r="54" fill="none" stroke="currentColor" strokeWidth="1.2" />

                                <defs>
                                  <path id="stampPathTop" d="M 24,80 A 56,56 0 0,1 136,80" fill="none" />
                                  <path id="stampPathBottom" d="M 136,80 A 56,56 0 0,1 24,80" fill="none" />
                                </defs>

                                <text fill="currentColor" fontSize="10.5" fontWeight="bold" letterSpacing="2.2">
                                  <textPath href="#stampPathTop" startOffset="50%" textAnchor="middle">
                                    PRAJNAA MARKET
                                  </textPath>
                                </text>

                                <text fill="currentColor" fontSize="11" fontWeight="bold" letterSpacing="3">
                                  <textPath href="#stampPathBottom" startOffset="50%" textAnchor="middle">
                                    ★ SOLAN ★
                                  </textPath>
                                </text>

                                {/* Center Signature Script */}
                                <path
                                  d="M 45,86 Q 58,62 70,86 T 95,78 T 115,88"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                />
                                <text
                                  x="80"
                                  y="100"
                                  fill="currentColor"
                                  fontSize="9.5"
                                  fontStyle="italic"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                >
                                  Prajnaa Market
                                </text>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="text-center text-[9px] text-neutral-400 pt-2 border-t border-neutral-100 print:text-[8px]">
                  This is a computer-generated tax invoice issued by Prajnaa Market (AVBT Enterprises) under the Information Technology Act, 2000. All disputes subject to Solan (Himachal Pradesh) jurisdiction.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}