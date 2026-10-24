export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  sender: "customer" | "agent" | "system";
  text: string;
  timestamp: string;
  createdAt?: string;
  status: "sent" | "delivered" | "read" | "failed";
  mediaUrl?: string;
  mediaType?: "image" | "document" | "audio";
  templateName?: string;
}

export interface WhatsAppConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  avatar?: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
  assignedAgent?: string;
  status: "active" | "resolved" | "pending_payment" | "packed" | "dispatched";
  orderId?: string;
  orderNumber?: string;
  orderTotalPaise?: number;
  orderStatus?: string;
  orderPaymentStatus?: string;
  orderItemsSummary?: string;
  shippingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  consignmentNumber?: string;
  carrier?: string;
  tags: string[];
}

export interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerState: string;
  pincode: string;
  totalAmountPaise: number;
  items: Array<{
    name: string;
    weight?: string;
    quantity: number;
    pricePaise: number;
    image?: string;
  }>;
  stage: "awaiting_payment" | "payment_confirmed" | "packing" | "ready_for_dispatch" | "shipped_india_post" | "delivered";
  paymentMethod: "whatsapp" | "cod" | "razorpay" | "cashfree";
  paymentStatus: "pending" | "collected" | "refunded";
  placedAt: string;
  packingStartedAt?: string;
  processingDay: number; // 1, 2, or 3
  consignmentNumber?: string;
  carrier: "India Post Speed Post" | "India Post Registered" | "Delhivery";
  notes?: string;
}

export interface BroadcastCampaign {
  id: string;
  name: string;
  templateName: string;
  audienceSegment: "all_customers" | "repeat_buyers" | "high_value" | "dry_fruits_buyers" | "opted_in";
  audienceCount: number;
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";
  scheduledFor?: string;
  sentAt?: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  previewMessage: string;
  tags: string[];
}

export interface IndiaPostConsignment {
  consignmentNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  destinationPincode: string;
  serviceType: "Speed Post" | "Registered Parcel";
  bookingDate: string;
  currentStatus: "Booked" | "In Transit" | "Arrived at Hub" | "Out for Delivery" | "Delivered";
  lastLocation: string;
  lastUpdated: string;
  weightGrams: number;
  whatsappNotified: boolean;
  timeline: Array<{
    date: string;
    status: string;
    location: string;
  }>;
}

// Default Prajnaa WhatsApp Business Context
export const PRAJNAA_WHATSAPP_CONFIG = {
  businessNumber: "+91 80912 65690",
  businessNumberClean: "918091265690",
  businessName: "Prajnaa Market",
  tagline: "Pure Himalayan Produce • Direct from Mountain Farmers",
  upiId: "8091265690@okbizaxis",
  bankDetails: {
    accountName: "Prajnaa Farm Produce Pvt Ltd",
    accountNumber: "91809126569001",
    bankName: "HDFC Bank",
    ifsc: "HDFC0001824",
    branch: "Shimla Mall Road",
  },
  processingDaysMin: 2,
  processingDaysMax: 3,
};

