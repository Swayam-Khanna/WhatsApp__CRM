import fs from "fs";
import path from "path";
import { AUTOMATED_TEMPLATES } from "../backend/lib/automation-templates.ts";

const INITIAL_INBOX_TEMPLATES = [
  {
    id: "tpl_1",
    category: "Order Updates",
    name: "Order Confirmation",
    message: "Namaste {{customer_name}} ji! Aapka order #{{order_id}} successfully receive ho gaya hai.",
    description: "Sent immediately when an order is received to confirm receipt and order ID.",
    variables: ["customer_name", "order_id"],
  },
  {
    id: "tpl_2",
    category: "Payment",
    name: "Payment Pending",
    message: "Ji, aapka payment abhi pending hai. Official UPI ID: prajnaa@upi. Total: ₹{{amount}}.",
    description: "Payment reminder with official UPI details and pending payable amount.",
    variables: ["amount"],
  },
  {
    id: "tpl_3",
    category: "Payment",
    name: "Payment Confirmed",
    message: "Thank you {{customer_name}} ji! Aapka payment confirm ho gaya hai.",
    description: "Receipt acknowledgement upon successful payment capture.",
    variables: ["customer_name"],
  },
  {
    id: "tpl_4",
    category: "Order Updates",
    name: "Order Processing",
    message: "Ji, aapka order processing mein hai. Dispatch mein lagbhag 2–3 din lag sakte hain.",
    description: "Informs the customer that produce is being harvested and packaged.",
    variables: [],
  },
  {
    id: "tpl_5",
    category: "Shipping",
    name: "Order Shipped",
    message: "Good news {{customer_name}} ji! 📦 Aapka Prajnaa Market order #{{order_id}} ship ho gaya hai. Hum aapko har transit location ki live update bhejte rahenge.",
    description: "Dispatch notification when India Post Speed Post booking is completed.",
    variables: ["customer_name", "order_id"],
  },
  {
    id: "tpl_5b",
    category: "Shipping",
    name: "Order Location Update",
    message: "Namaste {{customer_name}} ji! 📍 Aapka order #{{order_id}} abhi {{location}} pahunch chuka hai aur aage transit mein hai.",
    description: "Milestone transit update as the parcel passes through postal hubs.",
    variables: ["customer_name", "order_id", "location"],
  },
  {
    id: "tpl_5c",
    category: "Shipping",
    name: "Delivering Tomorrow",
    message: "Namaste {{customer_name}} ji! 🚚 Aapke liye update: Aapka order #{{order_id}} kal deliver ho jayega. Kripya apna phone available rakhein.",
    description: "Next-day arrival notice to ensure recipient is available.",
    variables: ["customer_name", "order_id"],
  },
  {
    id: "tpl_6",
    category: "Shipping",
    name: "Order Delivered",
    message: "Ji, aapka order successfully deliver ho gaya hai. Thank you!",
    description: "Final delivery milestone confirmation.",
    variables: [],
  },
  {
    id: "tpl_7",
    category: "Catalogue",
    name: "Live Product Catalogue",
    message: "Bilkul ji! Hamara latest product catalogue yahan dekhein: {{catalogue_url}}",
    description: "Shares the verified online farm catalogue link with prospective customers.",
    variables: ["catalogue_url"],
  },
  {
    id: "tpl_8",
    category: "Support",
    name: "Human Support Handoff",
    message: "Nishant ji abhi available nahi hain. Woh jald hi aapse connect karenge.",
    description: "Human concierge handoff acknowledgement when human escalation is requested.",
    variables: [],
  },
  {
    id: "tpl_9",
    category: "Support",
    name: "Customer Complaint",
    message: "Ji, inconvenience ke liye maafi chahte hain. Hamari team jald aapse connect karegi.",
    description: "Empathetic complaint acknowledgement with immediate investigation guarantee.",
    variables: [],
  },
];

