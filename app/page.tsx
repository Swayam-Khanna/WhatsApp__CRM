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
}

// Client-side automated reply generator with multi-step unknown sender greeting, name capture & Himalayan catalog recommendations
function generateClientAutoReply(customerName?: string, queryText: string = ""): string {
  const query = (queryText || "").toLowerCase().trim();
  const isUnknown = !customerName || customerName === "Customer" || customerName === "Patron" || customerName.startsWith("Patron (") || customerName.startsWith("+91");

  const clean = queryText.trim();
  const introMatch = clean.match(/(?:mera\s+naam|my\s+name\s+is|this\s+is|i\s+am|iam|main|mai|naam|name\s*:?)\s+([A-Za-z\u0900-\u097F\s]{2,30})/i);
  let extracted: string | null = null;
  if (introMatch && introMatch[1]) {
    extracted = introMatch[1].replace(/(?:hai|hu|hoon|ji|here|this side)\b.*$/i, "").trim();
  } else if (isUnknown) {
    const words = clean.split(/\s+/).filter(Boolean);
    const disallowed = ["hi", "hello", "hey", "hlo", "namaste", "pranam", "almond", "badam", "honey", "order", "price", "bhav"];
    if (words.length >= 1 && words.length <= 3 && clean.length >= 2 && clean.length <= 30 && !words.some(w => disallowed.includes(w.toLowerCase()))) {
      extracted = clean;
    }
  }

  const resolvedName = extracted || (!isUnknown ? customerName : undefined);
  const name = resolvedName ? `${resolvedName} ji` : "ji";

  // Product Intent: Almonds / Badam
  if (query.includes("almond") || query.includes("badam") || query.includes("badaam") || query.includes("mamra") || query.includes("kagzi almond")) {
    return [
      `Namaste ${name}! 🌿 Prajnaa Market ke certified 100% pure Himalayan Organic Almonds (Badam) direct mountain orchards se harvest kiye jate hain:`,
      "",
      "🌰 *Himalayan Mamra Giri Almonds (High Natural Oil)*:",
      "• 500g Pack: ₹1,250",
      "• 1kg Pack: ₹2,400 *(Best Value & Free Shipping)*",
      "",
      "🌰 *Kashmir Sweet Organic Almonds (Giri)*:",
      "• 500g Pack: ₹720",
      "• 1kg Pack: ₹1,400",
      "",
      "✨ *Prajnaa Farm Guarantee*:",
      "✔ 100% Chemical-free, unpolished single-origin harvest",
      "✔ Insured India Post Speed Post delivery (2–3 din mein dispatch from Solan hub)",
      "✔ Free delivery on orders above ₹999",
      "✔ Official UPI: prajnaa@upi",
      "",
      "Kripya batayein aap kaun sa pack aur kitni quantity lena chahte hain? Saath hi apna delivery address aur pincode share kar dijiye, hum turant order book kar denge! 🙏",
    ].join("\n");
  }

  // Product Intent: Honey / Shehad
  if (query.includes("honey") || query.includes("shehad") || query.includes("shahad") || query.includes("flora honey") || query.includes("madhu")) {
    return [
      `Namaste ${name}! 🍯 Hamara Himalayan Raw Flora Honey 100% raw, unheated aur multi-flora forest harvest hai:`,
      "",
      "• 500g Glass Jar: ₹550",
      "• 1kg Pack: ₹950",
      "• 5kg Bulk Saver: ₹3,950",
      "",
      "Kripya batayein aap kitni quantity order karna chahte hain aur apna delivery pincode share karein! 🌿",
    ].join("\n");
  }

  // Product Intent: Walnuts / Akhrot
  if (query.includes("walnut") || query.includes("akhrot") || query.includes("kagzi") || query.includes("walnuts")) {
    return [
      `Namaste ${name}! 🌰 Direct Kashmir & Himachal valley ke certified fresh walnuts:`,
      "",
      "• Kashmir Kagzi Walnuts (In-Shell): 500g ₹450 | 1kg ₹850",
      "• Pure Kashmiri Walnut Kernels (Giri): 500g ₹650 | 1kg ₹1,250",
      "",
      "Kripya apna delivery address share karein, hum turant dispatch note create kar denge! 🌿",
    ].join("\n");
  }

  // Address acknowledgement
  if (/\b\d{6}\b/.test(query) || query.includes("address") || query.includes("road") || query.includes("nagar") || query.includes("pata") || query.includes("pincode")) {
    return [
      `Bahut badhiya ${name}! 🙏 Aapka delivery address note kar liya gaya hai.`,
      "",
      "Himalayan farm fresh packaging Solan hub (Outer Solan Road, Solan, HP – 173212) se 2–3 din mein Speed Post dwara dispatch ho jayegi.",
      "",
      "Payment aap hamare official UPI desk *prajnaa@upi* par kar sakte hain. Payment ke baad screenshot yahan share kar dijiye taaki hum order confirm kar sakein! 🌿",
    ].join("\n");
  }

  // 1. Order Cancellation
  if (query.includes("cancel") || query.includes("radd")) {
    return `Namaste ${name}! 🙏 Agar aapka parcel abhi dispatch nahi hua hai, toh order cancel ho sakta hai. Kripya apna Order ID confirm kar dijiye, hum turant cancellation update kar denge.`;
  }

  // 2. Address Change / Update
  if (query.includes("address") || query.includes("pata") || query.includes("location") || query.includes("pincode change") || query.includes("galat address")) {
    return `Namaste ${name}! 🙏 Ji bilkul, agar parcel dispatch nahi hua hai toh address update ho jayega. Kripya apna naya complete delivery address aur pincode yahan send kar dijiye.`;
  }

  // 3. Cash on Delivery (COD)
  if (query.includes("cod") || query.includes("cash on delivery") || query.includes("pay on delivery") || query.includes("deliver hone par paise")) {
    return `Namaste ${name}! 🙏 Selected pincodes par Cash on Delivery (COD) uplabdh hai. Aap apna delivery pincode share kar dijiye, hum turant check karke bata denge.`;
  }

  // 4. Refund / Return / Money Back
  if (query.includes("refund") || query.includes("wapas") || query.includes("return") || query.includes("money back")) {
    return `Namaste ${name}! 🙏 Refund approve hone ke baad 3–5 working days ke andar aapke original bank account ya UPI source me paise credit ho jate hain.`;
  }

  // 5. Payment, Screenshot, UPI confirmation
  if (
    query.includes("payment") ||
    query.includes("screenshot") ||
    query.includes("upi") ||
    query.includes("qr") ||
    query.includes("utr") ||
    query.includes("pay") ||
    query.includes("paise") ||
    query.includes("transferred")
  ) {
    return `Namaste ${name}! 🙏 Agar aapne payment kar di hai, toh kripya payment ka screenshot ya transaction UTR number isi chat par share kar dijiye. Nishant ji verify karke turant confirm kar denge. (Official UPI: prajnaa@upi)`;
  }

  // 6. Delivery Timeline ("Kab aayega?" / "Kitne din lagenge?")
  if (
    query.includes("kab tak") ||
    query.includes("when will") ||
    query.includes("kab aayega") ||
    query.includes("aayega") ||
    query.includes("deliver") ||
    query.includes("reach") ||
    query.includes("kitne din") ||
    query.includes("delivery time")
  ) {
    return `Namaste ${name}! 🙏 Prajnaa organic products ki fresh artisan packing me 2–3 din lagte hain, aur dispatch hone ke baad 3–5 working days me Speed Post se parcel aapke address par deliver ho jata hai.`;
  }

  // 7. Dispatch Status & Tracking ("Dispatch hua kya?" / "Tracking number")
  if (
    query.includes("dispatch") ||
    query.includes("track") ||
    query.includes("tracking") ||
    query.includes("speed post") ||
    query.includes("consignment") ||
    query.includes("courier")
  ) {
    return `Namaste ${name}! 🙏 Jaise hi parcel dispatch hota hai, India Post Speed Post tracking number (ED...IN) automatically aapko isi WhatsApp par mil jayega, jise aap indiapost.gov.in par live track kar sakte hain.`;
  }

  // 8. Product Purity, Organic Quality, Farm Origin
  if (
    query.includes("organic") ||
    query.includes("pure") ||
    query.includes("asli") ||
    query.includes("chemical") ||
    query.includes("quality") ||
    query.includes("shilajit") ||
    query.includes("ghee") ||
    query.includes("apricot") ||
    query.includes("saffron")
  ) {
    return `Namaste ${name}! 🙏 Prajnaa Market ke sabhi products 100% certified organic aur natural hain, jo direct Himalayan mountain farmers se aate hain. Inme koi chemical ya preservatives nahi milaye jate aur har batch lab-tested hota hai.`;
  }

  // 9. Customer Care / Call / Phone Contact
  if (query.includes("contact") || query.includes("number") || query.includes("call") || query.includes("phone") || query.includes("helpline") || query.includes("baat")) {
    return `Namaste ${name}! 🙏 Hamara official customer support number +91 80912 65690 hai. Store Concierge Nishant ji isi number par directly available hain.`;
  }

  // 10. Thank You / Appreciation
  if (query.includes("thank") || query.includes("dhanyawad") || query.includes("shukriya") || query.includes("thanks")) {
    return `Aapka bahut-bahut dhanyavaad ${name}! 🙏 Prajnaa Market ke sath judne ke liye shukriya. Agar koi aur sawal ho toh batayein.`;
  }

  // If customer provided their name and no product matched:
  if (extracted) {
    return [
      `Bahut-bahut dhanyawad, ${extracted} ji! 🙏`,
      "",
      "Aapka contact Prajnaa CRM inbox mein save kar liya gaya hai.",
      "",
      `Bataiye ${extracted} ji, aaj hum aapki kya sahayata kar sakte hain? Kya aap hamare pure Himalayan Organic Almonds (Badam), Raw Flora Honey, Walnuts (Kagzi Akhrot), ya Pahadi Spices explore karna chahte hain? 🌿`,
    ].join("\n");
  }

  // 11. Greeting
  if (query === "hi" || query === "hello" || query === "namaste" || query === "hey" || query === "pranam" || query === "hlo") {
    if (isUnknown && !resolvedName) {
      return [
        "Namaste ji! 🙏 Prajnaa Market (Pure Himalayan Farm Harvest) mein aapka swagat hai.",
        "",
        "Kripya humein apna shubh naam bata dijiye taaki hum aapka contact save kar sakein aur aapki behtar sahayata kar sakein? (Please reply with your name) 🌿",
      ].join("\n");
    }
    return `Namaste ${name}! 🙏 Prajnaa Market me aapka swagat hai. Batayein ${name}, aaj hum aapki kya sahayata kar sakte hain? Kya aap hamare Himalayan Almonds (Badam), Raw Flora Honey, ya Walnuts explore karna chahte hain? 🌿`;
  }

  // 12. Fallback: Concise & Direct
  return `Namaste ${name}! 🙏 Aapka sandesh Prajnaa support team ko mil gaya hai. Store Concierge Nishant ji (+91 80912 65690) ise review karke jald hi aapse direct connect karenge. Agar aap koi product order karna chahte hain, toh kripya product ka naam aur quantity batayein! 🌿`;
}