// Seed Conversations with authentic Prajnaa orders & customers
const INITIAL_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: "conv_rajat",
    customerName: "Rajat Katnoria",
    customerPhone: "+91 70184 90629",
    customerEmail: "rajat@prajnaa.in",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces",
    lastMessageText: "Hi",
    lastMessageTime: "Just now",
    unreadCount: 1,
    assignedAgent: "Store Concierge Nishant",
    status: "active",
    orderId: "ord_rajat_1",
    orderNumber: "PM-9021",
    orderTotalPaise: 84400,
    orderStatus: "processing",
    orderPaymentStatus: "paid",
    orderItemsSummary: "Kashmiri Walnuts (500g) × 1, Lakadong Turmeric (250g) × 1",
    shippingAddress: {
      line1: "Tehri Garhwal",
      city: "Tehri",
      state: "Uttarakhand",
      postalCode: "249001",
    },
    consignmentNumber: "ET765006569IN",
    carrier: "India Post Speed Post",
    tags: ["WhatsApp Live Customer", "High Priority"],
  },
  {
    id: "conv_1",
    customerName: "Aarav Sharma",
    customerPhone: "+91 98112 34567",
    customerEmail: "aarav.sharma@example.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    lastMessageText: "Namaste ji, I have made the UPI payment of ₹2,248. Please find the screenshot attached.",
    lastMessageTime: "10:42 AM",
    unreadCount: 1,
    assignedAgent: "Tanuj (Operations)",
    status: "pending_payment",
    orderId: "ord_1001",
    orderNumber: "ORD-2026-1001",
    orderTotalPaise: 224800,
    orderStatus: "pending",
    orderPaymentStatus: "pending",
    orderItemsSummary: "Himalayan Dried Apricots (500g) × 2, Pahadi Bilona Cow Ghee (1L) × 1",
    shippingAddress: {
      line1: "Flat 402, Green Glen Layout, Bellandur",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560103",
    },
    consignmentNumber: "ED839102914IN",
    carrier: "India Post Speed Post",
    tags: ["New Order", "Direct UPI", "High Priority"],
  },
  {
    id: "conv_2",
    customerName: "Pooja Verma",
    customerPhone: "+91 98201 89765",
    customerEmail: "pooja.verma@example.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces",
    lastMessageText: "Can you confirm if my parcel has been dispatched from Shimla?",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
    assignedAgent: "Nishant (Fulfillment)",
    status: "packed",
    orderId: "ord_1002",
    orderNumber: "ORD-2026-0994",
    orderTotalPaise: 185000,
    orderStatus: "packed",
    orderPaymentStatus: "collected",
    orderItemsSummary: "Kashmiri Mamra Almonds (250g) × 2, Organic Lakadong Turmeric (500g) × 1",
    shippingAddress: {
      line1: "B-12, Sector 14",
      city: "Gurugram",
      state: "Haryana",
      postalCode: "122001",
    },
    consignmentNumber: "ED772910482IN",
    carrier: "India Post Speed Post",
    tags: ["Repeat Buyer", "Paid", "Packing Day 2"],
  },
  {
    id: "conv_3",
    customerName: "Dr. Vikram Malhotra",
    customerPhone: "+91 97422 11984",
    customerEmail: "dr.vikram@example.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    lastMessageText: "Thank you for the prompt delivery! The Shilajit quality is extraordinary.",
    lastMessageTime: "14 Oct",
    unreadCount: 0,
    assignedAgent: "Tanuj (Operations)",
    status: "resolved",
    orderId: "ord_1003",
    orderNumber: "ORD-2026-0982",
    orderTotalPaise: 349900,
    orderStatus: "delivered",
    orderPaymentStatus: "collected",
    orderItemsSummary: "High-Altitude Pure Himalayan Shilajit Resin (20g) × 1",
    shippingAddress: {
      line1: "Villa 8, Adarsh Palm Meadows, Whitefield",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560066",
    },
    consignmentNumber: "ED661028391IN",
    carrier: "India Post Speed Post",
    tags: ["VIP", "Delivered", "Verified Reviewer"],
  },
  {
    id: "conv_4",
    customerName: "Sunaina Singhania",
    customerPhone: "+91 99100 44321",
    customerEmail: "sunaina.singhania@example.com",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces",
    lastMessageText: "Namaste, how many days does delivery take to South Mumbai?",
    lastMessageTime: "12 Oct",
    unreadCount: 0,
    assignedAgent: "Tanuj (Operations)",
    status: "active",
    tags: ["Inquiry", "Pre-Order"],
  },
];