const ORDER_STATUS_NOTIFICATION_TEMPLATES = [
  {
    status: "Pending",
    icon: "🕒",
    trigger: "Order created or under administrative review",
    message: `Namaste {customerName}! 🕒\n\nAapka order *{orderNumber}* hume praapt ho gaya hai aur *pending review* status mein hai.\n\nHumari team jald hi farm harvest check karke ise process karegi. Prajnaa Market par bharosa karne ke liye dhanyawad! 🌿\n\n*Team Prajnaa Market*`,
  },
  {
    status: "Processing",
    icon: "⏳",
    trigger: "Harvest confirmation & produce preparation began",
    message: `Namaste {customerName}! ⏳\n\nUpdate on your Prajnaa Market order *{orderNumber}*:\nYour order has been confirmed and is now being *processed* by our Himalayan harvest team. 🌿\n\nWe are carefully preparing your authentic natural produce directly from the farms. You will receive another notification as soon as your parcel is packed!\n\n*Team Prajnaa Market* 🌿`,
  },
  {
    status: "Packed",
    icon: "📦",
    trigger: "Quality-check passed & sealed in eco-friendly packaging",
    message: `Namaste {customerName}! 📦\n\nGreat news! Your Prajnaa Market order *{orderNumber}* has been *quality-checked and carefully packed*.\n\nIt is safely sealed and prepared for dispatch via India Post Speed Post. We will share your tracking consignment details as soon as it is handed over to the courier! 🌿\n\n*Team Prajnaa Market* 🌿`,
  },
  {
    status: "Shipped",
    icon: "🚀",
    trigger: "Consignment handed over to India Post Speed Post",
    message: `Namaste {customerName}! 🚀\n\nYour Prajnaa Market order *{orderNumber}* has been *dispatched and shipped*! 🌿\n📦 *Tracking Consignment:* {trackingId} ({carrier})\nDispatch Hub: Solan / Dehradun Postal Sorting Center\n\nHum aapko har transit hub ki live milestone update isi WhatsApp par send karte rahenge.\n*Team Prajnaa Market* 🌿`,
  },
  {
    status: "In Transit",
    icon: "📍",
    trigger: "Parcel reaches a sorting hub / regional transit hub",
    message: `Namaste {customerName}! 📍\n\nTransit Update for order *{orderNumber}*:\nYour parcel has reached *{location}* and is moving smoothly towards your destination address. 🌿\n📦 *Tracking Consignment:* {trackingId}\nPure Himalayan farm goodness is on its way to you!\n\n*Team Prajnaa Market* 🌿`,
  },
  {
    status: "Out for Delivery",
    icon: "🛵",
    trigger: "Dispatched with local postman / delivery executive for same-day delivery",
    message: `Namaste {customerName}! 🛵\n\nExciting update! Your Prajnaa Market order *{orderNumber}* is *out for delivery today*! 🎉\n\nThe delivery executive / India Post postman will be arriving with your parcel shortly. Please keep your phone reachable to receive your fresh farm harvest! 🌿\n\n*Team Prajnaa Market* 🌿`,
  },
  {
    status: "Delivering Tomorrow",
    icon: "🚚",
    trigger: "Arrived at destination postal sorting facility",
    message: `Namaste {customerName}! 🚚\n\nZaroori Delivery Update for order *{orderNumber}*:\nAapka parcel local delivery hub pahunch chuka hai aur *kal deliver ho jayega*. 🌿\n\nKripya delivery receive karne ke liye available rahein. Prajnaa Himalayan harvest choose karne ke liye dhanyawad!\n\n*Team Prajnaa Market* 🌿`,
  },
  {
    status: "Delivered",
    icon: "✅",
    trigger: "Parcel successfully delivered to the customer",
    message: `Namaste {customerName}! 🎉\n\nAapka Prajnaa Market order *{orderNumber}* successfully *deliver ho gaya hai*! ✅\n\nWe hope you love the purity and freshness of your Himalayan harvest. If you have any feedback or questions, please reply to this message directly.\n\nDhanyawaad for supporting our Himalayan farmer community! 🌿🌸\n\n*Team Prajnaa Market*`,
  },
  {
    status: "Cancelled",
    icon: "ℹ️",
    trigger: "Order cancelled by administrator or customer request",
    message: `Namaste {customerName}! ℹ️\n\nAapka Prajnaa Market order *{orderNumber}* cancel kar diya gaya hai.\nReason: {reason}\n\nAgar yeh kisi galti se hua hai ya aapko refund/replacement mein koi sahayata chahiye, toh kripya yahan reply karein. Humari team aapki poori madad karegi! 🌿\n\n*Team Prajnaa Market*`,
  },
];

