# Prajnaa WhatsApp CRM — Master Template Catalog & Documentation

> **Document Version**: 2.0 (Authoritative)
> **Last Updated**: 2026-11-18
> **Total Automated Response Templates**: 220 templates across 17 structured categories
> **Total CRM Inbox Quick Templates**: 11 Meta-compliant pre-approved templates
> **Total Real-Time Status Notification Templates**: 9 lifecycle status notifications
> **Supported Languages**: English (`en`), Hinglish (`hinglish`), Hindi Devanagari (`hi`)

---

## Table of Contents

1. [Architecture Overview & Separation Principle](#1-architecture-overview--separation-principle)
2. [CRM Inbox Manual Quick Templates (11 Templates)](#2-crm-inbox-manual-quick-templates)
3. [Real-Time Order Lifecycle Notification Templates (9 Stages)](#3-real-time-order-lifecycle-notification-templates)
4. [Automated Engine Response Templates Catalog (220 Templates across 17 Categories)](#4-automated-engine-response-templates-catalog)
   - [1. Greetings & Welcome (10 templates)](#category-1-greetings-welcome)
   - [2. Thank You & Acknowledgements (10 templates)](#category-2-thank-you-acknowledgements)
   - [3. Casual Conversations (8 templates)](#category-3-casual-conversations)
   - [4. General Assistance & Clarification (8 templates)](#category-4-general-assistance-clarification)
   - [5. Product Catalogue Enquiries (10 templates)](#category-5-product-catalogue-enquiries)
   - [6. Product Details & Pricing (12 templates)](#category-6-product-details-pricing)
   - [7. Packaging & Availability (8 templates)](#category-7-packaging-availability)
   - [8. Order Placement & Modification (10 templates)](#category-8-order-placement-modification)
   - [9. Order Status & Tracking (8 templates)](#category-9-order-status-tracking)
   - [10. Payment Enquiries (8 templates)](#category-10-payment-enquiries)
   - [11. Shipping & Delivery (8 templates)](#category-11-shipping-delivery)
   - [12. Complaints, Returns & Refunds (8 templates)](#category-12-complaints-returns-refunds)
   - [13. Human Support Handoff & Unknown Queries (5 templates)](#category-13-human-handoff-unknown)
   - [14. Indian Conversational Expressions & Slang (0 templates)](#category-14-indian-conversational-expressions)
   - [15. Indian Pricing, Discounts & Bargaining (0 templates)](#category-15-indian-pricing-bargaining)
   - [16. Customer Hesitation & Trust Building (0 templates)](#category-16-customer-hesitation-trust)
   - [17. Follow-up & Pending Inquiries (0 templates)](#category-17-followup-incomplete)
5. [Dynamic Variables & Replacement Rules](#5-dynamic-variables--replacement-rules)
6. [Language Detection & Matching Rules](#6-language-detection--matching-rules)

---

## 1. Architecture Overview & Separation Principle

To ensure an uncluttered administrator experience and enterprise-grade conversation quality, the CRM architecture maintains a strict, intentional separation between two messaging subsystems:

| Dimension | CRM Inbox Manual Templates | Automated Messaging Engine Library |
|---|---|---|
| **Target User** | Human Support Agents & Store Admins | Autonomous AI / Intelligent Bot Engine |
| **Location in CRM** | Inbox Chat Selector (`app/page.tsx`) | Internal System Engine (`backend/lib/automation-templates.ts`) |
| **Template Count** | 11 concise, pre-approved templates | 220 intent-based templates |
| **Trigger** | Manually clicked by agent during live chat | Auto-selected based on semantic understanding |
| **UI Clutter Risk** | Zero (only 11 high-utility options) | Stored in engine backend, hidden from inbox picker |
| **Language Support** | Hinglish / English | Trilingual: English, Hinglish, Hindi (Devanagari) |

---

## 2. CRM Inbox Manual Quick Templates

These 11 templates are available in the CRM Inbox chat console for human administrators to send with a single click. Dynamic placeholders such as `{{customer_name}}`, `{{order_id}}`, `{{amount}}`, and `{{location}}` are automatically replaced from the active customer record.

| ID | Category | Template Name | Message Preview | Variables |
|---|---|---|---|---|
| `tpl_1` | **Order Updates** | Order Confirmation | *"Namaste {{customer_name}} ji! Aapka order #{{order_id}} successfully receive ho gaya hai."* | `{{customer_name}}`, `{{order_id}}` |
| `tpl_2` | **Payment** | Payment Pending | *"Ji, aapka payment abhi pending hai. Official UPI ID: prajnaa@upi. Total: ₹{{amount}}."* | `{{amount}}` |
| `tpl_3` | **Payment** | Payment Confirmed | *"Thank you {{customer_name}} ji! Aapka payment confirm ho gaya hai."* | `{{customer_name}}` |
| `tpl_4` | **Order Updates** | Order Processing | *"Ji, aapka order processing mein hai. Dispatch mein lagbhag 2–3 din lag sakte hain."* | None |
| `tpl_5` | **Shipping** | Order Shipped | *"Good news {{customer_name}} ji! 📦 Aapka Prajnaa Market order #{{order_id}} ship ho gaya hai. Hum aapko har transit location ki live update bhejte rahenge."* | `{{customer_name}}`, `{{order_id}}` |
| `tpl_5b` | **Shipping** | Order Location Update | *"Namaste {{customer_name}} ji! 📍 Aapka order #{{order_id}} abhi {{location}} pahunch chuka hai aur aage transit mein hai."* | `{{customer_name}}`, `{{order_id}}`, `{{location}}` |
| `tpl_5c` | **Shipping** | Delivering Tomorrow | *"Namaste {{customer_name}} ji! 🚚 Aapke liye update: Aapka order #{{order_id}} kal deliver ho jayega. Kripya apna phone available rakhein."* | `{{customer_name}}`, `{{order_id}}` |
| `tpl_6` | **Shipping** | Order Delivered | *"Ji, aapka order successfully deliver ho gaya hai. Thank you!"* | None |
| `tpl_7` | **Catalogue** | Live Product Catalogue | *"Bilkul ji! Hamara latest product catalogue yahan dekhein: {{catalogue_url}}"* | `{{catalogue_url}}` |
| `tpl_8` | **Support** | Human Support Handoff | *"Nishant ji abhi available nahi hain. Woh jald hi aapse connect karenge."* | None |
| `tpl_9` | **Support** | Customer Complaint | *"Ji, inconvenience ke liye maafi chahte hain. Hamari team jald aapse connect karegi."* | None |

### Detailed Manual Template Breakdown

#### 2.1 Order Confirmation (`tpl_1`)
- **Category**: Order Updates
- **Purpose**: Sent immediately when an order is received to confirm receipt and order ID.
- **Template Text**:
```text
Namaste {{customer_name}} ji! Aapka order #{{order_id}} successfully receive ho gaya hai.
```

#### 2.2 Payment Pending (`tpl_2`)
- **Category**: Payment
- **Purpose**: Payment reminder with official UPI details and pending payable amount.
- **Template Text**:
```text
Ji, aapka payment abhi pending hai. Official UPI ID: prajnaa@upi. Total: ₹{{amount}}.
```

#### 2.3 Payment Confirmed (`tpl_3`)
- **Category**: Payment
- **Purpose**: Receipt acknowledgement upon successful payment capture.
- **Template Text**:
```text
Thank you {{customer_name}} ji! Aapka payment confirm ho gaya hai.
```

#### 2.4 Order Processing (`tpl_4`)
- **Category**: Order Updates
- **Purpose**: Informs the customer that produce is being harvested and packaged.
- **Template Text**:
```text
Ji, aapka order processing mein hai. Dispatch mein lagbhag 2–3 din lag sakte hain.
```

#### 2.5 Order Shipped (`tpl_5`)
- **Category**: Shipping
- **Purpose**: Dispatch notification when Shipping booking is completed.
- **Template Text**:
```text
Good news {{customer_name}} ji! 📦 Aapka Prajnaa Market order #{{order_id}} ship ho gaya hai. Hum aapko har transit location ki live update bhejte rahenge.
```

#### 2.6 Order Location Update (`tpl_5b`)
- **Category**: Shipping
- **Purpose**: Milestone transit update as the parcel passes through postal hubs.
- **Template Text**:
```text
Namaste {{customer_name}} ji! 📍 Aapka order #{{order_id}} abhi {{location}} pahunch chuka hai aur aage transit mein hai.
```

#### 2.7 Delivering Tomorrow (`tpl_5c`)
- **Category**: Shipping
- **Purpose**: Next-day arrival notice to ensure recipient is available.
- **Template Text**:
```text
Namaste {{customer_name}} ji! 🚚 Aapke liye update: Aapka order #{{order_id}} kal deliver ho jayega. Kripya apna phone available rakhein.
```

#### 2.8 Order Delivered (`tpl_6`)
- **Category**: Shipping
- **Purpose**: Final delivery milestone confirmation.
- **Template Text**:
```text
Ji, aapka order successfully deliver ho gaya hai. Thank you!
```

#### 2.9 Live Product Catalogue (`tpl_7`)
- **Category**: Catalogue
- **Purpose**: Shares the verified online farm catalogue link with prospective customers.
- **Template Text**:
```text
Bilkul ji! Hamara latest product catalogue yahan dekhein: {{catalogue_url}}
```

#### 2.10 Human Support Handoff (`tpl_8`)
- **Category**: Support
- **Purpose**: Human concierge handoff acknowledgement when human escalation is requested.
- **Template Text**:
```text
Nishant ji abhi available nahi hain. Woh jald hi aapse connect karenge.
```

#### 2.11 Customer Complaint (`tpl_9`)
- **Category**: Support
- **Purpose**: Empathetic complaint acknowledgement with immediate investigation guarantee.
- **Template Text**:
```text
Ji, inconvenience ke liye maafi chahte hain. Hamari team jald aapse connect karegi.
```

---

## 3. Real-Time Order Lifecycle Notification Templates

Whenever an order's status is updated in the CRM (via the Order Management table, the Order Details modal, or the admin API), the engine immediately formats and dispatches an authentic, polite WhatsApp update to the customer. The message is also automatically appended to the customer's chat thread in the live CRM inbox.

### 3.1 Status: 🕒 Pending
- **Trigger Event**: Order created or under administrative review
- **Dispatch Message**:
```text
Namaste {customerName}! 🕒

Aapka order *{orderNumber}* hume praapt ho gaya hai aur *pending review* status mein hai.

Humari team jald hi farm harvest check karke ise process karegi. Prajnaa Market par bharosa karne ke liye dhanyawad! 🌿

*Team Prajnaa Market*
```

### 3.2 Status: ⏳ Processing
- **Trigger Event**: Harvest confirmation & produce preparation began
- **Dispatch Message**:
```text
Namaste {customerName}! ⏳

Update on your Prajnaa Market order *{orderNumber}*:
Your order has been confirmed and is now being *processed* by our Himalayan harvest team. 🌿

We are carefully preparing your authentic natural produce directly from the farms. You will receive another notification as soon as your parcel is packed!

*Team Prajnaa Market* 🌿
```

### 3.3 Status: 📦 Packed
- **Trigger Event**: Quality-check passed & sealed in eco-friendly packaging
- **Dispatch Message**:
```text
Namaste {customerName}! 📦

Great news! Your Prajnaa Market order *{orderNumber}* has been *quality-checked and carefully packed*.

It is safely sealed and prepared for dispatch via Shipping. We will share your tracking consignment details as soon as it is handed over to the courier! 🌿

*Team Prajnaa Market* 🌿
```

### 3.4 Status: 🚀 Shipped
- **Trigger Event**: Consignment handed over to Shipping partner
- **Dispatch Message**:
```text
Namaste {customerName}! 🚀

Your Prajnaa Market order *{orderNumber}* has been *dispatched and shipped*! 🌿
📦 *Tracking Consignment:* {trackingId} ({carrier})
Dispatch Hub: Solan / Dehradun Postal Sorting Center

Hum aapko har transit hub ki live milestone update isi WhatsApp par send karte rahenge.
*Team Prajnaa Market* 🌿
```

### 3.5 Status: 📍 In Transit
- **Trigger Event**: Parcel reaches a sorting hub / regional transit hub
- **Dispatch Message**:
```text
Namaste {customerName}! 📍

Transit Update for order *{orderNumber}*:
Your parcel has reached *{location}* and is moving smoothly towards your destination address. 🌿
📦 *Tracking Consignment:* {trackingId}
Pure Himalayan farm goodness is on its way to you!

*Team Prajnaa Market* 🌿
```

### 3.6 Status: 🛵 Out for Delivery
- **Trigger Event**: Dispatched with local postman / delivery executive for same-day delivery
- **Dispatch Message**:
```text
Namaste {customerName}! 🛵

Exciting update! Your Prajnaa Market order *{orderNumber}* is *out for delivery today*! 🎉

The delivery executive / India Post postman will be arriving with your parcel shortly. Please keep your phone reachable to receive your fresh farm harvest! 🌿

*Team Prajnaa Market* 🌿
```

### 3.7 Status: 🚚 Delivering Tomorrow
- **Trigger Event**: Arrived at destination postal sorting facility
- **Dispatch Message**:
```text
Namaste {customerName}! 🚚

Zaroori Delivery Update for order *{orderNumber}*:
Aapka parcel local delivery hub pahunch chuka hai aur *kal deliver ho jayega*. 🌿

Kripya delivery receive karne ke liye available rahein. Prajnaa Himalayan harvest choose karne ke liye dhanyawad!

*Team Prajnaa Market* 🌿
```

### 3.8 Status: ✅ Delivered
- **Trigger Event**: Parcel successfully delivered to the customer
- **Dispatch Message**:
```text
Namaste {customerName}! 🎉

Aapka Prajnaa Market order *{orderNumber}* successfully *deliver ho gaya hai*! ✅

We hope you love the purity and freshness of your Himalayan harvest. If you have any feedback or questions, please reply to this message directly.

Dhanyawaad for supporting our Himalayan farmer community! 🌿🌸

*Team Prajnaa Market*
```

### 3.9 Status: ℹ️ Cancelled
- **Trigger Event**: Order cancelled by administrator or customer request
- **Dispatch Message**:
```text
Namaste {customerName}! ℹ️

Aapka Prajnaa Market order *{orderNumber}* cancel kar diya gaya hai.
Reason: {reason}

Agar yeh kisi galti se hua hai ya aapko refund/replacement mein koi sahayata chahiye, toh kripya yahan reply karein. Humari team aapki poori madad karegi! 🌿

*Team Prajnaa Market*
```

---

## 4. Automated Engine Response Templates Catalog

The automated messaging engine houses **220 templates** categorized into 17 high-intent domains. Each template includes hand-crafted, culturally respectful phrasing in **English**, **Hinglish**, and **Hindi (Devanagari)**, ensuring the customer is answered naturally in their preferred language without sounding robotic.

### Category 1: 1. Greetings & Welcome (10 templates)
{#category-1-greetings-welcome}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_greet_general` | `greetings / general` | **General Polite Greeting** | None |
| 2 | `auto_greet_morning` | `greetings / morning` | **Good Morning Greeting** | None |
| 3 | `auto_greet_afternoon` | `greetings / afternoon` | **Good Afternoon Greeting** | None |
| 4 | `auto_greet_evening` | `greetings / evening` | **Good Evening Greeting** | None |
| 5 | `auto_greet_casual_hi` | `greetings / casual_hi` | **Casual Short Hi / Hello** | None |
| 6 | `auto_greet_returning` | `greetings / returning_patron` | **Returning Customer Welcome Back** | None |
| 7 | `auto_greet_first_time` | `greetings / first_time` | **First-Time Visitor Welcome** | `{catalogueLink}` |
| 8 | `auto_greet_namaste` | `greetings / traditional_namaste` | **Traditional Namaste Response** | None |
| 9 | `auto_greet_weekend` | `greetings / weekend` | **Weekend Pleasant Greeting** | None |
| 10 | `auto_greet_quick_checkin` | `greetings / quick_checkin` | **Quick Helpful Check-in** | None |

#### Multilingual Variations

##### 1.1 General Polite Greeting (`auto_greet_general`)
- **Intent**: `greetings` | **Sub-Intent**: `general`

- **English (`en`)**:
  > Hello! Welcome to Prajnaa Farmer Market. How can we assist you with our pure Himalayan produce today?

- **Hinglish (`hinglish`)**:
  > Namaste ji! 🙏 Prajnaa Farmer Market mein aapka swagat hai. Aaj hum aapki kya sahayata kar sakte hain?

- **Hindi (`hi`)**:
  > नमस्ते जी! 🙏 प्रज्ञा फार्मर मार्केट में आपका स्वागत है। आज हम आपकी क्या सहायता कर सकते हैं?

##### 1.2 Good Morning Greeting (`auto_greet_morning`)
- **Intent**: `greetings` | **Sub-Intent**: `morning`

- **English (`en`)**:
  > Good morning! Wishing you a healthy day ahead. How may we help you explore our Himalayan harvests?

- **Hinglish (`hinglish`)**:
  > Shubh prabhat ji! ☀️ Aapka din shubh rahe. Prajnaa pure Himalayan harvests ke baare mein kya jaanna chahenge?

- **Hindi (`hi`)**:
  > शुभ प्रभात जी! ☀️ आपका दिन मंगलमय हो। हमारे शुद्ध हिमालयी उत्पादों के बारे में आप क्या जानना चाहेंगे?

##### 1.3 Good Afternoon Greeting (`auto_greet_afternoon`)
- **Intent**: `greetings` | **Sub-Intent**: `afternoon`

- **English (`en`)**:
  > Good afternoon! Welcome to Prajnaa Market. How can we help you today?

- **Hinglish (`hinglish`)**:
  > Namaste ji! Shubh dopahar. Prajnaa Market mein aapka swagat hai, batayein kya sahayata karein?

- **Hindi (`hi`)**:
  > नमस्ते जी! शुभ दोपहर। प्रज्ञा मार्केट में आपका स्वागत है, बताएं आज हम क्या सहायता कर सकते हैं?

##### 1.4 Good Evening Greeting (`auto_greet_evening`)
- **Intent**: `greetings` | **Sub-Intent**: `evening`

- **English (`en`)**:
  > Good evening! Welcome to Prajnaa Market. How can we assist you tonight?

- **Hinglish (`hinglish`)**:
  > Shubh sandhya ji! 🌄 Prajnaa Market mein swagat hai. Aaj hum aapki kya madad kar sakte hain?

- **Hindi (`hi`)**:
  > शुभ संध्या जी! 🌄 प्रज्ञा मार्केट में आपका स्वागत है। बताएं हम आपकी क्या सेवा कर सकते हैं?

##### 1.5 Casual Short Hi / Hello (`auto_greet_casual_hi`)
- **Intent**: `greetings` | **Sub-Intent**: `casual_hi`

- **English (`en`)**:
  > Hi there! How can we help you today?

- **Hinglish (`hinglish`)**:
  > Hello ji! 🙏 Batayein, aaj hum aapki kya madad kar sakte hain?

- **Hindi (`hi`)**:
  > नमस्ते जी! बताएं, आज हम आपकी क्या सहायता कर सकते हैं?

##### 1.6 Returning Customer Welcome Back (`auto_greet_returning`)
- **Intent**: `greetings` | **Sub-Intent**: `returning_patron`

- **English (`en`)**:
  > Welcome back to Prajnaa Market! Delighted to connect with you again. What can we arrange for you today?

- **Hinglish (`hinglish`)**:
  > Prajnaa Market par aapka dobara swagat hai ji! 🙏 Aapse judkar khushi hui. Aaj kounsa fresh harvest bhejein?

- **Hindi (`hi`)**:
  > प्रज्ञा मार्केट में आपका पुनः स्वागत है जी! आपसे दोबारा जुड़कर बहुत खुशी हुई। आज आपके लिए क्या भिजवाएं?

##### 1.7 First-Time Visitor Welcome (`auto_greet_first_time`)
- **Intent**: `greetings` | **Sub-Intent**: `first_time`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Namaste! Welcome to Prajnaa. We bring 100% pure Himalayan produce straight from mountain farmers to your home: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Namaste ji! 🙏 Prajnaa Market mein swagat hai. Hum Himalayan kisaano se 100% shuddh natural produce direct aap tak pahunchate hain: {catalogueLink}

- **Hindi (`hi`)**:
  > नमस्ते जी! 🙏 प्रज्ञा मार्केट में आपका स्वागत है। हम हिमालयी किसानों से 100% शुद्ध प्राकृतिक उत्पाद सीधे आपके घर तक पहुंचाते हैं: {catalogueLink}

##### 1.8 Traditional Namaste Response (`auto_greet_namaste`)
- **Intent**: `greetings` | **Sub-Intent**: `traditional_namaste`

- **English (`en`)**:
  > Namaste! It is a pleasure to connect with you. How can we assist you with our natural products today?

- **Hinglish (`hinglish`)**:
  > Namaste ji! 🙏 Aapse connect karke khushi hui. Prajnaa ke shuddh utpaadon ke baare mein kya jaanna chahte hain?

- **Hindi (`hi`)**:
  > नमस्ते जी! 🙏 आपसे जुड़कर अत्यंत प्रसन्नता हुई। हमारे प्राकृतिक उत्पादों के विषय में आज क्या जानकारी चाहिए?

##### 1.9 Weekend Pleasant Greeting (`auto_greet_weekend`)
- **Intent**: `greetings` | **Sub-Intent**: `weekend`

- **English (`en`)**:
  > Hello! Hope you are enjoying a peaceful weekend. How can we assist you today?

- **Hinglish (`hinglish`)**:
  > Hello ji! Umeed hai aapka weekend shandar beet raha hoga. Batayein, aaj kya seva karein?

- **Hindi (`hi`)**:
  > नमस्ते जी! आशा है आपका सप्ताहांत सुखद बीत रहा होगा। बताएं, आज हम आपकी क्या सहायता कर सकते हैं?

##### 1.10 Quick Helpful Check-in (`auto_greet_quick_checkin`)
- **Intent**: `greetings` | **Sub-Intent**: `quick_checkin`

- **English (`en`)**:
  > Hello! We are here to help. Looking for any specific Himalayan product today?

- **Hinglish (`hinglish`)**:
  > Hello ji! Hum aapki help ke liye available hain. Aaj koi khaas Himalayan product dhoondh rahe hain?

- **Hindi (`hi`)**:
  > नमस्ते जी! हम आपकी सहायता के लिए उपस्थित हैं। क्या आज किसी विशेष हिमालयी उत्पाद की तलाश में हैं?

---

### Category 2: 2. Thank You & Acknowledgements (10 templates)
{#category-2-thank-you-acknowledgements}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_thanks_welcome` | `thank_you / general_thanks` | **You Are Most Welcome** | None |
| 2 | `auto_thanks_happy_to_help` | `thank_you / happy_to_help` | **Happy To Help** | None |
| 3 | `auto_thanks_anytime` | `thank_you / anytime` | **Anytime Support** | None |
| 4 | `auto_thanks_farmer_support` | `thank_you / support_farmers` | **Gratitude For Supporting Farmers** | None |
| 5 | `auto_ack_sure` | `acknowledgements / sure` | **Acknowledgement Sure / Theek Hai** | None |
| 6 | `auto_ack_ok_noted` | `acknowledgement / ok_noted` | **Acknowledgement Noted / Theek Hai** | None |
| 7 | `auto_ack_got_it` | `acknowledgements / got_it` | **Acknowledgement Got It / Samajh Gaye** | None |
| 8 | `auto_thanks_info_provided` | `thank_you / info_received` | **Thanks For Information Received** | None |
| 9 | `auto_thanks_patron_appreciation` | `thank_you / patron_trust` | **Patron Trust Appreciation** | None |
| 10 | `auto_ack_at_your_service` | `thank_you / at_service` | **Always At Your Service** | None |

#### Multilingual Variations

##### 2.1 You Are Most Welcome (`auto_thanks_welcome`)
- **Intent**: `thank_you` | **Sub-Intent**: `general_thanks`

- **English (`en`)**:
  > You are most welcome! Always happy to help. Let us know if you need anything else.

- **Hinglish (`hinglish`)**:
  > Aapka swagat hai ji! Khushi hui madad karke. Koi aur zaroorat ho toh zaroor batayein. 🌿

- **Hindi (`hi`)**:
  > आपका बहुत-बहुत स्वागत है जी! आपकी सहायता करके खुशी हुई। कोई और आवश्यकता हो तो अवश्य बताएं। 🌿

##### 2.2 Happy To Help (`auto_thanks_happy_to_help`)
- **Intent**: `thank_you` | **Sub-Intent**: `happy_to_help`

- **English (`en`)**:
  > Always happy to help! Wishing you great health with our Himalayan harvests.

- **Hinglish (`hinglish`)**:
  > Hamari khushi hai ji! Prajnaa ke natural harvests ke saath aapka swasthya hamesha uttam rahe. 🌿

- **Hindi (`hi`)**:
  > आपकी सहायता हमारे लिए सौभाग्य की बात है जी! हिमालयी उत्पादों के साथ आपका स्वास्थ्य उत्तम रहे।

##### 2.3 Anytime Support (`auto_thanks_anytime`)
- **Intent**: `thank_you` | **Sub-Intent**: `anytime`

- **English (`en`)**:
  > Anytime! Feel free to message us whenever you need authentic mountain produce.

- **Hinglish (`hinglish`)**:
  > Kabhi bhi ji! Shuddh Himalayan produce ki zaroorat ho toh bina jhijhak message karein.

- **Hindi (`hi`)**:
  > कभी भी जी! जब भी आपको शुद्ध पहाड़ी उत्पादों की आवश्यकता हो, निसंकोच संपर्क करें।

##### 2.4 Gratitude For Supporting Farmers (`auto_thanks_farmer_support`)
- **Intent**: `thank_you` | **Sub-Intent**: `support_farmers`

- **English (`en`)**:
  > Thank you for supporting ethical mountain farming and local Himalayan communities! 🙏

- **Hinglish (`hinglish`)**:
  > Himalayan kisaano aur paramparik kheti ko support karne ke liye aapka dil se dhanyavaad ji! 🙏

- **Hindi (`hi`)**:
  > हिमालयी किसानों और पारंपरिक खेती का समर्थन करने के लिए आपका हृदय से आभार जी! 🙏

##### 2.5 Acknowledgement Sure / Theek Hai (`auto_ack_sure`)
- **Intent**: `acknowledgements` | **Sub-Intent**: `sure`

- **English (`en`)**:
  > Sure! Let us know whenever you are ready.

- **Hinglish (`hinglish`)**:
  > Bilkul ji! Jab bhi aap chahein, batayein.

- **Hindi (`hi`)**:
  > बिल्कुल जी! जब भी आप चाहें, हमें बताएं।

##### 2.6 Acknowledgement Noted / Theek Hai (`auto_ack_ok_noted`)
- **Intent**: `acknowledgement` | **Sub-Intent**: `ok_noted`

- **English (`en`)**:
  > Alright! Noted. Let us know if you need any help from Prajnaa! 🌿

- **Hinglish (`hinglish`)**:
  > Theek hai ji, note kar liya. Prajnaa se kisi bhi sahayata ke liye batayein! 🌿

- **Hindi (`hi`)**:
  > ठीक है जी, नोट कर लिया गया है। प्रज्ञा से किसी भी सहायता के लिए हमें बताएं! 🌿

##### 2.7 Acknowledgement Got It / Samajh Gaye (`auto_ack_got_it`)
- **Intent**: `acknowledgements` | **Sub-Intent**: `got_it`

- **English (`en`)**:
  > Understood! We are right here if you need anything.

- **Hinglish (`hinglish`)**:
  > Samajh gaye ji! Koi bhi baat ho toh hum yahin available hain.

- **Hindi (`hi`)**:
  > समझ गए जी! कोई भी आवश्यकता हो तो हम यहीं उपलब्ध हैं।

##### 2.8 Thanks For Information Received (`auto_thanks_info_provided`)
- **Intent**: `thank_you` | **Sub-Intent**: `info_received`

- **English (`en`)**:
  > Glad the information was helpful! Reach out whenever you'd like to place an order.

- **Hinglish (`hinglish`)**:
  > Khushi hui ki jaankari kaam aayi! Jab bhi order book karna ho, bataiye ji.

- **Hindi (`hi`)**:
  > प्रसन्नता हुई कि जानकारी उपयोगी रही! जब भी ऑर्डर बुक करना हो, कृपया बताएं।

##### 2.9 Patron Trust Appreciation (`auto_thanks_patron_appreciation`)
- **Intent**: `thank_you` | **Sub-Intent**: `patron_trust`

- **English (`en`)**:
  > Thank you for placing your trust in Prajnaa Market. We value your patronage!

- **Hinglish (`hinglish`)**:
  > Prajnaa Market par apna bharosa jatane ke liye bahut shukriya ji! 🙏

- **Hindi (`hi`)**:
  > प्रज्ञा मार्केट पर अपना विश्वास बनाए रखने के लिए बहुत-बहुत धन्यवाद जी! 🙏

##### 2.10 Always At Your Service (`auto_ack_at_your_service`)
- **Intent**: `thank_you` | **Sub-Intent**: `at_service`

- **English (`en`)**:
  > Always at your service. Wishing you and your family good health!

- **Hinglish (`hinglish`)**:
  > Hamesha aapki seva mein hazir hain ji. Aapke parivar ke uttam swasthya ki kamna karte hain!

- **Hindi (`hi`)**:
  > सदा आपकी सेवा में उपस्थित हैं जी। आपके और आपके परिवार के उत्तम स्वास्थ्य की कामना करते हैं!

---

### Category 3: 3. Casual Conversations (8 templates)
{#category-3-casual-conversations}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_casual_how_are_you` | `casual_conversation / how_are_you` | **How Are You Response** | None |
| 2 | `auto_casual_what_doing` | `casual_conversation / what_doing` | **What Are You Doing Response** | None |
| 3 | `auto_casual_availability_check` | `casual_conversation / availability_check` | **Are You Available Check** | None |
| 4 | `auto_casual_location` | `casual_conversation / location` | **Where Are You Located Response** | None |
| 5 | `auto_casual_everything_good` | `casual_conversation / everything_good` | **Is Everything Good Response** | None |
| 6 | `auto_casual_compliment` | `casual_conversation / compliment` | **Compliment / Praise Response** | None |
| 7 | `auto_casual_closing_bye` | `casual_conversation / closing_bye` | **Polite Closing / Bye** | None |
| 8 | `auto_casual_weather` | `casual_conversation / weather` | **Mountain Weather Casual Chat** | None |

#### Multilingual Variations

##### 3.1 How Are You Response (`auto_casual_how_are_you`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `how_are_you`

- **English (`en`)**:
  > We are doing very well, thank you! How are you doing today?

- **Hinglish (`hinglish`)**:
  > Hum bilkul theek hain ji, dhanyavaad! Aap bataiye, aap kaise hain?

- **Hindi (`hi`)**:
  > हम बिल्कुल ठीक हैं जी, पूछने के लिए धन्यवाद! आप बताएं, आप कैसे हैं?

##### 3.2 What Are You Doing Response (`auto_casual_what_doing`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `what_doing`

- **English (`en`)**:
  > We are packing fresh Himalayan produce and assisting our patrons. How can we help you today?

- **Hinglish (`hinglish`)**:
  > Himalayan fresh harvest ki packaging aur patrons ki madad mein lage hain ji. Batayein aapke liye kya kar sakte hain?

- **Hindi (`hi`)**:
  > हिमालयी ताजे उत्पादों की पैकिंग और ग्राहकों की सहायता कर रहे हैं जी। बताएं आपके लिए क्या सेवा कर सकते हैं?

##### 3.3 Are You Available Check (`auto_casual_availability_check`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `availability_check`

- **English (`en`)**:
  > Yes, we are live and active to help you right now! What would you like to know?

- **Hinglish (`hinglish`)**:
  > Ji haan, hum bilkul live aur available hain aapki help ke liye! Batayein kya jaanna chahte hain?

- **Hindi (`hi`)**:
  > जी हाँ, हम आपकी सहायता के लिए बिल्कुल उपलब्ध हैं! बताएं क्या जानकारी चाहिए?

##### 3.4 Where Are You Located Response (`auto_casual_location`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `location`

- **English (`en`)**:
  > We are based in Solan, Himachal Pradesh (173212). All our produce is harvested in high Himalayas and shipped directly from Solan.

- **Hinglish (`hinglish`)**:
  > Hum Solan, Himachal Pradesh (173212) mein based hain ji. Saara produce high Himalayas se harvest hokar Solan hub se dispatch hota hai.

- **Hindi (`hi`)**:
  > हम सोलन, हिमाचल प्रदेश (173212) में स्थित हैं जी। सभी उत्पाद ऊंचे हिमालयी क्षेत्रों से एकत्र कर सोलन हब से सीधे भेजे जाते हैं।

##### 3.5 Is Everything Good Response (`auto_casual_everything_good`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `everything_good`

- **English (`en`)**:
  > Everything is wonderful here! Hope all is great at your end too.

- **Hinglish (`hinglish`)**:
  > Ji sab badhiya hai yahan! Umeed hai aapke wahan bhi sab kushal mangal hoga.

- **Hindi (`hi`)**:
  > जी यहाँ सब बहुत अच्छा है! आशा है आपके वहाँ भी सब कुशल-मंगल होगा।

##### 3.6 Compliment / Praise Response (`auto_casual_compliment`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `compliment`

- **English (`en`)**:
  > Thank you for the kind words! We take great pride in delivering 100% pure Himalayan goodness.

- **Hinglish (`hinglish`)**:
  > Aapke pyare shabdon ke liye shukriya ji! 100% shuddh Himalayan produce deliver karna hi hamara sankalp hai. 🌿

- **Hindi (`hi`)**:
  > आपकी प्रशंसा के लिए बहुत-बहुत धन्यवाद जी! 100% शुद्ध हिमालयी उत्पाद उपलब्ध कराना ही हमारा संकल्प है। 🌿

##### 3.7 Polite Closing / Bye (`auto_casual_closing_bye`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `closing_bye`

- **English (`en`)**:
  > Goodbye! Take care and stay healthy. Feel free to message us whenever you need anything.

- **Hinglish (`hinglish`)**:
  > Alvida ji! Apna khayal rakhein aur swasth rahein. Jab bhi zaroorat ho, message karein. 🌿

- **Hindi (`hi`)**:
  > अलविदा जी! अपना ध्यान रखें और स्वस्थ रहें। जब भी आवश्यकता हो, निसंकोच संपर्क करें। 🌿

##### 3.8 Mountain Weather Casual Chat (`auto_casual_weather`)
- **Intent**: `casual_conversation` | **Sub-Intent**: `weather`

- **English (`en`)**:
  > The mountain air is crisp and refreshing here in Solan! How is the weather at your place?

- **Hinglish (`hinglish`)**:
  > Solan ke pahadon mein hawa bahut taaza aur thandi hai ji! Aapke wahan mausam kaisa hai?

- **Hindi (`hi`)**:
  > सोलन की पहाड़ियों में मौसम बहुत सुहावना और ताज़ा है जी! आपके वहाँ मौसम कैसा है?

---

### Category 4: 4. General Assistance & Clarification (8 templates)
{#category-4-general-assistance-clarification}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_assist_how_to_order` | `general_assistance / how_to_order` | **How To Order Guide** | `{catalogueLink}` |
| 2 | `auto_assist_purity_guarantee` | `general_assistance / purity_guarantee` | **Purity and Lab Testing Guarantee** | None |
| 3 | `auto_assist_pan_india` | `general_assistance / pan_india` | **Pan-India Delivery Assistance** | None |
| 4 | `auto_assist_clarify_explain` | `confusion_clarification / explain_simpler` | **Clarification / Explanation Request** | None |
| 5 | `auto_assist_payment_methods` | `general_assistance / payment_methods` | **Accepted Payment Methods** | None |
| 6 | `auto_assist_followup_response` | `follow_up / here_to_help` | **Follow-up Response / We Are Here** | None |
| 7 | `auto_assist_affirmative_followup` | `positive_confirmation / affirmative_ready` | **Positive Response Follow-up** | None |
| 8 | `auto_assist_negative_respect` | `negative_declination / respect_decision` | **Negative Response Polite Respect** | None |

#### Multilingual Variations

##### 4.1 How To Order Guide (`auto_assist_how_to_order`)
- **Intent**: `general_assistance` | **Sub-Intent**: `how_to_order`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Ordering is simple! Just tell us the product name and quantity here on WhatsApp, or browse our live catalogue: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Order karna bahut aasan hai ji! Bas product ka naam aur quantity yahan WhatsApp par bata dijiye, ya catalogue dekhein: {catalogueLink}

- **Hindi (`hi`)**:
  > ऑर्डर करना बहुत आसान है जी! बस उत्पाद का नाम और मात्रा यहाँ व्हाट्सएप पर बताएं, या कैटलॉग देखें: {catalogueLink}

##### 4.2 Purity and Lab Testing Guarantee (`auto_assist_purity_guarantee`)
- **Intent**: `general_assistance` | **Sub-Intent**: `purity_guarantee`

- **English (`en`)**:
  > Every Prajnaa product is 100% pure, unadulterated, and third-party lab-certified. We source directly from high-altitude farmers without middlemen.

- **Hinglish (`hinglish`)**:
  > Prajnaa ka har product 100% pure, bina milawat aur lab-tested hai. Hum high Himalayas ke farmers se direct harvest karte hain.

- **Hindi (`hi`)**:
  > प्रज्ञा का प्रत्येक उत्पाद 100% शुद्ध, प्राकृतिक और लैब-प्रमाणित है। हम बिना किसी बिचौलिए के सीधे पहाड़ी किसानों से लाते हैं।

##### 4.3 Pan-India Delivery Assistance (`auto_assist_pan_india`)
- **Intent**: `general_assistance` | **Sub-Intent**: `pan_india`

- **English (`en`)**:
  > Yes, we deliver pan-India via Shipping directly to your doorstep with protective artisan packaging.

- **Hinglish (`hinglish`)**:
  > Ji haan, hum poore Bharat mein Shipping dwara surakshit packaging ke saath doorstep delivery karte hain.

- **Hindi (`hi`)**:
  > जी हाँ, हम पूरे भारत में शिपिंग के माध्यम से सुरक्षित पैकेजिंग के साथ होम डिलीवरी करते हैं।

##### 4.4 Clarification / Explanation Request (`auto_assist_clarify_explain`)
- **Intent**: `confusion_clarification` | **Sub-Intent**: `explain_simpler`

- **English (`en`)**:
  > Allow me to clarify simply: We harvest natural Himalayan produce and deliver it straight to your address. What would you like to know more about?

- **Hinglish (`hinglish`)**:
  > Aasan shabdon mein samjha dete hain ji: Hum high Himalayas se 100% pure natural products direct aapke ghar tak deliver karte hain. Kis cheez ki jankari chahiye?

- **Hindi (`hi`)**:
  > सरल शब्दों में स्पष्ट कर देते हैं जी: हम हिमालय से 100% शुद्ध प्राकृतिक उत्पाद सीधे आपके घर तक पहुंचाते हैं। आप किस विषय में जानना चाहते हैं?

##### 4.5 Accepted Payment Methods (`auto_assist_payment_methods`)
- **Intent**: `general_assistance` | **Sub-Intent**: `payment_methods`

- **English (`en`)**:
  > We accept UPI (GPay, PhonePe, Paytm), Net Banking, and Debit/Credit Cards. You can easily pay to our official UPI: prajnaa@upi.

- **Hinglish (`hinglish`)**:
  > Hum UPI (GPay, PhonePe, Paytm), Net Banking aur Cards accept karte hain ji. Official UPI ID `prajnaa@upi` par aasan payment hoti hai.

- **Hindi (`hi`)**:
  > हम UPI (GPay, PhonePe, Paytm), नेट बैंकिंग और कार्ड स्वीकार करते हैं जी। हमारे आधिकारिक UPI ID `prajnaa@upi` पर भुगतान कर सकते हैं।

##### 4.6 Follow-up Response / We Are Here (`auto_assist_followup_response`)
- **Intent**: `follow_up` | **Sub-Intent**: `here_to_help`

- **English (`en`)**:
  > Yes, we are right here! How may we assist you with your query?

- **Hinglish (`hinglish`)**:
  > Ji haan, hum yahin hain! Batayein, aapko kis baare mein jankari chahiye?

- **Hindi (`hi`)**:
  > जी हाँ, हम यहीं उपस्थित हैं! बताएं, आपकी किस प्रकार सहायता कर सकते हैं?

##### 4.7 Positive Response Follow-up (`auto_assist_affirmative_followup`)
- **Intent**: `positive_confirmation` | **Sub-Intent**: `affirmative_ready`

- **English (`en`)**:
  > Wonderful! Please let us know your details or product choice so we can proceed.

- **Hinglish (`hinglish`)**:
  > Bahut badhiya ji! Apni requirement ya delivery details share kar dijiye, hum aage proceed karte hain.

- **Hindi (`hi`)**:
  > बहुत बढ़िया जी! कृपया अपनी आवश्यकता या डिलीवरी विवरण साझा करें, हम प्रक्रिया आगे बढ़ाते हैं।

##### 4.8 Negative Response Polite Respect (`auto_assist_negative_respect`)
- **Intent**: `negative_declination` | **Sub-Intent**: `respect_decision`

- **English (`en`)**:
  > No problem at all! We completely respect your choice. Feel free to connect whenever you need pure mountain produce.

- **Hinglish (`hinglish`)**:
  > Koi baat nahi ji! Hum aapki baat samajhte hain. Jab bhi zaroorat ho, batayein. Have a great day! 🌿

- **Hindi (`hi`)**:
  > कोई बात नहीं जी! हम आपकी बात का पूरा सम्मान करते हैं। जब भी आवश्यकता हो, निसंकोच संपर्क करें। आपका दिन शुभ हो! 🌿

---

### Category 5: 5. Product Catalogue Enquiries (10 templates)
{#category-5-product-catalogue-enquiries}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_cat_general` | `catalogue_request / general_catalogue` | **General Catalogue Overview** | `{catalogueLink}` |
| 2 | `auto_cat_dryfruits` | `catalogue_request / dryfruits` | **Dry Fruits & Nuts Catalogue** | `{catalogueLink}` |
| 3 | `auto_cat_honey` | `catalogue_request / honey` | **Honey Collection Catalogue** | `{catalogueLink}` |
| 4 | `auto_cat_ghee` | `catalogue_request / ghee` | **A2 Badri Cow Ghee Catalogue** | `{catalogueLink}` |
| 5 | `auto_cat_shilajit` | `catalogue_request / shilajit` | **Shilajit Vitality Catalogue** | `{catalogueLink}` |
| 6 | `auto_cat_spices` | `catalogue_request / spices` | **Spices & Haldi Catalogue** | `{catalogueLink}` |
| 7 | `auto_cat_salts` | `catalogue_request / salts` | **Natural Salts Catalogue** | `{catalogueLink}` |
| 8 | `auto_cat_pickles` | `catalogue_request / pickles` | **Heirloom Pickles Catalogue** | `{catalogueLink}` |
| 9 | `auto_cat_seeds` | `catalogue_request / seeds` | **Seeds & Superfoods Catalogue** | `{catalogueLink}` |
| 10 | `auto_cat_seasonal` | `catalogue_request / seasonal` | **Seasonal Fresh Harvests** | `{catalogueLink}` |

#### Multilingual Variations

##### 5.1 General Catalogue Overview (`auto_cat_general`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `general_catalogue`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Here is our complete authentic Himalayan catalogue: {catalogueLink}
  > 
  > Key Harvests:
  > • Raw Multiflora Honey (₹550/500g)
  > • Pure Shilajit Resin (₹1,450/20g)
  > • A2 Badri Cow Desi Ghee (₹2,100/1L)
  > • Mamra Almonds (₹1,250/500g)
  > • Kagzi Walnuts (₹650/500g)
  > • Kashmiri Saffron (₹380/1g)
  > 
  > Which harvest would you like to know more about?

- **Hinglish (`hinglish`)**:
  > Hamara poora authentic Himalayan catalogue yahan dekhein: {catalogueLink}
  > 
  > Top Harvests:
  > • Raw Multiflora Honey (₹550/500g)
  > • Pure Shilajit Resin (₹1,450/20g)
  > • A2 Badri Cow Desi Ghee (₹2,100/1L)
  > • Mamra Almonds (₹1,250/500g)
  > • Kagzi Walnuts (₹650/500g)
  > • Kashmiri Kesar (₹380/1g)
  > 
  > Aapko kis product ke baare mein jaanna ya order karna hai?

- **Hindi (`hi`)**:
  > हमारा संपूर्ण प्रामाणिक हिमालयी कैटलॉग यहाँ देखें: {catalogueLink}
  > 
  > प्रमुख उत्पाद:
  > • हिमालयन रॉ शहद (₹550/500g)
  > • शुद्ध शिलाजीत रेजिन (₹1,450/20g)
  > • A2 बद्री गाय का देसी घी (₹2,100/1L)
  > • मामरा बादाम (₹1,250/500g)
  > • कागज़ी अखरोट (₹650/500g)
  > • कश्मीरी केसर (₹380/1g)
  > 
  > आप किस उत्पाद के बारे में जानना या ऑर्डर करना चाहते हैं?

##### 5.2 Dry Fruits & Nuts Catalogue (`auto_cat_dryfruits`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `dryfruits`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Our Himalayan Dry Fruits collection includes Kashmiri Mamra Almonds (₹1,250), High-Oil Kagzi Walnuts (₹650), and Ladakh Sun-Dried Apricots (₹999). Explore: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamari Himalayan Dry Fruits collection mein Kashmiri Mamra Badam (₹1,250), High-Oil Kagzi Akhrot (₹650) aur Ladakh Dried Apricots (₹999) uplabdh hain: {catalogueLink}

- **Hindi (`hi`)**:
  > हमारे हिमालयी मेवों में कश्मीरी मामरा बादाम (₹1,250), अखरोट गिरी (₹650) और लद्दाख सूखी खुबानी (₹999) उपलब्ध हैं: {catalogueLink}

##### 5.3 Honey Collection Catalogue (`auto_cat_honey`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `honey`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Our Himalayan Raw Multiflora Honey is 100% unprocessed, natural enzymes-rich, in 500g glass jars at ₹550. Details: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamara Himalayan Raw Honey 100% unprocessed, natural enzymes se bharpoor hai. 500g glass jar ₹550 mein uplabdh hai: {catalogueLink}

- **Hindi (`hi`)**:
  > हमारा हिमालयन रॉ शहद 100% प्राकृतिक व एंजाइम-युक्त है। 500 ग्राम का कांच का जार ₹550 में उपलब्ध है: {catalogueLink}

##### 5.4 A2 Badri Cow Ghee Catalogue (`auto_cat_ghee`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `ghee`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Our A2 Desi Ghee is prepared using the traditional wooden bilona churn method from grass-fed Himalayan Badri cows (1L at ₹2,100). Details: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamara A2 Desi Ghee pahadi Badri gaay ke doodh se paramparik bilona method dwara banaya jata hai (1L at ₹2,100): {catalogueLink}

- **Hindi (`hi`)**:
  > हमारा A2 देसी घी पहाड़ी बद्री गाय के दूध से पारंपरिक बिलोना पद्धति द्वारा तैयार किया जाता है (1L ₹2,100 में): {catalogueLink}

##### 5.5 Shilajit Vitality Catalogue (`auto_cat_shilajit`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `shilajit`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Our Pure Himalayan Shilajit Resin is harvested at 16,000+ feet, sun-purified, and third-party lab-certified (20g at ₹1,450). Details: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamara Pure Himalayan Shilajit 16,000+ feet ki unchayi se harvest aur lab-certified hai (20g at ₹1,450): {catalogueLink}

- **Hindi (`hi`)**:
  > हमारा शुद्ध हिमालयन शिलाजीत 16,000+ फीट की ऊंचाई से एकत्र और लैब-प्रमाणित है (20g ₹1,450 में): {catalogueLink}

##### 5.6 Spices & Haldi Catalogue (`auto_cat_spices`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `spices`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Explore our stone-ground mountain spices: Lakadong High-Curcumin Turmeric (₹240/250g) and House Garam Masala (₹320/200g). Catalogue: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamare pahadi stone-ground masale dekhein: Lakadong Turmeric (₹240/250g) aur House Garam Masala (₹320/200g): {catalogueLink}

- **Hindi (`hi`)**:
  > हमारे पत्थर पर पिसे मसाले: लकाडोंग हल्दी (₹240/250g) और गरम मसाला (₹320/200g)। कैटलॉग देखें: {catalogueLink}

##### 5.7 Natural Salts Catalogue (`auto_cat_salts`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `salts`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > We offer natural Pink Himalayan Rock Salt (₹180/500g) and Kiln-Fired Kala Namak (₹160/500g). Pure mineral goodness: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamare paas Pink Himalayan Salt (₹180/500g) aur Black Salt (₹160/500g) uplabdh hain: {catalogueLink}

- **Hindi (`hi`)**:
  > हमारे पास प्राकृतिक गुलाबी हिमालयन नमक (₹180/500g) और काला नमक (₹160/500g) उपलब्ध है: {catalogueLink}

##### 5.8 Heirloom Pickles Catalogue (`auto_cat_pickles`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `pickles`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Traditional sun-aged pickles: Heirloom Mango Pickle (₹380/400g) and Salt-Cured Lemon Pickle (₹320/400g), made in wood-pressed mustard oil: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Dhoop mein pake paramparik achar: Heirloom Mango Pickle (₹380) aur Lemon Pickle (₹320): {catalogueLink}

- **Hindi (`hi`)**:
  > पारंपरिक धूप में पके अचार: आम का अचार (₹380) और नींबू का अचार (₹320): {catalogueLink}

##### 5.9 Seeds & Superfoods Catalogue (`auto_cat_seeds`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `seeds`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Nutrient-rich mountain seeds: Five-Seed Mix (₹280/500g) and Organic Black Chia Seeds (₹220/250g). Full catalogue: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Superfood seeds: Five-Seed Mix (₹280/500g) aur Chia Seeds (₹220/250g): {catalogueLink}

- **Hindi (`hi`)**:
  > पौष्टिक बीज: फाइव-सीड मिक्स (₹280/500g) और चिया सीड्स (₹220/250g)। कैटलॉग: {catalogueLink}

##### 5.10 Seasonal Fresh Harvests (`auto_cat_seasonal`)
- **Intent**: `catalogue_request` | **Sub-Intent**: `seasonal`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Our fresh seasonal harvests are hand-packed at Solan Mountain Hub. Browse all live available options: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Hamare taaza seasonal harvests Solan Mountain Hub par pack hote hain. Yahan dekhein: {catalogueLink}

- **Hindi (`hi`)**:
  > हमारे ताज़े मौसमी उत्पाद सोलन हब पर पैक किए जाते हैं। सभी विकल्प यहाँ देखें: {catalogueLink}

---

### Category 6: 6. Product Details & Pricing (12 templates)
{#category-6-product-details-pricing}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_price_honey` | `price_enquiry / honey` | **Honey Price & Details** | `{productLink}` |
| 2 | `auto_price_shilajit` | `price_enquiry / shilajit` | **Shilajit Price & Details** | `{productLink}` |
| 3 | `auto_price_ghee` | `price_enquiry / ghee` | **Badri Ghee Price & Details** | `{productLink}` |
| 4 | `auto_price_almonds` | `price_enquiry / almonds` | **Mamra Almonds Price & Details** | `{productLink}` |
| 5 | `auto_price_walnuts` | `price_enquiry / walnuts` | **Kagzi Walnuts Price & Details** | `{productLink}` |
| 6 | `auto_price_saffron` | `price_enquiry / saffron` | **Kashmiri Saffron Price & Details** | `{productLink}` |
| 7 | `auto_price_turmeric` | `price_enquiry / turmeric` | **Turmeric Price & Details** | `{productLink}` |
| 8 | `auto_price_salt` | `price_enquiry / salt` | **Pink Salt Price & Details** | `{productLink}` |
| 9 | `auto_price_pickles` | `price_enquiry / pickle` | **Pickle Price & Details** | `{productLink}` |
| 10 | `auto_price_contextual` | `price_enquiry / contextual_price` | **Contextual Product Price** | `{productName}`, `{packaging}`, `{livePrice}`, `{productLink}` |
| 11 | `auto_price_multi_variant` | `price_enquiry / multi_variant` | **Multiple Sizes Pricing Overview** | `{productName}`, `{livePrice}`, `{productLink}` |
| 12 | `auto_price_bulk_discount` | `price_enquiry / bulk_pricing` | **Bulk / Wholesale Pricing Inquiry** | None |

#### Multilingual Variations

##### 6.1 Honey Price & Details (`auto_price_honey`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `honey`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Himalayan Raw Multiflora Honey (500g Glass Jar) is available for ₹550. 100% raw, unheated, enzyme-rich: {productLink}

- **Hinglish (`hinglish`)**:
  > Ji, Himalayan Raw Honey (500g Glass Jar) ki price ₹550 hai. 100% pure raw aur unheated: {productLink}

- **Hindi (`hi`)**:
  > जी, हिमालयन रॉ शहद (500 ग्राम कांच का जार) की कीमत ₹550 है। 100% शुद्ध और प्राकृतिक: {productLink}

##### 6.2 Shilajit Price & Details (`auto_price_shilajit`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `shilajit`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Pure Himalayan Shilajit Resin (20g Jar with measuring spoon) is ₹1,450. Lab certified with 75%+ fulvic acid: {productLink}

- **Hinglish (`hinglish`)**:
  > Shilajit Resin (20g pack) ki price ₹1,450 hai ji. Lab certified aur 75%+ fulvic acid se bharpoor: {productLink}

- **Hindi (`hi`)**:
  > शुद्ध हिमालयन शिलाजीत रेजिन (20g) की कीमत ₹1,450 है। 75%+ फुल्विक एसिड व लैब-प्रमाणित: {productLink}

##### 6.3 Badri Ghee Price & Details (`auto_price_ghee`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `ghee`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our A2 Badri Cow Bilona Desi Ghee (1 Litre Glass Jar) is ₹2,100. Made with traditional bilona method: {productLink}

- **Hinglish (`hinglish`)**:
  > A2 Badri Cow Bilona Desi Ghee (1L Glass Jar) ₹2,100 mein available hai ji: {productLink}

- **Hindi (`hi`)**:
  > A2 बद्री गाय का बिलोना देसी घी (1 लीटर जार) ₹2,100 में उपलब्ध है जी: {productLink}

##### 6.4 Mamra Almonds Price & Details (`auto_price_almonds`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `almonds`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our premium Kashmiri Mamra Almonds (500g pack) are available for ₹1,250. High natural oil content: {productLink}

- **Hinglish (`hinglish`)**:
  > Kashmiri Mamra Badam (500g pack) ki price ₹1,250 hai ji. High oil content aur 100% natural: {productLink}

- **Hindi (`hi`)**:
  > कश्मीरी मामरा बादाम (500g पैक) की कीमत ₹1,250 है जी। उच्च तेल और पौष्टिकता से भरपूर: {productLink}

##### 6.5 Kagzi Walnuts Price & Details (`auto_price_walnuts`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `walnuts`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Kashmiri High-Oil Kagzi Walnuts (500g pack) are available for ₹650. Freshly cracked kernels: {productLink}

- **Hinglish (`hinglish`)**:
  > Kashmiri Kagzi Akhrot Giri (500g pack) ₹650 mein available hai ji. Fresh aur high-oil kernels: {productLink}

- **Hindi (`hi`)**:
  > कश्मीरी कागज़ी अखरोट गिरी (500g) ₹650 में उपलब्ध है जी। ताज़ा और तेल से भरपूर: {productLink}

##### 6.6 Kashmiri Saffron Price & Details (`auto_price_saffron`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `saffron`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Pure Kashmiri Mongra Saffron (1g airtight glass vial) is ₹380. Grade-A certified aroma and color: {productLink}

- **Hinglish (`hinglish`)**:
  > Pure Kashmiri Mongra Kesar (1g glass vial) ki price ₹380 hai ji. Grade-A certified shuddh kesar: {productLink}

- **Hindi (`hi`)**:
  > शुद्ध कश्मीरी मोंगरा केसर (1g कांच की शीशी) की कीमत ₹380 है जी। ग्रेड-ए प्रमाणित शुद्धता: {productLink}

##### 6.7 Turmeric Price & Details (`auto_price_turmeric`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `turmeric`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Stone-Ground Lakadong Turmeric (250g pack) is ₹240. Exceptionally high 7%+ natural curcumin: {productLink}

- **Hinglish (`hinglish`)**:
  > Stone-Ground Lakadong Turmeric (250g) ₹240 mein available hai. 7%+ high curcumin content: {productLink}

- **Hindi (`hi`)**:
  > पत्थर पर पिसी लकाडोंग हल्दी (250g) ₹240 में उपलब्ध है। 7%+ प्राकृतिक करक्यूमिन: {productLink}

##### 6.8 Pink Salt Price & Details (`auto_price_salt`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `salt`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Mineral-Rich Pink Himalayan Rock Salt (500g pack) is ₹180: {productLink}

- **Hinglish (`hinglish`)**:
  > Mineral-rich Pink Himalayan Rock Salt (500g) ki price ₹180 hai ji: {productLink}

- **Hindi (`hi`)**:
  > प्राकृतिक गुलाबी हिमालयन सेंधा नमक (500g) की कीमत ₹180 है जी: {productLink}

##### 6.9 Pickle Price & Details (`auto_price_pickles`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `pickle`
- **Variables**: `{productLink}`

- **English (`en`)**:
  > Our Heirloom Mango Pickle (400g Glass Jar) is ₹380, and Salt-Cured Lemon Pickle is ₹320: {productLink}

- **Hinglish (`hinglish`)**:
  > Heirloom Mango Pickle (400g) ₹380 aur Salt-Cured Lemon Pickle ₹320 mein available hai: {productLink}

- **Hindi (`hi`)**:
  > आम का पारंपरिक अचार (400g) ₹380 और नींबू का अचार ₹320 में उपलब्ध है: {productLink}

##### 6.10 Contextual Product Price (`auto_price_contextual`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `contextual_price`
- **Variables**: `{productName}`, `{packaging}`, `{livePrice}`, `{productLink}`

- **English (`en`)**:
  > Our {productName} ({packaging}) is available for ₹{livePrice}. View details: {productLink}

- **Hinglish (`hinglish`)**:
  > Ji, {productName} ({packaging}) ki price ₹{livePrice} hai. Details: {productLink}

- **Hindi (`hi`)**:
  > जी, {productName} ({packaging}) की कीमत ₹{livePrice} है। विवरण: {productLink}

##### 6.11 Multiple Sizes Pricing Overview (`auto_price_multi_variant`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `multi_variant`
- **Variables**: `{productName}`, `{livePrice}`, `{productLink}`

- **English (`en`)**:
  > {productName} is available in multiple pack sizes starting from ₹{livePrice}. Details: {productLink}

- **Hinglish (`hinglish`)**:
  > {productName} alag-alag pack sizes mein ₹{livePrice} se shuru hai ji. Details yahan dekhein: {productLink}

- **Hindi (`hi`)**:
  > {productName} विभिन्न साइज़ में ₹{livePrice} से उपलब्ध है जी। विवरण: {productLink}

##### 6.12 Bulk / Wholesale Pricing Inquiry (`auto_price_bulk_discount`)
- **Intent**: `price_enquiry` | **Sub-Intent**: `bulk_pricing`

- **English (`en`)**:
  > For wholesale or bulk orders (5kg+), we offer direct commercial rates. Please share your required quantity so we can provide a customized quote.

- **Hinglish (`hinglish`)**:
  > Bulk ya wholesale (5kg+) ke liye hum direct special rates dete hain ji. Apni quantity bataiye, hum quote bhejte hain.

- **Hindi (`hi`)**:
  > थोक या बल्क ऑर्डर (5kg+) के लिए हम विशेष रियायती दरें प्रदान करते हैं जी। कृपया अपनी मात्रा बताएं।

---

### Category 7: 7. Packaging & Availability (8 templates)
{#category-7-packaging-availability}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_pack_in_stock` | `packaging_availability / in_stock` | **Product In Stock Confirmation** | `{productName}` |
| 2 | `auto_pack_out_of_stock` | `packaging_availability / out_of_stock` | **Product Out of Stock Notice** | `{productName}` |
| 3 | `auto_pack_glass_jar` | `packaging_availability / glass_packaging` | **Glass Jar Protective Packaging** | None |
| 4 | `auto_pack_shelf_life` | `packaging_availability / shelf_life` | **Shelf Life & Storage Instructions** | None |
| 5 | `auto_pack_available_sizes` | `packaging_availability / available_sizes` | **Available Sizes Overview** | `{productName}`, `{packaging}` |
| 6 | `auto_pack_preorder` | `packaging_availability / pre_order` | **Pre-Order Window Active** | `{productName}` |
| 7 | `auto_pack_zero_preservatives` | `packaging_availability / zero_preservatives` | **Zero Preservatives / Natural Packaging** | None |
| 8 | `auto_pack_eco_friendly` | `packaging_availability / eco_friendly` | **Eco-Friendly Mountain Packaging** | None |

#### Multilingual Variations

##### 7.1 Product In Stock Confirmation (`auto_pack_in_stock`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `in_stock`
- **Variables**: `{productName}`

- **English (`en`)**:
  > Yes, {productName} is currently fresh in stock and ready to be dispatched from our Solan Hub!

- **Hinglish (`hinglish`)**:
  > Ji haan, {productName} bilkul fresh stock mein available hai aur Solan se dispatch ke liye ready hai!

- **Hindi (`hi`)**:
  > जी हाँ, {productName} वर्तमान में ताज़ा स्टॉक में उपलब्ध है और सोलन हब से भेजे जाने के लिए तैयार है!

##### 7.2 Product Out of Stock Notice (`auto_pack_out_of_stock`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `out_of_stock`
- **Variables**: `{productName}`

- **English (`en`)**:
  > Currently {productName} is out of stock as fresh batches are being harvested in the mountains. We will notify you once ready!

- **Hinglish (`hinglish`)**:
  > Ji, {productName} abhi stock mein nahi hai kyunki pahadon se fresh batch harvest ho raha hai. Stock aate hi batate hain!

- **Hindi (`hi`)**:
  > वर्तमान में {productName} उपलब्ध नहीं है क्योंकि पहाड़ों से ताज़ा बैच तैयार किया जा रहा है। स्टॉक आते ही सूचित करेंगे!

##### 7.3 Glass Jar Protective Packaging (`auto_pack_glass_jar`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `glass_packaging`

- **English (`en`)**:
  > We package our Honey, Ghee, and Shilajit strictly in food-grade glass jars with multi-layered shock-proof eco cushioning for safe transit.

- **Hinglish (`hinglish`)**:
  > Hum Honey, Ghee aur Shilajit ko food-grade glass jars mein shock-proof eco packing ke saath deliver karte hain.

- **Hindi (`hi`)**:
  > हम शहद, घी और शिलाजीत को सुरक्षित कांच के जार में मजबूत सुरक्षात्मक पैकिंग के साथ भेजते हैं।

##### 7.4 Shelf Life & Storage Instructions (`auto_pack_shelf_life`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `shelf_life`

- **English (`en`)**:
  > Our raw mountain products have a natural long shelf life. Keep in a cool, dry place away from direct sunlight. Raw honey never truly expires!

- **Hinglish (`hinglish`)**:
  > Hamare pahadi products ki shelf life natural lambi hoti hai. Direct dhoop se door thandi jagah rakhein. Raw honey kabhi kharab nahi hota!

- **Hindi (`hi`)**:
  > हमारे प्राकृतिक उत्पादों की शेल्फ लाइफ बहुत लंबी होती है। इसे धूप से दूर ठंडे स्थान पर रखें। शुद्ध शहद कभी खराब नहीं होता!

##### 7.5 Available Sizes Overview (`auto_pack_available_sizes`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `available_sizes`
- **Variables**: `{productName}`, `{packaging}`

- **English (`en`)**:
  > Available pack sizes for {productName} are: {packaging}. Which size would you prefer?

- **Hinglish (`hinglish`)**:
  > {productName} in pack sizes mein uplabdh hai: {packaging}. Aapko kounsa size chahiye ji?

- **Hindi (`hi`)**:
  > {productName} इन साइज़ में उपलब्ध है: {packaging}। आप कौन सा साइज़ लेना चाहेंगे?

##### 7.6 Pre-Order Window Active (`auto_pack_preorder`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `pre_order`
- **Variables**: `{productName}`

- **English (`en`)**:
  > The pre-order window for {productName} is currently open! Book now to reserve fresh harvest before stock runs out.

- **Hinglish (`hinglish`)**:
  > {productName} ki pre-order booking live hai ji! Fresh harvest reserve karne ke liye abhi book karein.

- **Hindi (`hi`)**:
  > {productName} की प्री-ऑर्डर बुकिंग खुली है जी! ताज़ा बैच आरक्षित करने के लिए अभी बुक करें।

##### 7.7 Zero Preservatives / Natural Packaging (`auto_pack_zero_preservatives`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `zero_preservatives`

- **English (`en`)**:
  > We use zero chemical preservatives or artificial colors. All items are packed fresh upon harvesting.

- **Hinglish (`hinglish`)**:
  > Hamare products mein zero preservatives aur koi chemical nahi hota. Fresh pack karke bheja jata hai ji.

- **Hindi (`hi`)**:
  > हमारे उत्पादों में कोई रासायनिक संरक्षक (प्रिजर्वेटिव) नहीं होता। ताज़ा पैक करके भेजा जाता है।

##### 7.8 Eco-Friendly Mountain Packaging (`auto_pack_eco_friendly`)
- **Intent**: `packaging_availability` | **Sub-Intent**: `eco_friendly`

- **English (`en`)**:
  > We use 100% recyclable, plastic-free outer packaging to preserve nature and our Himalayan biosphere.

- **Hinglish (`hinglish`)**:
  > Hum plastic-free aur eco-friendly packaging use karte hain taki Himalayas ki prakriti surakshit rahe.

- **Hindi (`hi`)**:
  > हम पर्यावरण के अनुकूल और प्लास्टिक-मुक्त पैकेजिंग का उपयोग करते हैं।

---

### Category 8: 8. Order Placement & Modification (10 templates)
{#category-8-order-placement-modification}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_order_ask_items` | `order_placement / ask_items` | **Start Order - Ask Product & Quantity** | None |
| 2 | `auto_order_ask_address` | `order_placement / ask_address` | **Ask Delivery Name & Address** | `{productName}` |
| 3 | `auto_order_contextual_confirm` | `order_placement / contextual_confirm` | **Contextual Order Confirmation Prompt** | `{productName}`, `{quantity}` |
| 4 | `auto_order_address_received` | `order_placement / address_received` | **Address Received - Proceed To Pay** | None |
| 5 | `auto_order_modify_items` | `order_placement / modify_items` | **Modify Order Items Request** | None |
| 6 | `auto_order_change_address` | `order_placement / change_address` | **Change Delivery Address Request** | None |
| 7 | `auto_order_cancel_request` | `order_placement / cancel_order` | **Cancel Order Request** | None |
| 8 | `auto_order_repeat_previous` | `order_placement / repeat_order` | **Repeat Previous Order Request** | None |
| 9 | `auto_order_gift_pack` | `order_placement / gift_order` | **Gift Packaging Instructions** | None |
| 10 | `auto_order_free_shipping_notice` | `order_placement / free_shipping` | **Free Shipping Threshold Notice** | None |

#### Multilingual Variations

##### 8.1 Start Order - Ask Product & Quantity (`auto_order_ask_items`)
- **Intent**: `order_placement` | **Sub-Intent**: `ask_items`

- **English (`en`)**:
  > Certainly! Which product and how many packs would you like to order?

- **Hinglish (`hinglish`)**:
  > Bilkul ji! Aapko kounsa product aur kitne pack order karne hain, bataiye?

- **Hindi (`hi`)**:
  > बिल्कुल जी! आपको कौन सा उत्पाद और कितनी मात्रा में ऑर्डर करना है, बताएं?

##### 8.2 Ask Delivery Name & Address (`auto_order_ask_address`)
- **Intent**: `order_placement` | **Sub-Intent**: `ask_address`
- **Variables**: `{productName}`

- **English (`en`)**:
  > Great! To book your order of {productName}, please share your Name, Complete Delivery Address, and Pincode.

- **Hinglish (`hinglish`)**:
  > Bahut badhiya ji! {productName} ka order confirm karne ke liye apna Naam, Pura Address aur Pincode share kar dijiye.

- **Hindi (`hi`)**:
  > बहुत बढ़िया जी! {productName} का ऑर्डर पक्का करने के लिए कृपया अपना नाम, पूरा पता और पिनकोड भेजें।

##### 8.3 Contextual Order Confirmation Prompt (`auto_order_contextual_confirm`)
- **Intent**: `order_placement` | **Sub-Intent**: `contextual_confirm`
- **Variables**: `{productName}`, `{quantity}`

- **English (`en`)**:
  > Certainly! {quantity} pack(s) of {productName}. Would you like to proceed with this order?

- **Hinglish (`hinglish`)**:
  > Bilkul ji! {productName} ke {quantity} pack. Kya hum aapka order book karein?

- **Hindi (`hi`)**:
  > बिल्कुल जी! {productName} के {quantity} पैक। क्या हम आपका ऑर्डर बुक करें?

##### 8.4 Address Received - Proceed To Pay (`auto_order_address_received`)
- **Intent**: `order_placement` | **Sub-Intent**: `address_received`

- **English (`en`)**:
  > Thank you! Your delivery address has been received. Please pay via our official UPI ID `prajnaa@upi` and share the confirmation screenshot.

- **Hinglish (`hinglish`)**:
  > Dhanyavaad ji! Delivery address mil gaya hai. Kripya official UPI `prajnaa@upi` par payment karke screenshot share kar dein.

- **Hindi (`hi`)**:
  > धन्यवाद जी! डिलीवरी का पता प्राप्त हो गया है। कृपया आधिकारिक UPI `prajnaa@upi` पर भुगतान कर स्क्रीनशॉट साझा करें।

##### 8.5 Modify Order Items Request (`auto_order_modify_items`)
- **Intent**: `order_placement` | **Sub-Intent**: `modify_items`

- **English (`en`)**:
  > Sure! What modifications or additional products would you like to make to your order?

- **Hinglish (`hinglish`)**:
  > Ji bilkul! Order mein kya change karna chahte hain ya kounsa naya item add karna hai, batayein.

- **Hindi (`hi`)**:
  > जी बिल्कुल! ऑर्डर में क्या बदलाव करना चाहते हैं या कौन सा नया उत्पाद जोड़ना है, बताएं।

##### 8.6 Change Delivery Address Request (`auto_order_change_address`)
- **Intent**: `order_placement` | **Sub-Intent**: `change_address`

- **English (`en`)**:
  > Please share the new complete delivery address with pincode before dispatch so we can update it immediately.

- **Hinglish (`hinglish`)**:
  > Dispatch hone se pehle naya pura address pincode ke sath share kar dein, hum turant update kar dete hain ji.

- **Hindi (`hi`)**:
  > डिस्पैच होने से पहले कृपया नया पूरा पता पिनकोड सहित साझा करें, हम तुरंत अपडेट कर देंगे जी।

##### 8.7 Cancel Order Request (`auto_order_cancel_request`)
- **Intent**: `order_placement` | **Sub-Intent**: `cancel_order`

- **English (`en`)**:
  > Please share your order number. If the parcel has not yet been dispatched, we can cancel it for you immediately.

- **Hinglish (`hinglish`)**:
  > Apna order number share karein ji. Agar parcel abhi dispatch nahi hua hai toh hum turant cancel kar denge.

- **Hindi (`hi`)**:
  > कृपया अपना ऑर्डर नंबर बताएं। यदि पार्सल अभी डिस्पैच नहीं हुआ है, तो हम तुरंत रद्द कर देंगे।

##### 8.8 Repeat Previous Order Request (`auto_order_repeat_previous`)
- **Intent**: `order_placement` | **Sub-Intent**: `repeat_order`

- **English (`en`)**:
  > Delighted to arrange your repeat order! We will verify your previous items and confirm the delivery address.

- **Hinglish (`hinglish`)**:
  > Khushi hui aapka repeat order lekar! Pichle order ke items check karke hum turant confirm karte hain ji.

- **Hindi (`hi`)**:
  > आपका दोबारा ऑर्डर लेने में बहुत खुशी हुई! पिछले ऑर्डर की पुष्टि करके हम तुरंत प्रक्रिया आगे बढ़ाते हैं जी।

##### 8.9 Gift Packaging Instructions (`auto_order_gift_pack`)
- **Intent**: `order_placement` | **Sub-Intent**: `gift_order`

- **English (`en`)**:
  > Yes, we can prepare an artisan gift package with a handwritten mountain greeting note! Please share the recipient's details.

- **Hinglish (`hinglish`)**:
  > Ji haan, hum personalized gift message ke sath special packing kar denge! Recipient ki details share kar dijiye.

- **Hindi (`hi`)**:
  > जी हाँ, हम व्यक्तिगत शुभकामना संदेश के साथ विशेष गिफ्ट पैकिंग कर देंगे! प्राप्तकर्ता का विवरण साझा करें।

##### 8.10 Free Shipping Threshold Notice (`auto_order_free_shipping_notice`)
- **Intent**: `order_placement` | **Sub-Intent**: `free_shipping`

- **English (`en`)**:
  > Reminder: Doorstep delivery is 100% FREE on all orders above ₹1,500! Standard shipping is ₹50 on smaller orders.

- **Hinglish (`hinglish`)**:
  > Zaroori info: ₹1,500 se upar ke sabhi orders par delivery bilkul FREE hai ji! Chhote orders par standard shipping ₹50 hai.

- **Hindi (`hi`)**:
  > महत्वपूर्ण जानकारी: ₹1,500 से ऊपर के सभी ऑर्डर्स पर डिलीवरी बिल्कुल मुफ़्त है जी! छोटे ऑर्डर्स पर ₹50 डिलीवरी शुल्क है।

---

### Category 9: 9. Order Status & Tracking (8 templates)
{#category-9-order-status-tracking}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_status_ask_number` | `order_status / ask_order_number` | **Ask Order Number** | None |
| 2 | `auto_status_packing` | `order_status / packing` | **Order Being Packed** | `{orderNumber}` |
| 3 | `auto_status_ready_dispatch` | `order_status / ready_dispatch` | **Order Ready For Dispatch** | `{orderNumber}` |
| 4 | `auto_status_dispatched` | `order_status / shipped` | **Order Dispatched / Shipped** | `{orderNumber}` |
| 5 | `auto_status_in_transit` | `order_status / in_transit` | **Order In Transit At Location** | `{orderNumber}`, `{location}` |
| 6 | `auto_status_delivering_tomorrow` | `order_status / delivering_tomorrow` | **Order Delivering Tomorrow Alert** | `{orderNumber}` |
| 7 | `auto_status_delivered` | `order_status / delivered` | **Order Delivered Confirmation** | `{orderNumber}` |
| 8 | `auto_status_weather_delay` | `order_status / weather_update` | **Mountain Weather Transit Update** | `{orderNumber}` |

#### Multilingual Variations

##### 9.1 Ask Order Number (`auto_status_ask_number`)
- **Intent**: `order_status` | **Sub-Intent**: `ask_order_number`

- **English (`en`)**:
  > Please share your order number so we can look up the real-time fulfillment status for you.

- **Hinglish (`hinglish`)**:
  > Ji, apna order number share kar dijiye, hum turant live status check karke batate hain.

- **Hindi (`hi`)**:
  > कृपया अपना ऑर्डर नंबर साझा करें, हम तुरंत स्टेटस चेक करके बताते हैं।

##### 9.2 Order Being Packed (`auto_status_packing`)
- **Intent**: `order_status` | **Sub-Intent**: `packing`
- **Variables**: `{orderNumber}`

- **English (`en`)**:
  > Your order #{orderNumber} is currently undergoing artisan quality inspection and protective packing at our Solan Hub.

- **Hinglish (`hinglish`)**:
  > Ji, aapka order #{orderNumber} abhi Solan Hub par quality check aur secure packing mein hai.

- **Hindi (`hi`)**:
  > जी, आपका ऑर्डर #{orderNumber} अभी सोलन हब पर गुणवत्ता जांच और सुरक्षित पैकिंग में है।

##### 9.3 Order Ready For Dispatch (`auto_status_ready_dispatch`)
- **Intent**: `order_status` | **Sub-Intent**: `ready_dispatch`
- **Variables**: `{orderNumber}`

- **English (`en`)**:
  > Your order #{orderNumber} is packed and scheduled for handover to Shipping today.

- **Hinglish (`hinglish`)**:
  > Aapka order #{orderNumber} pack ho chuka hai aur aaj hi Shipping ko handover kiya ja raha hai ji.

- **Hindi (`hi`)**:
  > आपका ऑर्डर #{orderNumber} पैक हो चुका है और आज ही शिपिंग को सौंपा जा रहा है जी।

##### 9.4 Order Dispatched / Shipped (`auto_status_dispatched`)
- **Intent**: `order_status` | **Sub-Intent**: `shipped`
- **Variables**: `{orderNumber}`

- **English (`en`)**:
  > Good news! Your order #{orderNumber} has been dispatched from our Solan Mountain Hub. We will share live updates at each transit hub.

- **Hinglish (`hinglish`)**:
  > Shubh samachar! Aapka order #{orderNumber} Solan hub se dispatch ho chuka hai ji. Har transit hub ki live update aati rahegi.

- **Hindi (`hi`)**:
  > शुभ समाचार! आपका ऑर्डर #{orderNumber} सोलन हब से रवाना हो चुका है जी। हर लोकेशन की अपडेट आपको मिलती रहेगी।

##### 9.5 Order In Transit At Location (`auto_status_in_transit`)
- **Intent**: `order_status` | **Sub-Intent**: `in_transit`
- **Variables**: `{orderNumber}`, `{location}`

- **English (`en`)**:
  > Transit update for order #{orderNumber}: Your package has safely reached {location} and is moving towards your destination.

- **Hinglish (`hinglish`)**:
  > Transit update ji: Aapka order #{orderNumber} abhi *{location}* pahunch chuka hai aur aapki taraf badh raha hai. 🚚

- **Hindi (`hi`)**:
  > पार्सल अपडेट: आपका ऑर्डर #{orderNumber} अभी *{location}* पहुँच चुका है और आपके गंतव्य की ओर अग्रसर है। 🚚

##### 9.6 Order Delivering Tomorrow Alert (`auto_status_delivering_tomorrow`)
- **Intent**: `order_status` | **Sub-Intent**: `delivering_tomorrow`
- **Variables**: `{orderNumber}`

- **English (`en`)**:
  > Delivery Alert: Your order #{orderNumber} is scheduled for delivery tomorrow! Please ensure someone is available at the address.

- **Hinglish (`hinglish`)**:
  > Zaroori update ji: Aapka order #{orderNumber} *kal deliver hone wala hai*. Kripya parcel receive karne ke liye phone available rakhein! 🌿

- **Hindi (`hi`)**:
  > डिलीवरी अलर्ट: आपका ऑर्डर #{orderNumber} *कल डिलीवर होगा जी*। कृपया पार्सल प्राप्त करने के लिए उपलब्ध रहें! 🌿

##### 9.7 Order Delivered Confirmation (`auto_status_delivered`)
- **Intent**: `order_status` | **Sub-Intent**: `delivered`
- **Variables**: `{orderNumber}`

- **English (`en`)**:
  > Your order #{orderNumber} has been successfully delivered! We hope you enjoy the authentic Himalayan harvest.

- **Hinglish (`hinglish`)**:
  > Aapka order #{orderNumber} successfully deliver ho gaya hai ji! Prajnaa se judne ke liye bahut shukriya. 🌿

- **Hindi (`hi`)**:
  > आपका ऑर्डर #{orderNumber} सफलतापूर्वक डिलीवर हो गया है जी! प्रज्ञा से जुड़ने के लिए बहुत धन्यवाद। 🌿

##### 9.8 Mountain Weather Transit Update (`auto_status_weather_delay`)
- **Intent**: `order_status` | **Sub-Intent**: `weather_update`
- **Variables**: `{orderNumber}`

- **English (`en`)**:
  > Mountain transit update: High-altitude rains/snow in Himachal Pradesh caused slight transit delays, but your order #{orderNumber} is safe and en route.

- **Hinglish (`hinglish`)**:
  > Pahadi transit update: Himachal mein mausam ki wajah se thodi transit deri hui hai, par aapka order #{orderNumber} safe aur raste mein hai ji.

- **Hindi (`hi`)**:
  > पहाड़ी मौसम अपडेट: हिमाचल में मौसम के कारण थोड़ी देरी हुई है, परंतु आपका ऑर्डर #{orderNumber} सुरक्षित रूप से रास्ते में है जी।

---

### Category 10: 10. Payment Enquiries (8 templates)
{#category-10-payment-enquiries}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_pay_instructions` | `payment_enquiry / upi_instructions` | **Official UPI Payment Instructions** | None |
| 2 | `auto_pay_confirmed` | `payment_enquiry / payment_confirmed` | **Payment Confirmed Received** | None |
| 3 | `auto_pay_pending_with_amount` | `payment_enquiry / pending_amount` | **Payment Pending With Amount Due** | `{orderNumber}`, `{amount}` |
| 4 | `auto_pay_verify_utr` | `payment_enquiry / verify_utr` | **Ask UTR / Reference For Verification** | None |
| 5 | `auto_pay_cod_policy` | `payment_enquiry / cod_policy` | **Cash On Delivery (COD) Policy** | None |
| 6 | `auto_pay_failed_help` | `payment_enquiry / payment_failed` | **Failed Payment Assistance** | None |
| 7 | `auto_pay_gst_invoice` | `payment_enquiry / gst_invoice` | **GST Invoice Inquiry** | None |
| 8 | `auto_pay_refund_timeline` | `payment_enquiry / refund_timeline` | **Refund Processing Timeline** | None |

#### Multilingual Variations

##### 10.1 Official UPI Payment Instructions (`auto_pay_instructions`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `upi_instructions`

- **English (`en`)**:
  > You can pay via UPI to our official ID: `prajnaa@upi` (Account: Prajnaa Himalayan Harvest). Please share the screenshot once done.

- **Hinglish (`hinglish`)**:
  > Aap hamare official UPI ID `prajnaa@upi` par payment kar sakte hain ji. Ho jaane par screenshot yahan share kar dein.

- **Hindi (`hi`)**:
  > आप हमारे आधिकारिक UPI ID `prajnaa@upi` पर भुगतान कर सकते हैं जी। भुगतान के बाद स्क्रीनशॉट यहाँ साझा करें।

##### 10.2 Payment Confirmed Received (`auto_pay_confirmed`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `payment_confirmed`

- **English (`en`)**:
  > Your payment has been successfully verified! We are scheduling your package for prompt dispatch from Solan Hub.

- **Hinglish (`hinglish`)**:
  > Aapka payment successfully verify ho gaya hai ji! Hum parcel ko Solan hub se dispatch ke liye schedule kar rahe hain.

- **Hindi (`hi`)**:
  > आपका भुगतान सफलतापूर्वक कन्फर्म हो गया है जी! हम पार्सल को सोलन हब से तुरंत रवाना करने की व्यवस्था कर रहे हैं।

##### 10.3 Payment Pending With Amount Due (`auto_pay_pending_with_amount`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `pending_amount`
- **Variables**: `{orderNumber}`, `{amount}`

- **English (`en`)**:
  > Your payment is pending for order #{orderNumber}. Total Amount: ₹{amount}. Official UPI: `prajnaa@upi`.

- **Hinglish (`hinglish`)**:
  > Order #{orderNumber} ke liye payment pending hai ji. Total: ₹{amount}. Official UPI ID: `prajnaa@upi`.

- **Hindi (`hi`)**:
  > ऑर्डर #{orderNumber} का भुगतान लंबित है जी। कुल राशि: ₹{amount}। आधिकारिक UPI ID: `prajnaa@upi`।

##### 10.4 Ask UTR / Reference For Verification (`auto_pay_verify_utr`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `verify_utr`

- **English (`en`)**:
  > Please share the 12-digit UPI UTR number or transfer receipt so our finance team can verify it immediately.

- **Hinglish (`hinglish`)**:
  > Kripya 12-digit UPI UTR number ya screenshot share karein, hum turant verify karke confirm karte hain ji.

- **Hindi (`hi`)**:
  > कृपया 12-अंकों का UPI UTR नंबर या स्क्रीनशॉट साझा करें, हम तुरंत सत्यापन कर देते हैं जी।

##### 10.5 Cash On Delivery (COD) Policy (`auto_pay_cod_policy`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `cod_policy`

- **English (`en`)**:
  > To maintain purity without transit inventory hold-ups, we prioritize prepaid UPI. However, COD is available upon customer request with verified contact details.

- **Hinglish (`hinglish`)**:
  > Direct UPI payment se order turant dispatch hota hai ji. COD bhi uplabdh hai verified details ke sath.

- **Hindi (`hi`)**:
  > प्रीपेड UPI से ऑर्डर तुरंत रवाना होता है जी। विशेष अनुरोध पर कैश ऑन डिलीवरी (COD) भी उपलब्ध है।

##### 10.6 Failed Payment Assistance (`auto_pay_failed_help`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `payment_failed`

- **English (`en`)**:
  > If the amount was deducted from your bank but failed at gateway, it automatically reverses within 24-48 hours. You may retry via UPI ID `prajnaa@upi`.

- **Hinglish (`hinglish`)**:
  > Agar paise bank se kat gaye hain toh 24-48 ghante mein auto-refund ho jate hain ji. Aap direct `prajnaa@upi` par dubara try kar sakte hain.

- **Hindi (`hi`)**:
  > यदि बैंक से राशि कट गई है, तो 24-48 घंटे में स्वतः वापस आ जाएगी। आप पुनः `prajnaa@upi` पर प्रयास कर सकते हैं जी।

##### 10.7 GST Invoice Inquiry (`auto_pay_gst_invoice`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `gst_invoice`

- **English (`en`)**:
  > Yes, we provide official tax invoices with GSTIN. We will share your invoice PDF right here on WhatsApp.

- **Hinglish (`hinglish`)**:
  > Ji haan, hum official GST tax invoice provide karte hain. Invoice PDF yahan WhatsApp par share kar diya jayega.

- **Hindi (`hi`)**:
  > जी हाँ, हम जीएसटी सहित आधिकारिक बिल प्रदान करते हैं। बिल का पीडीएफ आपको यहीं व्हाट्सएप पर मिल जाएगा।

##### 10.8 Refund Processing Timeline (`auto_pay_refund_timeline`)
- **Intent**: `payment_enquiry` | **Sub-Intent**: `refund_timeline`

- **English (`en`)**:
  > Approved refunds are credited directly to your original payment source within 3–5 working banking days.

- **Hinglish (`hinglish`)**:
  > Approved refunds 3–5 working days mein aapke original bank account mein credit ho jate hain ji.

- **Hindi (`hi`)**:
  > स्वीकृत रिफंड 3-5 कार्य दिवसों में आपके मूल बैंक खाते में वापस आ जाते हैं जी।

---

### Category 11: 11. Shipping & Delivery (8 templates)
{#category-11-shipping-delivery}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_ship_timeline` | `shipping_delivery / delivery_timeline` | **Standard Delivery Timeline** | None |
| 2 | `auto_ship_dispatch_time` | `shipping_delivery / dispatch_time` | **Dispatch Time Information** | None |
| 3 | `auto_ship_carrier_info` | `shipping_delivery / carrier_info` | **Carrier & Logistics Partner** | None |
| 4 | `auto_ship_charges` | `shipping_delivery / shipping_charges` | **Shipping Charges Policy** | None |
| 5 | `auto_ship_remote_areas` | `shipping_delivery / remote_areas` | **Remote Areas / North-East Delivery** | None |
| 6 | `auto_ship_damage_protection` | `shipping_delivery / damage_protection` | **In-Transit Damage Protection** | None |
| 7 | `auto_ship_express_inquiry` | `shipping_delivery / express_delivery` | **Express Delivery Inquiry** | None |
| 8 | `auto_ship_address_update` | `shipping_delivery / address_update` | **Address Update Before Handover** | None |

#### Multilingual Variations

##### 11.1 Standard Delivery Timeline (`auto_ship_timeline`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `delivery_timeline`

- **English (`en`)**:
  > Delivery across India takes 3–5 working days via Shipping. Packaging takes 2–3 days for artisan harvest inspection.

- **Hinglish (`hinglish`)**:
  > Delivery mein lagbhag 3–5 working days lagte hain ji. Solan hub par artisan packing mein 2–3 din lagte hain.

- **Hindi (`hi`)**:
  > डिलीवरी में लगभग 3-5 कार्य दिवस लगते हैं जी। सोलन हब से सुरक्षित पैकिंग में 2-3 दिन लगते हैं।

##### 11.2 Dispatch Time Information (`auto_ship_dispatch_time`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `dispatch_time`

- **English (`en`)**:
  > Orders are freshly packed and dispatched within 2–3 working days of payment verification from Solan, Himachal Pradesh.

- **Hinglish (`hinglish`)**:
  > Payment confirm hone ke 2–3 din ke andar fresh pack karke parcel Solan se dispatch ho jata hai ji.

- **Hindi (`hi`)**:
  > भुगतान की पुष्टि के 2-3 दिन के भीतर पार्सल सोलन से रवाना कर दिया जाता है जी।

##### 11.3 Carrier & Logistics Partner (`auto_ship_carrier_info`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `carrier_info`

- **English (`en`)**:
  > We partner with trusted Shipping carriers for the most reliable pan-India reach, covering even remote PIN codes.

- **Hinglish (`hinglish`)**:
  > Hum reliable Shipping partners dwara deliver karte hain taki har chote-bade shahar aur gaon tak parcel surakshit pahunche.

- **Hindi (`hi`)**:
  > हम विश्वसनीय शिपिंग पार्टनर्स द्वारा पार्सल भेजते हैं ताकि हर पिनकोड तक सुरक्षित पहुंच सुनिश्चित हो सके।

##### 11.4 Shipping Charges Policy (`auto_ship_charges`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `shipping_charges`

- **English (`en`)**:
  > Shipping is completely FREE for orders above ₹1,500. For orders below ₹1,500, a nominal shipping charge of ₹50 applies.

- **Hinglish (`hinglish`)**:
  > ₹1,500 se upar sabhi orders par shipping bilkul FREE hai ji. Chote orders par standard ₹50 charge lagta hai.

- **Hindi (`hi`)**:
  > ₹1,500 से ऊपर के सभी ऑर्डर्स पर शिपिंग बिल्कुल मुफ़्त है जी। उससे कम पर केवल ₹50 का शुल्क लगता है।

##### 11.5 Remote Areas / North-East Delivery (`auto_ship_remote_areas`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `remote_areas`

- **English (`en`)**:
  > Yes, Shipping ensures delivery to all remote locations, island territories, and North-Eastern states within 5–7 days.

- **Hinglish (`hinglish`)**:
  > Ji haan, Shipping se sabhi door-daraaz ke ilaqon aur North-East mein bhi 5–7 din mein delivery ho jati hai.

- **Hindi (`hi`)**:
  > जी हाँ, शिपिंग से सभी दूरस्थ क्षेत्रों में भी 5-7 दिनों में डिलीवरी सुनिश्चित होती है जी।

##### 11.6 In-Transit Damage Protection (`auto_ship_damage_protection`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `damage_protection`

- **English (`en`)**:
  > All our shipments are 100% insured against transit breakage. In case of any transit issue, we provide an immediate free replacement.

- **Hinglish (`hinglish`)**:
  > Hamari packing 100% shock-proof hai ji. Kisi bhi breakage par hum bina sawaal turant free replacement bhejte hain.

- **Hindi (`hi`)**:
  > हमारे सभी पार्सल 100% सुरक्षित होते हैं जी। रास्ते में किसी भी नुकसान पर तुरंत नया पार्सल भेजा जाता है।

##### 11.7 Express Delivery Inquiry (`auto_ship_express_inquiry`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `express_delivery`

- **English (`en`)**:
  > Express Shipping is currently our fastest air-parcel route from Himachal Pradesh. We prioritize early morning dispatches.

- **Hinglish (`hinglish`)**:
  > Pahadon se Express Shipping air-transit sabse tez route hai ji. Hum subah hi dispatch priority par nikaalte hain.

- **Hindi (`hi`)**:
  > हिमाचल से एक्सप्रेस शिपिंग एयर-पार्सल सबसे तीव्र मार्ग है जी। हम सुबह ही डिस्पैच प्राथमिकता पर करते हैं।

##### 11.8 Address Update Before Handover (`auto_ship_address_update`)
- **Intent**: `shipping_delivery` | **Sub-Intent**: `address_update`

- **English (`en`)**:
  > If your parcel hasn't left our Solan Hub, we can update the address immediately. Please send the new address.

- **Hinglish (`hinglish`)**:
  > Agar parcel abhi hub par hai toh hum turant address change kar denge ji. Naya address share karein.

- **Hindi (`hi`)**:
  > यदि पार्सल अभी हब पर है, तो हम तुरंत नया पता अपडेट कर देंगे जी। कृपया नया पता भेजें।

---

### Category 12: 12. Complaints, Returns & Refunds (8 templates)
{#category-12-complaints-returns-refunds}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_comp_damaged_item` | `complaint / damaged_item` | **Damaged / Broken Item In Transit** | None |
| 2 | `auto_comp_wrong_item` | `complaint / wrong_item` | **Wrong Item Received** | None |
| 3 | `auto_comp_taste_quality` | `complaint / quality_concern` | **Taste or Quality Feedback Concern** | None |
| 4 | `auto_comp_return_policy` | `complaint / return_policy` | **Return & Replacement Policy** | None |
| 5 | `auto_comp_replacement_dispatched` | `complaint / replacement_dispatched` | **Replacement Dispatched Notification** | None |
| 6 | `auto_comp_refund_processed` | `complaint / refund_processed` | **Refund Approved & Processed** | None |
| 7 | `auto_comp_escalation_desk` | `complaint / escalation` | **Escalation To Senior Desk** | None |
| 8 | `auto_comp_missing_item` | `complaint / missing_item` | **Missing Item In Parcel** | None |

#### Multilingual Variations

##### 12.1 Damaged / Broken Item In Transit (`auto_comp_damaged_item`)
- **Intent**: `complaint` | **Sub-Intent**: `damaged_item`

- **English (`en`)**:
  > We sincerely apologize for the inconvenience! Please share a clear photo of the damaged item and order number. We will dispatch an immediate free replacement.

- **Hinglish (`hinglish`)**:
  > Inconvenience ke liye maafi chahte hain ji! Kripya parcel ki ek photo aur order number share karein, hum turant free replacement bhejte hain.

- **Hindi (`hi`)**:
  > असुविधा के लिए अत्यंत खेद है जी! कृपया पार्सल की एक फोटो और ऑर्डर नंबर साझा करें, हम तुरंत नया पार्सल भेजेंगे।

##### 12.2 Wrong Item Received (`auto_comp_wrong_item`)
- **Intent**: `complaint` | **Sub-Intent**: `wrong_item`

- **English (`en`)**:
  > We deeply apologize! Please share a photo of the received parcel. Our team will verify and dispatch the correct items immediately.

- **Hinglish (`hinglish`)**:
  > Galat item receive hone ke liye maafi chahte hain ji! Ek photo share karein, hum turant sahi saman dispatch karte hain.

- **Hindi (`hi`)**:
  > गलत वस्तु प्राप्त होने के लिए क्षमा चाहते हैं जी! कृपया एक फोटो भेजें, हम तुरंत सही सामान भेज देंगे।

##### 12.3 Taste or Quality Feedback Concern (`auto_comp_taste_quality`)
- **Intent**: `complaint` | **Sub-Intent**: `quality_concern`

- **English (`en`)**:
  > Since our produce is 100% raw and seasonal, natural flavors can vary slightly by mountain bloom. We take your feedback seriously and our quality lead will connect with you.

- **Hinglish (`hinglish`)**:
  > Prajnaa harvest 100% natural hone ke kaaran thoda natural flavor farak ho sakta hai ji. Hamare team lead jald aapse connect karenge.

- **Hindi (`hi`)**:
  > हमारा उत्पाद 100% प्राकृतिक होने के कारण मौसम के अनुसार स्वाद में भिन्नता हो सकती है। हमारी टीम जल्द आपसे संपर्क करेगी जी।

##### 12.4 Return & Replacement Policy (`auto_comp_return_policy`)
- **Intent**: `complaint` | **Sub-Intent**: `return_policy`

- **English (`en`)**:
  > We offer hassle-free replacement or refund for damaged, defective, or incorrect items reported within 48 hours of delivery.

- **Hinglish (`hinglish`)**:
  > Delivery ke 48 ghante ke andar batane par damaged ya galat item ka bina kisi pareshani ke replacement ya refund milta hai ji.

- **Hindi (`hi`)**:
  > डिलीवरी के 48 घंटे के भीतर सूचना देने पर क्षतिग्रस्त वस्तु का बिना किसी झंझट के रिप्लेसमेंट या रिफंड किया जाता है जी।

##### 12.5 Replacement Dispatched Notification (`auto_comp_replacement_dispatched`)
- **Intent**: `complaint` | **Sub-Intent**: `replacement_dispatched`

- **English (`en`)**:
  > Your replacement parcel has been packed and scheduled for priority dispatch. We are tracking it personally for you.

- **Hinglish (`hinglish`)**:
  > Aapka replacement parcel priority par pack kar diya gaya hai ji. Hum personally iski live tracking monitor kar rahe hain.

- **Hindi (`hi`)**:
  > आपका रिप्लेसमेंट पार्सल प्राथमिकता पर पैक कर दिया गया है जी। हम व्यक्तिगत रूप से इसकी निगरानी कर रहे हैं।

##### 12.6 Refund Approved & Processed (`auto_comp_refund_processed`)
- **Intent**: `complaint` | **Sub-Intent**: `refund_processed`

- **English (`en`)**:
  > Your refund has been approved and initiated. It will reflect in your UPI account or bank within 3–5 working days.

- **Hinglish (`hinglish`)**:
  > Aapka refund approve hokar initiate ho gaya hai ji. 3–5 working days mein aapke account mein credit ho jayega.

- **Hindi (`hi`)**:
  > आपका रिफंड स्वीकृत होकर जारी कर दिया गया है जी। 3-5 कार्य दिवसों में आपके खाते में आ जाएगा।

##### 12.7 Escalation To Senior Desk (`auto_comp_escalation_desk`)
- **Intent**: `complaint` | **Sub-Intent**: `escalation`

- **English (`en`)**:
  > Your complaint has been directly escalated to our Store Administrator, Nishant ji, who will review and call/message you shortly.

- **Hinglish (`hinglish`)**:
  > Aapki shikayat direct hamare Store Administrator Nishant ji ke paas escalate kar di gayi hai, woh jald aapse judenge.

- **Hindi (`hi`)**:
  > आपकी शिकायत हमारे स्टोर प्रशासक निशांत जी को सौंप दी गई है, वे जल्द ही आपसे संपर्क करेंगे।

##### 12.8 Missing Item In Parcel (`auto_comp_missing_item`)
- **Intent**: `complaint` | **Sub-Intent**: `missing_item`

- **English (`en`)**:
  > We apologize if any item was missed during packaging. Please share your order number; we will dispatch the missing item right away.

- **Hinglish (`hinglish`)**:
  > Agar koi item miss ho gaya hai toh maafi chahte hain ji! Order number batayein, hum bacha hua saman turant bhejte hain.

- **Hindi (`hi`)**:
  > यदि कोई वस्तु छूट गई है तो हम क्षमा चाहते हैं जी! ऑर्डर नंबर बताएं, हम छूटा हुआ सामान तुरंत रवाना कर देंगे।

---

### Category 13: 13. Human Support Handoff & Unknown Queries (5 templates)
{#category-13-human-handoff-unknown}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|
| 1 | `auto_handoff_explicit_request` | `human_handoff / explicit_request` | **Customer Asks For Human Agent** | None |
| 2 | `auto_handoff_complex_query` | `human_handoff / complex_query` | **Complex Special Request Handoff** | None |
| 3 | `auto_handoff_unclear_polite` | `human_handoff / unclear_polite` | **Polite Handoff Without 'Unable To Understand'** | `{catalogueLink}` |
| 4 | `auto_handoff_after_hours` | `human_handoff / after_hours` | **Night / After-Hours Handoff** | None |
| 5 | `auto_handoff_resume_automation` | `human_handoff / resume_notice` | **Resume Automation Notice** | None |

#### Multilingual Variations

##### 13.1 Customer Asks For Human Agent (`auto_handoff_explicit_request`)
- **Intent**: `human_handoff` | **Sub-Intent**: `explicit_request`

- **English (`en`)**:
  > Certainly! I am connecting you with our Store Administrator, Nishant ji. He will assist you personally very shortly.

- **Hinglish (`hinglish`)**:
  > Bilkul ji! Main aapki chat Store Administrator Nishant ji se connect kar raha hoon. Woh jald aapse judenge.

- **Hindi (`hi`)**:
  > जी बिल्कुल! मैं आपकी बातचीत हमारे स्टोर व्यवस्थापक निशांत जी से जोड़ रहा हूँ। वे शीघ्र ही आपसे संपर्क करेंगे।

##### 13.2 Complex Special Request Handoff (`auto_handoff_complex_query`)
- **Intent**: `human_handoff` | **Sub-Intent**: `complex_query`

- **English (`en`)**:
  > This requires special assistance from our mountain fulfillment team. Nishant ji will review this and respond to you directly.

- **Hinglish (`hinglish`)**:
  > Iske liye hamari mountain team ki special assistance chahiye ji. Nishant ji review karke seedha aapse connect karenge.

- **Hindi (`hi`)**:
  > इसके लिए हमारी टीम की विशेष सहायता आवश्यक है जी। निशांत जी इसकी समीक्षा कर आपसे सीधे संपर्क करेंगे।

##### 13.3 Polite Handoff Without 'Unable To Understand' (`auto_handoff_unclear_polite`)
- **Intent**: `human_handoff` | **Sub-Intent**: `unclear_polite`
- **Variables**: `{catalogueLink}`

- **English (`en`)**:
  > Thank you for reaching out! Our store admin will connect with you shortly to assist you properly. You can also explore our catalogue here: {catalogueLink}

- **Hinglish (`hinglish`)**:
  > Prajnaa Market se judne ke liye dhanyavaad ji! Nishant ji jald hi aapse connect karenge. Hamara live catalogue yahan dekhein: {catalogueLink}

- **Hindi (`hi`)**:
  > प्रज्ञा मार्केट से संपर्क करने के लिए धन्यवाद जी! हमारे स्टोर एडमिन जल्द ही आपसे संपर्क करेंगे। आप हमारा कैटलॉग यहाँ देख सकते हैं: {catalogueLink}

##### 13.4 Night / After-Hours Handoff (`auto_handoff_after_hours`)
- **Intent**: `human_handoff` | **Sub-Intent**: `after_hours`

- **English (`en`)**:
  > Our store desk is currently closed for the night, but we have noted your message! Nishant ji will connect with you first thing in the morning.

- **Hinglish (`hinglish`)**:
  > Hamari desk abhi raat ke samay closed hai ji, par aapka message note ho gaya hai! Subah hote hi hum aapse connect karenge.

- **Hindi (`hi`)**:
  > हमारी डेस्क अभी रात्रि में बंद है जी, परंतु आपका संदेश नोट कर लिया गया है! सुबह होते ही हम आपसे संपर्क करेंगे।

##### 13.5 Resume Automation Notice (`auto_handoff_resume_automation`)
- **Intent**: `human_handoff` | **Sub-Intent**: `resume_notice`

- **English (`en`)**:
  > Automated assistance is back active. How can we help you explore our Himalayan products?

- **Hinglish (`hinglish`)**:
  > Automated assistance dubara active hai ji. Batayein, Himalayan products mein kya dekhna chahenge?

- **Hindi (`hi`)**:
  > स्वचालित सहायता पुनः सक्रिय है जी। बताएं, हिमालयी उत्पादों में आप क्या देखना चाहेंगे?

---

### Category 14: 14. Indian Conversational Expressions & Slang (0 templates)
{#category-14-indian-conversational-expressions}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|

#### Multilingual Variations

---

### Category 15: 15. Indian Pricing, Discounts & Bargaining (0 templates)
{#category-15-indian-pricing-bargaining}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|

#### Multilingual Variations

---

### Category 16: 16. Customer Hesitation & Trust Building (0 templates)
{#category-16-customer-hesitation-trust}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|

#### Multilingual Variations

---

### Category 17: 17. Follow-up & Pending Inquiries (0 templates)
{#category-17-followup-incomplete}

| # | Template ID | Intent / Sub-Intent | Template Name | Variables |
|---|---|---|---|---|

#### Multilingual Variations

---

## 5. Dynamic Variables & Replacement Rules

The template engine uses placeholder syntax `{variableName}` or `{{variableName}}` which is safely interpolated with live database records at runtime:

| Variable | Description | Example Replacement | Fallback Value |
|---|---|---|---|
| `{customerName}` / `{{customer_name}}` | Customer's full or preferred name | "Rajat", "Dr. Sharma" | "ji" / "Customer" |
| `{orderNumber}` / `{{order_id}}` | Order ID reference | "#PJ-OD-8921" | "#PRJ-ORD" |
| `{productName}` | Name of the discussed produce item | "Tehri Badri Cow Ghee" | "Himalayan Produce" |
| `{price}` | Price in Rupees | "₹1,450" | "Contact for price" |
| `{quantity}` | Requested unit quantity | "2 jars", "500g" | "1" |
| `{location}` | Current postal transit hub | "Solan HPO", "Dehradun Hub" | "Regional Sorting Hub" |
| `{trackingId}` | Shipping consignment / tracking no. | "EH123456789IN" | "Pending Booking" |
| `{catalogueUrl}` / `{{catalogue_url}}` | Live verified product catalogue link | "https://prajnaa-farm-8zam.vercel.app/" | Official Portal Link |
| `{agentName}` | Support agent assigned | "Nishant" | "Support Desk" |
| `{amount}` | Total invoice amount | "₹2,450" | "₹0" |

---

## 6. Language Detection & Matching Rules

1. **Automatic Script Detection**:
   - If customer message contains Devanagari characters (Unicode range `\u0900-\u097F`), language is detected as Hindi (`hi`).
   - If customer uses Romanized Hindi words (e.g. *kaise ho, dhanyawad, kripya, theek hai, kitna price hai*), language is detected as Hinglish (`hinglish`).
   - Otherwise, language defaults to English (`en`).
2. **Dynamic Language Switching**:
   - The engine does not lock a customer into a single language. If a customer starts in English and follows up in Hinglish or Hindi, the response language shifts immediately to match.
3. **Tone Consistency**:
   - All responses embody warmth, politeness, cultural respect (*Namaste ji, Bilkul ji*), and transparent Himalayan farm-to-table authenticity.