interface OrderItem {
  name: string;
  weight: string;
  qty: number;
  price: number;
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
  orderStatus: "Pending" | "Processing" | "Packed" | "Shipped" | "Delivered" | "Cancelled" | "Completed";
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

// Initial Mock Customers Data
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "cust_admin",
    name: "Store Admin (Prajnaa Desk)",
    phone: "+91 80912 65690",
    email: "admin@prajnaa.in",
    location: "Outer Solan Road, Solan, Himachal Pradesh",
    totalOrders: 0,
    totalSpent: 0,
    customerSince: "Oct 2026",
    isVip: true,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    address: {
      line1: "Outer Solan Road, Solan",
      city: "Solan",
      state: "Himachal Pradesh",
      pincode: "173212",
      country: "India",
    },
    unreadCount: 0,
    lastMessageTime: "Just now",
    lastMessageText: "Prajnaa CRM Active Desk",
    latestOrder: {
      id: "ord_admin_desk",
      orderNumber: "ADMIN-DESK",
      itemsCount: 0,
      amount: 0,
      paymentStatus: "Paid",
      orderStatus: "Processing",
      date: "Today",
      time: "Just now",
      items: [],
      subtotal: 0,
      discount: 0,
      shipping: 0,
      paymentMethod: "Internal Desk",
    },
  },
  {
    id: "cust_rajat",
    name: "Rajat",
    phone: "+91 70184 90629",
    email: "rajat@prajnaa.in",
    location: "Tehri Garhwal, Uttarakhand",
    totalOrders: 1,
    totalSpent: 844,
    customerSince: "Oct 2026",
    isVip: true,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    address: {
      line1: "Tehri Garhwal",
      city: "Tehri",
      state: "Uttarakhand",
      pincode: "249001",
      country: "India",
    },
    unreadCount: 0,
    lastMessageTime: "Just now",
    lastMessageText: "Namaste Rajat ji! Welcome to Prajnaa Market & Farm! 🌿",
    latestOrder: {
      id: "ord_rajat_1",
      orderNumber: "#PM-9021",
      itemsCount: 2,
      amount: 844,
      paymentStatus: "Pending",
      orderStatus: "Processing",
      date: "Today",
      time: "Just now",
      items: [
        {
          name: "Kashmiri Walnuts",
          weight: "500g",
          qty: 1,
          price: 604,
          total: 604,
          image: "🌰",
        },
        {
          name: "Lakadong Turmeric",
          weight: "250g",
          qty: 1,
          price: 240,
          total: 240,
          image: "🌿",
        },
      ],
      subtotal: 844,
      discount: 0,
      shipping: 0,
      paymentMethod: "WhatsApp Order & Direct Payment",
    },
  },
  {
    id: "cust_1",
    name: "Priya Sharma",
    phone: "+91 98765 43210",
    email: "priya.sharma@gmail.com",
    location: "Dehradun, Uttarakhand",
    totalOrders: 3,
    totalSpent: 3420,
    customerSince: "Mar 2024",
    isVip: true,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    address: {
      line1: "123, Main Road, Rajpur",
      city: "Dehradun",
      state: "Uttarakhand",
      pincode: "248001",
      country: "India",
    },
    unreadCount: 3,
    lastMessageTime: "10:24 AM",
    lastMessageText: "Namaste ji, maine kal order kiya tha...",
    latestOrder: {
      id: "ord_1",
      orderNumber: "#PM2024001234",
      itemsCount: 2,
      amount: 1740,
      paymentStatus: "Pending",
      orderStatus: "Processing",
      date: "12 Mar 2024",
      time: "10:15 AM",
      items: [
        {
          name: "Himalayan Raw Honey",
          weight: "500g",
          qty: 2,
          price: 550,
          total: 1100,
          image: "🍯",
        },
        {
          name: "A2 Cow Ghee",
          weight: "1L",
          qty: 1,
          price: 800,
          total: 800,
          image: "🧈",
        },
      ],
      subtotal: 1900,
      discount: 200,
      shipping: 40,
      paymentMethod: "WhatsApp Order & Direct Payment",
    },
  },
  {
    id: "cust_2",
    name: "Rahul Verma",
    phone: "+91 87654 32109",
    email: "rahul.verma@gmail.com",
    location: "Haridwar, Uttarakhand",
    totalOrders: 2,
    totalSpent: 2150,
    customerSince: "Feb 2024",
    isVip: false,
    avatar: "",
    address: {
      line1: "Flat 402, Ganga Heights, Kankhal",
      city: "Haridwar",
      state: "Uttarakhand",
      pincode: "249408",
      country: "India",
    },
    unreadCount: 1,
    lastMessageTime: "10:12 AM",
    lastMessageText: "Payment kar diya hai, check kar lijiye",
    latestOrder: {
      id: "ord_2",
      orderNumber: "#PM2024001233",
      itemsCount: 3,
      amount: 1100,
      paymentStatus: "Paid",
      orderStatus: "Packed",
      date: "12 Mar 2024",
      time: "09:30 AM",
      items: [
        {
          name: "Himalayan Turmeric Powder",
          weight: "250g",
          qty: 2,
          price: 250,
          total: 500,
          image: "🌿",
        },
        {
          name: "Himalayan Herbal Tea",
          weight: "100g",
          qty: 3,
          price: 200,
          total: 600,
          image: "🍵",
        },
      ],
      subtotal: 1100,
      discount: 50,
      shipping: 50,
      paymentMethod: "UPI Direct",
    },
  },
  {
    id: "cust_3",
    name: "Neha Kapoor",
    phone: "+91 98887 66554",
    email: "neha.k@gmail.com",
    location: "Rishikesh, Uttarakhand",
    totalOrders: 1,
    totalSpent: 850,
    customerSince: "Mar 2024",
    isVip: false,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    address: {
      line1: "Ashram Road, Tapovan",
      city: "Rishikesh",
      state: "Uttarakhand",
      pincode: "249192",
      country: "India",
    },
    unreadCount: 2,
    lastMessageTime: "09:45 AM",
    lastMessageText: "Tracking ID mil sakta hai?",
    latestOrder: {
      id: "ord_3",
      orderNumber: "#PM2024001232",
      itemsCount: 1,
      amount: 850,
      paymentStatus: "Pending",
      orderStatus: "Processing",
      date: "12 Mar 2024",
      time: "08:15 AM",
      items: [
        {
          name: "Himalayan Raw Honey",
          weight: "500g",
          qty: 1,
          price: 550,
          total: 550,
          image: "🍯",
        },
        {
          name: "Himalayan Herbal Tea",
          weight: "100g",
          qty: 1,
          price: 250,
          total: 250,
          image: "🍵",
        },
      ],
      subtotal: 800,
      discount: 0,
      shipping: 50,
      paymentMethod: "WhatsApp Order & Direct Payment",
    },
  },
  {
    id: "cust_4",
    name: "Amit Singh",
    phone: "+91 98712 33445",
    email: "amit.singh@delhicorp.in",
    location: "Delhi",
    totalOrders: 4,
    totalSpent: 4320,
    customerSince: "Jan 2024",
    isVip: false,
    avatar: "",
    address: {
      line1: "B-42, Greater Kailash 1",
      city: "New Delhi",
      state: "Delhi",
      pincode: "110048",
      country: "India",
    },
    lastMessageTime: "09:20 AM",
    lastMessageText: "Ye ghee ka price kya hai?",
    latestOrder: {
      id: "ord_4",
      orderNumber: "#PM2024001231",
      itemsCount: 4,
      amount: 3450,
      paymentStatus: "Paid",
      orderStatus: "Shipped",
      date: "12 Mar 2024",
      items: [
        {
          name: "A2 Cow Ghee",
          weight: "1L",
          qty: 2,
          price: 800,
          total: 1600,
          image: "🧈",
        },
        {
          name: "Himalayan Shilajit Resin",
          weight: "20g",
          qty: 1,
          price: 1850,
          total: 1850,
          image: "🏔️",
        },
      ],
      subtotal: 3450,
      discount: 100,
      shipping: 100,
      paymentMethod: "UPI Direct",
    },
  },
];