const CATEGORY_NAMES = {
  greetings_welcome: "1. Greetings & Welcome",
  thank_you_acknowledgements: "2. Thank You & Acknowledgements",
  casual_conversations: "3. Casual Conversations",
  general_assistance_clarification: "4. General Assistance & Clarification",
  product_catalogue_enquiries: "5. Product Catalogue Enquiries",
  product_details_pricing: "6. Product Details & Pricing",
  packaging_availability: "7. Packaging & Availability",
  order_placement_modification: "8. Order Placement & Modification",
  order_status_tracking: "9. Order Status & Tracking",
  payment_enquiries: "10. Payment Enquiries",
  shipping_delivery: "11. Shipping & Delivery",
  complaints_returns_refunds: "12. Complaints, Returns & Refunds",
  human_handoff_unknown: "13. Human Support Handoff & Unknown Queries",
  indian_conversational_expressions: "14. Indian Conversational Expressions & Slang",
  indian_pricing_bargaining: "15. Indian Pricing, Discounts & Bargaining",
  customer_hesitation_trust: "16. Customer Hesitation & Trust Building",
  followup_incomplete: "17. Follow-up & Pending Inquiries",
};

function generateMarkdown() {
  const lines = [];

  lines.push("# Prajnaa WhatsApp CRM — Master Template Catalog & Documentation");
  lines.push("");
  lines.push("> **Document Version**: 2.0 (Authoritative)");
  lines.push(`> **Last Updated**: ${new Date().toISOString().split("T")[0]}`);
  lines.push("> **Total Automated Response Templates**: 220 templates across 17 structured categories");
  lines.push("> **Total CRM Inbox Quick Templates**: 11 Meta-compliant pre-approved templates");
  lines.push("> **Total Real-Time Status Notification Templates**: 9 lifecycle status notifications");
  lines.push("> **Supported Languages**: English (`en`), Hinglish (`hinglish`), Hindi Devanagari (`hi`)");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Table of Contents");
  lines.push("");
  lines.push("1. [Architecture Overview & Separation Principle](#1-architecture-overview--separation-principle)");
  lines.push("2. [CRM Inbox Manual Quick Templates (11 Templates)](#2-crm-inbox-manual-quick-templates)");
  lines.push("3. [Real-Time Order Lifecycle Notification Templates (9 Stages)](#3-real-time-order-lifecycle-notification-templates)");
  lines.push("4. [Automated Engine Response Templates Catalog (220 Templates across 17 Categories)](#4-automated-engine-response-templates-catalog)");

  const categories = Object.keys(CATEGORY_NAMES);
  categories.forEach((catKey, idx) => {
    const catTitle = CATEGORY_NAMES[catKey];
    const catTemplates = AUTOMATED_TEMPLATES.filter((t) => t.category === catKey);
    lines.push(`   - [${catTitle} (${catTemplates.length} templates)](#category-${idx + 1}-${catKey.replace(/_/g, "-")})`);
  });

  lines.push("5. [Dynamic Variables & Replacement Rules](#5-dynamic-variables--replacement-rules)");
  lines.push("6. [Language Detection & Matching Rules](#6-language-detection--matching-rules)");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 1. Architecture Overview & Separation Principle");
  lines.push("");
  lines.push("To ensure an uncluttered administrator experience and enterprise-grade conversation quality, the CRM architecture maintains a strict, intentional separation between two messaging subsystems:");
  lines.push("");
  lines.push("| Dimension | CRM Inbox Manual Templates | Automated Messaging Engine Library |");
  lines.push("|---|---|---|");
  lines.push("| **Target User** | Human Support Agents & Store Admins | Autonomous AI / Intelligent Bot Engine |");
  lines.push("| **Location in CRM** | Inbox Chat Selector (`app/page.tsx`) | Internal System Engine (`backend/lib/automation-templates.ts`) |");
  lines.push("| **Template Count** | 11 concise, pre-approved templates | 220 intent-based templates |");
  lines.push("| **Trigger** | Manually clicked by agent during live chat | Auto-selected based on semantic understanding |");
  lines.push("| **UI Clutter Risk** | Zero (only 11 high-utility options) | Stored in engine backend, hidden from inbox picker |");
  lines.push("| **Language Support** | Hinglish / English | Trilingual: English, Hinglish, Hindi (Devanagari) |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 2. CRM Inbox Manual Quick Templates");
  lines.push("");
  lines.push("These 11 templates are available in the CRM Inbox chat console for human administrators to send with a single click. Dynamic placeholders such as `{{customer_name}}`, `{{order_id}}`, `{{amount}}`, and `{{location}}` are automatically replaced from the active customer record.");
  lines.push("");
  lines.push("| ID | Category | Template Name | Message Preview | Variables |");
  lines.push("|---|---|---|---|---|");

  INITIAL_INBOX_TEMPLATES.forEach((tpl) => {
    const vars = tpl.variables.length > 0 ? tpl.variables.map((v) => `\`{{${v}}}\``).join(", ") : "None";
    lines.push(`| \`${tpl.id}\` | **${tpl.category}** | ${tpl.name} | *\"${tpl.message}\"* | ${vars} |`);
  });

  lines.push("");
  lines.push("### Detailed Manual Template Breakdown");
  lines.push("");

  INITIAL_INBOX_TEMPLATES.forEach((tpl, idx) => {
    lines.push(`#### 2.${idx + 1} ${tpl.name} (\`${tpl.id}\`)`);
    lines.push(`- **Category**: ${tpl.category}`);
    lines.push(`- **Purpose**: ${tpl.description}`);
    lines.push(`- **Template Text**:`);
    lines.push("```text");
    lines.push(tpl.message);
    lines.push("```");
    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push("## 3. Real-Time Order Lifecycle Notification Templates");
  lines.push("");
  lines.push("Whenever an order's status is updated in the CRM (via the Order Management table, the Order Details modal, or the admin API), the engine immediately formats and dispatches an authentic, polite WhatsApp update to the customer. The message is also automatically appended to the customer's chat thread in the live CRM inbox.");
  lines.push("");

  ORDER_STATUS_NOTIFICATION_TEMPLATES.forEach((st, idx) => {
    lines.push(`### 3.${idx + 1} Status: ${st.icon} ${st.status}`);
    lines.push(`- **Trigger Event**: ${st.trigger}`);
    lines.push(`- **Dispatch Message**:`);
    lines.push("```text");
    lines.push(st.message);
    lines.push("```");
    lines.push("");
  });

  lines.push("---");
  lines.push("");
  lines.push("## 4. Automated Engine Response Templates Catalog");
  lines.push("");
  lines.push("The automated messaging engine houses **220 templates** categorized into 17 high-intent domains. Each template includes hand-crafted, culturally respectful phrasing in **English**, **Hinglish**, and **Hindi (Devanagari)**, ensuring the customer is answered naturally in their preferred language without sounding robotic.");
  lines.push("");

  categories.forEach((catKey, catIdx) => {
    const catTitle = CATEGORY_NAMES[catKey];
    const catTemplates = AUTOMATED_TEMPLATES.filter((t) => t.category === catKey);

    lines.push(`### Category ${catIdx + 1}: ${catTitle} (${catTemplates.length} templates)`);
    lines.push(`{#category-${catIdx + 1}-${catKey.replace(/_/g, "-")}}`);
    lines.push("");
    lines.push("| # | Template ID | Intent / Sub-Intent | Template Name | Variables |");
    lines.push("|---|---|---|---|---|");

    catTemplates.forEach((t, i) => {
      const vars = t.variables && t.variables.length > 0 ? t.variables.map((v) => `\`{${v}}\``).join(", ") : "None";
      lines.push(`| ${i + 1} | \`${t.id}\` | \`${t.intent} / ${t.subIntent}\` | **${t.name}** | ${vars} |`);
    });

    lines.push("");
    lines.push("#### Multilingual Variations");
    lines.push("");

    catTemplates.forEach((t, i) => {
      lines.push(`##### ${catIdx + 1}.${i + 1} ${t.name} (\`${t.id}\`)`);
      lines.push(`- **Intent**: \`${t.intent}\` | **Sub-Intent**: \`${t.subIntent}\``);
      if (t.variables && t.variables.length > 0) {
        lines.push(`- **Variables**: ${t.variables.map((v) => `\`{${v}}\``).join(", ")}`);
      }
      lines.push("");
      lines.push("- **English (`en`)**:");
      lines.push(`  > ${t.en.replace(/\n/g, "\n  > ")}`);
      lines.push("");
      lines.push("- **Hinglish (`hinglish`)**:");
      lines.push(`  > ${t.hinglish.replace(/\n/g, "\n  > ")}`);
      lines.push("");
      lines.push("- **Hindi (`hi`)**:");
      lines.push(`  > ${t.hi.replace(/\n/g, "\n  > ")}`);
      lines.push("");
    });

    lines.push("---");
    lines.push("");
  });

  lines.push("## 5. Dynamic Variables & Replacement Rules");
  lines.push("");
  lines.push("The template engine uses placeholder syntax `{variableName}` or `{{variableName}}` which is safely interpolated with live database records at runtime:");
  lines.push("");
  lines.push("| Variable | Description | Example Replacement | Fallback Value |");
  lines.push("|---|---|---|---|");
  lines.push("| `{customerName}` / `{{customer_name}}` | Customer's full or preferred name | \"Rajat\", \"Dr. Sharma\" | \"ji\" / \"Customer\" |");
  lines.push("| `{orderNumber}` / `{{order_id}}` | Order ID reference | \"#PJ-OD-8921\" | \"#PRJ-ORD\" |");
  lines.push("| `{productName}` | Name of the discussed produce item | \"Tehri Badri Cow Ghee\" | \"Himalayan Produce\" |");
  lines.push("| `{price}` | Price in Rupees | \"₹1,450\" | \"Contact for price\" |");
  lines.push("| `{quantity}` | Requested unit quantity | \"2 jars\", \"500g\" | \"1\" |");
  lines.push("| `{location}` | Current postal transit hub | \"Solan HPO\", \"Dehradun Hub\" | \"Regional Sorting Hub\" |");
  lines.push("| `{trackingId}` | India Post Speed Post consignment no. | \"EH123456789IN\" | \"Pending Booking\" |");
  lines.push("| `{catalogueUrl}` / `{{catalogue_url}}` | Live verified product catalogue link | \"https://prajnaa-farm-8zam.vercel.app/\" | Official Portal Link |");
  lines.push("| `{agentName}` | Support agent assigned | \"Nishant\" | \"Support Desk\" |");
  lines.push("| `{amount}` | Total invoice amount | \"₹2,450\" | \"₹0\" |");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## 6. Language Detection & Matching Rules");
  lines.push("");
  lines.push("1. **Automatic Script Detection**:");
  lines.push("   - If customer message contains Devanagari characters (Unicode range `\\u0900-\\u097F`), language is detected as Hindi (`hi`).");
  lines.push("   - If customer uses Romanized Hindi words (e.g. *kaise ho, dhanyawad, kripya, theek hai, kitna price hai*), language is detected as Hinglish (`hinglish`).");
  lines.push("   - Otherwise, language defaults to English (`en`).");
  lines.push("2. **Dynamic Language Switching**:");
  lines.push("   - The engine does not lock a customer into a single language. If a customer starts in English and follows up in Hinglish or Hindi, the response language shifts immediately to match.");
  lines.push("3. **Tone Consistency**:");
  lines.push("   - All responses embody warmth, politeness, cultural respect (*Namaste ji, Bilkul ji*), and transparent Himalayan farm-to-table authenticity.");

  return lines.join("\n");
}

const markdownContent = generateMarkdown();

// 1. Write to repository docs
const repoDocPath = path.resolve("docs/TEMPLATES_DOCUMENTATION.md");
fs.writeFileSync(repoDocPath, markdownContent, "utf8");
console.log("Successfully generated:", repoDocPath, `(${markdownContent.length} bytes)`);

// 2. Write to Brain Artifact directory
const artifactPath = path.resolve(
  "C:/Users/Rajat/.gemini/antigravity/brain/e01fbace-bc1f-40de-88c6-a154a2bca218/templates_documentation.md"
);
fs.writeFileSync(artifactPath, markdownContent, "utf8");
console.log("Successfully generated Artifact:", artifactPath);