const INITIAL_MESSAGES: Record<string, WhatsAppMessage[]> = {
  conv_1: [
    {
      id: "msg_1_1",
      conversationId: "conv_1",
      sender: "system",
      text: "🌾 *New Prajnaa Market Order Placed: #ORD-2026-1001*\nTotal: ₹2,248 (WhatsApp Order & Direct Payment)\nItems: Himalayan Dried Apricots (500g) × 2, Pahadi Bilona Cow Ghee (1L) × 1",
      timestamp: "10:30 AM",
      status: "delivered",
    },
    {
      id: "msg_1_2",
      conversationId: "conv_1",
      sender: "agent",
      text: "Namaste Aarav ji! 🙏 Thank you for choosing Prajnaa Market. We have received your order details.\n\nAap ₹2,248 hamare official UPI ID `prajnaa@upi` par transfer kar sakte hain. Payment transfer hone ke baad kripya screenshot share kar dijiye taki hum packaging initiate kar sakein. Dhanyavaad! 🌿",
      timestamp: "10:32 AM",
      status: "read",
    },
    {
      id: "msg_1_3",
      conversationId: "conv_1",
      sender: "customer",
      text: "Namaste ji, I have made the UPI payment of ₹2,248. Please find the screenshot attached.",
      timestamp: "10:42 AM",
      status: "read",
    },
  ],
  conv_2: [
    {
      id: "msg_2_1",
      conversationId: "conv_2",
      sender: "agent",
      text: "Namaste Pooja ji! 🙏 Aapka payment receive ho gaya hai. Prajnaa Market mein order processing mein 2–3 working days lagte hain taaki hum high-altitude fresh stock inspect karke pack kar sakein. Packaging start ho gayi hai!",
      timestamp: "Yesterday, 3:15 PM",
      status: "read",
    },
    {
      id: "msg_2_2",
      conversationId: "conv_2",
      sender: "customer",
      text: "Can you confirm if my parcel has been dispatched from Shimla?",
      timestamp: "Yesterday, 5:40 PM",
      status: "read",
    },
  ],
  conv_3: [
    {
      id: "msg_3_1",
      conversationId: "conv_3",
      sender: "system",
      text: "📦 Speed Post Consignment ED661028391IN marked as DELIVERED by India Post Bengaluru NSH.",
      timestamp: "14 Oct, 2:10 PM",
      status: "delivered",
    },
    {
      id: "msg_3_2",
      conversationId: "conv_3",
      sender: "customer",
      text: "Thank you for the prompt delivery! The Shilajit quality is extraordinary.",
      timestamp: "14 Oct, 4:22 PM",
      status: "read",
    },
    {
      id: "msg_3_3",
      conversationId: "conv_3",
      sender: "agent",
      text: "Dhanyavaad Vikram ji! 🙏 Aapka feedback hamare Kinnaur farmer partners ke liye bahut maayine rakhta hai. Agle harvest mein aapko special priority access milega.",
      timestamp: "14 Oct, 4:45 PM",
      status: "read",
    },
  ],
};

const INITIAL_FULFILLMENT_ORDERS: FulfillmentOrder[] = [
  {
    id: "ord_1001",
    orderNumber: "ORD-2026-1001",
    customerName: "Aarav Sharma",
    customerPhone: "+91 98112 34567",
    customerCity: "Bengaluru",
    customerState: "Karnataka",
    pincode: "560103",
    totalAmountPaise: 224800,
    items: [
      { name: "Himalayan Dried Apricots", weight: "500 gm", quantity: 2, pricePaise: 99900, image: "/assets/cat-dryfruits.jpg" },
      { name: "Pahadi Bilona Cow Ghee", weight: "1 L", quantity: 1, pricePaise: 125000, image: "/assets/prod-turmeric.jpg" },
    ],
    stage: "awaiting_payment",
    paymentMethod: "whatsapp",
    paymentStatus: "pending",
    placedAt: "Today, 10:30 AM",
    processingDay: 1,
    carrier: "India Post Speed Post",
    notes: "Customer shared UPI screenshot; awaiting finance check.",
  },
  {
    id: "ord_1002",
    orderNumber: "ORD-2026-0994",
    customerName: "Pooja Verma",
    customerPhone: "+91 98201 89765",
    customerCity: "Gurugram",
    customerState: "Haryana",
    pincode: "122001",
    totalAmountPaise: 185000,
    items: [
      { name: "Kashmiri Mamra Almonds", weight: "250 gm", quantity: 2, pricePaise: 65000, image: "/assets/prod-almonds.jpg" },
      { name: "Organic Lakadong Turmeric", weight: "500 gm", quantity: 1, pricePaise: 55000, image: "/assets/prod-turmeric.jpg" },
    ],
    stage: "packing",
    paymentMethod: "whatsapp",
    paymentStatus: "collected",
    placedAt: "15 Oct 2026",
    packingStartedAt: "16 Oct 2026",
    processingDay: 2,
    consignmentNumber: "ED772910482IN",
    carrier: "India Post Speed Post",
    notes: "Day 2 of 3: Double-bubble wrap packed for dry fruits glass jar.",
  },
  {
    id: "ord_1004",
    orderNumber: "ORD-2026-0990",
    customerName: "Rajinder Mehra",
    customerPhone: "+91 98721 34900",
    customerCity: "Chandigarh",
    customerState: "Punjab",
    pincode: "160017",
    totalAmountPaise: 145000,
    items: [
      { name: "Mountain Multi-Flora Honey", weight: "500 gm", quantity: 2, pricePaise: 72500, image: "/assets/cat-honey.jpg" },
    ],
    stage: "ready_for_dispatch",
    paymentMethod: "cod",
    paymentStatus: "pending",
    placedAt: "14 Oct 2026",
    packingStartedAt: "15 Oct 2026",
    processingDay: 3,
    consignmentNumber: "ED991823101IN",
    carrier: "India Post Speed Post",
    notes: "Quality inspection cleared. Manifest ready for India Post courier pickup.",
  },
  {
    id: "ord_1005",
    orderNumber: "ORD-2026-0985",
    customerName: "Kavita Nair",
    customerPhone: "+91 94471 22889",
    customerCity: "Kochi",
    customerState: "Kerala",
    pincode: "682001",
    totalAmountPaise: 420000,
    items: [
      { name: "Kashmiri Kesar Mongra Saffron", weight: "1 gm", quantity: 4, pricePaise: 105000, image: "/assets/prod-masala.jpg" },
    ],
    stage: "shipped_india_post",
    paymentMethod: "whatsapp",
    paymentStatus: "collected",
    placedAt: "12 Oct 2026",
    processingDay: 3,
    consignmentNumber: "ED448102919IN",
    carrier: "India Post Speed Post",
    notes: "Dispatched from Shimla RMS. In transit to Kochi.",
  },
];

