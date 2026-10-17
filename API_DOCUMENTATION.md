# Prajnaa Mobile & Web Application API Documentation

Welcome to the **Prajnaa API Documentation**. This document is designed for mobile app developers (iOS / Android / Flutter / React Native) and web frontend engineers integrating with Prajnaa's backend services.

---

## 1. General Architecture & Getting Started

### 1.1 Base URLs
| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:3000` |
| **Production Server** | `https://prajnaa-farm-8zam.vercel.app` (or custom production domain) |

### 1.2 Authentication & Headers
Prajnaa uses **Neon Auth** (powered by Better Auth). When a user logs in or registers, the server sets a session cookie and returns a session token.

For mobile applications that do not use web cookies, pass the session token as a standard Bearer token in the `Authorization` header:

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <session_token>
```

Web applications can alternatively send the HTTP cookie automatically:
```http
Cookie: better-auth.session_token=<session_token>
```

### 1.3 Standard Response Formats
#### Success Response:
```json
{
  "success": true,
  "data": { ... }
}
```

#### Error Response:
```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

---

## 2. Authentication APIs (`/api/auth/*`)

Built with Neon Auth / Better Auth.

### 2.1 Sign Up (Email & Password)
Registers a new customer or farmer.
- **Method:** `POST`
- **Endpoint:** `/api/auth/sign-up/email`
- **Auth Required:** No
- **Request Body:**
```json
{
  "name": "Arjun Sharma",
  "email": "arjun@example.com",
  "password": "SecurePassword123",
  "callbackURL": "https://prajnaa-farm-8zam.vercel.app/auth/login?verified=true"
}
```
- **Response (200 OK):**
```json
{
  "user": {
    "id": "usr_78a1bc293d",
    "email": "arjun@example.com",
    "name": "Arjun Sharma",
    "emailVerified": false,
    "createdAt": "2026-10-16T10:00:00.000Z"
  },
  "token": "sess_token_48194..."
}
```

