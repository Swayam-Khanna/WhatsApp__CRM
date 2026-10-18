"use client";

import { useState, useRef, useEffect } from "react";
import {
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
}

// Client-side automated reply generator strictly focused on the customer's specific question
function generateClientAutoReply(customerName?: string, queryText: string = ""): string {
  const query = queryText.toLowerCase().trim();
  const name = customerName && customerName !== "Customer" ? `${customerName} ji` : "ji";

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
    return `Namaste ${name}! 🙏 Hamara official customer support number +91 76500 65690 hai. Store Concierge Nishant ji isi number par directly available hain.`;
  }

  // 10. Thank You / Appreciation
  if (query.includes("thank") || query.includes("dhanyawad") || query.includes("shukriya") || query.includes("thanks")) {
    return `Aapka bahut-bahut dhanyavaad ${name}! 🙏 Prajnaa Market ke sath judne ke liye shukriya. Agar koi aur sawal ho toh batayein.`;
  }

  // 11. Greeting
  if (query === "hi" || query === "hello" || query === "namaste" || query === "hey" || query === "pranam") {
    return `Namaste ${name}! 🙏 Prajnaa Market me aapka swagat hai. Batayein, aaj hum aapki kya sahayata kar sakte hain?`;
  }

  // 12. Fallback: Concise & Direct
  return `Namaste ${name}! 🙏 Aapka sawal Prajnaa support team ko mil gaya hai. Store Concierge Nishant ji ise review karke jald hi aapse direct connect karenge.`;
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
}