const INITIAL_CAMPAIGNS: BroadcastCampaign[] = [
  {
    id: "camp_1",
    name: "2026 Himalayan Apricot Harvest Priority Access",
    templateName: "prajnaa_harvest_announcement_v1",
    audienceSegment: "all_customers",
    audienceCount: 1420,
    status: "completed",
    sentAt: "12 Oct 2026, 11:00 AM",
    sentCount: 1420,
    deliveredCount: 1398,
    readCount: 1142,
    failedCount: 22,
    previewMessage: "Namaste {{1}} ji! 🙏 This year's Himalayan Apricots from Sham Valley, Ladakh are finally harvested and ready for pre-order. Click to view harvest details.",
    tags: ["Harvest 2026", "Pre-Order"],
  },
  {
    id: "camp_2",
    name: "Bilona Cow Ghee Fresh Wooden-Churn Batch",
    templateName: "prajnaa_restock_alert",
    audienceSegment: "repeat_buyers",
    audienceCount: 384,
    status: "scheduled",
    scheduledFor: "Tomorrow, 10:00 AM",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    previewMessage: "Namaste {{1}} ji! Fresh slow-churned A2 Bilona Cow Ghee batch is packaged and dispatches start this week. Exclusive priority for our valued members.",
    tags: ["Dairy", "Repeat Customers"],
  },
  {
    id: "camp_3",
    name: "Kashmiri Kesar Festival Gift Box",
    templateName: "prajnaa_festive_offer",
    audienceSegment: "high_value",
    audienceCount: 215,
    status: "draft",
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    previewMessage: "Namaste {{1}} ji! Premium Grade-1 Pampore Mongra Saffron wooden gift boxes are now live with complimentary shipping across India.",
    tags: ["Saffron", "Festive"],
  },
];

const INITIAL_CONSIGNMENTS: IndiaPostConsignment[] = [
  {
    consignmentNumber: "ED839102914IN",
    orderNumber: "ORD-2026-1001",
    customerName: "Aarav Sharma",
    customerPhone: "+91 98112 34567",
    destinationPincode: "560103",
    serviceType: "Speed Post",
    bookingDate: "17 Oct 2026",
    currentStatus: "Booked",
    lastLocation: "Shimla RMS (171001)",
    lastUpdated: "Today, 11:15 AM",
    weightGrams: 1540,
    whatsappNotified: true,
    timeline: [
      { date: "17 Oct, 11:15 AM", status: "Item Booked", location: "Shimla RMS" },
    ],
  },
  {
    consignmentNumber: "ED772910482IN",
    orderNumber: "ORD-2026-0994",
    customerName: "Pooja Verma",
    customerPhone: "+91 98201 89765",
    destinationPincode: "122001",
    serviceType: "Speed Post",
    bookingDate: "16 Oct 2026",
    currentStatus: "In Transit",
    lastLocation: "Delhi NSH (110001)",
    lastUpdated: "Today, 06:30 AM",
    weightGrams: 850,
    whatsappNotified: true,
    timeline: [
      { date: "16 Oct, 04:00 PM", status: "Item Booked", location: "Shimla RMS" },
      { date: "16 Oct, 10:20 PM", status: "Item Dispatched", location: "Chandigarh TMO" },
      { date: "17 Oct, 06:30 AM", status: "Item Received", location: "Delhi NSH" },
    ],
  },
  {
    consignmentNumber: "ED448102919IN",
    orderNumber: "ORD-2026-0985",
    customerName: "Kavita Nair",
    customerPhone: "+91 94471 22889",
    destinationPincode: "682001",
    serviceType: "Speed Post",
    bookingDate: "13 Oct 2026",
    currentStatus: "Out for Delivery",
    lastLocation: "Kochi Delivery Office (682001)",
    lastUpdated: "Today, 09:10 AM",
    weightGrams: 320,
    whatsappNotified: true,
    timeline: [
      { date: "13 Oct, 03:00 PM", status: "Item Booked", location: "Shimla RMS" },
      { date: "14 Oct, 08:30 PM", status: "Item Dispatched", location: "Delhi NSH" },
      { date: "16 Oct, 02:40 PM", status: "Item Received", location: "Kochi NSH" },
      { date: "17 Oct, 09:10 AM", status: "Out for Delivery", location: "Kochi Delivery Office" },
    ],
  },
];