### 2.2 Sign In (Email & Password)
- **Method:** `POST`
- **Endpoint:** `/api/auth/sign-in/email`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "arjun@example.com",
  "password": "SecurePassword123"
}
```
- **Response (200 OK):**
```json
{
  "user": {
    "id": "usr_78a1bc293d",
    "email": "arjun@example.com",
    "name": "Arjun Sharma",
    "emailVerified": true
  },
  "session": {
    "id": "sess_81726...",
    "userId": "usr_78a1bc293d",
    "token": "better_auth_token_991823...",
    "expiresAt": "2026-11-16T10:00:00.000Z"
  }
}
```

### 2.3 Get Current User Session
Verifies the current session and returns the logged-in user profile.
- **Method:** `GET`
- **Endpoint:** `/api/auth/get-session`
- **Auth Required:** Yes (`Authorization: Bearer <token>` or session cookie)
- **Response (200 OK):**
```json
{
  "session": {
    "id": "sess_81726...",
    "userId": "usr_78a1bc293d",
    "expiresAt": "2026-11-16T10:00:00.000Z"
  },
  "user": {
    "id": "usr_78a1bc293d",
    "email": "arjun@example.com",
    "name": "Arjun Sharma",
    "image": null,
    "emailVerified": true
  }
}
```

### 2.4 Sign Out
- **Method:** `POST`
- **Endpoint:** `/api/auth/sign-out`
- **Auth Required:** Yes
- **Response (200 OK):**
```json
{
  "success": true
}
```

---

## 3. Categories & Taxonomy

Prajnaa categorizes farm produce into **10 standard categories**. The app can cache this taxonomy locally or use the slugs to query products.

### 3.1 Taxonomy Reference
| Category Slug | Name | Description | Image Asset URL |
| :--- | :--- | :--- | :--- |
| `dry-fruits` | Dry Fruits | Sun-dried, naturally sweet. | `/assets/cat-dryfruits.jpg` |
| `nuts` | Nuts | Raw, roasted, hand-sorted. | `/assets/cat-nuts.jpg` |
| `seeds` | Seeds | Nutrient-dense superfoods. | `/assets/cat-seeds.jpg` |
| `spices` | Spices | Single-origin, freshly ground. | `/assets/cat-spices.jpg` |
| `herbs` | Herbs | Aromatic, garden-fresh. | `/assets/cat-herbs.jpg` |
| `plants` | Plants | Live herbs for your home. | `/assets/cat-plants.jpg` |
| `pickles` | Pickles | Slow-fermented, family recipes. | `/assets/cat-pickles.jpg` |
| `salts` | Salts | Mineral-rich, unrefined. | `/assets/cat-salts.jpg` |
| `masalas` | Masalas | Whole-spice blends. | `/assets/cat-masalas.jpg` |
| `honey` | Honey | Raw, pure organic mountain honey. | `/assets/cat-honey.jpg` |

> **Filter Products by Category:** Pass `?category=<slug>` to `GET /api/products` (e.g. `/api/products?category=spices`).

---

## 4. Products APIs (`/api/products/*`)

### 4.1 Get Products (Catalog, Search & Filtering)
- **Method:** `GET`
- **Endpoint:** `/api/products`
- **Auth Required:** No
- **Query Parameters:**
  - `category` *(optional)*: Category slug (e.g., `spices`, `honey`, `all`).
  - `search` *(optional)*: Keyword matching against product name, category, or slug.
  - `slug` *(optional)*: Exact slug or product ID to retrieve a single product.
- **Example:**
```http
GET /api/products?category=spices&search=turmeric
```
- **Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "products": [
    {
      "id": "prod_lakadong_turmeric",
      "name": "Lakadong Turmeric Powder",
      "slug": "lakadong-turmeric-powder",
      "description": "High curcumin (7%+) organic turmeric powder directly from Meghalaya.",
      "price": 280,
      "compare_at_price": 350,
      "price_per_kg": 560,
      "category": "spices",
      "stock": 50,
      "stock_grams": 25000,
      "low_stock_threshold_grams": 2000,
      "unit": "500g",
      "weight_grams": 500,
      "images": [
        "https://res.cloudinary.com/xk8miuvg/image/upload/v1/prajnaa/products/turmeric.jpg"
      ],
      "featured": true,
      "status": "published",
      "hsn_code": "09103020",
      "gst_applicable": true,
      "gst_rate": 5,
      "farmer_id": "farm_101",
      "farmer_profiles": {
        "id": "farm_101",
        "fullName": "Bhanu Pratap Singh",
        "farmName": "Meghalaya Highlands Organics",
        "slug": "bhanu-pratap",
        "village": "Jowai",
        "state": "Meghalaya"
      },
      "inventory": {
        "id": "inv_prod_lakadong",
        "stockGrams": 25000,
        "quantity": 50,
        "lowStockThresholdGrams": 2000,
        "soldCount": 142,
        "pledgedCount": 0,
        "preorderEnabled": false
      },
      "_source": "neon"
    }
  ]
}
```

### 4.2 Single Product Details
- **Method:** `GET`
- **Endpoint:** `/api/products?slug=<slug_or_id>`
- **Auth Required:** No

### 4.3 Product Harvest Journey & Farm Traceability
Returns the verified seed-to-shelf timeline milestones, testing data, and harvest stages.
- **Method:** `GET`
- **Endpoint:** `/api/products/:productId/harvest-journey`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "success": true,
  "stages": [
    {
      "id": "stage_sowing",
      "title": "Sowing & Seed Inoculation",
      "description": "Heirloom Lakadong rhizomes sown with organic Jeevamrut preparation.",
      "date": "2026-04-12",
      "location": "Jowai, Meghalaya",
      "images": ["https://..."]
    },
    {
      "id": "stage_testing",
      "title": "Lab Soil & Residue Testing",
      "description": "Tested zero synthetic pesticide residues, 7.3% curcumin confirmed.",
      "date": "2026-08-20",
      "reportUrl": "https://..."
    },
    {
      "id": "stage_harvest",
      "title": "Hand Harvest & Sun Drying",
      "description": "Slowly dried under ambient mountain sunlight to retain volatile oils.",
      "date": "2026-09-28"
    }
  ]
}
```

### 4.4 Product Reviews
- **Fetch Reviews:** `GET /api/reviews?product_slug=<product_slug>`
- **Submit Review:** `POST /api/reviews`
  - **Auth Required:** Yes
  - **Request Body:**
```json
{
  "product_slug": "lakadong-turmeric-powder",
  "rating": 5,
  "title": "Best organic turmeric I have ever bought",
  "body": "Aroma is vibrant and the golden color speaks for its curcumin content.",
  "images": []
}
```

### 4.5 Product Inventory
- **Get Inventory Status:** `GET /api/inventory?product_id=<id>`
- **Adjust Stock (Farmer / Admin):** `POST /api/inventory/:productId/adjust`
  - **Auth Required:** Yes (Farmer or Admin)
  - **Request Body:**
```json
{
  "changeGrams": 5000,
  "reason": "Restocked freshly ground batch"
}
```

---

## 5. Farmers APIs (`/api/farmer/*` & `/api/farmers/*`)

### 5.1 Get Authenticated Farmer Profile
Retrieves the profile of the currently logged-in farmer.
- **Method:** `GET`
- **Endpoint:** `/api/farmer/profile`
- **Auth Required:** Yes
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "farm_7718abc",
    "user_id": "usr_78a1bc293d",
    "full_name": "Ramesh Patel",
    "farm_name": "Gir Amrit Organic Farms",
    "phone": "+919876543210",
    "email": "ramesh@example.com",
    "slug": "ramesh-patel-gir",
    "status": "approved",
    "state": "Gujarat",
    "district": "Junagadh",
    "village": "Talala",
    "pincode": "362150",
    "crops": ["Kesar Mango", "Groundnut", "Sesame"],
    "farming_method": "Natural Vedic Farming / ZBNF",
    "farm_size_acres": 12.5,
    "years_farming": 16,
    "story": "Cultivating Gir heritage orchards with indigenous cows for over 15 years.",
    "headline": "100% Certified Vedic Natural Farmer",
    "portrait_url": "https://res.cloudinary.com/.../farmer_portrait.jpg",
    "cover_image_url": "https://res.cloudinary.com/.../farm_cover.jpg",
    "aadhaar_last4": "6712",
    "pan_number": "ABCDE1234F",
    "upi_id": "rameshpatel@okhdfcbank",
    "bank_account_name": "Ramesh Patel",
    "bank_account_number": "XXXXXXXXXX1234",
    "bank_name": "Bank of Baroda",
    "bank_ifsc": "BARB0TALALA",
    "kishan_pehchan_patra": "KPP-GJ-2025-9921",
    "total_land_area": "12.5",
    "area_unit": "Acres",
    "cultivated_area": "12.0",
    "khasra_numbers": "210/1, 210/2",
    "cultivator_type": "Owner",
    "trust_application_status": "approved",
    "created_at": "2026-01-10T10:00:00.000Z",
    "updated_at": "2026-10-14T09:30:00.000Z"
  }
}
```

### 5.2 Update Farmer Profile
Allows farmers to update story, crops, land records, and media.
- **Method:** `PATCH`
- **Endpoint:** `/api/farmer/profile`
- **Auth Required:** Yes
- **Request Body (all fields optional):**
```json
{
  "headline": "Award-Winning Natural Farmer",
  "story": "Practicing pesticide-free regenerative agriculture.",
  "crops": ["Groundnut", "Kesar Mango", "Mustard"],
  "farming_method": "ZBNF Natural Farming",
  "portrait_url": "https://res.cloudinary.com/.../portrait.jpg",
  "cover_image_url": "https://res.cloudinary.com/.../cover.jpg",
  "total_land_area": "12.5",
  "area_unit": "Acres",
  "cultivated_area": "12.0",
  "khasra_numbers": "210/1, 210/2",
  "cultivator_type": "Owner"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": { /* Updated farmer object */ }
}
```

### 5.3 Public Farmer Trust Score & Verification
- **Method:** `GET`
- **Endpoint:** `/api/farmers/:id/trust`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "farmerId": "farm_7718abc",
    "trustScore": 95,
    "verificationLevel": "Tier 3 - Verified Gold",
    "badges": [
      "Aadhaar Identity Verified",
      "Land Record Verified",
      "NPOP Organic Certified",
      "Lab Tested Clean"
    ]
  }
}
```