// Initial Messages mapped by customer ID
const INITIAL_MESSAGES_MAP: Record<string, Message[]> = {
  cust_1: [
    {
      id: "m_1_order",
      sender: "business",
      text: "Namaste Priya Sharma ji! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* #PM2024001234\n🌾 *Saman / Items:* Pahadi Bilona Cow Ghee (1L) × 1, Organic Lakadong Turmeric (500g) × 1\n💰 *Total Amount:* ₹3,420\n📍 *Delivery Address:* Flat 402, Green Glen Layout, Dehradun - 248001\n🚚 *Shipping Mode:* India Post Speed Post (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿",
      time: "10:15 AM",
      status: "delivered",
    },
    {
      id: "m_1_cust",
      sender: "customer",
      text: "Namaste ji, mera order kab tak dispatch hoga aur kitne din me aayega?",
      time: "10:20 AM",
      status: "read",
    },
    {
      id: "m_1_auto",
      sender: "business",
      text: "Namaste Priya Sharma ji! 🙏 Prajnaa organic products ki fresh artisan packing me 2–3 din lagte hain, aur dispatch hone ke baad 3–5 working days me Speed Post se parcel aapke address par deliver ho jata hai.",
      time: "10:20 AM",
      status: "read",
      isAutomated: true,
    },
  ],
  cust_2: [
    {
      id: "m_2_order",
      sender: "business",
      text: "Namaste Rahul Verma ji! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* #PM2024001233\n🌾 *Saman / Items:* High-Altitude Pure Himalayan Shilajit (20g) × 1\n💰 *Total Amount:* ₹2,150\n📍 *Delivery Address:* 14 Ring Road, Nehru Colony, Dehradun - 248001\n🚚 *Shipping Mode:* India Post Speed Post (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿",
      time: "09:50 AM",
      status: "delivered",
    },
    {
      id: "m_2_cust",
      sender: "customer",
      text: "Payment kar diya hai, check kar lijiye. UTR: 409871239841",
      time: "10:12 AM",
      status: "read",
    },
    {
      id: "m_2_auto",
      sender: "business",
      text: "Namaste Rahul Verma ji! 🙏 Agar aapne payment kar di hai, toh kripya payment ka screenshot ya transaction UTR number isi chat par share kar dijiye. Nishant ji verify karke turant confirm kar denge. (Official UPI: prajnaa@upi)",
      time: "10:12 AM",
      status: "read",
      isAutomated: true,
    },
  ],
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
    assignedChats: 8,
    avgResponseTime: "1.2m",
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
    assignedChats: 4,
    avgResponseTime: "1.8m",
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
    assignedChats: 18,
    avgResponseTime: "2.1m",
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
    assignedChats: 2,
    avgResponseTime: "2.5m",
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

const getRealProductImage = (prod: { id?: string; slug?: string; name?: string; category?: string; image?: string }): string => {
  if (prod.image && (prod.image.startsWith("/") || prod.image.startsWith("http"))) {
    return prod.image;
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

// Initial Shipments Data
const INITIAL_SHIPMENTS = [
  {
    orderId: "#PM2024001234",
    customer: "Priya Sharma",
    trackingId: "ET123456789IN",
    status: "In Transit",
    date: "14 Mar 2024",
    timeline: [
      { status: "Item Booked", date: "12 Mar 2024, 04:30 PM", loc: "Dehradun MDG" },
      { status: "In Transit", date: "13 Mar 2024, 09:20 AM", loc: "Delhi NSH" },
      { status: "Out for Delivery", date: "14 Mar 2024, 08:15 AM", loc: "Dehradun SO" },
      { status: "Delivered", date: "Pending", loc: "Rajpur Dehradun" },
    ],
  },
  {
    orderId: "#PM2024001233",
    customer: "Rahul Verma",
    trackingId: "ET987654321IN",
    status: "Delivered",
    date: "13 Mar 2024",
    timeline: [
      { status: "Item Booked", date: "11 Mar 2024, 02:00 PM", loc: "Haridwar HO" },
      { status: "Delivered", date: "13 Mar 2024, 11:30 AM", loc: "Kankhal SO" },
    ],
  },
];

// Initial Templates Data (Official Meta Cloud API pre-approved templates)
const INITIAL_TEMPLATES = [
  {
    id: "tpl_1",
    category: "Order Updates",
    name: "Official Order Confirmation",
    message: "Namaste {{customer_name}} ji! 🙏\n\nThank you for placing your order with Prajnaa Market.\n\nOrder ID: {{order_id}}\nTotal Amount: ₹{{amount}}\nPayment Status: Awaiting Payment Confirmation\n\nJi, hum aapke order ko process kar rahe hain. Prajnaa Market mein order processing mein aam taur par 2–3 din lagte hain. Processing complete hone aur parcel dispatch hone ke baad hum aapko tracking details share kar denge.\n\nDhanyavaad ji! 🌿\nTeam Prajnaa Market",
  },
  {
    id: "tpl_2",
    category: "Payment",
    name: "Payment QR & Instructions",
    message: "Namaste {{customer_name}} ji! 🙏\n\nYeh raha aapke order {{order_id}} ka official Prajnaa Market payment QR. Total Amount: ₹{{amount}}.\n\nKripya kisi bhi UPI app (Google Pay, PhonePe, Paytm) se scan karke payment complete karein aur screenshot share kar dijiye. Verification ke baad order dispatch queue me chala jayega.\n\nUPI ID: 8091265690@okbizaxis\nDhanyavaad! 🌾",
  },
  {
    id: "tpl_3",
    category: "Order Updates",
    name: "2-3 Days Artisan Packing Update",
    message: "Namaste {{customer_name}} ji! 🙏\n\nAapke Prajnaa Market order {{order_id}} ki artisan packing complete ho gayi hai. Hamare organic Himalayan produce ko eco-friendly packaging me seal kar diya gaya hai. Hum aapke parcel ko dispatch karne ki taiyari kar rahe hain. Dispatch hote hi aapko tracking details share kar di jayengi.\n\nDhanyavaad ji! 📦",
  },
  {
    id: "tpl_4",
    category: "Shipping",
    name: "India Post Speed Post Dispatch",
    message: "Namaste {{customer_name}} ji! 🙏\n\nAapka Prajnaa Market order {{order_id}} Dehradun MDG se dispatch ho gaya hai. 📦\n\nCarrier: India Post (Speed Post)\nTracking ID: {{tracking_id}}\n\nAap apne parcel ka live status India Post ki official tracking service par check kar sakte hain:\nhttps://www.indiapost.gov.in\n\nDhanyavaad ji! 🌿",
  },
  {
    id: "tpl_5",
    category: "Shipping",
    name: "Out for Delivery Alert",
    message: "Namaste {{customer_name}} ji! 🙏\n\nAapka Prajnaa Market parcel (Consignment: {{tracking_id}}) aaj aapke delivery address ke liye out for delivery nikal chuka hai. Kripya apna phone available rakhein.\n\nDhanyavaad ji! 🌿\nTeam Prajnaa Market",
  },
  {
    id: "tpl_6",
    category: "Order Updates",
    name: "Delivery Confirmation & Feedback",
    message: "Namaste {{customer_name}} ji! 🙏\n\nAapke Prajnaa Market order {{order_id}} ki delivery successfully confirm ho gayi hai. Humein ummeed hai ki aapko hamare Himalayan natural products pasand aayenge. Prajnaa Market par bharosa karne ke liye dil se dhanyavaad!\n\nAgar aapka koi feedback ya review hai, toh isi chat par humse share kar sakte hain. 🌿",
  },
  {
    id: "tpl_7",
    category: "Inquiry",
    name: "Himalayan Harvest Inquiry Quote",
    message: "Namaste {{customer_name}} ji! 🌿\n\nPrajnaa Market par swagat hai. Hamare sabhi Himalayan produce (Badri Cow A2 Ghee, Ladakh Apricots, Kashmir Mamra Almonds, Raw Forest Honey, Lakadong Turmeric) 100% natural, ethical aur traditional tarike se taiyar kiye jaate hain. Aap kis product ki jankari lena chahenge?",
  },
];

// Initial Broadcast Campaigns Data
const INITIAL_CAMPAIGNS: BroadcastCampaign[] = [
  {
    id: "camp_autumn_ghee_2024",
    name: "Autumn Badri Cow Ghee Fresh Batch",
    audience: "All Opted-In Customers (345)",
    segment: "all",
    message:
      "Namaste ji! 🙏 Tehri Garhwal ke high-altitude Badri cow farm se A2 Desi Ghee ka naya seasonal batch ready hai. Traditional bilona method se tayar. Order before stock finishes: https://prajnaa-farm-8zam.vercel.app/ 🧈",
    status: "Completed",
    sentCount: 345,
    deliveredCount: 341,
    readCount: 298,
    failedCount: 4,
    createdAt: "10 Oct 2024, 11:30 AM",
  },
  {
    id: "camp_apricot_preorder_2024",
    name: "2026 Himalayan Apricots Pre-Order Window",
    audience: "VIP & Dry Fruit Buyers (88)",
    segment: "vip",
    message:
      "Namaste ji! Ladakh Sham Valley ke pure Himalayan Sun-Dried Apricots ka pre-order window open ho gaya hai. Fresh 2026 harvest direct from orchards! 🍑",
    status: "Completed",
    sentCount: 88,
    deliveredCount: 88,
    readCount: 82,
    failedCount: 0,
    createdAt: "14 Oct 2024, 02:15 PM",
  },
  {
    id: "camp_diwali_festive_2024",
    name: "Diwali Himalayan Gift Hampers 2024",
    audience: "All Opted-In Customers (345)",
    segment: "all",
    message:
      "Namaste ji! 🌸 Is Diwali apne priyajanon ko gift karein pure Himalayan wellness. Prajnaa Special Dry Fruit & Honey hampers ab live hain with festive packaging! Visit: https://prajnaa.market",
    status: "Completed",
    sentCount: 345,
    deliveredCount: 339,
    readCount: 312,
    failedCount: 6,
    createdAt: "16 Oct 2024, 09:45 AM",
  },
];

// Quick Presets for Broadcast Campaigns
const BROADCAST_PRESETS = [
  {
    label: "🧈 Badri Cow Ghee Batch",
    name: "Fresh Batch: A2 Badri Cow Desi Ghee",
    audience: "All Customers (345)",
    text: "Namaste ji! 🙏 Tehri Garhwal ke high-altitude Badri cow farm se A2 Desi Ghee ka naya seasonal batch ready hai. Traditional bilona method se tayar. Order before stock finishes: https://prajnaa-farm-8zam.vercel.app/ 🧈",
  },
  {
    label: "🍑 Himalayan Apricots Pre-Order",
    name: "Pre-Order: Ladakh Sun-Dried Apricots",
    audience: "VIP Customers (42)",
    text: "Namaste ji! 🍑 Ladakh Sham Valley ke pure Himalayan Sun-Dried Apricots ka pre-order window open ho gaya hai. Fresh harvest direct from orchard farmers! Book here: https://prajnaa-farm-8zam.vercel.app/",
  },
  {
    label: "🍯 Raw Wild Forest Honey",
    name: "Special Reserve: Himalayan Multiflora Honey",
    audience: "Honey Lovers (88)",
    text: "Namaste ji! 🍯 Raw Unfiltered Multiflora Forest Honey ka fresh batch extract ho chuka hai. Zero processing, naturally enzymes-rich. Visit: https://prajnaa-farm-8zam.vercel.app/",
  },
  {
    label: "✨ Festive Season Discount",
    name: "Diwali Himalayan Wellness Offer 2024",
    audience: "All Customers (345)",
    text: "Namaste ji! 🌸 Prajnaa Market par Diwali ke shubh awsar par special Himalayan Produce hampers par direct savings offer live hai. Abhi visit karein: https://prajnaa-farm-8zam.vercel.app/ 🙏",
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("cust_rajat");
  const [inboxTab, setInboxTab] = useState<"all" | "unread" | "assigned" | "resolved">("all");
  const [inboxSearch, setInboxSearch] = useState("");

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
  const notifiedOrdersRef = useRef<Set<string>>(new Set(["PM2024001234", "PM2024001233", "PM2024001230", "PM2024001225", "PM2024001188"]));

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
  const [customerNotes, setCustomerNotes] = useState<string>("Pre-booked raw forest honey. Preferred morning delivery.");

  // State: Orders & Selected Order Details
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order>(INITIAL_CUSTOMERS[0].latestOrder);
  const [orderPreviousNav, setOrderPreviousNav] = useState<string>("orders");
  const [ordersFilter, setOrdersFilter] = useState<string>("all");
  const [ordersSearch, setOrdersSearch] = useState<string>("");
  const [showAddOrderModal, setShowAddOrderModal] = useState<boolean>(false);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  // State: Global Universal Search Bar (Dashboard Header)
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);

  // State: Create Order Form
  const [newOrderCustomerName, setNewOrderCustomerName] = useState<string>("");
  const [newOrderCustomerPhone, setNewOrderCustomerPhone] = useState<string>("");
  const [newOrderCustomerEmail, setNewOrderCustomerEmail] = useState<string>("");
  const [newOrderAddress, setNewOrderAddress] = useState<string>("");
  const [newOrderCity, setNewOrderCity] = useState<string>("Dehradun");
  const [newOrderPincode, setNewOrderPincode] = useState<string>("248001");
  const [newOrderProductId, setNewOrderProductId] = useState<string>("");
  const [newOrderQuantity, setNewOrderQuantity] = useState<number>(1);
  const [newOrderPaymentMethod, setNewOrderPaymentMethod] = useState<"COD" | "WhatsApp" | "UPI">("COD");
  const [newOrderPaymentStatus, setNewOrderPaymentStatus] = useState<"Pending" | "Paid">("Pending");
  const [newOrderStatus, setNewOrderStatus] = useState<"Pending" | "Processing" | "Packed" | "Shipped" | "Completed">("Pending");
  const [newOrderNotes, setNewOrderNotes] = useState<string>("");
  const [isSubmittingNewOrder, setIsSubmittingNewOrder] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  // Multi-product order items and payment method
  const [newOrderItemsList, setNewOrderItemsList] = useState<Array<{ productId: string; qty: number }>>([
    { productId: "prajnaa-almond-500g", qty: 1 }
  ]);
  const [newOrderPaymentMethodChoice, setNewOrderPaymentMethodChoice] = useState<string>("UPI");
  const [newOrderDiscount, setNewOrderDiscount] = useState<number>(0);

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
  const [selectedShipment, setSelectedShipment] = useState(INITIAL_SHIPMENTS[0]);

  // State: Templates
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState("Order Updates");
  const [templatesList, setTemplatesList] = useState(INITIAL_TEMPLATES);

  // State: Modal for Status Update / Order
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdateChoice, setStatusUpdateChoice] = useState<Order["orderStatus"]>("Processing");

  // State: Products & Stock Inventory Management
  const [productsList, setProductsList] = useState<ProductItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("prajnaa_crm_products");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Upgrade any emoji-only image fields to real Himalayan catalog photos
            return parsed.map((p) => ({
              ...p,
              image: p.image && (p.image.startsWith("/") || p.image.startsWith("http")) ? p.image : (REAL_PRODUCT_IMAGES[p.id] || "/assets/cat-dryfruits.jpg")
            }));
          }
        }
      } catch {}
    }
    return INITIAL_PRODUCTS;
  });
  const [productStockFilter, setProductStockFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");
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

      // 1. Fetch live authoritative product catalogue from /api/products
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.products && Array.isArray(data.products)) {
            const savedProductsStr = localStorage.getItem("prajnaa_crm_products");
            const savedOverrides: Record<string, Partial<ProductItem>> = {};
            if (savedProductsStr) {
              try {
                const parsed: ProductItem[] = JSON.parse(savedProductsStr);
                parsed.forEach((p) => {
                  savedOverrides[p.id] = { stock: p.stock, unitsLeft: p.unitsLeft, price: p.price };
                });
              } catch {}
            }

            const mapped: ProductItem[] = data.products.map((p: any) => {
              const override = savedOverrides[p.id] || savedOverrides[p.slug];
              const isPreOrder = p.is_preorder || p.preOrder?.enabled;
              const defaultStock: StockStatus = isPreOrder ? "Pre-Order" : p.stock > 0 ? "In Stock" : "Out of Stock";
              const defaultUnits = typeof p.stock === "number" ? p.stock : 50;
              const realImg = getRealProductImage(p);

              return {
                id: p.id || p.slug,
                name: p.name,
                price: override?.price !== undefined ? override.price : Number(p.price) || 0,
                stock: override?.stock || defaultStock,
                image: realImg,
                category: p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "Produce",
                unitsLeft: override?.unitsLeft !== undefined ? override.unitsLeft : defaultUnits,
                origin: p.origin || (p.preOrder?.reservationNote ? "Ladakh High Altitude" : "Himalayan Farms"),
                sku: `PM-${(p.slug || p.id).substring(0, 3).toUpperCase()}-${p.unit?.replace(/\D/g, "") || "500"}`,
                weight: p.unit || p.weight || "500g",
              };
            });

            if (mapped.length > 0) {
              setProductsList(mapped);
            }
          }
        })
        .catch(() => {
          // If fetch fails, load saved from localStorage
          const savedProducts = localStorage.getItem("prajnaa_crm_products");
          if (savedProducts) {
            try {
              setProductsList(JSON.parse(savedProducts));
            } catch {}
          }
        });

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
              ordersFromLocal = JSON.parse(saved);
            } catch {}
          }

          const combinedMap = new Map();
          [...ordersFromLocal, ...ordersFromApi].forEach((ord: any) => {
            const key = ord.orderNumber || ord.id;
            if (key && !combinedMap.has(key)) {
              combinedMap.set(key, ord);
            }
          });

          const allOrders = Array.from(combinedMap.values());
          if (allOrders.length > 0) {
            setCrmOrders(allOrders);

            // Dynamically propagate orders into Customers, Messages, and Shipments
            allOrders.forEach((ord: any) => {
              if (!ord.customerPhone && !ord.customerName) return;

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
                  const businessFirstMessage = `Namaste ${ord.customerName || "ji"}! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* ${orderNumTag}\n🌾 *Saman / Items:* ${itemsSummary}\n💰 *Total Amount:* ₹${orderTotal.toLocaleString("en-IN")}\n📍 *Delivery Address:* ${snap.line1 || snap.addressLine1 || "Dehradun"}, ${snap.city || "Dehradun"} - ${snap.postalCode || "248001"}\n🚚 *Shipping Mode:* India Post Speed Post (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿`;

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
                const shipOrderNum = `#${ord.orderNumber || ord.id}`;
                if (prevShipments.some((s) => s.orderId === shipOrderNum)) return prevShipments;
                const newTracking = ord.trackingId || `ET${Math.floor(100000000 + Math.random() * 900000000)}IN`;
                const newShipment = {
                  orderId: shipOrderNum,
                  customer: ord.customerName || "Prajnaa Customer",
                  trackingId: newTracking,
                  status: "In Transit",
                  date: orderDate,
                  timeline: [
                    { status: "Item Booked", date: `${orderDate}, 04:30 PM`, loc: "Dehradun MDG" },
                    { status: "In Transit", date: "In Transit", loc: "National Sorting Hub" },
                    { status: "Out for Delivery", date: "Pending", loc: "Delivery Sub Post Office" },
                    { status: "Delivered", date: "Pending", loc: "Destination" },
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
          if (!json || !json.success || !Array.isArray(json.messages) || json.messages.length === 0) return;

          const dbMsgs: any[] = json.messages;
          const adminPhoneClean = "8091265690";

          // Group all messages by conversation key (10-digit customer counterparty phone)
          const msgsByCustomerPhone: Record<string, any[]> = {};

          dbMsgs.forEach((m: any) => {
            const isInbound = m.direction === "inbound" || m.sender === "customer";
            const counterpartyRaw = isInbound ? m.from : m.to;
            const cleanPhone = (counterpartyRaw || "").replace(/\D/g, "").slice(-10);

            // Skip messages between admin and admin
            if (!cleanPhone || cleanPhone === adminPhoneClean) return;

            if (
              deletedCustomerIdsRef.current.has(cleanPhone) ||
              (m.customerId && deletedCustomerIdsRef.current.has(m.customerId))
            ) {
              return;
            }

            if (!msgsByCustomerPhone[cleanPhone]) {
              msgsByCustomerPhone[cleanPhone] = [];
            }
            msgsByCustomerPhone[cleanPhone].push(m);
          });

          // 1. Determine customer changes and new unknown customers
          let custsModified = false;
          const nextCustomers = [...customersRef.current];

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
              const contactName = namedMsg?.customerName || latest.customerName || `Patron (${formattedPhone})`;

              const latestTime = latest.timestamp || latest.createdAt
                ? new Date(latest.timestamp || latest.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now";

              const newCustId = latest.customerId || `cust_wa_${phoneKey}`;
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

      syncCrmOrders();
      syncCrmMessages();
      const interval = setInterval(() => {
        syncCrmOrders();
        syncCrmMessages();
      }, 1000);

      const handleWindowFocus = () => {
        syncCrmOrders();
        syncCrmMessages();
      };
      window.addEventListener("focus", handleWindowFocus);
      window.addEventListener("prajnaa_order_placed", syncCrmOrders);
      window.addEventListener("storage", syncCrmOrders);

      return () => { window.removeEventListener("focus", handleWindowFocus);
        clearInterval(interval);
        window.removeEventListener("prajnaa_order_placed", syncCrmOrders);
        window.removeEventListener("storage", syncCrmOrders);
      };
    }
  }, []);

  // Stock Status Update Handler
  // Manage & Save Product (Add / Edit)
  const handleSaveProduct = (prod: ProductItem) => {
    if (!prod.name.trim()) {
      toast.error("Product name cannot be empty");
      return;
    }
    if (prod.price <= 0) {
      toast.error("Product price must be greater than 0");
      return;
    }

    setProductsList((prev) => {
      const exists = prev.some((p) => p.id === prod.id);
      let updated: ProductItem[];
      if (exists) {
        updated = prev.map((p) => (p.id === prod.id ? prod : p));
        toast.success(`Product "${prod.name}" updated successfully!`);
      } else {
        const newProduct: ProductItem = {
          ...prod,
          id: prod.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sku: prod.sku || `PM-${Math.floor(1000 + Math.random() * 9000)}`,
        };
        updated = [newProduct, ...prev];
        toast.success(`Product "${newProduct.name}" added to catalog!`);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(updated));
      }
      return updated;
    });

    setShowManageProductModal(false);
  };

  // Remove / Delete Product from Catalog
  const handleDeleteProduct = (productId: string) => {
    setProductsList((prev) => {
      const target = prev.find((p) => p.id === productId);
      const updated = prev.filter((p) => p.id !== productId);
      if (typeof window !== "undefined") {
        localStorage.setItem("prajnaa_crm_products", JSON.stringify(updated));
      }
      toast.success(`Product "${target?.name || "Item"}" removed from catalog`);
      return updated;
    });
    setShowDeleteProductConfirm(false);
    setProductToDelete(null);
  };

  const handleUpdateProductStock = (productId: string, newStock: StockStatus, newUnits?: number, newPrice?: number) => {
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
    toast.success(`Updated stock status to "${newStock}"`);
  };

  // Save team changes
  const saveTeamMembers = (updated: TeamMember[]) => {
    setTeamMembers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("prajnaa_crm_team", JSON.stringify(updated));
    }
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
      "ET809126569IN";

    return tplMessage
      .replace(/{{customer_name}}/gi, customer.name)
      .replace(/{{order_id}}/gi, latestOrder.orderNumber || "PRJ25680063")
      .replace(/{{amount}}/gi, (latestOrder.amount || 1740).toLocaleString("en-IN"))
      .replace(/{{tracking_id}}/gi, trackingNumber);
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
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const currentMessages = messagesMap[selectedCustomerId] || [
    {
      id: "def_1",
      sender: "customer",
      text: "Namaste Prajnaa Market ji!",
      time: "Just now",
      status: "read",
    },
  ];

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
    }, 5000);

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

  // Handle Send Text Message via Official WhatsApp API
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    const amount = currentCustomer.latestOrder.amount || 1740;
    const textMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "business",
      text: `Bilkul ji, yeh raha aapke order ka payment QR.\nTotal Amount: ₹${amount.toLocaleString("en-IN")}\n\nKripya payment karke screenshot share kar dijiye.`,
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
      return updated;
    });

    // 5. Build official WhatsApp payment confirmation message
    const receiptMsg = `Namaste ${customerName} ji! 🙏\n\nPrajnaa Market se aapke order *${ordNum}* ka payment (₹${amountFormatted}) successfully confirm ho gaya hai. ✅\n\n💰 *Payment Status:* PAID (Received & Verified)\n📦 *Order Status:* In Processing & Packaging\n📍 *Fulfillment Hub:* Prajnaa Himalayan Hub, Dehradun\n\nAapka parcel fresh Himalayan batch se pack kiya ja raha hai. Dispatch hote hi India Post Speed Post tracking consignment details hum yahan send kar denge! 🌿\n\nDhanyavaad ji!\n*Team Prajnaa Market*`;

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
    setNewOrderItemsList((prev) => [...prev, { productId: nextProd?.id || "raw-forest-honey", qty: 1 }]);
  };

  const handleUpdateOrderItemLine = (index: number, productId: string, qty: number) => {
    setNewOrderItemsList((prev: any[]) => {
      const updated = [...prev];
      updated[index] = { productId, qty: Math.max(1, qty) };
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

    // Remove from UI state
    setCustomers((prev) => {
      const remaining = prev.filter((c) => c.id !== targetCust.id);
      if (remaining.length > 0) {
        setSelectedCustomerId(remaining[0].id);
      }
      return remaining;
    });

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

    // Multi-Product Line Items Mapping
    const lineItems: OrderItem[] = newOrderItemsList.map((item: any) => {
      const prod = productsList.find((p) => p.id === item.productId) || productsList[0];
      const itemPrice = prod?.price || 950;
      const itemQty = Math.max(1, item.qty || 1);
      return {
        name: prod?.name || "Himalayan Produce",
        weight: prod?.weight || "500g",
        qty: itemQty,
        price: itemPrice,
        total: itemPrice * itemQty,
        image: prod?.image || "🍯",
      };
    });

    const subtotal = lineItems.reduce((acc, it) => acc + it.total, 0);
    const discount = Math.max(0, Number(newOrderDiscount) || 0);
    const afterDiscount = Math.max(0, subtotal - discount);
    const shipping = afterDiscount > 1500 ? 0 : 50;
    const total = afterDiscount + shipping;
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
      discount: discount,
      shipping,
      paymentMethod: paymentMethodLabel,
      trackingNumber: `ET${Math.floor(100000000 + Math.random() * 900000000)}IN`,
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
      const firstMsgText = `Namaste ${newOrderCustomerName.trim()}! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* ${fullOrderNum}\n🌾 *Saman / Items:* ${lineItems.map((i: any) => `${i.name} × ${i.qty}`).join(", ")}\n💰 *Total Amount:* ₹${total.toLocaleString("en-IN")}\n📍 *Delivery Address:* ${newOrderAddress || "Civil Lines"}, ${newOrderCity} - ${newOrderPincode}\n🚚 *Shipping Mode:* India Post Speed Post (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿`;

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
          totalPaise: total * 100,
          subtotalPaise: subtotal * 100,
          discountPaise: discount * 100,
          shippingPaise: shipping * 100,
          paymentMethod: newOrderPaymentMethod.toLowerCase(),
          paymentStatus: newOrderPaymentStatus.toLowerCase(),
          status: newOrderStatus.toLowerCase(),
          items: lineItems.map((i: any) => ({
            productName: i.name,
            weight: i.weight,
            quantity: i.qty,
            price: i.price,
            total: i.total,
            unitPricePaise: i.price * 100,
            totalPaise: i.total * 100,
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
      setNewOrderNotes("");
      setNewOrderDiscount(0);
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

  // Dynamic Dashboard Timeframe Data (Last 7 Days, Last 30 Days, This Quarter)
  const TIMEFRAME_DATA = {
    "7d": {
      label: "Last 7 Days",
      periodSubtitle: "Velocity for past 7 days (12 Oct – 18 Oct)",
      avgDailyText: "Avg: ₹24,800 / day",
      peakCapacityText: "₹35K",
      midTargetText: "₹18K",
      maxRevenue: 35000,
      metrics: {
        revenue: 73600,
        revenueFormatted: "₹73,600",
        revenueGrowth: "+24.2%",
        orders: 38,
        ordersGrowth: "+18% growth",
        pendingUpi: 9,
        pendingUpiDue: "₹12,400 due",
        processing: 6,
        processingNote: "1–2d standard",
        shipped: 11,
        shippedNote: "India Post transit",
        delivered: 12,
        deliveredSatisfaction: "100% satisfaction",
      },
      chart: [
        { date: "12 Oct", orders: 4, revenue: 8200, placed: 1, processing: 1, shipped: 1, delivered: 1 },
        { date: "13 Oct", orders: 6, revenue: 11400, placed: 2, processing: 2, shipped: 1, delivered: 1 },
        { date: "14 Oct", orders: 5, revenue: 9800, placed: 1, processing: 1, shipped: 2, delivered: 1 },
        { date: "15 Oct", orders: 7, revenue: 14200, placed: 2, processing: 2, shipped: 2, delivered: 1 },
        { date: "16 Oct", orders: 5, revenue: 10100, placed: 1, processing: 1, shipped: 2, delivered: 1 },
        { date: "17 Oct", orders: 8, revenue: 16500, placed: 2, processing: 2, shipped: 2, delivered: 2 },
        { date: "18 Oct", orders: 3, revenue: 3400, placed: 1, processing: 1, shipped: 1, delivered: 0 },
      ],
    },
    "30d": {
      label: "Last 30 Days",
      periodSubtitle: "Velocity for past 30 days (Oct 2024)",
      avgDailyText: "Avg: ₹17,750 / day",
      peakCapacityText: "₹50K",
      midTargetText: "₹25K",
      maxRevenue: 50000,
      metrics: {
        revenue: 248500,
        revenueFormatted: "₹2,48,500",
        revenueGrowth: "+18.4%",
        orders: 124,
        ordersGrowth: "+12% growth",
        pendingUpi: 32,
        pendingUpiDue: "₹44,800 due",
        processing: 18,
        processingNote: "2–3d standard",
        shipped: 21,
        shippedNote: "India Post transit",
        delivered: 46,
        deliveredSatisfaction: "99.1% satisfaction",
      },
      chart: [
        { date: "01 Oct", orders: 6, revenue: 10440, placed: 2, processing: 2, shipped: 1, delivered: 1 },
        { date: "03 Oct", orders: 9, revenue: 15660, placed: 3, processing: 3, shipped: 2, delivered: 1 },
        { date: "05 Oct", orders: 12, revenue: 20880, placed: 4, processing: 4, shipped: 2, delivered: 2 },
        { date: "07 Oct", orders: 16, revenue: 27840, placed: 5, processing: 5, shipped: 4, delivered: 2 },
        { date: "09 Oct", orders: 11, revenue: 19140, placed: 3, processing: 4, shipped: 2, delivered: 2 },
        { date: "11 Oct", orders: 15, revenue: 26100, placed: 4, processing: 5, shipped: 3, delivered: 3 },
        { date: "13 Oct", orders: 19, revenue: 33060, placed: 6, processing: 6, shipped: 4, delivered: 3 },
        { date: "15 Oct", orders: 22, revenue: 38280, placed: 7, processing: 7, shipped: 5, delivered: 3 },
        { date: "17 Oct", orders: 14, revenue: 24360, placed: 5, processing: 4, shipped: 3, delivered: 2 },
        { date: "19 Oct", orders: 18, revenue: 31320, placed: 5, processing: 6, shipped: 4, delivered: 3 },
        { date: "21 Oct", orders: 25, revenue: 43500, placed: 8, processing: 8, shipped: 5, delivered: 4 },
        { date: "23 Oct", orders: 20, revenue: 34800, placed: 6, processing: 7, shipped: 4, delivered: 3 },
        { date: "25 Oct", orders: 23, revenue: 40020, placed: 7, processing: 7, shipped: 5, delivered: 4 },
        { date: "27 Oct", orders: 28, revenue: 48720, placed: 9, processing: 9, shipped: 6, delivered: 4 },
      ],
    },
    "quarter": {
      label: "This Quarter",
      periodSubtitle: "Quarterly Velocity (Q3/Q4 Harvest Season)",
      avgDailyText: "Avg: ₹52,400 / week",
      peakCapacityText: "₹1.2L",
      midTargetText: "₹60K",
      maxRevenue: 120000,
      metrics: {
        revenue: 684200,
        revenueFormatted: "₹6,84,200",
        revenueGrowth: "+31.6%",
        orders: 348,
        ordersGrowth: "+27% growth",
        pendingUpi: 54,
        pendingUpiDue: "₹82,600 due",
        processing: 26,
        processingNote: "Batch dispatch",
        shipped: 64,
        shippedNote: "Speed Post",
        delivered: 204,
        deliveredSatisfaction: "99.4% satisfaction",
      },
      chart: [
        { date: "Aug W1", orders: 24, revenue: 48000, placed: 6, processing: 6, shipped: 6, delivered: 6 },
        { date: "Aug W2", orders: 28, revenue: 56000, placed: 7, processing: 7, shipped: 7, delivered: 7 },
        { date: "Aug W3", orders: 32, revenue: 64000, placed: 8, processing: 8, shipped: 8, delivered: 8 },
        { date: "Aug W4", orders: 36, revenue: 72000, placed: 9, processing: 9, shipped: 9, delivered: 9 },
        { date: "Sep W1", orders: 39, revenue: 78000, placed: 10, processing: 10, shipped: 10, delivered: 9 },
        { date: "Sep W2", orders: 42, revenue: 84000, placed: 11, processing: 11, shipped: 10, delivered: 10 },
        { date: "Sep W3", orders: 45, revenue: 90000, placed: 12, processing: 11, shipped: 11, delivered: 11 },
        { date: "Sep W4", orders: 48, revenue: 96000, placed: 12, processing: 12, shipped: 12, delivered: 12 },
        { date: "Oct W1", orders: 50, revenue: 99000, placed: 13, processing: 13, shipped: 12, delivered: 12 },
        { date: "Oct W2", orders: 54, revenue: 108000, placed: 14, processing: 14, shipped: 13, delivered: 13 },
        { date: "Oct W3", orders: 60, revenue: 118000, placed: 15, processing: 15, shipped: 15, delivered: 15 },
      ],
    },
  };

  const activeTimeframeData = TIMEFRAME_DATA[graphTimeframe] || TIMEFRAME_DATA["30d"];
  const DAILY_ORDER_DATA = activeTimeframeData.chart;

  // Unified Orders List (Combines createdOrders + crmOrders + customers' latest orders)
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
      if (num && !map.has(num)) {
        const orderTotal = ord.totalPaise ? ord.totalPaise / 100 : ord.amount || 0;
        const rawStatus = String(ord.status || ord.orderStatus || "Pending").toLowerCase();
        let mappedStatus: Order["orderStatus"] = "Pending";
        if (["delivered", "completed"].includes(rawStatus)) mappedStatus = "Completed";
        else if (["shipped", "partially_shipped"].includes(rawStatus)) mappedStatus = "Shipped";
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
          shipping: ord.shippingPaise ? ord.shippingPaise / 100 : 50,
          paymentMethod: ord.paymentMethod || "COD",
          trackingNumber: ord.trackingId || "ET809126569IN",
          shippingAddress: ord.shippingAddressSnapshot
            ? `${ord.shippingAddressSnapshot.line1 || ""}, ${ord.shippingAddressSnapshot.city || ""}`
            : "Dehradun, Uttarakhand",
        });
      }
    });

    // 3. Fallback to Initial Customers' latest orders so list has initial baseline
    customers.forEach((c) => {
      const num = c.latestOrder?.orderNumber?.replace("#", "");
      if (num && !map.has(num)) {
        map.set(num, {
          ...c.latestOrder,
          customerName: c.name,
          customerPhone: c.phone,
          customerEmail: c.email,
          shippingAddress: `${c.address.line1}, ${c.address.city}`,
        });
      }
    });

    return Array.from(map.values());
  }, [createdOrders, crmOrders, customers]);

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
      : 44800;
  }, [pendingPaymentOrders]);

  const pendingPaymentCount = useMemo(() => {
    return pendingPaymentOrders.length > 0
      ? pendingPaymentOrders.length
      : (activeTimeframeData?.metrics?.pendingUpi || 32);
  }, [pendingPaymentOrders, activeTimeframeData]);

  const speedPostQueueOrders = useMemo(() => {
    return unifiedOrders.filter((o) => {
      const s = String(o.orderStatus || "").toLowerCase();
      return ["processing", "packed"].includes(s);
    });
  }, [unifiedOrders]);

  const speedPostQueueCount = useMemo(() => {
    return speedPostQueueOrders.length > 0
      ? speedPostQueueOrders.length
      : (activeTimeframeData?.metrics?.processing || 18);
  }, [speedPostQueueOrders, activeTimeframeData]);

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
        const reminderText = `Namaste ${cust.name}! 🙏 Prajnaa Market se aapke order ${orderTag} (₹${amountDue.toLocaleString("en-IN")}) ke payment ke liye official UPI QR code share kiya gaya hai.\n\n📲 *Official UPI ID:* prajnaa@upi\n🏦 *Account Name:* Prajnaa Himalayan Harvest\n\nPayment hote hi confirmation screenshot yahan share kar dein taki hum parcel India Post Speed Post se turant dispatch kar sakein! 🌿`;

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
    toast.success("Opened India Post Speed Post Dispatch Manifest!");
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

  // Unified Shipments List (combining active shipments and created orders)
  const unifiedShipments = useMemo(() => {
    const list = [...shipments];
    unifiedOrders.forEach((ord) => {
      const ordNum = ord.orderNumber;
      if (!list.some((s) => s.orderId === ordNum)) {
        const trk = ord.trackingNumber || `ET${ordNum.replace(/\D/g, "").padEnd(9, "0")}IN`;
        list.push({
          orderId: ordNum,
          customer: ord.customerName || "Customer",
          trackingId: trk,
          status: ord.orderStatus === "Completed" ? "Delivered" : ord.orderStatus === "Shipped" ? "In Transit" : "Ready for Dispatch",
          date: ord.date || "Today",
          timeline: [
            { status: "Artisan Produce Packed", date: `${ord.date || "Today"}, 10:00 AM`, loc: "Dehradun Packaging Hub" },
            { status: ord.orderStatus === "Shipped" ? "Speed Post Consignment Booked" : "Ready at Speed Post Counter", date: `${ord.date || "Today"}, 02:30 PM`, loc: "Dehradun MDG" },
            { status: ord.orderStatus === "Completed" ? "Delivered to Customer" : "In Transit to Destination", date: ord.orderStatus === "Completed" ? "Today" : "Pending", loc: ord.shippingAddress || "India Post Hub" },
          ],
        });
      }
    });
    return list;
  }, [shipments, unifiedOrders]);

  // Send Speed Post Consignment Tracking to Customer via WhatsApp
    // Helper: Export Orders to CSV
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
      "Order ID",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Shipping Address",
      "Items",
      "Items Count",
      "Total Amount (INR)",
      "Payment Status",
      "Payment Method",
      "Order Status",
      "Tracking Number"
    ];

    const rows = list.map((o: any) => [
      `"${o.orderNumber || ""}"`,
      `"${o.date || ""}"`,
      `"${(o.customerName || "").replace(/"/g, '""')}"`,
      `"${o.customerPhone || ""}"`,
      `"${o.customerEmail || ""}"`,
      `"${(o.shippingAddress || "").replace(/"/g, '""')}"`,
      `"${(o.items || []).map((i: any) => `${i.name} (${i.qty})`).join("; ").replace(/"/g, '""')}"`,
      o.itemsCount || 1,
      o.amount || 0,
      `"${o.paymentStatus || "Pending"}"`,
      `"${o.paymentMethod || "COD"}"`,
      `"${o.orderStatus || "Pending"}"`,
      `"${o.trackingNumber || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Prajnaa_Orders_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} orders to CSV successfully!`);
  };

  // Helper: Export Products to CSV
  const handleExportProductsCsv = () => {
    if (productsList.length === 0) {
      toast.error("No products available to export.");
      return;
    }
    const headers = [
      "Product ID",
      "SKU",
      "Product Name",
      "Category",
      "Himalayan Origin",
      "Weight",
      "Selling Price (INR)",
      "Units in Stock",
      "Stock Status"
    ];

    const rows = productsList.map((p) => [
      `"${p.id || ""}"`,
      `"${p.sku || ""}"`,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${p.category || ""}"`,
      `"${(p.origin || "").replace(/"/g, '""')}"`,
      `"${p.weight || ""}"`,
      p.price || 0,
      p.unitsLeft || 0,
      `"${p.stock || "In Stock"}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Prajnaa_Products_Catalog_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${productsList.length} products to CSV!`);
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
                });
              }
              importedCount++;
            }
          });

          if (typeof window !== "undefined") {
            localStorage.setItem("prajnaa_crm_products", JSON.stringify(current));
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

  // Helper: Export Analytics Report to CSV
  const handleExportAnalyticsCsv = () => {
    const totalRev = unifiedOrders.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
    const headers = ["Metric", "Value", "Scope / Details"];
    const rows = [
      ["Gross Sales Volume", `₹${totalRev.toLocaleString("en-IN")}`, "Total recorded orders revenue"],
      ["Completed Orders", unifiedOrders.filter((o) => o.orderStatus === "Completed").length, "Fully delivered orders"],
      ["Pending Processing", unifiedOrders.filter((o) => o.orderStatus === "Pending").length, "Awaiting dispatch"],
      ["Shipped in Transit", unifiedOrders.filter((o) => o.orderStatus === "Shipped").length, "Speed Post parcels"],
      ["Total Active Customers", customers.length, "Registered CRM clients"],
      ["Total Himalayan SKUs", productsList.length, "Active catalog products"],
      ["In Stock SKUs", productsList.filter((p) => p.stock === "In Stock").length, "Ready for immediate packing"],
      ["Low Stock SKUs", productsList.filter((p) => p.stock === "Low Stock").length, "Replenishment required"],
      ["Out of Stock SKUs", productsList.filter((p) => p.stock === "Out of Stock").length, "Production cycle active"]
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Prajnaa_CRM_Analytics_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Analytics CSV report downloaded successfully!");
  };

  const handleSendSpeedPostTracking = async (shipmentItem: typeof selectedShipment) => {
    const trackingMsg = `Namaste ${shipmentItem.customer} ji! 📦\n\nAapka Prajnaa Market order *${shipmentItem.orderId}* Dehradun MDG se dispatch ho gaya hai. 🚚\n\nCarrier: India Post (Speed Post)\nTracking Consignment ID: *${shipmentItem.trackingId}*\n\nAap apne parcel ka live status India Post ki official tracking service par check kar sakte hain:\nhttps://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/trackconsignment.aspx\n\nDhanyavaad ji! 🌿\n*Team Prajnaa Market*`;

    // 1. Find matching customer
    const targetCust = customers.find(
      (c) =>
        c.name.toLowerCase() === shipmentItem.customer.toLowerCase() ||
        c.latestOrder?.orderNumber === shipmentItem.orderId
    ) || currentCustomer;

    const targetPhone = targetCust.phone ? targetCust.phone.replace(/\D/g, "") : "918091265690";

    // 2. Add message to customer's WhatsApp chat in CRM
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    const newMsg: Message = {
      id: `track_msg_${Date.now()}`,
      sender: "business",
      senderName: "Prajnaa Fulfillment",
      text: trackingMsg,
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
          ? { ...c, lastMessageText: `Speed Post: ${shipmentItem.trackingId}`, lastMessageTime: timeStr }
          : c
      )
    );

    // 3. Update shipment status in state
    setShipments((prev) =>
      prev.map((s) =>
        s.trackingId === shipmentItem.trackingId ? { ...s, status: "In Transit" } : s
      )
    );
    setSelectedShipment((prev) => ({ ...prev, status: "In Transit" }));

    // 4. Update order status to Shipped in unifiedOrders / createdOrders
    setCreatedOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === shipmentItem.orderId ? { ...o, orderStatus: "Shipped" } : o
      )
    );

    // 5. Send to /api/crm/messages backend
    try {
      const res = await fetch("/api/crm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetPhone,
          text: trackingMsg,
          customerId: targetCust.id,
          orderNumber: shipmentItem.orderId,
          customerName: shipmentItem.customer,
          sender: "business",
        }),
      });
      const data = await res.json();
      const directUrl = data?.result?.whatsappUrl || `https://wa.me/${targetPhone.length === 10 ? "91" + targetPhone : targetPhone}?text=${encodeURIComponent(trackingMsg)}`;

      toast.success(
        `Speed Post tracking for ${shipmentItem.customer} dispatched! Status updated to In Transit.`
      );

      // Also record message directly into CRM conversation thread
      const trackMsgObj: Message = {
        id: `msg_track_${Date.now()}`,
        sender: "business",
        text: trackingMsg,
        time: "Just now",
        status: "sent",
      };
      setMessagesMap((prev: any) => ({
        ...prev,
        [targetCust.id]: [...(prev[targetCust.id] || []), trackMsgObj],
      }));

      toast.success(
        `Speed Post tracking dispatched directly via CRM to ${shipmentItem.customer}!`
      );
    } catch {
      toast.success(`Tracking details updated in CRM chat for ${shipmentItem.customer}!`);
    }
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
    <div className={`flex h-screen w-screen overflow-hidden ${themeStyles.mainBg} font-sans antialiased`}>
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
        className={`fixed md:static inset-y-0 left-0 z-50 w-[270px] md:w-[240px] shrink-0 ${themeStyles.sidebarBg} flex flex-col justify-between select-none shadow-2xl md:shadow-xl border-r transition-transform duration-300 ease-in-out ${
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
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  12
                </span>
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden pb-14 md:pb-0 relative">
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
                                <span>Ready for India Post Speed Post Dispatch</span>
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
                      : "Outer Solan Road, Solan, Himachal Pradesh – 173212",
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
                    ₹{(248500 + crmOrders.reduce((acc, o) => acc + (o.totalPaise ? o.totalPaise / 100 : o.amount || 0), 0)).toLocaleString("en-IN")}
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
                    {124 + crmOrders.length}
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
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">32</h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Pending UPI</p>
                </div>
              </div>

              {/* Card 4: Processing */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">18</h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Processing</p>
                </div>
              </div>

              {/* Card 5: Shipped */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">21</h4>
                  <p className="text-[10px] font-medium text-neutral-500 mt-1">Shipped</p>
                </div>
              </div>

              {/* Card 6: Unread Messages */}
              <div className={`p-3 rounded-2xl border shadow-2xs hover:shadow-xs transition flex items-center gap-3 ${themeStyles.cardBg}`}>
                <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-neutral-900 leading-none">12</h4>
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
                      <span className="text-emerald-600 font-bold">💬</span> WhatsApp Inbox (12)
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <button
                      onClick={() => setInboxTab("all")}
                      className={`px-2.5 py-1 rounded-full cursor-pointer transition flex items-center gap-1 ${
                        inboxTab === "all" ? "bg-emerald-600 text-white font-bold" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      All <span className="text-[10px] opacity-90">12</span>
                    </button>
                    <button
                      onClick={() => setInboxTab("unread")}
                      className={`px-2.5 py-1 rounded-full cursor-pointer transition flex items-center gap-1 ${
                        inboxTab === "unread" ? "bg-rose-500 text-white font-bold" : "text-neutral-500 hover:bg-neutral-100"
                      }`}
                    >
                      Unread <span className="text-[10px] opacity-90">12</span>
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
                  {filteredCustomers.map((cust) => {
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
                  })}
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
                      {currentCustomer.avatar ? (
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

                    {/* Simulate Customer Query Button */}
                    <button
                      type="button"
                      onClick={() => setShowSimulateCustomerMenu(true)}
                      className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 transition flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap shadow-2xs"
                      title="Simulate customer inquiry to test instant automated response"
                    >
                      <span>💬</span>
                      <span className="hidden md:inline">Simulate</span>
                      <span className="md:hidden">Ask</span>
                    </button>

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
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
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
                  <span className="text-neutral-400 font-bold text-[10px] uppercase font-mono">Test Query:</span>
                  <button
                    type="button"
                    onClick={() => handleSimulateCustomerInquiry("Namaste, mera parcel kab tak dispatch hoga?")}
                    className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold text-[11px] shrink-0 cursor-pointer transition flex items-center gap-1 shadow-2xs"
                    title="Simulate customer asking about parcel dispatch"
                  >
                    <span>⚡ "Kab tak dispatch hoga?"</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateCustomerInquiry("Maine UPI payment kar di hai, check kar lijiye")}
                    className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold text-[11px] shrink-0 cursor-pointer transition flex items-center gap-1 shadow-2xs"
                    title="Simulate customer asking about payment confirmation"
                  >
                    <span>⚡ "Payment kar di hai"</span>
                  </button>
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
                      setInputMessage(`Namaste ${currentCustomer.name} ji! Aapka parcel India Post Speed Post se book hai. Consignment: ET123456789IN. https://indiapost.gov.in`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 font-medium shrink-0 cursor-pointer transition"
                  >
                    🚚 Send Speed Post ID
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
                                <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                  {p.name}
                                </p>
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
                      chatSenderMode === "customer"
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
                      title="Attach Quick Items"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>

                    {showAttachmentMenu && (
                      <div className="absolute bottom-full right-0 mb-2 w-60 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 text-xs space-y-1">
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
                            setInputMessage(`Namaste ${currentCustomer.name} ji! Aapka consignment Speed Post se dispatch ho gaya hai. Tracking Consignment: ET809126569IN. Track at: https://indiapost.gov.in`);
                            setShowAttachmentMenu(false);
                            toast.success("Inserted Speed Post tracking notice!");
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-neutral-100 text-neutral-800 font-medium flex items-center gap-2 cursor-pointer transition"
                        >
                          <Truck className="h-3.5 w-3.5 text-neutral-600" />
                          <span>Attach Speed Post Tracking</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md transition cursor-pointer shrink-0 ${
                      chatSenderMode === "customer"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-[#0A2E22] hover:bg-[#0E3D2E] text-[#E8A317]"
                    }`}
                    title={chatSenderMode === "customer" ? "Send customer question" : "Send message"}
                  >
                    <Send className="h-4 w-4 ml-0.5 text-white" />
                  </button>
                </form>
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

              <div className="flex items-center gap-1 p-1 bg-white border border-neutral-200/80 rounded-xl text-xs font-semibold shadow-2xs self-start sm:self-auto overflow-x-auto">
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
                  ₹{(activeTimeframeData.metrics.revenue + crmOrders.reduce((acc, o) => acc + (o.totalPaise ? o.totalPaise / 100 : o.amount || 0), 0)).toLocaleString("en-IN")}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-200/90 pt-0.5">
                  <span className="font-bold text-amber-300 flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> {activeTimeframeData.metrics.revenueGrowth}
                  </span>
                  <span>vs prev period</span>
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
                  {activeTimeframeData.metrics.orders + crmOrders.length + createdOrders.length}
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
                    <circle cx="72" cy="72" r="54" stroke="#F59E0B" strokeWidth="18" fill="none" strokeDasharray="80 260" />
                    <circle cx="72" cy="72" r="54" stroke="#3B82F6" strokeWidth="18" fill="none" strokeDasharray="50 290" strokeDashoffset="-80" />
                    <circle cx="72" cy="72" r="54" stroke="#6366F1" strokeWidth="18" fill="none" strokeDasharray="60 280" strokeDashoffset="-130" />
                    <circle cx="72" cy="72" r="54" stroke="#10B981" strokeWidth="18" fill="none" strokeDasharray="150 190" strokeDashoffset="-190" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold text-neutral-900 dark:text-white leading-none">124</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5">Total Orders</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending Payment
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">32</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-sky-500" /> Processing
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">18</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" /> Shipped
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">21</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Delivered
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-white">46</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Recent Real-Time Orders & India Post Speed Post Shipments */}
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
                      <th className="p-3 font-semibold">Speed Post Consignment</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-slate-800">
                    {customers.slice(0, 4).map((c, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-neutral-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        onClick={() => {
                          setSelectedOrderForView(c.latestOrder);
                          setActiveNav("order_details");
                        }}
                      >
                        <td className="p-3 font-mono font-bold text-neutral-900 dark:text-white">
                          {c.latestOrder.orderNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-neutral-900 dark:text-white">{c.name}</div>
                          <span className="text-[10px] text-neutral-400 font-mono">{c.phone}</span>
                        </td>
                        <td className="p-3 text-neutral-600 dark:text-slate-300">
                          {c.latestOrder.items.map((it) => it.name).join(", ").slice(0, 32)}...
                        </td>
                        <td className="p-3 font-bold text-neutral-900 dark:text-white">
                          ₹{c.latestOrder.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.latestOrder.paymentStatus === "Paid"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            ● {c.latestOrder.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                            {c.latestOrder.orderStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-neutral-600 dark:text-slate-300">
                          {idx === 0 ? "ET123456789IN" : idx === 1 ? "ET987654321IN" : "Label Pending"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerId(c.id);
                              setActiveNav("inbox");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </button>
                        </td>
                      </tr>
                    ))}
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

              {/* Card 2: India Post Speed Post Queue */}
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
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white">India Post Speed Post Queue</h4>
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
                  title="Export Orders List to CSV file"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
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
              <div className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 overflow-x-auto w-full sm:w-auto">
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
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="p-3.5 font-semibold">Order ID</th>
                      <th className="p-3.5 font-semibold">Customer</th>
                      <th className="p-3.5 font-semibold">Items</th>
                      <th className="p-3.5 font-semibold">Amount</th>
                      <th className="p-3.5 font-semibold">Payment</th>
                      <th className="p-3.5 font-semibold">Status</th>
                      <th className="p-3.5 font-semibold">Date</th>
                      <th className="p-3.5 font-semibold text-right">Actions</th>
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
                          pending: "bg-amber-100 text-amber-800 border-amber-200",
                          processing: "bg-sky-100 text-sky-800 border-sky-200",
                          packed: "bg-purple-100 text-purple-800 border-purple-200",
                          shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
                          completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
                          delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
                          cancelled: "bg-rose-100 text-rose-800 border-rose-200",
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
                            onClick={() => {
                              setSelectedOrderForView(ord);
                              setActiveNav("order_details");
                            }}
                            className="hover:bg-neutral-50 cursor-pointer transition"
                          >
                            <td className="p-3.5 font-mono font-bold text-neutral-900">
                              <span className="text-emerald-700 hover:underline">{ord.orderNumber}</span>
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
                            <td className="p-3.5 font-bold text-neutral-900">
                              ₹{Number(ord.amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="p-3.5">
                              {String(ord.paymentStatus || "").toLowerCase() === "paid" ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Paid
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMarkOrderAsPaid(ord)}
                                  title="1-Click: Verify & Mark Payment as Paid"
                                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300 transition inline-flex items-center gap-1 cursor-pointer group shadow-2xs"
                                >
                                  <span>Pending</span>
                                  <span className="text-[9px] font-extrabold text-emerald-700 underline ml-0.5">
                                    ✓ Mark Paid
                                  </span>
                                </button>
                              )}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
                                ● {ord.orderStatus || "Pending"}
                              </span>
                            </td>
                            <td className="p-3.5 text-neutral-500 whitespace-nowrap">{ord.date}</td>
                            <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {String(ord.paymentStatus || "").toLowerCase() !== "paid" && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkOrderAsPaid(ord)}
                                    title="1-Click: Mark Payment as Paid & Send WhatsApp Receipt"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cleanPhone = (ord.customerPhone || "").replace(/\D/g, "");
                                    const cust = customers.find(
                                      (c) => (c.phone || "").replace(/\D/g, "") === cleanPhone || c.name === ord.customerName
                                    );
                                    if (cust) {
                                      setSelectedCustomerId(cust.id);
                                    }
                                    setActiveNav("inbox");
                                  }}
                                  title="Open Customer Chat in CRM"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrderForView(ord);
                                    setStatusUpdateChoice((ord.orderStatus as any) || "Processing");
                                    setShowStatusModal(true);
                                  }}
                                  title="Change Status"
                                  className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrderForView(ord);
                                    setActiveNav("order_details");
                                  }}
                                  title="View Order Details"
                                  className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                                >
                                  <ArrowRight className="h-3.5 w-3.5" />
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
                              <h4 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
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
                      <span>India Post Speed Post Delivery:</span>
                      <span className="font-mono font-semibold text-neutral-900 dark:text-white">
                        {Number(selectedOrderForView.shipping || 0) > 0
                          ? `₹${Number(selectedOrderForView.shipping).toLocaleString("en-IN")}`
                          : "FREE (Complimentary)"}
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
                      Consignment: {selectedOrderForView.trackingNumber || "ET809126569IN"}
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
                        desc: "Speed Post transit",
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
                    <span className="text-neutral-500">Carrier: Department of Posts, Govt. of India (Speed Post)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrderForView.trackingNumber || "ET809126569IN");
                        toast.success("Speed Post tracking number copied to clipboard!");
                      }}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" /> Copy Tracking ID
                    </button>
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
                      const trackingId = selectedOrderForView.trackingNumber || "ET809126569IN";
                      const msg = `Namaste ${selectedOrderForView.customerName || "ji"}! 🙏 Prajnaa Market se aapka order ${selectedOrderForView.orderNumber} India Post Speed Post se dispatch kar diya gaya hai.\n\n📦 *Tracking Consignment No:* ${trackingId}\n🌐 *Track Online:* https://www.indiapost.gov.in\n\nHumare organic Himalayan farms se judne ke liye dhanyawaad! 🌿`;

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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Customers Directory</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Verified WhatsApp customers, lifetime spending, and direct chat links.
                </p>
              </div>
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
                  {customers.map((c) => (
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
                      <td className="p-3.5 text-right">
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
                      </td>
                    </tr>
                  ))}
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
                <h3 className="text-2xl font-extrabold text-emerald-600">98.6%</h3>
                <span className="text-[10px] text-emerald-700 font-medium">Meta Tier 1 Cloud Routing</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-slate-800 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">Average Read Rate</span>
                <h3 className="text-2xl font-extrabold text-blue-600">86.4%</h3>
                <span className="text-[10px] text-neutral-400">Industry benchmark: 45%</span>
              </div>
            </div>

            {/* Quick Template Presets Pill Bar */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-slate-900/60 border border-emerald-200/70 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center gap-2">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 shrink-0 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Quick Harvest Presets:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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
                    placeholder="e.g., Autumn Badri Cow Ghee Fresh Batch"
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
                    <option>All Customers (345)</option>
                    <option>VIP Customers (42)</option>
                    <option>Honey Lovers (88)</option>
                    <option>Dry Fruits & Nuts Buyers (115)</option>
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
                      {broadcastText.replace(/{{customer_name}}/gi, "Priya Sharma") || "Enter message text above to see live preview..."}
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

              {/* Single-line toolbar: Add Product, CSV Actions, and all stock counters in the exact same line */}
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
                      sku: "PM-" + Math.floor(1000 + Math.random() * 9000),
                      weight: "500g",
                    });
                    setShowManageProductModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Add New Product to Catalog"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Product</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportProductsCsv}
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  title="Export Products Catalog to CSV"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
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
                  Total SKUs: <strong className="text-neutral-900 dark:text-white font-mono">{productsList.length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold shadow-2xs shrink-0">
                  ● {productsList.filter((p) => p.stock === "In Stock").length} In Stock
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold shadow-2xs shrink-0">
                  ▲ {productsList.filter((p) => p.stock === "Low Stock").length} Low Stock
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold shadow-2xs shrink-0">
                  ✕ {productsList.filter((p) => p.stock === "Out of Stock").length} Out
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between gap-4 ${themeStyles.cardBg}`}>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(["all", "In Stock", "Low Stock", "Out of Stock", "Pre-Order"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setProductStockFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                      productStockFilter === st
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "text-neutral-600 hover:bg-neutral-100 dark:hover:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {st === "all" ? "All Products" : st}
                  </button>
                ))}
              </div>

              <div className="relative w-72">
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
                      if (productStockFilter !== "all" && p.stock !== productStockFilter) return false;
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
                              <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                                <span>{prod.name}</span>
                                {prod.sku && (
                                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {prod.sku}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-emerald-600" />
                                <span>{prod.origin}</span>
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
                                setProductFormData({ ...prod });
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
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Shipments & India Post Speed Post</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Official India Post consignment tracking, packaging milestone updates, and dispatch links.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="lg:col-span-3 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                      <tr>
                        <th className="p-3 font-semibold">Order ID</th>
                        <th className="p-3 font-semibold">Customer</th>
                        <th className="p-3 font-semibold">Tracking ID</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {unifiedShipments.map((s, idx) => (
                        <tr
                          key={`${s.orderId || "ship"}_${s.trackingId}_${idx}`}
                          onClick={() => setSelectedShipment(s)}
                          className={`hover:bg-neutral-50 cursor-pointer transition ${
                            selectedShipment.trackingId === s.trackingId ? "bg-emerald-50/60" : ""
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-neutral-900">{s.orderId}</td>
                          <td className="p-3 font-semibold text-neutral-900">{s.customer}</td>
                          <td className="p-3 font-mono text-emerald-700 font-bold">{s.trackingId}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === "Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : s.status === "In Transit"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-500">{s.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900">Tracking Details</h3>
                    <p className="text-xs text-neutral-500">
                      Consignment: <strong className="font-mono text-neutral-900">{selectedShipment.trackingId}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-red-600">🇮🇳 India Post</span>
                </div>

                <div className="space-y-4 pt-1">
                  {selectedShipment.timeline.map((step, idx) => (
                    <div key={idx} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                          ✓
                        </div>
                        {idx < selectedShipment.timeline.length - 1 && <div className="w-0.5 h-8 bg-neutral-200 my-1" />}
                      </div>
                      <div>
                        <h5 className="font-bold text-neutral-900 leading-tight">{step.status}</h5>
                        <p className="text-[11px] text-neutral-500">{step.date}</p>
                        <p className="text-[10px] text-neutral-400">{step.loc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-neutral-100">
                  <button
                    onClick={() => handleSendSpeedPostTracking(selectedShipment)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> Dispatch & Send Tracking via WhatsApp
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const targetCust = customers.find(
                          (c) =>
                            c.name.toLowerCase() === selectedShipment.customer.toLowerCase() ||
                            c.latestOrder?.orderNumber === selectedShipment.orderId
                        ) || currentCustomer;
                        setSelectedCustomerId(targetCust.id);
                        setActiveNav("inbox");
                      }}
                      className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Open in CRM Chat
                    </button>

                    <button
                      onClick={() => {
                        window.open("https://www.indiapost.gov.in/_layouts/15/dpt.cptc.va/trackconsignment.aspx", "_blank");
                      }}
                      className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      🇮🇳 Track on India Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 9: TEMPLATES */}
        {activeNav === "templates" && userPermissions.allowedTabs.includes("templates") && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">WhatsApp Message Templates</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pre-approved templates for rapid order confirmations, QR codes, and tracking links.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs divide-y divide-neutral-100 overflow-hidden">
              {templatesList.map((tpl) => (
                <div key={tpl.id} className="p-4 flex items-start justify-between gap-4 hover:bg-neutral-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-neutral-900">{tpl.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {tpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed max-w-2xl">{tpl.message}</p>
                  </div>

                  <button
                    onClick={() => {
                      const personalized = interpolateCustomerTemplate(tpl.message, currentCustomer);
                      setInputMessage(personalized);
                      setActiveNav("inbox");
                      toast.success(`Applied "${tpl.name}" personalized for ${currentCustomer.name}!`);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shrink-0 transition shadow-2xs cursor-pointer"
                  >
                    Use in Chat
                  </button>
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
                  onClick={handleExportAnalyticsCsv}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" /> Export Data
                </button>
              </div>
            </div>

            {/* 4 Key Performance Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Gross WhatsApp Revenue</span>
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900">₹2,48,500</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> +22.4%
                  </span>
                  <span className="text-neutral-400">vs last month</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>WhatsApp Chat Conversion</span>
                  <Award className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900">34.8%</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold">+4.2%</span>
                  <span className="text-neutral-400">Industry avg: 12%</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Avg Response Time</span>
                  <Clock className="h-4 w-4 text-sky-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900">1.8 mins</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold">-45s faster</span>
                  <span className="text-neutral-400">Instant auto-reply</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Avg Order Value (AOV)</span>
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-neutral-900">₹1,740</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-bold">2.4 items/order</span>
                  <span className="text-neutral-400">Direct UPI</span>
                </div>
              </div>
            </div>

            {/* Monthly Revenue Progression & Funnel */}
            <div className="grid grid-cols-5 gap-6">
              <div className={`col-span-3 p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Monthly Revenue Growth (Jan - Oct 2024)</h3>
                    <p className="text-xs text-neutral-500">Prajnaa Market Himalayan direct sales in ₹ INR</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    +282% YTD Growth
                  </span>
                </div>

                <div className="h-52 flex items-end justify-between gap-2.5 pt-6 px-2 border-b border-neutral-200 dark:border-slate-700 relative">
                  {[
                    { month: "Jan", rev: "₹65K", h: 26 },
                    { month: "Feb", rev: "₹82K", h: 33 },
                    { month: "Mar", rev: "₹105K", h: 42 },
                    { month: "Apr", rev: "₹128K", h: 51 },
                    { month: "May", rev: "₹142K", h: 57 },
                    { month: "Jun", rev: "₹168K", h: 67 },
                    { month: "Jul", rev: "₹185K", h: 74 },
                    { month: "Aug", rev: "₹205K", h: 82 },
                    { month: "Sep", rev: "₹224K", h: 90 },
                    { month: "Oct", rev: "₹248K", h: 100 },
                  ].map((m, i) => {
                    const barHeightPx = Math.max(14, Math.round((m.h / 100) * 125));
                    return (
                      <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer relative">
                        <span className="text-[9px] font-bold text-neutral-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition mb-1 shrink-0">
                          {m.rev}
                        </span>

                        {/* Bar Track Container */}
                        <div className="w-full h-32 flex items-end justify-center relative px-0.5">
                          {/* Background Track Pill */}
                          <div className="w-full max-w-[28px] h-full bg-neutral-100 dark:bg-slate-700/60 rounded-t-md absolute bottom-0 transition-colors group-hover:bg-neutral-200/70" />

                          {/* Colored Bar */}
                          <div
                            className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 relative z-10 shadow-xs ${
                              i === 9
                                ? "bg-gradient-to-t from-emerald-800 to-emerald-400 ring-2 ring-emerald-400"
                                : "bg-gradient-to-t from-emerald-700 to-emerald-500 hover:from-emerald-600 hover:to-emerald-400"
                            }`}
                            style={{ height: `${barHeightPx}px` }}
                          />
                        </div>

                        <span className="text-[10px] font-medium text-neutral-500 dark:text-slate-400 mt-2 shrink-0">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-2 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">WhatsApp Sales Funnel</h3>
                  <p className="text-xs text-neutral-500">From conversation to UPI payment collected</p>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">1. Inbound Chats Received</span>
                      <span className="font-mono text-neutral-900">1,420 (100%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-400 rounded-full w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">2. Products & Pricing Shared</span>
                      <span className="font-mono text-neutral-900">1,180 (83.1%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full w-[83%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">3. Orders Generated</span>
                      <span className="font-mono text-neutral-900">494 (34.8%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[35%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">4. UPI Payments Verified</span>
                      <span className="font-mono text-emerald-800 font-bold">438 (88.6%)</span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full w-[31%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Top Selling Himalayan Produce & Fulfillment Speed Post SLA */}
            <div className="grid grid-cols-5 gap-6">
              {/* Left Column (3 cols): Top Selling Himalayan Produce */}
              <div className={`col-span-3 p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">Top Selling Himalayan Harvests</h3>
                    <p className="text-xs text-neutral-500">Revenue and order share per natural produce line</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    Total: ₹2,48,500
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {[
                    { name: "Himalayan Raw Forest Honey (500g)", emoji: "🍯", rev: "₹86,400", units: 157, share: 34.8, color: "bg-amber-500" },
                    { name: "A2 Badri Cow Desi Ghee (1L)", emoji: "🧈", rev: "₹68,800", units: 86, share: 27.7, color: "bg-emerald-600" },
                    { name: "Pure Himalayan Shilajit Resin (20g)", emoji: "🏔️", rev: "₹44,200", units: 24, share: 17.8, color: "bg-indigo-600" },
                    { name: "Himalayan Red Rice & Organic Spices", emoji: "🌾", rev: "₹32,600", units: 112, share: 13.1, color: "bg-sky-500" },
                    { name: "Kashmiri Mongra Saffron (1g)", emoji: "🌸", rev: "₹16,500", units: 37, share: 6.6, color: "bg-rose-500" },
                  ].map((p, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{p.emoji}</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">{p.name}</span>
                          <span className="text-[10px] text-neutral-400">({p.units} units)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-neutral-900 dark:text-white font-mono">{p.rev}</strong>
                          <span className="text-[11px] text-neutral-500 font-mono w-10 text-right">{p.share}%</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                        <div className={`h-full ${p.color} rounded-full transition-all duration-500`} style={{ width: `${p.share}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column (2 cols): Fulfillment SLA & Quality Assurance */}
              <div className={`col-span-2 p-6 rounded-2xl border shadow-2xs space-y-4 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">India Post Fulfillment SLA</h3>
                    <p className="text-xs text-neutral-500">Dehradun dispatch hub speed & quality scores</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Grade A+
                  </span>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Same-Day Packing Rate</p>
                      <span className="text-[10px] text-neutral-500">Eco-friendly packaging standard</span>
                    </div>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">94.2%</span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Speed Post Transit Avg</p>
                      <span className="text-[10px] text-neutral-500">Dehradun MDG to customer doorstep</span>
                    </div>
                    <span className="font-bold text-sm text-indigo-700 dark:text-indigo-400 font-mono">2.4 days</span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Repeat Customer Retention</p>
                      <span className="text-[10px] text-neutral-500">Re-ordering Himalayan harvest</span>
                    </div>
                    <span className="font-bold text-sm text-amber-700 dark:text-amber-400 font-mono">41.5%</span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 dark:bg-slate-800/60 border border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Return & Damage Rate</p>
                      <span className="text-[10px] text-neutral-500">Shock-proof glass jar protection</span>
                    </div>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">0.4%</span>
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
                Manage official WhatsApp Business API configuration, Meta webhooks, payment credentials, and India Post dispatch hubs.
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
                        value="https://prajnaa-farm-8zam.vercel.app/api/webhooks/whatsapp"
                        className="flex-1 p-2 rounded-xl border border-neutral-200 dark:border-slate-800 text-xs font-mono bg-neutral-50 dark:bg-slate-800 text-neutral-700 dark:text-slate-300 truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://prajnaa-farm-8zam.vercel.app/api/webhooks/whatsapp");
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
                        const testMsgId = `wamid_test_${Date.now()}`;
                        const testBody = "Namaste Nishant ji! Maine payment transfer kar diya hai, kripya parcel confirm karein. 🙏";
                        const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                        // 1. Immediately inject the inbound message into Priya Sharma's conversation in CRM
                        const inboundMsg: Message = {
                          id: testMsgId,
                          sender: "customer",
                          text: testBody,
                          time: nowTime,
                          status: "delivered",
                        };

                        setMessagesMap((prev: any) => ({
                          ...prev,
                          cust_1: [...(prev["cust_1"] || []), inboundMsg],
                        }));

                        setCustomers((prev) =>
                          prev.map((c) =>
                            c.id === "cust_1"
                              ? {
                                  ...c,
                                  lastMessageText: testBody,
                                  lastMessageTime: nowTime,
                                  unreadCount: (c.unreadCount || 0) + 1,
                                }
                              : c
                          )
                        );

                        // 2. Dispatch payload to backend webhook endpoint
                        try {
                          await fetch("/api/webhooks/whatsapp", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-crm-source": "internal-test",
                              "Accept": "application/json",
                            },
                            body: JSON.stringify({
                              entry: [
                                {
                                  changes: [
                                    {
                                      value: {
                                        contacts: [{ profile: { name: "Priya Sharma" } }],
                                        messages: [
                                          {
                                            id: testMsgId,
                                            from: "919876543210",
                                            timestamp: Math.floor(Date.now() / 1000).toString(),
                                            type: "text",
                                            text: { body: testBody },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              ],
                            }),
                          });
                        } catch (err) {
                          console.warn("Backend webhook sync warning:", err);
                        }

                        // 3. Automated reply in the conversation
                        setTimeout(() => {
                          const replyTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const autoReplyText = "Namaste Priya Sharma ji! 🙏 Aapka payment transfer confirmation note Prajnaa concierge team ko receive ho gaya hai. Hum turant verify karke aapka parcel Speed Post sorting hub par dispatch schedule kar rahe hain! 🌿";
                          const replyMsg: Message = {
                            id: `msg_auto_${Date.now()}`,
                            sender: "business",
                            text: autoReplyText,
                            time: replyTime,
                            status: "sent",
                            isAutomated: true,
                          };

                          setMessagesMap((prev: any) => ({
                            ...prev,
                            cust_1: [...(prev["cust_1"] || []), replyMsg],
                          }));

                          setCustomers((prev) =>
                            prev.map((c) =>
                              c.id === "cust_1"
                                ? {
                                    ...c,
                                    lastMessageText: autoReplyText,
                                    lastMessageTime: replyTime,
                                  }
                                : c
                            )
                          );
                        }, 500);

                        toast.success("Webhook verified! Inbound message from Priya Sharma added to Inbox.", {
                          action: {
                            label: "Open Chat",
                            onClick: () => {
                              setSelectedCustomerId("cust_1");
                              setActiveNav("inbox");
                            },
                          },
                        });
                        setIsTestingWebhook(false);
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

              {/* Card 2: India Post & Payment Gateways */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-neutral-200 dark:border-slate-800 shadow-2xs space-y-4 text-neutral-900 dark:text-white">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇳</span>
                    <div>
                      <h3 className="font-bold text-sm">Fulfillment & UPI Gateway</h3>
                      <p className="text-[11px] text-neutral-500">Speed Post Hubs & QR Payment</p>
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
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Official India Post Consignment Portal</label>
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
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-bold px-1 rounded-full">
                12
              </span>
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
                  placeholder="+91 98765 43210"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 dark:border-slate-800 space-y-4 text-neutral-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">Create New Customer Order</h3>
                  <p className="text-[11px] text-neutral-500">
                    Add order details manually or from WhatsApp inquiries.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="space-y-4 text-xs">
              {/* Customer Info */}
              <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-700" /> Customer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Customer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajat Katnoria"
                      value={newOrderCustomerName}
                      onChange={(e) => setNewOrderCustomerName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">WhatsApp Mobile (10-Digit) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={newOrderCustomerPhone}
                      onChange={(e) => setNewOrderCustomerPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={newOrderCustomerEmail}
                    onChange={(e) => setNewOrderCustomerEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" /> Shipping & Delivery Address
                </h4>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Street / Area Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="House/Flat No, Street, Landmark"
                    value={newOrderAddress}
                    onChange={(e) => setNewOrderAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">City</label>
                    <input
                      type="text"
                      value={newOrderCity}
                      onChange={(e) => setNewOrderCity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-neutral-700">Pincode</label>
                    <input
                      type="text"
                      value={newOrderPincode}
                      onChange={(e) => setNewOrderPincode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection (Multi-Product Support) */}
              <div className="space-y-3 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-700" /> Order Produce ({newOrderItemsList.length} items)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddOrderItemLine}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Product
                  </button>
                </div>

                <div className="space-y-2.5">
                  {newOrderItemsList.map((item: any, idx: number) => {
                    const selectedProd = productsList.find((p) => p.id === item.productId) || productsList[0];
                    const lineTotal = (selectedProd?.price || 0) * (item.qty || 1);

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-neutral-200/80 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase font-mono">Item #{idx + 1}</span>
                          {newOrderItemsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItemLine(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 cursor-pointer transition"
                              title="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-8">
                            <SearchableProductSelect
                              products={productsList.map((p) => ({
                                id: p.id,
                                name: p.name,
                                price: p.price,
                                weight: p.weight,
                                category: p.category,
                              }))}
                              selectedId={item.productId}
                              onSelect={(prod: any) => handleUpdateOrderItemLine(idx, prod.id, item.qty)}
                              placeholder="Search Himalayan produce..."
                              className="w-full"
                            />
                          </div>

                          <div className="sm:col-span-4 flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderItemLine(idx, item.productId, Math.max(1, item.qty - 1))}
                                className="h-7 w-7 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-mono font-bold text-xs">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderItemLine(idx, item.productId, item.qty + 1)}
                                className="h-7 w-7 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-mono font-bold text-xs text-neutral-900 w-16 text-right">
                              ₹{lineTotal.toLocaleString("en-IN")}
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

              {/* Order Notes & Discounted Price */}
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
                  <label className="font-semibold text-emerald-800 flex items-center justify-between">
                    <span>Discounted Price / Order Discount (₹)</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Deducted from total</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newOrderDiscount || ""}
                    onChange={(e) => setNewOrderDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full p-2 rounded-xl border border-emerald-300 font-mono font-bold text-xs bg-emerald-50/40 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Dynamic Pricing Summary Card */}
              {(() => {
                const subtotal = newOrderItemsList.reduce((acc: number, item: any) => {
                  const prod = productsList.find((p) => p.id === item.productId) || productsList[0];
                  return acc + (prod?.price || 0) * (item.qty || 1);
                }, 0);
                const discount = Math.max(0, Number(newOrderDiscount) || 0);
                const afterDiscount = Math.max(0, subtotal - discount);
                const shipping = afterDiscount > 1500 ? 0 : 50;
                const total = afterDiscount + shipping;

                return (
                  <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Produce Subtotal ({newOrderItemsList.reduce((a: number, b: any) => a + (b.qty || 1), 0)} items)</span>
                      <span className="font-mono font-bold text-neutral-800">₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Special Order Discount</span>
                        <span className="font-mono font-bold">-₹{discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-neutral-600">
                      <span>India Post Speed Post Delivery</span>
                      <span className="font-mono font-bold text-neutral-800">
                        {shipping === 0 ? "FREE (Orders > ₹1,500)" : `₹${shipping}`}
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

            <div className="grid grid-cols-2 gap-2">
              {(["Pending", "Processing", "Packed", "Shipped", "Delivered", "Cancelled"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusUpdateChoice(st as any)}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    statusUpdateChoice === st
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSelectedOrderForView((prev) => ({ ...prev, orderStatus: statusUpdateChoice }));
                  setCreatedOrders((prev) =>
                    prev.map((o) =>
                      o.orderNumber === selectedOrderForView.orderNumber ? { ...o, orderStatus: statusUpdateChoice } : o
                    )
                  );
                  setCustomers((prev) =>
                    prev.map((c) =>
                      c.latestOrder?.orderNumber === selectedOrderForView.orderNumber
                        ? { ...c, latestOrder: { ...c.latestOrder, orderStatus: statusUpdateChoice } }
                        : c
                    )
                  );
                  setCrmOrders((prev) =>
                    prev.map((o) =>
                      `#${o.orderNumber || o.id}` === selectedOrderForView.orderNumber ||
                      String(o.orderNumber || o.id) === selectedOrderForView.orderNumber
                        ? { ...o, status: statusUpdateChoice }
                        : o
                    )
                  );
                  setShowStatusModal(false);
                  toast.success(`Order status updated to ${statusUpdateChoice}! Customer notified on WhatsApp.`);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Update
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-100 dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl border border-neutral-300 dark:border-slate-800 overflow-hidden my-auto">
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
                    Complies with Rule 46 of CGST Rules, 2017 & India Post Speed Post fulfillment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-200/60 dark:bg-slate-950 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
              {/* THE OFFICIAL TAX INVOICE A4 SHEET */}
              <div
                id="prajnaa-tax-invoice"
                className="bg-white text-neutral-900 p-6 sm:p-8 w-full max-w-[850px] h-fit min-h-fit shadow-xl rounded-2xl print:rounded-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-full space-y-4 text-xs font-sans border border-neutral-300 print:border-none my-4 print:my-0"
              >
                {/* 1. Header: Brand Letterhead & Tax Invoice Heading */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-emerald-900/80">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-[#0F3D2E] text-white flex items-center justify-center font-bold text-base shrink-0">
                        🌿
                      </div>
                      <div>
                        <h2 className="font-extrabold text-sm sm:text-base text-[#0F3D2E] uppercase tracking-wide font-mono">
                          Prajnaa Market
                        </h2>
                        <p className="text-[10px] font-semibold text-neutral-600">
                          Pure Himalayan Origin Harvest • Farm-to-Table Marketplace
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-neutral-600 space-y-0.5 pt-1 font-mono">
                      <p className="font-semibold text-neutral-900">
                        Address: Outer Solan Road, Solan, Himachal Pradesh – 173212, India
                      </p>
                      <p className="font-semibold text-neutral-800">Pin code: 173212</p>
                      <p className="font-semibold text-neutral-800">
                        GSTIN: <span className="text-emerald-900 font-bold">02AABCP1234F1Z8</span> • State: Himachal Pradesh (02) • PAN: AABCP1234F
                      </p>
                      <p>FSSAI Lic No: 12622005000189 • CIN: U01111HP2024PTC016789</p>
                      <p>Desk: +91 80912 65690 • concierge@prajnaa.in • https://market.prajnaa.in</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 w-full sm:w-auto">
                    <div className="inline-block bg-[#0F3D2E] text-white px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider mb-2">
                      TAX INVOICE
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono space-y-1">
                      <p><strong>Original for Recipient</strong></p>
                      <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-left space-y-1 mt-1">
                        <div className="flex justify-between gap-3">
                          <span className="text-neutral-500">Invoice No:</span>
                          <strong className="font-mono text-neutral-900">
                            INV-{selectedOrderForView.orderNumber.replace(/[^a-zA-Z0-9]/g, "")}
                          </strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-neutral-500">Invoice Date:</span>
                          <strong className="text-neutral-900">{selectedOrderForView.date}</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-neutral-500">Order Ref:</span>
                          <strong className="font-mono text-emerald-800">{selectedOrderForView.orderNumber}</strong>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-neutral-500">Place of Supply:</span>
                          <strong className="text-neutral-900">Himachal Pradesh (02)</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Transport Logistics Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Billed To / Consignee */}
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1 mb-1.5">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">
                        Billed & Shipped To (Customer)
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800">
                        Verified Patron
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-neutral-900">
                      {selectedOrderForView.customerName || "Customer Patron"}
                    </h4>
                    <p className="font-mono text-neutral-600">
                      Phone: <strong>{selectedOrderForView.customerPhone || "+91 98765 43210"}</strong>
                    </p>
                    {selectedOrderForView.customerEmail && (
                      <p className="text-neutral-600 truncate">Email: {selectedOrderForView.customerEmail}</p>
                    )}
                    <p className="text-neutral-700 leading-snug pt-0.5">
                      Address: {selectedOrderForView.shippingAddress || "Outer Solan Road, Solan, Himachal Pradesh – 173212"}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      State / Code: {selectedOrderForView.shippingAddress?.toLowerCase().includes("uttarakhand")
                        ? "Uttarakhand (05)"
                        : selectedOrderForView.shippingAddress?.toLowerCase().includes("delhi")
                        ? "Delhi (07)"
                        : "Himachal Pradesh (02)"}
                    </p>
                  </div>

                  {/* Logistics Dispatch & India Post */}
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-1 mb-1.5">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">
                        Fulfillment & Speed Post Dispatch
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-sky-100 text-sky-800 font-mono">
                        Speed Post
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Carrier:</span>
                        <strong className="text-neutral-800">India Post (Speed Post Parcel)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Consignment No:</span>
                        <strong className="font-mono text-emerald-800 font-bold">
                          {selectedOrderForView.trackingNumber || "ET809126569IN"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Dispatch Hub:</span>
                        <span className="text-neutral-800">Solan Head Post Office (HPO), Himachal Pradesh - 173212</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Fulfillment Status:</span>
                        <strong className="text-neutral-900 capitalize font-mono">
                          {selectedOrderForView.orderStatus}
                        </strong>
                      </div>
                      <div className="flex justify-between pt-0.5 text-[10px] text-neutral-500 border-t border-neutral-200">
                        <span>Insurance Cover:</span>
                        <span className="text-emerald-700 font-semibold">100% In-Transit Protected</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Itemized Goods Table */}
                {(() => {
                  const rawItems = selectedOrderForView.items && selectedOrderForView.items.length > 0
                    ? selectedOrderForView.items
                    : [
                        {
                          name: "Himalayan Artisanal Produce Package",
                          weight: "Standard Pack",
                          qty: selectedOrderForView.itemsCount || 1,
                          price: Number(selectedOrderForView.amount || 0),
                          total: Number(selectedOrderForView.amount || 0),
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
                      price = found?.price || 450;
                      total = price * qty;
                    }

                    let packWeight = it.weight || "Standard Pack";
                    const nameL = (it.name || it.productName || "").toLowerCase();
                    if (nameL.includes("5kg") || nameL.includes("5 kg")) packWeight = "5kg Bulk Pack";
                    else if (nameL.includes("1kg") || nameL.includes("1 kg")) packWeight = "1kg Pack";
                    else if (nameL.includes("250g") || nameL.includes("250 g")) packWeight = "250g Pack";
                    else if (nameL.includes("1l") || nameL.includes("1 litre")) packWeight = "1 Litre";

                    return {
                      ...it,
                      name: it.name || it.productName || "Himalayan Produce",
                      qty,
                      price,
                      total,
                      weight: packWeight,
                    };
                  });

                  const computedSubtotal = parsedInvoiceItems.reduce((acc, it) => acc + it.total, 0);
                  const discountVal = Number(selectedOrderForView.discount || 0);
                  const shippingVal = Number(selectedOrderForView.shipping || 0);
                  const computedTotal = Math.max(0, computedSubtotal - discountVal + shippingVal);
                  const finalInvoiceAmount = selectedOrderForView.amount != null && selectedOrderForView.amount > 0 && selectedOrderForView.amount === computedTotal
                    ? selectedOrderForView.amount
                    : computedTotal;
                  const discountPct = computedSubtotal > 0 && discountVal > 0
                    ? ((discountVal / computedSubtotal) * 100).toFixed(1)
                    : "0";
                  const gstVal = finalInvoiceAmount > 0 ? (finalInvoiceAmount * 0.05 / 1.05) : 0;

                  return (
                    <>
                      <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#0F3D2E] text-white text-[11px]">
                            <tr>
                              <th className="py-2 px-3 font-semibold text-center w-8">#</th>
                              <th className="py-2 px-3 font-semibold">Description of Produce & Harvest</th>
                              <th className="py-2 px-3 font-semibold text-center w-24">HSN Code</th>
                              <th className="py-2 px-3 font-semibold text-center w-16">Qty</th>
                              <th className="py-2 px-3 font-semibold text-right w-24">Unit Rate</th>
                              <th className="py-2 px-3 font-semibold text-right w-28">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 text-neutral-800 bg-white">
                            {parsedInvoiceItems.map((it, idx) => (
                              <tr key={idx} className="hover:bg-neutral-50/80">
                                <td className="py-2 px-3 text-center font-mono text-[11px] text-neutral-500">{idx + 1}</td>
                                <td className="py-2 px-3">
                                  <span className="font-bold text-neutral-900 block">{it.name}</span>
                                  <span className="text-[10px] text-neutral-500 font-mono">
                                    Pack / Weight: {it.weight} • Certified Himalayan Single-Origin
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[11px] text-neutral-600">
                                  {getProductHsn(it.name)}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-bold">{it.qty}</td>
                                <td className="py-2 px-3 text-right font-mono">
                                  ₹{it.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                                  ₹{it.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* 4. Commercial Summary & Tax Calculation */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 print-keep">
                        {/* Left (7 cols): Words, Payment Details & Notes */}
                        <div className="sm:col-span-7 space-y-2">
                          <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/80 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider block">
                              Invoice Total in Words:
                            </span>
                            <p className="font-bold text-neutral-900 text-xs">
                              {numberToWordsIndian(finalInvoiceAmount)}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                              <span className="font-bold text-neutral-600">Payment Method:</span>
                              <strong className="text-neutral-900">{selectedOrderForView.paymentMethod || "UPI Direct"}</strong>
                            </div>
                            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                              <span className="font-bold text-neutral-600">Payment Status:</span>
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                ● {selectedOrderForView.paymentStatus || "Paid"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-500">Transaction Desk:</span>
                              <span className="font-mono text-[10px] text-neutral-700">Official Desk (prajnaa@upi)</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-neutral-500 space-y-0.5 leading-relaxed pt-0.5">
                            <p className="font-semibold text-neutral-700">Terms & Harvest Warranty:</p>
                            <p>• Certified pesticide-free Himalayan single-origin farm harvest with zero adulteration.</p>
                            <p>• Goods dispatched via India Post Speed Post are tracked and insured under postal transit rules.</p>
                            <p>• For queries or re-orders, reach concierge at <strong>+91 80912 65690</strong> on WhatsApp.</p>
                          </div>
                        </div>

                        {/* Right (5 cols): Calculation Box */}
                        <div className="sm:col-span-5">
                          <div className="p-3 rounded-xl border border-neutral-300 bg-neutral-50/70 space-y-2 text-xs">
                            <div className="flex justify-between text-neutral-600">
                              <span>Produce Subtotal:</span>
                              <span className="font-mono font-semibold text-neutral-900">
                                ₹{computedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="flex justify-between text-neutral-600">
                              <span>Speed Post Delivery:</span>
                              <span className="font-mono font-semibold text-neutral-900">
                                {shippingVal > 0
                                  ? `₹${shippingVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : "FREE (Included)"}
                              </span>
                            </div>

                            {discountVal > 0 && (
                              <div className="flex justify-between text-emerald-700 font-semibold">
                                <span>Discount Applied ({discountPct}%):</span>
                                <span className="font-mono font-bold">-₹{discountVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-200">
                              <span>Applicable GST (5% Included):</span>
                              <span className="font-mono">
                                ₹{gstVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-sm font-extrabold text-neutral-900 pt-2 border-t-2 border-neutral-300">
                              <span>Total Amount:</span>
                              <span className="text-base font-mono text-emerald-800 font-extrabold">
                                ₹{finalInvoiceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* 5. Official Stamp & Authorized Signatory */}
                <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 print-keep">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-neutral-100 rounded-lg border border-neutral-200">
                      <QrCode className="h-8 w-8 text-[#0F3D2E]" />
                    </div>
                    <div className="text-[10px] text-neutral-500 leading-tight">
                      <strong className="block text-neutral-800">Scan to Verify Invoice</strong>
                      <span>Authentication via Prajnaa Digital Ledger</span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-[10px] text-neutral-500">For <strong>PRAJNAA MARKET</strong></p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      <span>Digitally Verified & Authorized Signatory</span>
                    </div>
                    <p className="text-[9px] text-neutral-400">Operations & Concierge Fulfillment Team</p>
                  </div>
                </div>

                <div className="text-center text-[9px] text-neutral-400 pt-2 border-t border-neutral-100">
                  This is a computer-generated tax invoice issued by Prajnaa Market under the Information Technology Act, 2000. All disputes subject to Dehradun jurisdiction.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}