export interface AutomationRule {
  id: string;
  name: string;
  trigger: "order_placed" | "payment_received" | "packing_started" | "parcel_dispatched" | "parcel_delivered";
  condition: string;
  action: string;
  messageTemplate: string;
  enabled: boolean;
  executionsCount: number;
}

export interface CustomerContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  totalOrders: number;
  totalSpendPaise: number;
  tags: string[];
  lastOrderDate: string;
  optInStatus: boolean;
}

const INITIAL_AUTOMATIONS: AutomationRule[] = [
  {
    id: "auto_1",
    name: "Instant Order Placed & Payment QR Auto-Reply",
    trigger: "order_placed",
    condition: "Payment method is 'whatsapp'",
    action: "Send Prajnaa UPI QR & Bank transfer instructions",
    messageTemplate: "Namaste {{customer_name}} ji! 🙏 We have received your order #{{order_number}} for ₹{{amount}}. Transfer via UPI to prajnaa@upi and reply with screenshot.",
    enabled: true,
    executionsCount: 248,
  },
  {
    id: "auto_2",
    name: "Payment Confirmed & Packaging Queue Alert",
    trigger: "payment_received",
    condition: "Payment status changes to 'collected'",
    action: "Send confirmation & explain 2–3 days packaging standard",
    messageTemplate: "Namaste {{customer_name}} ji! Payment of ₹{{amount}} received. Fresh mountain produce is being inspected. Packaging takes 2–3 working days.",
    enabled: true,
    executionsCount: 214,
  },
  {
    id: "auto_3",
    name: "Day 2 Quality Check & Sealing Update",
    trigger: "packing_started",
    condition: "Order in packing for >24 hours",
    action: "Send reassurance on artisan packaging",
    messageTemplate: "Namaste {{customer_name}} ji! Order #{{order_number}} packaging is on Day 2: Quality testing & eco-corrugated packing cleared.",
    enabled: true,
    executionsCount: 182,
  },
  {
    id: "auto_4",
    name: "India Post Speed Post Dispatch Notification",
    trigger: "parcel_dispatched",
    condition: "Consignment ID (ED...IN) assigned",
    action: "Send official Speed Post tracking number and India Post portal link",
    messageTemplate: "Namaste {{customer_name}} ji! 📦 Parcel dispatched! Speed Post ID: {{consignment_id}}. Track at indiapost.gov.in.",
    enabled: true,
    executionsCount: 169,
  },
  {
    id: "auto_5",
    name: "Delivery Confirmation & Himalayan Review Request",
    trigger: "parcel_delivered",
    condition: "Speed Post status is 'Delivered'",
    action: "Send thank you message and review invitation",
    messageTemplate: "Namaste {{customer_name}} ji! 🙏 Parcel delivery confirmed. We hope you cherish our pure Himalayan harvest. Reply with your thoughts!",
    enabled: true,
    executionsCount: 154,
  },
];