### 5.4 Public Farmer Land Ledger
- **Method:** `GET`
- **Endpoint:** `/api/farmers/:id/land-ledger`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "success": true,
  "farmerId": "farm_7718abc",
  "khasraNumbers": "210/1, 210/2",
  "totalLand": "12.5 Acres",
  "district": "Junagadh",
  "state": "Gujarat",
  "soilCard": {
    "status": "Verified",
    "nitrogen": "Normal",
    "organicCarbon": "0.92% (High)"
  }
}
```

### 5.5 Farmer KYC: Aadhaar Verification
- **Method:** `POST`
- **Endpoint:** `/api/kyc/verify-aadhaar`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body:**
```json
{
  "aadhaar": "987654321098",
  "consent": true,
  "farmer_id": "farm_7718abc",
  "document": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Or File in multipart form-data
}
```
- **Response (200 OK):**
```json
{
  "status": "verified",
  "maskedAadhaar": "XXXXXXXX1098",
  "message": "Aadhaar verified successfully."
}
```

### 5.6 Farmer KYC: PAN Verification
- **Method:** `POST`
- **Endpoint:** `/api/kyc/verify-pan`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "pan": "ABCDE1234F",
  "nameOnPan": "Ramesh Patel",
  "dob": "1982-05-14",
  "farmer_id": "farm_7718abc",
  "document": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```