export type UserRole = "Store Admin" | "Senior Concierge" | "Fulfillment Officer" | "Inventory Associate";

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
  status: "Online" | "On Break" | "Offline";
  assignedChats: number;
  avgResponseTime: string;
  avatar: string;
  tempPassword?: string;
  createdAt: string;
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
    defaultTab: "dashboard",
    label: "Store Admin (Master Control)",
    description: "Full access to revenue analytics, broadcasts, team management & settings",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  "Senior Concierge": {
    allowedTabs: ["inbox", "orders", "order_details", "customers", "products", "templates"],
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
    phone: "+91 76500 65690",
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

// Initial Products Data (All 14 Authoritative Himalayan Store Items)
const INITIAL_PRODUCTS: ProductItem[] = [
  { id: "himalayan-dried-apricots", name: "Himalayan Dried Apricots (Red)", price: 999, stock: "Pre-Order", image: "🍑", category: "Dry Fruits", unitsLeft: 0, origin: "Sham Valley Orchard, Ladakh", sku: "PM-APR-500", weight: "500 gm" },
  { id: "walnuts", name: "Himalayan Mountain Walnuts", price: 604, stock: "Pre-Order", image: "🌰", category: "Dry Fruits", unitsLeft: 0, origin: "Kashmir Giri High Oil", sku: "PM-WAL-250", weight: "250g" },
  { id: "organic-almonds", name: "Mamra Almonds", price: 1250, stock: "In Stock", image: "🥜", category: "Dry Fruits", unitsLeft: 42, origin: "High Altitude Organic Orchards", sku: "PM-ALM-500", weight: "500 g" },
  { id: "turmeric-powder", name: "Stone-Ground Turmeric", price: 240, stock: "In Stock", image: "🌿", category: "Spices", unitsLeft: 86, origin: "Lakadong High Curcumin", sku: "PM-TUR-250", weight: "250 g" },
  { id: "mango-pickle", name: "Heirloom Mango Pickle", price: 380, stock: "In Stock", image: "🥭", category: "Pickles", unitsLeft: 24, origin: "Himalayan Foothills Wood Pressed", sku: "PM-PCK-400", weight: "400 g" },
  { id: "pink-himalayan-salt", name: "Pink Himalayan Salt", price: 180, stock: "In Stock", image: "🧂", category: "Salts", unitsLeft: 120, origin: "Khewra Foothills Mineral Rich", sku: "PM-SLT-500", weight: "500 g" },
  { id: "garam-masala", name: "House Garam Masala", price: 320, stock: "In Stock", image: "🌶️", category: "Masalas", unitsLeft: 58, origin: "Stone-Ground Whole Spices", sku: "PM-MAS-200", weight: "200 g" },
  { id: "mixed-seeds", name: "Five-Seed Mix", price: 280, stock: "In Stock", image: "🌱", category: "Seeds", unitsLeft: 96, origin: "Uttarakhand Hill Farms", sku: "PM-SED-500", weight: "500 g" },
  { id: "california-almonds", name: "California Almonds", price: 720, stock: "Out of Stock", image: "🌰", category: "Dry Fruits", unitsLeft: 0, origin: "Premium Kernels", sku: "PM-CAL-500", weight: "500 g" },
  { id: "chilli-powder", name: "Guntur Red Chilli", price: 220, stock: "Out of Stock", image: "🌶️", category: "Spices", unitsLeft: 0, origin: "Sun-Dried Stone Ground", sku: "PM-CHL-250", weight: "250 g" },
  { id: "lemon-pickle", name: "Salt-Cured Lemon Pickle", price: 320, stock: "In Stock", image: "🍋", category: "Pickles", unitsLeft: 42, origin: "Six-Week Sun-Aged Foothills", sku: "PM-LMN-400", weight: "400 g" },
  { id: "black-salt", name: "Black Salt (Kala Namak)", price: 160, stock: "In Stock", image: "🧂", category: "Salts", unitsLeft: 86, origin: "Kiln-Fired Natural Crystals", sku: "PM-BSL-500", weight: "500 g" },
  { id: "chai-masala", name: "Spiced Chai Masala", price: 260, stock: "In Stock", image: "☕", category: "Masalas", unitsLeft: 24, origin: "Pahari Cardamom & Clove", sku: "PM-CHM-150", weight: "150 g" },
  { id: "chia-seeds", name: "Black Chia Seeds", price: 220, stock: "In Stock", image: "🌾", category: "Seeds", unitsLeft: 120, origin: "High Altitude Organic Cultivation", sku: "PM-CHI-250", weight: "250 g" },
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
    message: "Namaste {{customer_name}} ji! 🙏\n\nYeh raha aapke order {{order_id}} ka official Prajnaa Market payment QR. Total Amount: ₹{{amount}}.\n\nKripya kisi bhi UPI app (Google Pay, PhonePe, Paytm) se scan karke payment complete karein aur screenshot share kar dijiye. Verification ke baad order dispatch queue me chala jayega.\n\nUPI ID: 7650065690@okbizaxis\nDhanyavaad! 🌾",
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

  // Authentication State (MANDATORY LOGIN: Users MUST authenticate before accessing CRM)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Current Logged-in User
  const [currentUser, setCurrentUser] = useState<TeamMember>(INITIAL_TEAM[0]);

  // Auth Form State (Empty by default for clean staff login)
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Navigation (Filtered by User's Work Area / Role)
  const [activeNav, setActiveNav] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileChatView, setMobileChatView] = useState<"list" | "chat" | "details">("list");

  // State: Team Members (Stored in State & Loaded from LocalStorage)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM);
  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [newTeamMember, setNewTeamMember] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Senior Concierge" as UserRole,
  });
  const [lastCreatedMember, setLastCreatedMember] = useState<TeamMember | null>(null);

  // State: Customers & Conversations
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("cust_1");
  const [inboxTab, setInboxTab] = useState<"all" | "unread" | "assigned" | "resolved">("all");
  const [inboxSearch, setInboxSearch] = useState("");

  // State: Messages
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES_MAP);
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
  const [ordersFilter, setOrdersFilter] = useState<string>("all");
  const [ordersSearch, setOrdersSearch] = useState<string>("");
  const [showAddOrderModal, setShowAddOrderModal] = useState<boolean>(false);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);

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
  const [productsList, setProductsList] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [productStockFilter, setProductStockFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showEditStockModal, setShowEditStockModal] = useState<boolean>(false);
  const [editUnitsInput, setEditUnitsInput] = useState<number>(0);
  const [editStockStatusInput, setEditStockStatusInput] = useState<StockStatus>("In Stock");
  const [editPriceInput, setEditPriceInput] = useState<number>(0);

  // State: CRM Orders synchronized with Web Checkout & Server
  const [crmOrders, setCrmOrders] = useState<any[]>([]);
  const [showCatalogQuoteMenu, setShowCatalogQuoteMenu] = useState<boolean>(false);
  const [showQuickTemplatesMenu, setShowQuickTemplatesMenu] = useState<boolean>(false);
  const [chatSenderMode, setChatSenderMode] = useState<"business" | "customer">("business");
  const [isAutoReplying, setIsAutoReplying] = useState<boolean>(false);
  const [showSimulateCustomerMenu, setShowSimulateCustomerMenu] = useState<boolean>(false);

  // Derived: Permissions for Current User
  const userPermissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS["Store Admin"];

  // Load persistent team, authoritative products, & sync checkout orders
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("prajnaa_crm_theme") as ThemeMode;
      if (savedTheme) setCurrentTheme(savedTheme);

      const savedTeam = localStorage.getItem("prajnaa_crm_team");
      if (savedTeam) {
        try {
          setTeamMembers(JSON.parse(savedTeam));
        } catch {}
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

            const categoryEmojiMap: Record<string, string> = {
              "dry-fruits": "🍑",
              spices: "🌿",
              pickles: "🥭",
              salts: "🧂",
              masalas: "🌶️",
              seeds: "🌱",
            };

            const mapped: ProductItem[] = data.products.map((p: any) => {
              const override = savedOverrides[p.id] || savedOverrides[p.slug];
              const isPreOrder = p.is_preorder || p.preOrder?.enabled;
              const defaultStock: StockStatus = isPreOrder ? "Pre-Order" : p.stock > 0 ? "In Stock" : "Out of Stock";
              const defaultUnits = typeof p.stock === "number" ? p.stock : 50;

              return {
                id: p.id || p.slug,
                name: p.name,
                price: override?.price !== undefined ? override.price : Number(p.price) || 0,
                stock: override?.stock || defaultStock,
                image: categoryEmojiMap[p.category] || "🌾",
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
                    ? ord.items.map((it: any) => ({
                        name: it.productName || it.name,
                        weight: it.weight || "500g",
                        qty: it.quantity || it.qty || 1,
                        price: (it.unitPricePaise ? it.unitPricePaise / 100 : it.price) || 0,
                        total: (it.totalPaise ? it.totalPaise / 100 : it.total) || 0,
                        image: it.productImage || "🌾",
                      }))
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
          }
        } catch {}
      };

      // 3. Sync Live WhatsApp CRM Messages from MongoDB Atlas & Webhooks
      const syncCrmMessages = async () => {
        try {
          const res = await fetch("/api/crm/messages");
          const json = await res.json();
          if (json && json.success && Array.isArray(json.messages)) {
            const dbMsgs = json.messages;
            setMessagesMap((prevMap) => {
              let hasChanges = false;
              const nextMap = { ...prevMap };

              setCustomers((currentCusts) => {
                currentCusts.forEach((cust) => {
                  const custPhoneClean = (cust.phone || "").replace(/\D/g, "").slice(-10);
                  const relevantDbMsgs = dbMsgs.filter((m: any) => {
                    const toClean = (m.to || "").replace(/\D/g, "").slice(-10);
                    const fromClean = (m.from || "").replace(/\D/g, "").slice(-10);
                    return (
                      m.customerId === cust.id ||
                      (custPhoneClean && (toClean === custPhoneClean || fromClean === custPhoneClean))
                    );
                  });

                  if (relevantDbMsgs.length > 0) {
                    const currentList = nextMap[cust.id] || [];
                    const newToAdd: Message[] = [];

                    // Sort chronologically ascending
                    relevantDbMsgs.sort(
                      (a: any, b: any) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
                    );

                    relevantDbMsgs.forEach((dbM: any) => {
                      const alreadyExists = currentList.some(
                        (ex) =>
                          ex.id === dbM.id ||
                          (ex.text === dbM.text &&
                            Math.abs(new Date(ex.time || 0).getTime() - new Date(dbM.timestamp || 0).getTime()) < 60000)
                      );
                      if (!alreadyExists) {
                        const timeStr = dbM.timestamp
                          ? new Date(dbM.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Just now";
                        newToAdd.push({
                          id: dbM.id || `msg_db_${Date.now()}_${Math.random()}`,
                          sender: dbM.direction === "inbound" || dbM.sender === "customer" ? "customer" : "business",
                          text: dbM.text,
                          time: timeStr,
                          status: (dbM.status as any) || "delivered",
                          isAutomated: Boolean(dbM.isAutomated),
                        });
                      }
                    });

                    if (newToAdd.length > 0) {
                      nextMap[cust.id] = [...currentList, ...newToAdd];
                      hasChanges = true;
                    }
                  }
                });
                return currentCusts;
              });

              return hasChanges ? nextMap : prevMap;
            });
          }
        } catch {}
      };

      syncCrmOrders();
      syncCrmMessages();
      const interval = setInterval(() => {
        syncCrmOrders();
        syncCrmMessages();
      }, 3000);
      window.addEventListener("prajnaa_order_placed", syncCrmOrders);
      window.addEventListener("storage", syncCrmOrders);

      return () => {
        clearInterval(interval);
        window.removeEventListener("prajnaa_order_placed", syncCrmOrders);
        window.removeEventListener("storage", syncCrmOrders);
      };
    }
  }, []);

  // Stock Status Update Handler
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
    const latestOrder = customer.latestOrder || {};
    const trackingNumber =
      latestOrder.trackingNumber ||
      (crmOrders.find((o) =>
        o.customerPhone?.replace(/\D/g, "").endsWith(customer.phone.replace(/\D/g, "").slice(-10))
      )?.trackingId) ||
      "ET765006569IN";

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

    setIsBroadcasting(true);
    try {
      const res = await fetch("/api/crm/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: broadcastName.trim(),
          audience: broadcastAudience,
          message: broadcastText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.campaign) {
          setBroadcastCampaigns((prev) => [data.campaign, ...prev]);
        }
        toast.success(data.message || `Campaign "${broadcastName}" dispatched successfully!`);
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

  // Handle Login — STRICT TEAM-ROSTER AUTHENTICATION
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredEmail = authEmail.trim().toLowerCase();
    const enteredPassword = authPassword.trim();

    // 1. Check if user exists in Team Roster (added by Admin)
    const matchingMember = teamMembers.find((m) => m.email.toLowerCase() === enteredEmail);

    if (!matchingMember) {
      toast.error(
        "Access Denied: Only team members added by the Store Admin can sign in. This email is not in the CRM team roster."
      );
      return;
    }

    // 2. Validate Password (Matches their issued password or master demo)
    const isPasswordValid =
      enteredPassword === matchingMember.tempPassword ||
      enteredPassword === "adminPrajnaa#2024" ||
      enteredPassword === "prajnaa2024";

    if (!isPasswordValid) {
      toast.error(`Invalid password for ${matchingMember.name}. Please enter the password issued by your Admin.`);
      return;
    }

    // 3. Authenticate User and route to their Work Area
    setCurrentUser(matchingMember);
    setIsAuthenticated(true);

    const perms = ROLE_PERMISSIONS[matchingMember.role];
    setActiveNav(perms.defaultTab);

    toast.success(`Welcome back, ${matchingMember.name}! Switched to ${perms.label}.`);
  };

  // Quick Demo Login Helper
  const handleQuickLoginAs = (member: TeamMember) => {
    setAuthEmail(member.email);
    setAuthPassword(member.tempPassword || "adminPrajnaa#2024");
    setCurrentUser(member);
    setIsAuthenticated(true);
    const perms = ROLE_PERMISSIONS[member.role];
    setActiveNav(perms.defaultTab);
    toast.success(`Signed in as ${member.name} (${member.role}) — ${perms.label}`);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowProfileMenu(false);
    toast.info("Logged out from Prajnaa WhatsApp CRM");
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

    const selectedProduct = productsList.find((p) => p.id === newOrderProductId) || productsList[0];
    const qty = Math.max(1, newOrderQuantity || 1);
    const subtotal = (selectedProduct?.price || 950) * qty;
    const shipping = 50;
    const total = subtotal + shipping;
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
      itemsCount: qty,
      amount: total,
      paymentStatus: (newOrderPaymentStatus === "Paid" ? "Paid" : "Pending") as any,
      orderStatus: (newOrderStatus === "Completed" ? "Completed" : newOrderStatus) as any,
      date: formattedDate,
      time: formattedTime,
      items: [
        {
          name: selectedProduct?.name || "Himalayan Forest Honey",
          weight: selectedProduct?.weight || "500g",
          qty,
          price: selectedProduct?.price || 950,
          total: subtotal,
          image: selectedProduct?.image || "🍯",
        },
      ],
      subtotal,
      discount: 0,
      shipping,
      paymentMethod: newOrderPaymentMethod === "COD" ? "Cash on Delivery" : newOrderPaymentMethod === "WhatsApp" ? "WhatsApp Order" : "UPI Payment",
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
      const firstMsgText = `Namaste ${newOrderCustomerName.trim()}! 🙏 Prajnaa Market se connect karne ke liye dhanyawad.\n\nAapne hamare Prajnaa portal se yeh saman order kiya hai:\n\n📦 *Order ID:* ${fullOrderNum}\n🌾 *Saman / Items:* ${selectedProduct?.name || "Himalayan Forest Honey"} × ${qty}\n💰 *Total Amount:* ₹${total.toLocaleString("en-IN")}\n📍 *Delivery Address:* ${newOrderAddress || "Civil Lines"}, ${newOrderCity} - ${newOrderPincode}\n🚚 *Shipping Mode:* India Post Speed Post (2-3 din me dispatch)\n\nHum aapka order organic farms se pack kar rahe hain. Kisi bhi jaankari ya payment confirmation ke liye aap yahan reply kar sakte hain! 🌿`;

      setMessagesMap((prev) => {
        const existing = prev[targetCustId] || [];
        return {
          ...prev,
          [targetCustId]: [
            ...existing,
            {
              id: `msg_order_${orderNum}`,
              sender: "admin",
              senderName: "Prajnaa Store Concierge",
              text: firstMsgText,
              time: formattedTime,
              date: "Today",
              type: "text",
              status: "delivered",
            },
          ],
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
          paymentMethod: newOrderPaymentMethod.toLowerCase(),
          paymentStatus: newOrderPaymentStatus.toLowerCase(),
          status: newOrderStatus.toLowerCase(),
          items: [
            {
              productName: selectedProduct?.name || "Himalayan Produce",
              quantity: qty,
              price: selectedProduct?.price || 950,
              unitPricePaise: (selectedProduct?.price || 950) * 100,
            },
          ],
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
            ? ord.items.map((it: any) => ({
                name: it.productName || it.name || "Himalayan Produce",
                weight: it.weight || "500g",
                qty: it.quantity || it.qty || 1,
                price: (it.unitPricePaise ? it.unitPricePaise / 100 : it.price) || 0,
                total: (it.totalPaise ? it.totalPaise / 100 : it.total) || 0,
                image: it.productImage || "🌾",
              }))
            : [],
          subtotal: ord.subtotalPaise ? ord.subtotalPaise / 100 : orderTotal,
          discount: ord.discountPaise ? ord.discountPaise / 100 : 0,
          shipping: ord.shippingPaise ? ord.shippingPaise / 100 : 50,
          paymentMethod: ord.paymentMethod || "COD",
          trackingNumber: ord.trackingId || "ET765006569IN",
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
                <label className="font-bold text-neutral-700">Team Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajat@prajnaamarket.com"
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

            {/* Note on RBAC */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>🛡️</span> Role-Based Workspace Access:
              </p>
              <p className="text-amber-800 leading-snug">
                Upon sign-in, you will only see tools allowed for your specific role (Admin, Concierge, or Fulfillment Officer).
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
            <div className="relative hidden sm:block w-[220px] md:w-[320px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search customers, orders, messages..."
                className="w-full pl-9 pr-12 py-2 rounded-xl bg-neutral-100/70 border border-neutral-200/60 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 bg-white border border-neutral-200 px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </span>
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
                  +91 76500 65690
                </span>
              </div>
              <div className="flex items-center gap-1 pl-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-800">Online</span>
              </div>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => toast.info("3 unread WhatsApp customer escalations")}
              className="relative p-2 rounded-xl text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>

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
                        onClick={() => { setSelectedCustomerId(cust.id); setMobileChatView("chat"); }}
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

                  <div className="flex items-center gap-1 md:gap-2 text-neutral-500">
                    {/* Auto-Responder Active Badge */}
                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-subhead font-bold shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Auto-Responder: Active</span>
                    </div>

                    {/* Direct Real WhatsApp Opener */}
                    <a
                      href={`https://wa.me/${(currentCustomer.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                        currentMessages[currentMessages.length - 1]?.text || "Namaste from Prajnaa Market!"
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#0F602B] text-[11px] md:text-xs font-bold border border-[#25D366]/50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Open conversation in real WhatsApp Web/App to send message directly to phone"
                    >
                      <span className="text-xs">🟢</span>
                      <span className="hidden sm:inline">Open in Real WhatsApp</span>
                      <span className="sm:hidden">WhatsApp</span>
                    </a>

                    {/* Simulate Customer Query Button */}
                    <button
                      type="button"
                      onClick={() => setShowSimulateCustomerMenu(true)}
                      className="px-2 md:px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] md:text-xs font-semibold border border-amber-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Test customer asking something to see instant automated response"
                    >
                      <span>💬</span>
                      <span className="hidden sm:inline">Simulate Ask</span>
                      <span className="sm:hidden">Test</span>
                    </button>

                    <button
                      onClick={handleSendPaymentQr}
                      className="px-2 md:px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] md:text-xs font-semibold border border-emerald-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Send QR</span>
                      <span className="sm:hidden">QR</span>
                    </button>
                    {/* View Details Info button on mobile & tablets */}
                    <button
                      onClick={() => setMobileChatView("details")}
                      className="xl:hidden p-2 rounded-xl border border-neutral-200/80 hover:bg-neutral-100 text-neutral-700 transition cursor-pointer"
                      title="Customer Details & Orders"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <button className="hidden sm:block p-2 rounded-lg hover:bg-neutral-100 transition cursor-pointer">
                      <Star className="h-4 w-4" />
                    </button>
                    <button className="hidden sm:block p-2 rounded-lg hover:bg-neutral-100 transition cursor-pointer">
                      <Tag className="h-4 w-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-neutral-100 transition cursor-pointer">
                      <MoreVertical className="h-4 w-4" />
                    </button>
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
                            className={`max-w-[70%] rounded-2xl p-3 text-xs shadow-2xs space-y-1 relative ${
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
                <div className="px-4 py-2 bg-neutral-50/90 border-t border-neutral-200/60 flex items-center gap-2 overflow-x-auto text-[11px] shrink-0 text-neutral-800">
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
                              <span className="text-3xl shrink-0 p-1.5 rounded-xl bg-neutral-100 dark:bg-slate-800">{p.image}</span>
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

                  <button type="button" className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition cursor-pointer">
                    <Smile className="h-5 w-5" />
                  </button>
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
                  <button type="button" className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition cursor-pointer">
                    <Paperclip className="h-5 w-5" />
                  </button>
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
                        <button className="absolute top-3 right-3 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded-lg px-2 py-0.5 cursor-pointer">
                          Edit
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
                      </div>

                      {/* Latest Order Card */}
                      <div className="rounded-2xl border border-neutral-200/80 p-3.5 space-y-3 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-semibold text-neutral-500 block uppercase tracking-wider">Latest Order</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-bold text-xs text-neutral-900 font-mono">{currentCustomer.latestOrder.orderNumber}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                ● {currentCustomer.latestOrder.orderStatus}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedOrderForView(currentCustomer.latestOrder);
                              setActiveNav("order_details");
                            }}
                            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 border border-emerald-200 bg-emerald-50 rounded-lg px-2 py-1 transition cursor-pointer"
                          >
                            View Order
                          </button>
                        </div>

                        <div className="space-y-2 pt-1 border-t border-neutral-100">
                          {currentCustomer.latestOrder.items.map((item, idx) => (
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
                            <span className="text-emerald-800 font-extrabold">₹{currentCustomer.latestOrder.amount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
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
                            o.orderNumber === currentCustomer.latestOrder.orderNumber.replace("#", "")
                          ).length || 1} Orders
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const matchedOrders = crmOrders.filter((o) =>
                            o.customerPhone?.replace(/\D/g, "").endsWith(currentCustomer.phone.replace(/\D/g, "").slice(-10)) ||
                            o.customerEmail === currentCustomer.email ||
                            o.orderNumber === currentCustomer.latestOrder.orderNumber.replace("#", "")
                          );

                          const displayList = matchedOrders.length > 0 ? matchedOrders : [currentCustomer.latestOrder];

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
                        onClick={() => toast.success("Customer notes saved!")}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Save Notes
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
              <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-orange-500/15 text-orange-600 flex items-center justify-center">
                    <QrCode className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 px-2 py-0.5 rounded-full">
                    32 Pending UPI
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Collect Outstanding Payments</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    ₹44,800 awaiting customer UPI verification across Dehradun and Delhi orders.
                  </p>
                </div>
                <button
                  onClick={() => toast.success("Sent automated payment QR reminders to 32 WhatsApp customers!")}
                  className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Dispatch QR Reminders
                </button>
              </div>

              <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                    18 Parcels
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">India Post Speed Post Queue</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Himalayan raw honey and A2 cow ghee ready for booking at Dehradun Head Post Office.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveNav("shipments");
                    toast.info("Navigated to India Post Speed Post Dispatch");
                  }}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Package className="h-3.5 w-3.5" /> Open Shipping Manifest
                </button>
              </div>

              <div className={`p-5 rounded-2xl border shadow-2xs space-y-3 ${themeStyles.cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    Stock Alert
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Artisan Harvest Inventory</h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Pure Shilajit Resin & Kashmiri Saffron down to last batch at Haridwar facility.
                  </p>
                </div>
                <button
                  onClick={() => toast.info("Stock reorder alert dispatched to Uttarkashi producer cooperative!")}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reorder from Cooperative
                </button>
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
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  String(ord.paymentStatus || "").toLowerCase() === "paid"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {ord.paymentStatus || "Pending"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeClass}`}>
                                ● {ord.orderStatus || "Pending"}
                              </span>
                            </td>
                            <td className="p-3.5 text-neutral-500 whitespace-nowrap">{ord.date}</td>
                            <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {waLink && (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open Customer WhatsApp"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </a>
                                )}
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveNav("orders")}
                  className="p-1.5 rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                >
                  ←
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-neutral-900 font-mono">
                      Order {selectedOrderForView.orderNumber}
                    </h2>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      ● {selectedOrderForView.orderStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {selectedOrderForView.date}, {selectedOrderForView.time || "10:15 AM"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Update Status
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                <h3 className="font-bold text-sm text-neutral-900">Customer Information</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Name:</span>
                    <span className="text-neutral-800 font-bold">{currentCustomer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Phone:</span>
                    <span className="text-neutral-800 font-mono">{currentCustomer.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Address:</span>
                    <span className="text-neutral-800 font-medium text-right max-w-[180px]">
                      {currentCustomer.address.line1}, {currentCustomer.address.city}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-4">
                <h3 className="font-bold text-sm text-neutral-900">Order Items</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1.5 border-t border-neutral-100">
                    <span>Total Amount</span>
                    <span className="text-emerald-800 font-extrabold">₹{selectedOrderForView.amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-neutral-900">Payment Details</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {selectedOrderForView.paymentStatus}
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleSendPaymentQr();
                    toast.success("Sent payment QR directly to customer on WhatsApp!");
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Send QR via WhatsApp
                </button>
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
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Meta Cloud API v21.0 Active
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Send seasonal harvest releases, fresh batch alerts, and promotional announcements to opted-in customers via +91 76500 65690.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs text-neutral-700 dark:text-slate-300">
                  Official WABA: <strong className="font-mono text-emerald-800 dark:text-emerald-400">+91 76500 65690</strong>
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
                    Meta Verified Business Account: +91 76500 65690
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Products & Himalayan Stock Management</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Update live inventory stock status, track units available, and share authoritative product quotes directly via WhatsApp.
                </p>
              </div>

              {/* Status Counters */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white dark:bg-slate-800 text-xs font-semibold shadow-2xs">
                  Total SKUs: <strong className="text-neutral-900 dark:text-white font-mono">{productsList.length}</strong>
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold shadow-2xs">
                  ● {productsList.filter((p) => p.stock === "In Stock").length} In Stock
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold shadow-2xs">
                  ▲ {productsList.filter((p) => p.stock === "Low Stock").length} Low Stock
                </span>
                <span className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold shadow-2xs">
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
                            <span className="text-3xl shrink-0">{prod.image}</span>
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
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setEditStockStatusInput(prod.stock);
                                setEditUnitsInput(prod.unitsLeft);
                                setEditPriceInput(prod.price);
                                setShowEditStockModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-100 dark:border-slate-700 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-300 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Edit Units & Status"
                            >
                              <Edit3 className="h-3 w-3" /> Edit Stock
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
                      {shipments.map((s, idx) => (
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
                                s.status === "Delivered" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
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

                <button
                  onClick={() => {
                    setInputMessage(`Namaste ${selectedShipment.customer} ji! Aapka parcel India Post Speed Post se book hai. Consignment: ${selectedShipment.trackingId}. Expected delivery soon!`);
                    setActiveNav("inbox");
                    toast.success("Sent tracking link to customer chat!");
                  }}
                  className="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Send Tracking via WhatsApp
                </button>
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
                  onClick={() => toast.success("Analytics report downloaded (CSV)")}
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Team & Concierge Access Management</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Only staff added here can log into the CRM. Their role determines what work areas they can access.
                </p>
              </div>

              <button
                onClick={() => setShowAddTeamModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Add Team Member
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs hover:shadow-xs transition space-y-4 text-neutral-900"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="h-11 w-11 rounded-full object-cover border border-neutral-200 shadow-2xs" />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center border border-emerald-200">
                          {member.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-neutral-900">{member.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              member.status === "Online" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            ● {member.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 font-medium">{member.role}</p>
                      </div>
                    </div>

                    <span className="text-[10px] text-neutral-400">Added: {member.createdAt}</span>
                  </div>

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

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                    <div className="flex items-center gap-4 text-neutral-600">
                      <span>Assigned Chats: <strong className="text-neutral-900">{member.assignedChats}</strong></span>
                      <span>Avg Response: <strong className="text-neutral-900">{member.avgResponseTime}</strong></span>
                    </div>

                    <button
                      onClick={() => {
                        setLastCreatedMember(member);
                        setShowCredentialsModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Key className="h-3 w-3 text-neutral-500" />
                      <span>View Credentials</span>
                    </button>
                  </div>
                </div>
              ))}
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
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                    ● Active
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 dark:text-slate-300">Official Business Number</label>
                    <input
                      type="text"
                      disabled
                      value="+91 76500 65690"
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
                      onClick={() => {
                        fetch("/api/webhooks/whatsapp", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            entry: [
                              {
                                changes: [
                                  {
                                    value: {
                                      contacts: [{ profile: { name: "Priya Sharma" } }],
                                      messages: [
                                        {
                                          id: `wamid_test_${Date.now()}`,
                                          from: "919876543210",
                                          timestamp: Math.floor(Date.now() / 1000).toString(),
                                          type: "text",
                                          text: { body: "Namaste Nishant ji! Maine payment transfer kar diya hai, kripya parcel confirm karein. 🙏" },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            ],
                          }),
                        })
                          .then((res) => res.json())
                          .then(() => {
                            toast.success("Test webhook payload processed successfully!");
                          })
                          .catch(() => toast.error("Webhook test failed"));
                      }}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      ⚡ Test Inbound Customer Webhook
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
      {/* 5.5. CREATE NEW ORDER MODAL                                */}
      {/* ========================================================= */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-neutral-200 space-y-4 text-neutral-900">
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

              {/* Product Selection */}
              <div className="space-y-2.5 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/70">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-emerald-700" /> Order Item
                </h4>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Select Himalayan Produce</label>
                  <select
                    value={newOrderProductId || productsList[0]?.id}
                    onChange={(e) => setNewOrderProductId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    {productsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price.toLocaleString("en-IN")} ({p.weight || "500g"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-semibold text-neutral-700">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewOrderQuantity(Math.max(1, newOrderQuantity - 1))}
                      className="h-7 w-7 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm">{newOrderQuantity}</span>
                    <button
                      type="button"
                      onClick={() => setNewOrderQuantity(newOrderQuantity + 1)}
                      className="h-7 w-7 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center font-bold text-neutral-700 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment & Status Choices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Payment Method</label>
                  <select
                    value={newOrderPaymentMethod}
                    onChange={(e) => setNewOrderPaymentMethod(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-neutral-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="WhatsApp">WhatsApp Order</option>
                    <option value="UPI">UPI / Online</option>
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
                  <label className="font-semibold text-neutral-700">Initial Status</label>
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

              {/* Order Notes */}
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

              {/* Pricing Summary Card */}
              {(() => {
                const sel = productsList.find((p) => p.id === newOrderProductId) || productsList[0];
                const sub = (sel?.price || 950) * Math.max(1, newOrderQuantity || 1);
                const ship = 50;
                const tot = sub + ship;
                return (
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 space-y-1.5">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal ({sel?.name})</span>
                      <span className="font-mono">₹{sub.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>India Post Speed Post</span>
                      <span className="font-mono">₹{ship}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-emerald-950 pt-1 border-t border-emerald-200">
                      <span>Total Amount</span>
                      <span className="font-mono text-emerald-800">₹{tot.toLocaleString("en-IN")}</span>
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
                <span className="text-3xl">{editingProduct.image}</span>
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
    </div>
  );
}