const INITIAL_CUSTOMERS: CustomerContact[] = [
  {
    id: "cust_1",
    name: "Aarav Sharma",
    phone: "+91 98112 34567",
    email: "aarav.sharma@example.com",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    totalOrders: 3,
    totalSpendPaise: 684000,
    tags: ["Dry Fruits Lover", "Direct UPI", "Repeat Customer"],
    lastOrderDate: "Today",
    optInStatus: true,
  },
  {
    id: "cust_2",
    name: "Pooja Verma",
    phone: "+91 98201 89765",
    email: "pooja.verma@example.com",
    city: "Gurugram",
    state: "Haryana",
    pincode: "122001",
    totalOrders: 4,
    totalSpendPaise: 820000,
    tags: ["A2 Ghee Subscriber", "VIP"],
    lastOrderDate: "15 Oct 2026",
    optInStatus: true,
  },
  {
    id: "cust_3",
    name: "Dr. Vikram Malhotra",
    phone: "+91 97422 11984",
    email: "dr.vikram@example.com",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560066",
    totalOrders: 5,
    totalSpendPaise: 1450000,
    tags: ["Shilajit Connoisseur", "Verified Reviewer", "VIP"],
    lastOrderDate: "14 Oct 2026",
    optInStatus: true,
  },
  {
    id: "cust_4",
    name: "Sunaina Singhania",
    phone: "+91 99100 44321",
    email: "sunaina.singhania@example.com",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400006",
    totalOrders: 1,
    totalSpendPaise: 299900,
    tags: ["Saffron Buyer", "New"],
    lastOrderDate: "12 Oct 2026",
    optInStatus: true,
  },
  {
    id: "cust_5",
    name: "Rajinder Mehra",
    phone: "+91 98721 34900",
    email: "rajinder.mehra@example.com",
    city: "Chandigarh",
    state: "Punjab",
    pincode: "160017",
    totalOrders: 2,
    totalSpendPaise: 310000,
    tags: ["Honey Buyer"],
    lastOrderDate: "14 Oct 2026",
    optInStatus: false,
  },
];

// In-Memory & LocalStorage Service
class WhatsAppCrmService {
  private getStorageKey(key: string) {
    return `prajnaa_wa_crm_${key}`;
  }