- **Response (200 OK):**
```json
{
  "status": "verified",
  "pan": "ABCDE1234F",
  "message": "PAN verified successfully."
}
```

### 5.7 Upload Farmer Organic Certificate
Uploads the certificate document directly to secure Neon Object Storage and creates a verification queue item.
- **Method:** `POST`
- **Endpoint:** `/api/farmers/me/certificates`
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `name`: Certificate title (e.g. `"NPOP Organic Certificate"`)
  - `issuedBy`: Certifying agency (e.g. `"Aditi Organic Certification"`)
  - `certNumber`: Certificate serial number
  - `validTill`: Expiry date (`YYYY-MM-DD`)
  - `file`: PDF or JPG/PNG image (max 5 MB)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cert_992144",
    "name": "NPOP Organic Certificate",
    "status": "pending",
    "url": "/api/storage/prajnaa/certificates/cert_1741234.pdf"
  },
  "message": "Certificate submitted successfully. Pending admin review."
}
```

### 5.8 Public Certificate Verification Lookup
- **Method:** `GET`
- **Endpoint:** `/api/certificates/verify/:certificateNumber`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "success": true,
  "verified": true,
  "certificate": {
    "certificateNumber": "ORG-2025-00918",
    "farmerName": "Ramesh Patel",
    "farmName": "Gir Amrit Organic Farms",
    "status": "active",
    "validTill": "2027-12-31"
  }
}
```

---

## 6. Cart, Shipping & Pincode APIs