  // 1. Conversations
  getConversations(): WhatsAppConversation[] {
    if (typeof window === "undefined") return INITIAL_CONVERSATIONS;
    try {
      const data = localStorage.getItem(this.getStorageKey("conversations"));
      return data ? JSON.parse(data) : INITIAL_CONVERSATIONS;
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  }

  saveConversations(conversations: WhatsAppConversation[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.getStorageKey("conversations"), JSON.stringify(conversations));
  }

  // 2. Messages
  getMessages(conversationId: string): WhatsAppMessage[] {
    if (typeof window === "undefined") return INITIAL_MESSAGES[conversationId] || [];
    try {
      const all = localStorage.getItem(this.getStorageKey(`messages_${conversationId}`));
      const rawList: WhatsAppMessage[] = all ? JSON.parse(all) : INITIAL_MESSAGES[conversationId] || [];
      const seenIds = new Set<string>();
      const seenSigs = new Set<string>();
      const cleanList: WhatsAppMessage[] = [];
      for (const m of rawList) {
        if (!m || !m.text) continue;
        if (m.id && seenIds.has(m.id)) continue;
        const sig = `${m.sender}_${m.text.trim()}`;
        if (seenSigs.has(sig) && !m.id?.startsWith("wamid.")) continue;
        if (m.id) seenIds.add(m.id);
        seenSigs.add(sig);
        cleanList.push(m);
      }
      return cleanList;
    } catch {
      return INITIAL_MESSAGES[conversationId] || [];
    }
  }

  async sendMessage(conversationId: string, text: string, sender: "agent" | "customer" = "agent"): Promise<WhatsAppMessage> {
    const messages = this.getMessages(conversationId);
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Deduplication guard: ignore rapid double submission within 2.5 seconds
    const recentDuplicate = messages.find(
      (m) =>
        m.sender === sender &&
        m.text.trim() === text.trim() &&
        m.createdAt &&
        Math.abs(now.getTime() - new Date(m.createdAt).getTime()) < 2500
    );
    if (recentDuplicate) {
      return recentDuplicate;
    }

    const newMsg: WhatsAppMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      sender,
      text,
      timestamp: timeString,
      createdAt: now.toISOString(),
      status: "sent",
    };

    messages.push(newMsg);
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey(`messages_${conversationId}`), JSON.stringify(messages));
    }

    // Update conversation last message
    const conversations = this.getConversations();
    const targetIdx = conversations.findIndex((c) => c.id === conversationId);
    let targetPhone = "";
    let customerName = "";
    let orderNumber = "";
    if (targetIdx !== -1) {
      conversations[targetIdx].lastMessageText = text;
      conversations[targetIdx].lastMessageTime = timeString;
      targetPhone = conversations[targetIdx].customerPhone || "";
      customerName = conversations[targetIdx].customerName || "";
      orderNumber = conversations[targetIdx].orderNumber || "";
      if (sender === "agent") {
        conversations[targetIdx].unreadCount = 0;
      } else {
        conversations[targetIdx].unreadCount = (conversations[targetIdx].unreadCount || 0) + 1;
      }
      this.saveConversations(conversations);
    }

    // Real API call to Meta Cloud API via CRM Backend
    if (sender === "agent" && targetPhone && typeof window !== "undefined") {
      try {
        const res = await fetch("/api/crm/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: targetPhone,
            text,
            customerName,
            orderNumber,
            sender: "business",
          }),
        });
        const data = await res.json();
        if (data.success) {
          newMsg.id = data.result?.messageId || newMsg.id;
          if (data.result?.success) {
            newMsg.status = "delivered";
            (newMsg as any).metaStatus = "delivered";
          } else {
            // Meta status is pending verification: message is successfully recorded in CRM pipeline
            newMsg.status = "sent";
            (newMsg as any).metaStatus = "pending";
            (newMsg as any).whatsappUrl = data.result?.whatsappUrl;
            (newMsg as any).metaPending = true;
          }
        } else {
          newMsg.status = "failed";
          (newMsg as any).error = data.error || "Failed to record message";
        }
      } catch (err: any) {
        newMsg.status = "failed";
        (newMsg as any).error = err.message || "Network error";
      }

      // Update persisted message status in localStorage
      localStorage.setItem(this.getStorageKey(`messages_${conversationId}`), JSON.stringify(messages));
    }

    return newMsg;
  }

  async syncLiveMessages(): Promise<{ newMessagesCount: number }> {
    if (typeof window === "undefined") return { newMessagesCount: 0 };
    try {
      const res = await fetch("/api/crm/messages");
      if (!res.ok) return { newMessagesCount: 0 };
      const data = await res.json();
      if (!data.success || !Array.isArray(data.messages)) return { newMessagesCount: 0 };

      let updatedCount = 0;
      const conversations = this.getConversations();

      for (const msg of data.messages) {
        const isInbound = msg.direction === "inbound" || msg.sender === "customer";
        const customerRawPhone = isInbound ? msg.from : msg.to;
        const cleanMsgPhone = (customerRawPhone || "").replace(/\D/g, "").slice(-10);
        const businessPhoneClean = PRAJNAA_WHATSAPP_CONFIG.businessNumberClean.slice(-10);
        if (!cleanMsgPhone || cleanMsgPhone === businessPhoneClean) continue;

        let conv = conversations.find((c) => c.customerPhone.replace(/\D/g, "").slice(-10) === cleanMsgPhone);
        const timeStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (!conv) {
          const newConvId = `conv_${cleanMsgPhone}`;
          conv = {
            id: newConvId,
            customerName: msg.customerName || `Customer (+91 ${cleanMsgPhone})`,
            customerPhone: `+91 ${cleanMsgPhone}`,
            lastMessageText: msg.text || "",
            lastMessageTime: timeStr,
            unreadCount: isInbound ? 1 : 0,
            status: "active",
            tags: ["WhatsApp Live Customer"],
          };
          conversations.unshift(conv);
          this.saveConversations(conversations);
        } else {
          conv.lastMessageText = msg.text || conv.lastMessageText;
          conv.lastMessageTime = timeStr;
          this.saveConversations(conversations);
        }

        const convMessages = this.getMessages(conv.id);
        const exists = convMessages.some(
          (m) =>
            m.id === msg.id ||
            (((m.sender === "agent" && (msg.sender === "business" || msg.direction === "outbound")) ||
              (m.sender === "customer" && (msg.sender === "customer" || msg.direction === "inbound"))) &&
              m.text.trim() === (msg.text || "").trim())
        );

        if (!exists) {
          convMessages.push({
            id: msg.id || `msg_${Date.now()}`,
            conversationId: conv.id,
            sender: isInbound ? "customer" : "agent",
            text: msg.text || "",
            timestamp: timeStr,
            status: msg.status || "delivered",
          });
          localStorage.setItem(this.getStorageKey(`messages_${conv.id}`), JSON.stringify(convMessages));
          updatedCount++;
        }
      }

      return { newMessagesCount: updatedCount };
    } catch {
      return { newMessagesCount: 0 };
    }
  }

  // 3. Fulfillment Pipeline
  getFulfillmentOrders(): FulfillmentOrder[] {
    if (typeof window === "undefined") return INITIAL_FULFILLMENT_ORDERS;
    try {
      const data = localStorage.getItem(this.getStorageKey("fulfillment_orders"));
      return data ? JSON.parse(data) : INITIAL_FULFILLMENT_ORDERS;
    } catch {
      return INITIAL_FULFILLMENT_ORDERS;
    }
  }

  updateOrderStatus(orderId: string, stage: FulfillmentOrder["stage"], notes?: string): boolean {
    const orders = this.getFulfillmentOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    order.stage = stage;
    if (notes) order.notes = notes;
    if (stage === "payment_confirmed") {
      order.paymentStatus = "collected";
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("fulfillment_orders"), JSON.stringify(orders));
    }
    return true;
  }

  // 4. Broadcast Campaigns
  getCampaigns(): BroadcastCampaign[] {
    if (typeof window === "undefined") return INITIAL_CAMPAIGNS;
    try {
      const data = localStorage.getItem(this.getStorageKey("campaigns"));
      return data ? JSON.parse(data) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  }

  createCampaign(campaign: Omit<BroadcastCampaign, "id" | "sentCount" | "deliveredCount" | "readCount" | "failedCount">): BroadcastCampaign {
    const campaigns = this.getCampaigns();
    const newCamp: BroadcastCampaign = {
      ...campaign,
      id: `camp_${Date.now()}`,
      sentCount: campaign.status === "sending" || campaign.status === "completed" ? campaign.audienceCount : 0,
      deliveredCount: campaign.status === "completed" ? Math.floor(campaign.audienceCount * 0.98) : 0,
      readCount: campaign.status === "completed" ? Math.floor(campaign.audienceCount * 0.82) : 0,
      failedCount: campaign.status === "completed" ? Math.floor(campaign.audienceCount * 0.02) : 0,
    };
    campaigns.unshift(newCamp);
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("campaigns"), JSON.stringify(campaigns));
    }
    return newCamp;
  }

  // 5. Consignments
  getConsignments(): IndiaPostConsignment[] {
    if (typeof window === "undefined") return INITIAL_CONSIGNMENTS;
    try {
      const data = localStorage.getItem(this.getStorageKey("consignments"));
      return data ? JSON.parse(data) : INITIAL_CONSIGNMENTS;
    } catch {
      return INITIAL_CONSIGNMENTS;
    }
  }

  addConsignment(consignment: IndiaPostConsignment) {
    const consignments = this.getConsignments();
    consignments.unshift(consignment);
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("consignments"), JSON.stringify(consignments));
    }
  }

  // 6. Automations
  getAutomations(): AutomationRule[] {
    if (typeof window === "undefined") return INITIAL_AUTOMATIONS;
    try {
      const data = localStorage.getItem(this.getStorageKey("automations"));
      return data ? JSON.parse(data) : INITIAL_AUTOMATIONS;
    } catch {
      return INITIAL_AUTOMATIONS;
    }
  }

  toggleAutomation(id: string): boolean {
    const autos = this.getAutomations();
    const target = autos.find((a) => a.id === id);
    if (!target) return false;
    target.enabled = !target.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem(this.getStorageKey("automations"), JSON.stringify(autos));
    }
    return target.enabled;
  }

  // 7. Customers
  getCustomers(): CustomerContact[] {
    if (typeof window === "undefined") return INITIAL_CUSTOMERS;
    try {
      const data = localStorage.getItem(this.getStorageKey("customers"));
      return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  }

  // Generate UPI QR link for Prajnaa Market
  generateUpiIntent(orderNumber: string, amountInr: number): string {
    const cleanPaise = Math.round(amountInr * 100);
    const amountStr = (cleanPaise / 100).toFixed(2);
    const payeeName = encodeURIComponent("Prajnaa Market");
    const note = encodeURIComponent(`Order ${orderNumber}`);
    return `upi://pay?pa=${PRAJNAA_WHATSAPP_CONFIG.upiId}&pn=${payeeName}&am=${amountStr}&cu=INR&tn=${note}`;
  }
}

export const whatsappCrmService = new WhatsAppCrmService();