### 6.1 Check Pincode Serviceability
- **Method:** `GET`
- **Endpoint:** `/api/pincode/:pincode`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "success": true,
  "pincode": "560001",
  "city": "Bengaluru",
  "state": "Karnataka",
  "serviceable": true,
  "codAvailable": true,
  "estimatedDays": 3
}
```

### 6.2 Get Shipping Rate Quote
Calculates shipping cost based on destination postal code and total order weight.
- **Method:** `POST`
- **Endpoint:** `/api/shipping/quote`
- **Auth Required:** No
- **Request Body:**
```json
{
  "destinationPincode": "560001",
  "totalWeightGrams": 1500
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "shippingFeePaise": 6000,
  "shippingFeeRupees": 60,
  "freeShippingThresholdPaise": 99900,
  "isFreeShipping": false
}
```

### 6.3 Redeem / Apply Coupon Code
- **Method:** `POST`
- **Endpoint:** `/api/cart/redeem-coupon`
- **Auth Required:** Optional (if logged in, checks per-user usage limits)
- **Request Body:**
```json
{
  "code": "HARVEST10",
  "cartSubtotal": 1200,
  "cartItems": [
    { "productId": "prod_lakadong_turmeric", "categoryId": "spices", "price": 280, "qty": 2 }
  ]
}
```
- **Response (200 OK):**
```json
{
  "valid": true,
  "code": "HARVEST10",
  "discountPaise": 12000,
  "discountRupees": 120,
  "message": "10% off applied successfully!"
}
```

---

## 7. Orders & Checkout APIs (`/api/orders/*`)

### 7.1 Place / Create Order
Supports Cash on Delivery (COD), Razorpay, Cashfree, and WhatsApp orders.
- **Method:** `POST`
- **Endpoint:** `/api/orders/create`
- **Auth Required:** Optional (supports authenticated users or guest checkout via mobile phone number)
- **Request Body:**
```json
{
  "items": [
    {
      "productId": "prod_lakadong_turmeric",
      "quantity": 2,
      "unitPricePaise": 28000
    }
  ],
  "customerName": "Pooja Hegde",
  "customerEmail": "pooja@example.com",
  "customerPhone": "9876543210",
  "paymentMethod": "cod",
  "shippingAddressSnapshot": {
    "fullName": "Pooja Hegde",
    "line1": "Flat 402, Sunshine Apartments",
    "line2": "Indiranagar 100ft Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560038",
    "phone": "9876543210"
  },
  "couponCode": "HARVEST10",
  "customerNotes": "Call before delivery"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "orderId": "ord_88291039",
  "orderNumber": "PRJ-2026-8829",
  "status": "placed",
  "paymentStatus": "pending",
  "totalAmountPaise": 50400,
  "message": "Order created successfully"
}
```

### 7.2 Customer Order History
Returns the authenticated customer's past orders with shipment statuses and ordered items.
- **Method:** `GET`
- **Endpoint:** `/api/orders?limit=20&offset=0`
- **Auth Required:** Yes
- **Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": "ord_88291039",
      "orderNumber": "PRJ-2026-8829",
      "totalAmount": 504,
      "status": "confirmed",
      "paymentMethod": "cod",
      "paymentStatus": "pending",
      "createdAt": "2026-10-15T14:30:00.000Z",
      "items": [
        {
          "name": "Lakadong Turmeric Powder",
          "slug": "lakadong-turmeric-powder",
          "qty": 2,
          "weight": "500g",
          "price": 280,
          "image": "https://..."
        }
      ]
    }
  ]
}
```

### 7.3 Order Details by ID
- **Method:** `GET`
- **Endpoint:** `/api/orders/:id`
- **Auth Required:** Yes

### 7.4 Cancel Order
- **Method:** `POST`
- **Endpoint:** `/api/orders/:id/cancel`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "reason": "Ordered wrong product size"
}
```

---

## 8. Payments APIs (`/api/payments/*`)

### 8.1 Active Gateways
Returns whether online payments (Razorpay / Cashfree) and COD are active.
- **Method:** `GET`
- **Endpoint:** `/api/payments/gateways`
- **Auth Required:** No

### 8.2 Razorpay Order Creation
- **Method:** `POST`
- **Endpoint:** `/api/payments/razorpay/create-order`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "orderId": "ord_88291039",
  "amountPaise": 50400
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "razorpayOrderId": "order_EKf38sbz12",
  "amount": 50400,
  "currency": "INR",
  "keyId": "rzp_live_XXXXXXXX"
}
```

### 8.3 Razorpay Payment Verification
- **Method:** `POST`
- **Endpoint:** `/api/payments/razorpay/verify-payment`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "orderId": "ord_88291039",
  "razorpay_order_id": "order_EKf38sbz12",
  "razorpay_payment_id": "pay_29384729",
  "razorpay_signature": "9a8f7c8b6d..."
}
```

---

## 9. Customer Account & Personalization APIs (`/api/account/*`)

### 9.1 Customer Addresses
- **Get Saved Addresses:** `GET /api/account/addresses`
- **Save Address:** `POST /api/account/addresses`
  - **Request Body:**
```json
{
  "fullName": "Pooja Hegde",
  "line1": "Flat 402, Sunshine Apartments",
  "city": "Bengaluru",
  "state": "Karnataka",
  "postalCode": "560038",
  "phone": "9876543210",
  "label": "Home",
  "isDefault": true
}
```

### 9.2 Wishlist Management
- **Get Wishlist:** `GET /api/account/wishlist`
- **Add to Wishlist:** `POST /api/account/wishlist` (body: `{ "productSlug": "lakadong-turmeric-powder" }`)
- **Remove from Wishlist:** `DELETE /api/account/wishlist` (body: `{ "productSlug": "lakadong-turmeric-powder" }`)

### 9.3 Recently Viewed Products
- **Get Recently Viewed:** `GET /api/account/recently-viewed`
- **Record Product View:** `POST /api/account/recently-viewed` (body: `{ "productSlug": "lakadong-turmeric-powder" }`)

---

## 10. Direct Universal Data Query API (`/api/data/query`)

Prajnaa exposes a unified, type-safe SQL query proxy that allows the mobile app to execute declarative operations on PostgreSQL tables without maintaining separate microservice endpoints for every entity.

### Supported Tables:
- `profiles`
- `addresses`
- `farmer_profiles`
- `farmer_products`
- `product_reviews`
- `orders`
- `order_items`
- `wishlist_items`
- `messages`

### 10.1 Query Example: Filter Farmer's Products
- **Method:** `POST`
- **Endpoint:** `/api/data/query`
- **Request Body:**
```json
{
  "table": "farmer_products",
  "action": "select",
  "filters": [
    { "col": "farmer_id", "val": "farm_7718abc", "op": "==" },
    { "col": "status", "val": "published", "op": "==" }
  ],
  "sorts": [
    { "col": "created_at", "asc": false }
  ],
  "limit": 20
}
```
- **Response (200 OK):**
```json
{
  "data": [
    {
      "id": "prod_1",
      "name": "Kesar Mango Pulp",
      "price": 320,
      "stock": 40
    }
  ],
  "count": 1,
  "error": null
}
```

### 10.2 Query Example: Insert New Record (e.g. Become a Seller)
```json
{
  "table": "farmer_profiles",
  "action": "insert",
  "payload": {
    "user_id": "usr_78a1bc293d",
    "full_name": "Ramesh Patel",
    "farm_name": "Gir Organic Farm",
    "phone": "9876543210",
    "village": "Talala",
    "state": "Gujarat",
    "status": "draft"
  }
}
```

---

## 11. Farmer Copilot AI (`/api/copilot`)
An integrated agricultural and marketplace AI assistant for farmers to get crop advice, pest solutions, and pricing tips.
- **Method:** `POST`
- **Endpoint:** `/api/copilot`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "message": "When should I harvest my Lakadong turmeric and how do I prevent rhizome rot during monsoons?"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "reply": "Lakadong turmeric typically reaches maturity in 7-9 months when lower leaves start turning yellow..."
}
```

---

## 12. In-App Messaging (`/api/messages/*`)
Enables direct customer-to-farmer or farmer-to-admin inquiries.
- **Send Message:** `POST /api/messages/send`
  - Body: `{ "receiverId": "farm_7718abc", "message": "Do you ship raw unpolished turmeric rhizomes?" }`
- **Get Message Thread:** `GET /api/messages/thread?conversationId=<id>`
- **Get Conversations:** `GET /api/messages/conversations`
- **Get Unread Count:** `GET /api/messages/counts`

---

## 13. File Uploads (`/api/upload`)
Uploads and compresses images to Neon Object Storage and registers the record in Neon PostgreSQL (`media_assets` table).
- **Method:** `POST`
- **Endpoint:** `/api/upload`
- **Auth Required:** Yes
- **Form Data:** `file` (Image/Document), `folder` (e.g., `"prajnaa/products"`, `"prajnaa/farmers"`, `"prajnaa/certificates"`)
- **Returns:** `{ "success": true, "url": "/api/storage/prajnaa/products/upload_1741234.webp", "key": "prajnaa/products/upload_1741234.webp" }`
- **Served Via:** `GET /api/storage/:folder/:file`


---

## 14. Admin Management APIs (`/api/admin/*`)

> **Note:** All Admin endpoints strictly require the caller to have the `admin` role in `user_roles` or be a pre-configured verified admin email. Machine-to-machine cron calls can also pass `x-admin-key: <ADMIN_API_SECRET>`.

### 14.1 Admin Orders Management
- **List All Orders:** `GET /api/admin/orders`
  - Query Params: `?page=1&limit=20&status=all&range=last_30_days&search=...`
- **Single Order Details:** `GET /api/admin/orders/:id`
- **Update Order Status / Tracking:** `PATCH /api/admin/orders/:id`
  - Body: `{ "status": "shipped", "trackingNumber": "DTDC12345", "courier": "DTDC" }`
- **Bulk Action on Orders:** `POST /api/admin/orders/bulk`
  - Body: `{ "orderIds": ["ord_1", "ord_2"], "action": "mark_dispatched" }`

### 14.2 Admin Farmer Approvals & Verification Checks
- **Create Farmer Manually:** `POST /api/admin/farmers/create`
  - Body: `{ "fullName": "Ramesh Patel", "farmName": "Gir Farms", "phone": "9876543210", "state": "Gujarat", "village": "Talala", "crops": ["Mango"] }`
- **Update Verification Checks:** `PATCH /api/admin/farmers/:id/checks`
  - Body: `{ "check": "identity", "done": true, "date": "2026-10-16" }`
  - Valid check keys: `"identity"`, `"land"`, `"farmVisit"`, `"quality"`
- **Approve/Revoke Farmer Certificate:** `PATCH /api/admin/farmers/:id/certificate`
  - Body: `{ "status": "approved", "adminRemarks": "NPOP certificate verified on APEDA portal" }`

### 14.3 Admin Farmer Settlements & Payouts (`/api/admin/settlements/*`)
- **List Settlements:** `GET /api/admin/settlements?status=all&page=1&pageSize=20`
- **Generate Bi-Weekly Settlement Batch:** `POST /api/admin/settlements/generate`
  - Body: `{ "cycleStart": "2026-10-01", "cycleEnd": "2026-10-15" }`
- **Process Individual Settlement:** `POST /api/admin/settlements/:id/process`
  - Body: `{ "utrReference": "CMS881923019", "paymentMethod": "IMPS" }`
- **Hold Payout:** `POST /api/admin/settlements/:id/hold` (Body: `{ "reason": "Bank KYC discrepancy" }`)
- **Export Settlement CSV:** `GET /api/admin/settlements/export?cycleId=...`
- **Farmer Payout Statement:** `GET /api/admin/settlements/:id/statement`

### 14.4 Admin Coupons Management
- **List All Coupons:** `GET /api/admin/coupons`
- **Create Coupon:** `POST /api/admin/coupons`
  - Body:
```json
{
  "code": "DIWALI20",
  "name": "Diwali Festival 20% Off",
  "type": "percentage",
  "value": 20,
  "minOrderAmount": 500,
  "maxDiscount": 300,
  "applyTo": "all",
  "usageLimit": 500,
  "validFrom": "2026-10-20T00:00:00Z",
  "validTill": "2026-11-15T23:59:59Z"
}
```
- **Update / Toggle Coupon:** `PATCH /api/admin/coupons/:id`
- **Delete Coupon:** `DELETE /api/admin/coupons/:id`

### 14.5 Real-Time Traffic & Store Analytics
- **Active Real-Time Shoppers:** `GET /api/admin/live-traffic/active-count`
- **Device & Platform Breakdown:** `GET /api/admin/live-traffic/device-breakdown`
- **Live Traffic Stream (SSE):** `GET /api/admin/live-traffic/stream`
- **Store Summary Metrics:** `GET /api/admin/live-traffic/summary`

---

## 15. Webhooks & Payment Gateway Notifications

All webhooks listen for signature verification headers.

### 15.1 Razorpay Webhook
- **Endpoint:** `POST /api/webhooks/razorpay`
- **Signature Header:** `x-razorpay-signature`
- **Verified via HMAC-SHA256:** `process.env.RAZORPAY_WEBHOOK_SECRET`
- **Supported Events:**
  - `payment.captured`
  - `order.paid`
  - `payment.failed`

### 15.2 Payouts & Gateway Webhook
- **Endpoint:** `POST /api/webhooks/payouts`
- **Signature Header:** `x-webhook-signature`
- **Handles:** Automated status syncs when IMPS/NEFT farmer bank payouts are credited or bounced.

---

## 16. Client Data Models & TypeScript Interfaces

Mobile developers can directly use these definitions in their state stores (e.g. Redux, Zustand, Riverpod, Bloc):

```typescript
// 1. User & Auth Session
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role?: 'customer' | 'farmer' | 'admin';
}

// 2. Category
export interface Category {
  slug: string;
  name: string;
  image: string;
  description: string;
}

// 3. Product Catalog Item
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  price_per_kg?: number | null;
  category: string;
  stock: number;
  stock_grams: number;
  low_stock_threshold_grams?: number;
  unit: string; // e.g. "500g", "1kg", "250g"
  weight_grams?: number;
  images: string[];
  featured: boolean;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  hsn_code?: string | null;
  gst_applicable: boolean;
  gst_rate: number;
  farmer_id?: string | null;
  farmer_profiles?: {
    id: string;
    fullName: string;
    farmName: string;
    slug: string;
    village: string;
    state: string;
  } | null;
  inventory?: {
    id: string;
    stockGrams: number;
    quantity: number;
    soldCount: number;
    preorderEnabled: boolean;
  } | null;
}

// 4. Farmer Profile
export interface FarmerProfile {
  id: string;
  user_id: string;
  full_name: string;
  farm_name: string;
  phone: string;
  email?: string | null;
  slug?: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
  state: string;
  district?: string | null;
  village: string;
  pincode?: string | null;
  crops: string[];
  farming_method?: string | null;
  farm_size_acres?: number | null;
  years_farming?: number | null;
  story?: string | null;
  headline?: string | null;
  portrait_url?: string | null;
  cover_image_url?: string | null;
  aadhaar_last4?: string | null;
  pan_number?: string | null;
  upi_id?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_name?: string | null;
  bank_ifsc?: string | null;
  kishan_pehchan_patra?: string | null;
  total_land_area?: string | null;
  area_unit?: string | null;
  cultivated_area?: string | null;
  khasra_numbers?: string | null;
  cultivator_type?: string | null;
  trust_application_status?: string | null;
  created_at: string;
  updated_at: string;
}

// 5. Order
export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  totalAmountPaise: number;
  status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentMethod: 'cod' | 'razorpay' | 'cashfree' | 'whatsapp';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddressSnapshot: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  items: Array<{
    name: string;
    slug: string;
    qty: number;
    weight?: string | null;
    price: number;
    image?: string | null;
  }>;
  createdAt: string;
}
```

---

## 17. Error Codes Reference

| Error Code | HTTP Status | Description | Action Required by App |
| :--- | :--- | :--- | :--- |
| `AUTH_REQUIRED` | 401 | User must be logged in to execute this action. | Prompt user to navigate to Login / Sign Up screen. |
| `FORBIDDEN` | 403 | User does not have sufficient role (e.g. customer trying to access admin endpoint). | Show permission denied message. |
| `INVALID_PHONE` | 400 | The phone number provided is not a valid 10-digit Indian mobile number. | Validate with regex `/^[6-9]\d{9}$/` before submitting. |
| `ONLINE_PAYMENTS_DISABLED` | 403 | Razorpay / Cashfree are currently in test or maintenance mode. | Default checkout selection to Cash on Delivery (COD) or WhatsApp. |
| `INVALID_PAYMENT_METHOD` | 400 | Selected payment method is not in `['cod', 'whatsapp', 'razorpay', 'cashfree']`. | Select one of the supported gateway options. |
| `COUPON_NOT_FOUND` | 404 | The promo code entered does not exist or has expired. | Inform user that coupon code is invalid. |
| `COUPON_MIN_ORDER` | 400 | Cart total has not met minimum requirement for the coupon. | Display minimum cart total required. |
| `OUT_OF_STOCK` | 400 | Product requested has insufficient inventory in grams. | Update item quantity in cart. |

