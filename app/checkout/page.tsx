"use client";

import Image from "next/image";
import { useNavigate } from "@/lib/tanstack-compat";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShoppingCart,
  MapPin,
  CreditCard,
  Truck,
  MessageSquare,
  Loader2,
  AlertCircle,
  Package,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { MarketingLayout } from "@/components/marketing/layout";
import { useCart } from "@/lib/cart-store";
import { inr } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { formatWeight, parseWeightToGrams, formatStock } from "@/lib/weight-utils";
import { ensureShippingSeedData } from "@/lib/shipping/seed-service";
import { DEFAULT_CONFIG } from "@/lib/shipping/seed-data";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchPincodeDetails, PostOffice } from "@/lib/api/pincode";
import { inventoryService, getAvailability } from "@/lib/services/inventoryService";
import {
  isGatewayEnabled,
  getGatewayConfig,
  getDefaultPaymentMethod,
  COD_FLAT_FEE,
} from "@/config/payment-gateways";
import { isOnlinePaymentsEnabled } from "@/lib/features";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const checkoutSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().regex(EMAIL_REGEX, "Please enter a valid email address"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  address1: z.string().min(5, "Address line 1 is required"),
  address2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit pincode"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export type PaymentMethod = "cod" | "razorpay" | "cashfree" | "whatsapp";
export type ShippingService = "india_post" | "speed_post";

export default function CheckoutPage() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const appliedCoupon = useCart((s) => s.appliedCoupon);
  const setAppliedCoupon = useCart((s) => s.setAppliedCoupon);
  const clearAppliedCoupon = useCart((s) => s.clearAppliedCoupon);

  const [checkoutCouponCode, setCheckoutCouponCode] = useState("");
  const [applyingCheckoutCoupon, setApplyingCheckoutCoupon] = useState(false);
  const [checkoutCouponError, setCheckoutCouponError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [shippingService, setShippingService] = useState<ShippingService>("india_post");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [placing, setPlacing] = useState(false);

  const { data: dbProducts } = useQuery({
    queryKey: ["checkout-db-products", items.map((i) => i.slug).join(",")],
    queryFn: async () => {
      if (items.length === 0) return [];
      const slugs = items.map((i) => (i as any).baseSlug || i.slug.replace(/-[^-]+$/, ""));
      const { data, error } = await supabase
        .from("farmer_products")
        .select("slug, hsn_code, gst_applicable, gst_rate, price, farmer_id, farmer_profiles:farmer_id(slug)")
        .in("slug", slugs);
      if (error) {
        // Fallback without join if foreign key relation name differs
        const { data: fallbackData } = await supabase
          .from("farmer_products")
          .select("slug, hsn_code, gst_applicable, gst_rate, price, farmer_id")
          .in("slug", slugs);
        return fallbackData || [];
      }
      return data || [];
    },
    enabled: items.length > 0,
  });

  // Live Shipping Quote States
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingQuote, setShippingQuote] = useState<{
    shippingCost: number;
    totalWeightGm: number;
    roundedSlabGm: number;
    zone: string;
    shippingPostageCost: number;
    shippingPackagingCost: number;
  } | null>(null);

  // App Config States
  const [config, setConfig] = useState({
    admin_whatsapp_number: DEFAULT_CONFIG.admin_whatsapp_number,
    cod_flat_fee: DEFAULT_CONFIG.cod_flat_fee || COD_FLAT_FEE || 40,
    razorpay_fee_percent: DEFAULT_CONFIG.razorpay_fee_percent,
    razorpay_gst_percent: DEFAULT_CONFIG.razorpay_gst_percent,
    cashfree_fee_percent: DEFAULT_CONFIG.cashfree_fee_percent,
    cashfree_gst_percent: DEFAULT_CONFIG.cashfree_gst_percent,
  });

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address1: "",
      address2: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  const watchedPhone = watch("phone");
  const watchedPincode = watch("pincode");
  const watchedState = watch("state");
  const watchedCity = watch("city");
  const watchedAddress1 = watch("address1");

  // Address Line 1 Suggestion Lists
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const ADDRESS_SUGGESTIONS = [
    "Sector 38 Medanta Hospital, Gurugram, Haryana",
    "Sector 15 Part 2 Main Market, Gurugram, Haryana",
    "Vikas Nagar near Post Office, Dehradun, Uttarakhand",
    "Rajpur Road near Clock Tower, Dehradun, Uttarakhand",
    "Connaught Place Block A, New Delhi, Delhi",
    "Saket District Center, New Delhi, Delhi",
    "Indiranagar 100 Feet Road, Bengaluru, Karnataka",
    "Koramangala 5th Block, Bengaluru, Karnataka",
    "Andheri West Link Road, Mumbai, Maharashtra",
    "Bandra West Linking Road, Mumbai, Maharashtra",
    "T Nagar Pondy Bazaar, Chennai, Tamil Nadu",
    "Salt Lake Sector V, Kolkata, West Bengal"
  ];

  const filteredAddresses = watchedAddress1
    ? ADDRESS_SUGGESTIONS.filter((a) => a.toLowerCase().includes(watchedAddress1.toLowerCase()))
    : ADDRESS_SUGGESTIONS;

  // State Dropdown lists
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Delhi", "Chandigarh", "Jammu and Kashmir", "Ladakh"
  ];
  
  const filteredStates = watchedState
    ? INDIAN_STATES.filter((s) => s.toLowerCase().includes(watchedState.toLowerCase()))
    : INDIAN_STATES;

  // Auto-detect City, State and Post Offices based on Pincode via Government of India OGD API
  const [detectingPincode, setDetectingPincode] = useState(false);
  const [pincodeSuccessInfo, setPincodeSuccessInfo] = useState<string | null>(null);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [detectedPostOffices, setDetectedPostOffices] = useState<PostOffice[]>([]);
  const [selectedPostOffice, setSelectedPostOffice] = useState<string>("");

  const handlePincodeLookup = async (pin: string) => {
    const cleanPin = pin.trim().replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) return;

    setDetectingPincode(true);
    setPincodeError(null);
    setPincodeSuccessInfo(null);

    try {
      const res = await fetchPincodeDetails(cleanPin);
      if (res.success && res.data) {
        if (res.data.state) {
          setValue("state", res.data.state, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        }
        if (res.data.district) {
          setValue("city", res.data.district, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        }
        setDetectedPostOffices(res.data.postOffices || []);
        setPincodeSuccessInfo(
          res.data.district && res.data.state
            ? `${res.data.district}, ${res.data.state}`
            : "Location detected"
        );
        toast.success(`Location detected: ${res.data.district || ""}, ${res.data.state || ""}`);
      } else {
        setPincodeError(res.message || "Pincode not found. You can enter details manually.");
        setDetectedPostOffices([]);
      }
    } catch (err: any) {
      setPincodeError("Unable to auto-detect location. Please enter manually.");
    } finally {
      setDetectingPincode(false);
    }
  };

  useEffect(() => {
    const cleanPin = (watchedPincode || "").trim().replace(/\D/g, "");

    if (cleanPin.length === 6) {
      const timer = setTimeout(() => {
        handlePincodeLookup(cleanPin);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setPincodeError(null);
      setPincodeSuccessInfo(null);
      setDetectedPostOffices([]);
      setDetectingPincode(false);
    }
  }, [watchedPincode]);

  // Auto-restore pre-order item on page load if cart is empty
  useEffect(() => {
    if (typeof window !== "undefined" && items.length === 0) {
      try {
        const raw = localStorage.getItem("prajnaa_preorder_reserve");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.item) {
            useCart.getState().add(parsed.item, parsed.qty || 1);
          }
        }
      } catch (e) {
        console.warn("Failed to restore pre-order reserve item:", e);
      }
    }
  }, [items.length]);

  useEffect(() => {
    void ensureShippingSeedData();
  }, []);

  // Prefill user details if logged in
  useEffect(() => {
    if (user) {
      setValue("name", user.name || getValues("name") || "");
      setValue("phone", (user.phone || "").replace(/\D/g, "").slice(-10) || getValues("phone") || "");
      setValue("email", user.email || getValues("email") || "");
    }
  }, [user, setValue, getValues]);

  // Recalculate shipping when pincode or service changes
  const fetchShippingQuote = async (pin: string, service: ShippingService) => {
    if (!/^\d{6}$/.test(pin) || items.length === 0) {
      setShippingQuote(null);
      setShippingError(null);
      return;
    }

    setCalculatingShipping(true);
    setShippingError(null);

    try {
      const formattedItems = items.map((i) => ({
        name: i.name,
        price: i.price,
        qty: i.qty,
        weight_gm: parseWeightToGrams(i.weight),
      }));

      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: formattedItems,
          service,
          destinationPincode: pin,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate shipping rate.");
      }

      setShippingQuote({
        shippingCost: data.shippingCost,
        totalWeightGm: data.totalWeightGm,
        roundedSlabGm: data.roundedSlabGm,
        zone: data.zone,
        shippingPostageCost: data.shippingPostageCost || 0,
        shippingPackagingCost: data.shippingPackagingCost || 0,
      });
    } catch (err: any) {
      setShippingError(err.message || "Could not calculate shipping rate.");
      setShippingQuote(null);
    } finally {
      setCalculatingShipping(false);
    }
  };

  useEffect(() => {
    if (watchedPincode && watchedPincode.length === 6) {
      fetchShippingQuote(watchedPincode, shippingService);
    }
  }, [watchedPincode, shippingService, items]);

  // Financial Calculations
  const resolvedItems = items.map((item) => {
    const baseSlug = (item as any).baseSlug || item.slug.replace(/-[^-]+$/, "");
    const dbProd = dbProducts?.find((p: any) => p.slug === baseSlug);

    let gstApplicable = true;
    let gstRate = 5;
    let hsnCode = "00000000";

    if (dbProd) {
      gstApplicable = dbProd.gst_applicable !== undefined ? dbProd.gst_applicable : true;
      gstRate = dbProd.gst_rate !== undefined ? dbProd.gst_rate : 5;
      hsnCode = dbProd.hsn_code || "";
    } else {
      const category = item.slug.toLowerCase();
      if (category.includes("fruit") || category.includes("plant") || category.includes("salt")) {
        gstApplicable = false;
        gstRate = 0;
      }
    }

    const taxableAmount = item.price * item.qty;
    const gstAmount = gstApplicable ? Math.round(taxableAmount * (gstRate / 100) * 100) / 100 : 0;
    const totalAmount = taxableAmount + gstAmount;

    const farmerSlug =
      (item as any).farmer_slug ||
      (item as any).farmerSlug ||
      (dbProd as any)?.farmer_profiles?.slug ||
      null;
    const farmerId =
      (item as any).farmer_id ||
      (item as any).farmerId ||
      dbProd?.farmer_id ||
      null;
    const farmerBasePrice =
      (item as any).farmer_base_price ||
      (dbProd?.price ? Number(dbProd.price) : Math.round(item.price / 1.1));

    return {
      ...item,
      baseSlug,
      hsnCode,
      gstApplicable,
      gstRate,
      taxableAmount,
      gstAmount,
      totalAmount,
      farmerSlug,
      farmerId,
      farmerBasePrice,
    };
  });

  const subtotal = resolvedItems.reduce((s, i) => s + i.taxableAmount, 0);
  const totalGst = resolvedItems.reduce((s, i) => s + i.gstAmount, 0);
  const totalWeightGm = items.reduce(
    (s, i) => s + parseWeightToGrams(i.weight) * i.qty,
    0
  );
  const rawShippingCost = shippingQuote ? shippingQuote.shippingCost : 0;
  const isFreeShipping = appliedCoupon?.discount.freeShipping === true;
  const shippingCost = isFreeShipping ? 0 : rawShippingCost;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount.discountAmount : 0;
  const discountedSubtotal = Math.max(0, subtotal - (isFreeShipping ? 0 : couponDiscount));

  // Fee calculation for payment gateways or COD surcharge (only active when method selected in step 3)
  let gatewayFee = 0;
  if (paymentMethod && activeStep === 3 && isGatewayEnabled(paymentMethod)) {
    if (paymentMethod === "razorpay") {
      const feeRate = (config.razorpay_fee_percent / 100) * (1 + config.razorpay_gst_percent / 100);
      gatewayFee = Math.round((discountedSubtotal + totalGst + shippingCost) * feeRate);
    } else if (paymentMethod === "cashfree") {
      const feeRate = (config.cashfree_fee_percent / 100) * (1 + config.cashfree_gst_percent / 100);
      gatewayFee = Math.round((discountedSubtotal + totalGst + shippingCost) * feeRate);
    } else if (paymentMethod === "cod") {
      gatewayFee = config.cod_flat_fee ?? COD_FLAT_FEE ?? 40;
    }
  }

  const finalTotal = discountedSubtotal + totalGst + shippingCost + gatewayFee;

  const handleApplyCheckoutCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutCouponCode.trim()) {
      setCheckoutCouponError("Please enter a coupon code");
      return;
    }
    setApplyingCheckoutCoupon(true);
    setCheckoutCouponError(null);
    try {
      const res = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: checkoutCouponCode.trim(),
          cart: {
            items: items.map((i) => ({ ...i, price: i.price, qty: i.qty })),
            shippingCost: rawShippingCost,
          },
          customerId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to apply coupon");
      }
      setAppliedCoupon({
        code: data.coupon.code,
        coupon: data.coupon,
        discount: data.discount,
      });
      setCheckoutCouponCode("");
      toast.success(data.message || `Coupon "${data.coupon.code}" applied!`);
    } catch (err: any) {
      setCheckoutCouponError(err.message || "Invalid coupon code");
      toast.error(err.message || "Could not apply coupon");
    } finally {
      setApplyingCheckoutCoupon(false);
    }
  };

  const handleRemoveCheckoutCoupon = () => {
    clearAppliedCoupon();
    setCheckoutCouponError(null);
    toast.success("Coupon removed");
  };

  const triggerCouponRedemption = async (orderId: string) => {
    if (!appliedCoupon || !user) return;
    try {
      await fetch("/api/cart/redeem-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: appliedCoupon.coupon.id,
          couponCode: appliedCoupon.code,
          customerId: user.id,
          orderId,
        }),
      });
    } catch (err) {
      console.warn("[Checkout] Failed to record coupon redemption:", err);
    }
  };

  // Step 1: Address form invalid toast popup handler
  const onAddressInvalid = (formErrors: any) => {
    const errorKeys = Object.keys(formErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const firstErrorMsg = formErrors[firstKey]?.message;
      toast.error(firstErrorMsg || "Please correct the highlighted fields in the address form.");
    } else {
      toast.error("Please fill in all required shipping address fields.");
    }
  };

  // Step 1: Address form valid handler
  const onAddressSubmit = async (values: CheckoutFormValues) => {
    if (!values.pincode || !/^\d{6}$/.test(values.pincode.trim())) {
      toast.error("Please enter a valid 6-digit delivery pincode.");
      return;
    }

    if (!shippingQuote && values.pincode.length === 6) {
      await fetchShippingQuote(values.pincode, shippingService);
    }
    if (shippingError) {
      toast.error(shippingError);
      return;
    }
    setActiveStep(2);
  };

  // Step 2: Proceed to payment handler
  const handleProceedToPayment = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!paymentMethod || !isGatewayEnabled(paymentMethod)) {
      setPaymentMethod(getDefaultPaymentMethod());
    }
    setActiveStep(3);
  };

  // ORDER CREATION & PAYMENT HANDLER
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!user) {
      toast.error("User authentication required. Please sign in to complete your order.");
      return;
    }
    if (!paymentMethod || !isGatewayEnabled(paymentMethod)) {
      toast.error("The selected payment method is temporarily unavailable. Please choose another option.");
      setPaymentMethod(getDefaultPaymentMethod());
      return;
    }

    // Strict validation of address before placing order
    const address = getValues();
    const parseResult = checkoutSchema.safeParse(address);
    if (!parseResult.success) {
      const firstErr = parseResult.error.errors[0]?.message;
      toast.error(firstErr || "Invalid shipping address details. Please verify your address.");
      setActiveStep(1);
      return;
    }

    setPlacing(true);

    try {
      // 1. Live stock verification against authoritative inventoryService to prevent overselling
      for (const item of resolvedItems) {
        const itemIdentifier = item.baseSlug || item.slug;
        const inv = await inventoryService.getInventory(itemIdentifier, (item as any).variantId || "default");
        if (inv) {
          const avail = getAvailability(inv);
          if (avail.status === "out_of_stock") {
            toast.error(`"${item.name}" is completely sold out. Please remove it from your cart to proceed.`);
            setPlacing(false);
            return;
          }
          const itemOrderedGrams = Number((item as any).weight_gm || (item as any).grams || (parseWeightToGrams(item.weight) * item.qty));
          const availableGrams =
            inv.stock_grams !== undefined
              ? inv.stock_grams
              : Math.max(0, Math.round(Number(inv.quantity || 0) * 1000));

          if (avail.status !== "preorder" && availableGrams < itemOrderedGrams) {
            toast.error(
              `"${item.name}" has only ${formatStock(availableGrams)} available in stock (you requested ${formatStock(itemOrderedGrams)}). Please adjust your cart.`
            );
            setPlacing(false);
            return;
          }
        }
      }

      // Call backend POST /api/orders/create (wired behind DATA_PROVIDER)
      const createRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: address.name,
          customerEmail: address.email,
          customerPhone: address.phone,
          shippingAddressSnapshot: {
            fullName: address.name,
            phone: address.phone,
            email: address.email,
            addressLine1: address.address1,
            addressLine2: address.address2 || "",
            landmark: address.landmark || "",
            city: address.city,
            state: address.state,
            postalCode: address.pincode,
            country: "India",
          },
          billingAddressSnapshot: {
            fullName: address.name,
            phone: address.phone,
            email: address.email,
            addressLine1: address.address1,
            city: address.city,
            state: address.state,
            postalCode: address.pincode,
            country: "India",
          },
          paymentMethod,
          couponCode: appliedCoupon?.code || null,
          items: resolvedItems.map((i) => ({
            productId: i.baseSlug || i.slug,
            slug: i.slug,
            productName: i.name,
            quantity: i.qty,
            unitPrice: i.price,
            weight: i.weight,
            weightGrams: parseWeightToGrams(i.weight),
            hsnCode: i.hsnCode,
            image: i.image,
            farmerId: i.farmerId,
            farmerSlug: i.farmerSlug,
          })),
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Failed to create order");
      }

      const order = createData.order;
      const orderId = order.orderNumber || order.id;

      // Persist to localStorage unconditionally for instant real-time customer tracking
      if (typeof window !== "undefined") {
        localStorage.setItem(`mock_order_${orderId}`, JSON.stringify(order));
        localStorage.setItem(`mock_order_${order.id}`, JSON.stringify(order));
        localStorage.setItem("prajnaa_last_order", JSON.stringify(order));

        try {
          const existingCrm = JSON.parse(localStorage.getItem("prajnaa_crm_orders") || "[]");
          const updatedCrm = [order, ...existingCrm.filter((o: any) => o.orderNumber !== orderId && o.id !== orderId)];
          localStorage.setItem("prajnaa_crm_orders", JSON.stringify(updatedCrm));
          window.dispatchEvent(new CustomEvent("prajnaa_order_placed", { detail: order }));

          // Also populate WhatsCRM v2 localStorage in case standalone CRM is viewed
          const custName = order.customerName || address.name || "Customer";
          const custPhone = order.customerPhone || address.phone || "9999999999";
          const shipSnap = order.shippingAddressSnapshot || {
            line1: address.address1,
            city: address.city,
            state: address.state,
            postalCode: address.pincode,
          };
          const cleanPhoneStr = custPhone.replace(/\D/g, "");

          const existingWhatsCrmOrders = JSON.parse(localStorage.getItem("whatscrm_orders_v2") || "[]");
          const itemsSummaryStr = items.map((i) => `${i.name} × ${i.qty || 1}`).join(", ");
          const orderTotalAmount = (order.totalPaise ? order.totalPaise / 100 : (order as any).amount || (order as any).total_amount || 0);

          const newWhatsOrder = {
            id: `ord-${orderId}`,
            orderNumber: orderId,
            customerId: `c-${cleanPhoneStr.slice(-6)}`,
            customerName: custName,
            customerPhone: custPhone,
            items: items.map((i, idx) => ({
              id: `item-${idx}`,
              name: i.name,
              quantity: `${i.qty || 1} unit`,
              price: i.price,
              isAvailable: true,
            })),
            itemsSummary: itemsSummaryStr,
            totalAmount: orderTotalAmount,
            status: "NEW_REQUEST",
            fulfillmentType: "DELIVERY",
            deliveryAddress: `${shipSnap.line1 || shipSnap.addressLine1 || ""}, ${shipSnap.city || ""}, ${shipSnap.state || ""} - ${shipSnap.postalCode || ""}`,
            deliveryCharge: 50,
            paymentStatus: "PENDING",
            createdAt: "Just now",
          };
          localStorage.setItem("whatscrm_orders_v2", JSON.stringify([newWhatsOrder, ...existingWhatsCrmOrders]));

          const existingWhatsConvs = JSON.parse(localStorage.getItem("whatscrm_conversations_v2") || "[]");
          const newWhatsConv = {
            id: `conv-${cleanPhoneStr.slice(-6)}`,
            contactId: `c-${cleanPhoneStr.slice(-6)}`,
            name: custName,
            phone: custPhone,
            avatar: "",
            lastMessage: `🌾 New Order #${orderId}: ${itemsSummaryStr}`,
            lastMessageTime: "Just now",
            unreadCount: 1,
            assignedTo: "Nishant (Store Admin)",
            leadStage: "Order Placed",
            tags: ["Website Order", "WhatsApp Checkout"],
            isPinned: true,
            isOnline: true,
            dealValue: orderTotalAmount,
            source: "WhatsApp",
            isServiceWindowActive: true,
            serviceWindowHoursRemaining: 24,
            currentRequest: {
              items: items.map((i) => `${i.name} × ${i.qty}`),
              requestedAt: "Just now",
              fulfillmentType: "DELIVERY",
              status: "NEW_REQUEST",
            },
            messages: [
              {
                id: `m_${Date.now()}_1`,
                sender: "customer",
                text: `Namaste Nishant ji! 🙏 Maine website se order place kiya hai:\n🌾 Order #${orderId}\nItems: ${itemsSummaryStr}\nTotal: ₹${orderTotalAmount}\nDelivery: ${shipSnap.line1 || shipSnap.addressLine1 || ""}, ${shipSnap.city || ""}`,
                timestamp: "Just now",
                status: "delivered",
              },
              {
                id: `m_${Date.now()}_2`,
                sender: "store",
                text: `Namaste ${custName}! 🙏 Aapka order #${orderId} record ho gaya hai. Hum pure Himalayan harvest direct farms se pack kar rahe hain. 2-3 din me Speed Post dispatch ho jayega.`,
                timestamp: "Just now",
                status: "read",
              },
            ],
          };
          localStorage.setItem(
            "whatscrm_conversations_v2",
            JSON.stringify([
              newWhatsConv,
              ...existingWhatsConvs.filter((c: any) => c.phone?.replace(/\D/g, "") !== cleanPhoneStr),
            ])
          );
        } catch {}
      }

      // Real-time cache propagation across entire app
      qc.invalidateQueries({ queryKey: ["public-all-products"] });
      qc.invalidateQueries({ queryKey: ["public-live-inventory"] });
      qc.invalidateQueries({ queryKey: ["farmer-products"] });
      qc.invalidateQueries({ queryKey: ["farmer-inventory"] });
      qc.invalidateQueries({ queryKey: ["farmer-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["farmer-listings-summary"] });
      qc.invalidateQueries({ queryKey: ["farmer-low-stock"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-list"] });
      qc.invalidateQueries({ queryKey: ["admin-inventory-history"] });

      // Handle specific payment options
      if (paymentMethod === "cod") {
        void triggerCouponRedemption(orderId);
        clear();
        toast.success("Order placed successfully via Cash on Delivery!");
        navigate({ to: "/order-confirmation", search: { id: orderId } });
      } else if (paymentMethod === "whatsapp") {
        void triggerCouponRedemption(orderId);
        clear();
        toast.success("Order recorded! Redirecting to WhatsApp...");
        if (createData.whatsappUrl) {
          window.open(createData.whatsappUrl, "_blank");
        }
        navigate({ to: "/order-confirmation", search: { id: orderId } });
      } else if (paymentMethod === "razorpay") {
        const res = await fetch("/api/payments/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({
              name: i.name,
              slug: i.slug,
              price: i.price,
              qty: i.qty,
              weight: i.weight,
              baseSlug: (i as any).baseSlug,
              image: i.image,
            })),
            shippingService,
            paymentMethod,
            destinationPincode: address.pincode,
            orderId,
            notes: { customer_email: address.email },
          }),
        });

        const rzpData = await res.json();
        if (!res.ok || !rzpData.success) {
          throw new Error(rzpData.error || "Failed to initialize Razorpay checkout");
        }

        // Dynamically load Razorpay SDK if not present
        if (typeof window !== "undefined" && !(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
            document.body.appendChild(script);
          });
        }

        const options: any = {
          key: rzpData.key || "rzp_test_mockkey123",
          amount: rzpData.amount,
          currency: "INR",
          name: "Prajnaa Market",
          description: "Purchase payment transaction",
          handler: async function (response: any) {
            // Success handler callback
            void triggerCouponRedemption(orderId);
            clear();
            toast.success("Payment successful via Razorpay!");

            const invoiceNo = `INV-2026-${orderId.split("-")[1] || Math.floor(10000 + Math.random() * 90000)}`;
            const invoiceDate = new Date().toISOString();

            // 1. Update order via API
            try {
              await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: "confirmed",
                  payment_status: "paid",
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  invoice_number: invoiceNo,
                  invoice_date: invoiceDate,
                }),
              });
            } catch (e) {
              console.warn("[Checkout] Razorpay order update error:", e);
            }

            // 2. Update Supabase if configured
            try {
              await supabase.from("orders").update({
                status: "confirmed",
                payment_status: "paid",
                invoice_number: invoiceNo,
                invoice_date: invoiceDate,
                updated_at: invoiceDate,
              }).eq("id", orderId);
            } catch (e) {
              console.warn("[Checkout] Supabase payment update error:", e);
            }
            
            // 3. Update order status locally in mock orders
            const localMock = localStorage.getItem(`mock_order_${orderId}`);
            if (localMock) {
              const parsed = JSON.parse(localMock);
              parsed.status = "confirmed";
              parsed.payment_status = "paid";
              parsed.razorpay_payment_id = response.razorpay_payment_id;
              parsed.invoice_number = invoiceNo;
              parsed.invoice_date = invoiceDate;
              localStorage.setItem(`mock_order_${orderId}`, JSON.stringify(parsed));
              localStorage.setItem("prajnaa_last_order", JSON.stringify(parsed));
            }
            
            navigate({ to: "/order-confirmation", search: { id: orderId } });
          },
          prefill: {
            name: address.name,
            email: address.email,
            contact: address.phone,
          },
          theme: {
            color: "#6D28D9", // Primary brand color
          },
        };

        if (rzpData.id) {
          options.order_id = rzpData.id;
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          toast.error(response.error.description || "Payment failed");
        });
        rzp.open();
      } else if (paymentMethod === "cashfree") {
        const res = await fetch("/api/payments/cashfree/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalTotal,
            orderId,
            customer: { name: address.name, email: address.email, phone: address.phone },
          }),
        });

        const cfData = await res.json();
        if (!res.ok || !cfData.success) {
          throw new Error(cfData.error || "Failed to initialize Cashfree checkout");
        }

        const cfMode = cfData.env === "production" ? "production" : "sandbox";

        try {
          if (cfData.paymentSessionId) {
            // Dynamically load Cashfree v3 SDK
            if (typeof window !== "undefined" && !(window as any).Cashfree) {
              await new Promise<void>((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
                document.body.appendChild(script);
              });
            }

            const cashfree = typeof (window as any).Cashfree === "function"
              ? (window as any).Cashfree({ mode: cfMode })
              : new (window as any).Cashfree({ mode: cfMode });

            const result = await cashfree.checkout({
              paymentSessionId: cfData.paymentSessionId,
              redirectTarget: "_modal",
            });

            if (result && result.error) {
              toast.error(result.error.message || "Cashfree payment was cancelled or failed");
              setPlacing(false);
              return;
            }
          } else if (cfData.cftoken) {
            // Load Cashfree v2 Drop/Modal SDK
            if (typeof window !== "undefined" && !(window as any).Cashfree?.payModal) {
              await new Promise<void>((resolve, reject) => {
                const script = document.createElement("script");
                script.src = "https://www.cashfree.com/assets/cashfree.sdk.v1.2.js";
                script.onload = () => resolve();
                script.onerror = () => reject(new Error("Failed to load Cashfree v2 SDK"));
                document.body.appendChild(script);
              });
            }

            if ((window as any).Cashfree?.payModal) {
              await new Promise<void>((resolve, reject) => {
                (window as any).Cashfree.payModal({
                  orderToken: cfData.cftoken,
                  onSuccess: (data: any) => resolve(data),
                  onFailure: (err: any) => reject(new Error(err?.message || "Cashfree payment failed")),
                  onClose: () => reject(new Error("Payment window was closed")),
                });
              });
            } else {
              // Direct payment checkout form post
              const form = document.createElement("form");
              form.method = "POST";
              form.action = cfMode === "production" ? "https://www.cashfree.com/checkout/post/submit" : "https://test.cashfree.com/billpay/checkout/post/submit";
              
              const tokenInput = document.createElement("input");
              tokenInput.type = "hidden";
              tokenInput.name = "token";
              tokenInput.value = cfData.cftoken;
              form.appendChild(tokenInput);

              const appIdInput = document.createElement("input");
              appIdInput.type = "hidden";
              appIdInput.name = "appId";
              appIdInput.value = cfData.appId;
              form.appendChild(appIdInput);

              const orderIdInput = document.createElement("input");
              orderIdInput.type = "hidden";
              orderIdInput.name = "orderId";
              orderIdInput.value = cfData.cfOrderId || orderId;
              form.appendChild(orderIdInput);

              const returnUrlInput = document.createElement("input");
              returnUrlInput.type = "hidden";
              returnUrlInput.name = "returnUrl";
              returnUrlInput.value = cfData.returnUrl || `${window.location.origin}/order-confirmation?id=${orderId}`;
              form.appendChild(returnUrlInput);

              document.body.appendChild(form);
              form.submit();
              return;
            }
          }
          
          void triggerCouponRedemption(orderId);
          clear();
          const invoiceNo = `INV-2026-${orderId.split("-")[1] || Math.floor(10000 + Math.random() * 90000)}`;
          const invoiceDate = new Date().toISOString();

          // Update order via API
          try {
            await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "confirmed",
                payment_status: "paid",
                cashfree_order_id: cfData.cfOrderId || orderId,
                invoice_number: invoiceNo,
                invoice_date: invoiceDate,
              }),
            });
          } catch (e) {
            console.warn("[Checkout] Cashfree order update error:", e);
          }

          // Update Supabase
          try {
            await supabase.from("orders").update({
              status: "confirmed",
              payment_status: "paid",
              invoice_number: invoiceNo,
              invoice_date: invoiceDate,
              updated_at: invoiceDate,
            }).eq("id", orderId);
          } catch (e) {
            console.warn("[Checkout] Cashfree Supabase update error:", e);
          }

          // Update order status locally in mock orders
          const localMock = localStorage.getItem(`mock_order_${orderId}`);
          if (localMock) {
            const parsed = JSON.parse(localMock);
            parsed.status = "confirmed";
            parsed.payment_status = "paid";
            parsed.cashfree_order_id = cfData.cfOrderId || orderId;
            parsed.invoice_number = invoiceNo;
            parsed.invoice_date = invoiceDate;
            localStorage.setItem(`mock_order_${orderId}`, JSON.stringify(parsed));
          }

          toast.success("Payment completed successfully! Order placed.");
          navigate({ to: `/orders/${orderId}` });
        } catch (cfErr: any) {
          console.error("[Checkout] Cashfree checkout error:", cfErr);
          toast.error(cfErr.message || "Cashfree checkout redirect failed");
        }
      }
    } catch (err: any) {
      console.error("[Checkout] Error placing order:", err);
      toast.error(err.message || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (authLoading) {
    return (
      <MarketingLayout>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="bg-secondary/30 min-h-screen py-10">
        <div className="container-prj">
          {/* Header & Back Nav */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                if (activeStep > 1) setActiveStep((prev) => (prev - 1) as 1 | 2 | 3);
                else navigate({ to: "/cart" });
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {activeStep === 1 ? "Back to Cart" : "Back to Previous Step"}
            </button>
            <h1 className="font-display text-2xl font-semibold">Prajnaa Market Checkout</h1>
          </div>

          {/* 3-STEP PROGRESS BAR */}
          <div className="mb-10 max-w-2xl mx-auto">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full -translate-y-1/2 bg-border" />
              <div
                className="absolute left-0 top-1/2 -z-10 h-0.5 -translate-y-1/2 bg-primary transition-all duration-300"
                style={{ width: `${((activeStep - 1) / 2) * 100}%` }}
              />

              {[
                { step: 1, label: "Shipping Address", icon: MapPin },
                { step: 2, label: "Verify Items", icon: ShoppingCart },
                { step: 3, label: "Secure Payment", icon: CreditCard },
              ].map(({ step, label, icon: Icon }) => {
                const isDone = activeStep > step;
                const isCurrent = activeStep === step;
                return (
                  <div key={step} className="flex flex-col items-center gap-2 bg-secondary/30 px-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                        isDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                          ? "border-primary bg-background text-primary ring-4 ring-primary/20"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MAIN CHECKOUT CONTENT & SUMMARY GRID */}
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* LEFT PANEL: STEPS CONTENT */}
            <div className="lg:col-span-7">
              {/* STEP 1: SHIPPING ADDRESS & SERVICE SELECTOR */}
              {activeStep === 1 && (
                <div className="rounded-3xl border border-border bg-background p-6 md:p-8 shadow-sm">
                  <h2 className="font-display text-xl font-semibold mb-1">1. Shipping Address</h2>
                  <p className="text-xs text-muted-foreground mb-6">
                    Enter your delivery location to calculate live India Post / Speed Post rates.
                  </p>

                  <form onSubmit={handleSubmit(onAddressSubmit, onAddressInvalid)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Full Name *
                        </label>
                        <input
                          {...register("name")}
                          placeholder="Swayam Sharma"
                          className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition-all ${
                            errors.name ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                          }`}
                        />
                        {errors.name && (
                          <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Phone Number (10 digits) *
                        </label>
                        <input
                          {...register("phone")}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          value={watchedPhone || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const clean = raw.replace(/\D/g, "").slice(0, 10);
                            setValue("phone", clean, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                          }}
                          placeholder="9876543210"
                          className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition-all ${
                            errors.phone ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                          }`}
                        />
                        {errors.phone && (
                          <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.phone.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Email Address *
                      </label>
                      <input
                        {...register("email")}
                        placeholder="swayam@example.com"
                        className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition-all ${
                          errors.email ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        {...register("address1")}
                        placeholder="House / Flat / House No., Village or Street Name"
                        onFocus={() => setShowAddressDropdown(true)}
                        onBlur={() => setTimeout(() => setShowAddressDropdown(false), 200)}
                        className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition-all ${
                          errors.address1 ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                        }`}
                      />

                      {showAddressDropdown && filteredAddresses.length > 0 && (
                        <ul className="absolute left-0 z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-background py-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-100">
                          {filteredAddresses.map((addr) => (
                            <li
                              key={addr}
                              onMouseDown={() => {
                                setValue("address1", addr, { shouldValidate: true });
                                setShowAddressDropdown(false);
                                
                                // Auto fill matching fields based on suggestion chosen
                                if (addr.includes("Gurugram")) {
                                  setValue("city", "Gurugram", { shouldValidate: true });
                                  setValue("state", "Haryana", { shouldValidate: true });
                                  setValue("pincode", "122022", { shouldValidate: true });
                                } else if (addr.includes("Dehradun")) {
                                  setValue("city", "Dehradun", { shouldValidate: true });
                                  setValue("state", "Uttarakhand", { shouldValidate: true });
                                  setValue("pincode", "248001", { shouldValidate: true });
                                } else if (addr.includes("New Delhi") || addr.includes("Delhi")) {
                                  setValue("city", "New Delhi", { shouldValidate: true });
                                  setValue("state", "Delhi", { shouldValidate: true });
                                  setValue("pincode", "110001", { shouldValidate: true });
                                } else if (addr.includes("Bengaluru")) {
                                  setValue("city", "Bengaluru", { shouldValidate: true });
                                  setValue("state", "Karnataka", { shouldValidate: true });
                                  setValue("pincode", "560001", { shouldValidate: true });
                                } else if (addr.includes("Mumbai")) {
                                  setValue("city", "Mumbai", { shouldValidate: true });
                                  setValue("state", "Maharashtra", { shouldValidate: true });
                                  setValue("pincode", "400001", { shouldValidate: true });
                                } else if (addr.includes("Chennai")) {
                                  setValue("city", "Chennai", { shouldValidate: true });
                                  setValue("state", "Tamil Nadu", { shouldValidate: true });
                                  setValue("pincode", "600001", { shouldValidate: true });
                                } else if (addr.includes("Kolkata")) {
                                  setValue("city", "Kolkata", { shouldValidate: true });
                                  setValue("state", "West Bengal", { shouldValidate: true });
                                  setValue("pincode", "700001", { shouldValidate: true });
                                }
                              }}
                              className="cursor-pointer px-4 py-2 text-xs text-foreground hover:bg-secondary hover:text-primary transition-colors"
                            >
                              {addr}
                            </li>
                          ))}
                        </ul>
                      )}

                      {errors.address1 && (
                        <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.address1.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Address Line 2 (Optional)
                        </label>
                        <input
                          {...register("address2")}
                          placeholder="Locality / Sector"
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Landmark (Optional)
                        </label>
                        <input
                          {...register("landmark")}
                          placeholder="Near Post Office / Temple"
                          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-muted-foreground">
                            Pincode (6 digits) *
                          </label>
                          {detectingPincode && (
                            <span className="text-[10px] text-primary flex items-center gap-1 font-medium animate-pulse">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Detecting...
                            </span>
                          )}
                        </div>
                        <input
                          {...register("pincode")}
                          value={watchedPincode || ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const clean = raw.replace(/\D/g, "").slice(0, 6);
                            setValue("pincode", clean, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                            if (clean.length === 6) {
                              handlePincodeLookup(clean);
                            }
                          }}
                          maxLength={6}
                          placeholder="e.g. 173212"
                          className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none font-mono transition-all ${
                            errors.pincode ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                          }`}
                        />
                        {pincodeSuccessInfo && !detectingPincode && (
                          <p className="mt-1 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                            <Check className="h-3 w-3 text-emerald-600 shrink-0" /> {pincodeSuccessInfo}
                          </p>
                        )}
                        {pincodeError && !detectingPincode && (
                          <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" /> {pincodeError}
                          </p>
                        )}
                        {errors.pincode && (
                          <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.pincode.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          City / District *
                        </label>
                        <input
                          {...register("city")}
                          value={watchedCity || ""}
                          onChange={(e) => setValue("city", e.target.value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
                          placeholder="City / District"
                          className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition-all ${
                            errors.city ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                          }`}
                        />
                        {errors.city && (
                          <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.city.message}
                          </p>
                        )}
                      </div>

                      <div className="relative">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          State *
                        </label>
                        <input
                          {...register("state")}
                          value={watchedState || ""}
                          onChange={(e) => setValue("state", e.target.value, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
                          placeholder="State"
                          onFocus={() => setShowStateDropdown(true)}
                          onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
                          className={`h-11 w-full rounded-xl border bg-background px-4 text-sm outline-none transition-all ${
                            errors.state ? "border-destructive focus:ring-2 focus:ring-destructive/20" : "border-border focus:border-primary"
                          }`}
                        />
                        
                        {showStateDropdown && filteredStates.length > 0 && (
                          <ul className="absolute left-0 z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-background py-1.5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-100">
                            {filteredStates.map((s) => (
                              <li
                                key={s}
                                onMouseDown={() => {
                                  setValue("state", s, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                                  setShowStateDropdown(false);
                                }}
                                className="cursor-pointer px-4 py-2 text-xs text-foreground hover:bg-secondary hover:text-primary transition-colors"
                              >
                                {s}
                              </li>
                            ))}
                          </ul>
                        )}

                        {errors.state && (
                          <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {errors.state.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* SELECTABLE POST OFFICE / LOCALITY IF MULTIPLE RETURNED */}
                    {detectedPostOffices.length > 0 && (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-foreground">
                            Select Local Post Office / Delivery Branch
                          </label>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {detectedPostOffices.length} branches available
                          </span>
                        </div>
                        <select
                          value={selectedPostOffice}
                          onChange={(e) => {
                            const poName = e.target.value;
                            setSelectedPostOffice(poName);
                            if (poName) {
                              const currentAddr2 = getValues("address2") || "";
                              if (!currentAddr2) {
                                setValue("address2", poName, { shouldValidate: true });
                              }
                            }
                          }}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Local Post Office / Locality --</option>
                          {detectedPostOffices.map((po) => (
                            <option key={po.name} value={po.name}>
                              {po.name} ({po.officeType}) — {po.deliveryStatus}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* SERVICE SELECTOR */}
                    <div className="mt-6 pt-6 border-t border-border">
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Select Postal Shipping Carrier *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                            shippingService === "india_post"
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingService"
                            checked={shippingService === "india_post"}
                            onChange={() => setShippingService("india_post")}
                            className="accent-primary"
                          />
                          <div>
                            <div className="font-semibold text-xs text-foreground">India Post Parcel</div>
                            <div className="text-[11px] text-muted-foreground">Economical standard delivery</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                            shippingService === "speed_post"
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingService"
                            checked={shippingService === "speed_post"}
                            onChange={() => setShippingService("speed_post")}
                            className="accent-primary"
                          />
                          <div>
                            <div className="font-semibold text-xs text-foreground">Speed Post</div>
                            <div className="text-[11px] text-muted-foreground">Express priority delivery</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mt-6 w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Continue to Verify Items <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2: VERIFY ITEMS & WEIGHT SUMMARY */}
              {activeStep === 2 && (
                <div className="rounded-3xl border border-border bg-background p-6 md:p-8 shadow-sm">
                  <h2 className="font-display text-xl font-semibold mb-1">2. Verify Cart Produce</h2>
                  <p className="text-xs text-muted-foreground mb-6">
                    Review your farmer-sourced items and exact total package weights.
                  </p>

                  <div className="divide-y divide-border mb-6">
                    {items.map((item) => {
                      const itemWeightGm = parseWeightToGrams(item.weight);
                      return (
                        <div key={item.slug} className="py-4 flex items-center gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary border border-border">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Unit Weight: {formatWeight(itemWeightGm)} | ₹{item.price} each
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setQty(item.slug, item.qty - 1)}
                              className="h-7 w-7 rounded-full border border-border text-xs flex items-center justify-center hover:bg-secondary"
                            >
                              -
                            </button>
                            <span className="text-xs font-semibold w-5 text-center">{item.qty}</span>
                            <button
                              onClick={() => setQty(item.slug, item.qty + 1)}
                              className="h-7 w-7 rounded-full border border-border text-xs flex items-center justify-center hover:bg-secondary"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold text-foreground">
                              {inr(item.price * item.qty)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {formatWeight(itemWeightGm * item.qty)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="rounded-full border border-border px-6 py-3.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleProceedToPayment}
                      className="flex-1 rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Proceed to Payment <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SECURE PAYMENT OPTIONS */}
              {activeStep === 3 && (
                <div className="rounded-3xl border border-border bg-background p-6 md:p-8 shadow-sm">
                  <h2 className="font-display text-xl font-semibold mb-1">3. Select Payment Method</h2>
                  <p className="text-xs text-muted-foreground mb-6">
                    Choose your preferred payment gateway or manual WhatsApp option.
                  </p>

                  <div className="space-y-3 mb-6">
                    {/* OPTION 3.1: WHATSAPP (Available & Highlighted) */}
                    <label
                      className={`flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all ${
                        paymentMethod === "whatsapp"
                          ? "border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "whatsapp"}
                        onChange={() => setPaymentMethod("whatsapp")}
                        className="mt-1 accent-emerald-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">WhatsApp Order & Direct Payment</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300/40">
                              <MessageSquare className="h-3 w-3 text-emerald-600" /> +91 76500 65690
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Zero Transaction Fee
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          Your order is instantly confirmed with Prajnaa's WhatsApp Concierge. Pay directly via UPI (Google Pay, PhonePe, Paytm, BHIM) or bank transfer. Fresh produce is inspected, sealed, and dispatched within 2–3 business days via India Post Speed Post.
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                          <span>✓ Instant WhatsApp Receipt</span>
                          <span>✓ Direct Farmer Support</span>
                          <span>✓ Speed Post Live Tracking</span>
                        </div>
                      </div>
                    </label>

                    {/* OPTION 3.2: COD (Available & Highlighted) */}
                    <label
                      className={`flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all ${
                        paymentMethod === "cod"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                          : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="mt-1 accent-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">Cash on Delivery (COD)</span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full font-mono">
                            +₹{config.cod_flat_fee ?? COD_FLAT_FEE ?? 40} COD Fee
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Pay cash upon delivery. Status will be marked as <code className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded">cod_pending</code>. An extra handling fee of ₹{config.cod_flat_fee ?? COD_FLAT_FEE ?? 40} applies.
                        </p>
                      </div>
                    </label>

                    {/* OPTION 3.3: RAZORPAY (Restricted / Temporarily Disabled) */}
                    {(() => {
                      const enabled = isGatewayEnabled("razorpay");
                      return (
                        <label
                          className={`flex items-start gap-4 rounded-2xl border p-4 transition-all ${
                            enabled
                              ? paymentMethod === "razorpay"
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 cursor-pointer"
                                : "border-border hover:bg-secondary/40 cursor-pointer"
                              : "opacity-55 grayscale cursor-not-allowed pointer-events-none bg-secondary/20 border-dashed border-border select-none"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            disabled={!enabled}
                            checked={paymentMethod === "razorpay"}
                            onChange={() => enabled && setPaymentMethod("razorpay")}
                            className="mt-1 accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">Razorpay (UPI / Cards / Netbanking)</span>
                              </div>
                              {enabled ? (
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                  +2.36% Gateway Fee
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Temporarily unavailable
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {enabled
                                ? "Standard 2% fee + 18% GST (≈2.36% effective). Calculated before payment."
                                : "Razorpay online payment is temporarily unavailable. Please choose Cash on Delivery or WhatsApp order."}
                            </p>
                          </div>
                        </label>
                      );
                    })()}

                    {/* OPTION 3.4: CASHFREE (Restricted / Temporarily Disabled) */}
                    {(() => {
                      const enabled = isGatewayEnabled("cashfree");
                      return (
                        <label
                          className={`flex items-start gap-4 rounded-2xl border p-4 transition-all ${
                            enabled
                              ? paymentMethod === "cashfree"
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 cursor-pointer"
                                : "border-border hover:bg-secondary/40 cursor-pointer"
                              : "opacity-55 grayscale cursor-not-allowed pointer-events-none bg-secondary/20 border-dashed border-border select-none"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            disabled={!enabled}
                            checked={paymentMethod === "cashfree"}
                            onChange={() => enabled && setPaymentMethod("cashfree")}
                            className="mt-1 accent-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">Cashfree Payments</span>
                              </div>
                              {enabled ? (
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                                  +2.30% Gateway Fee
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Temporarily unavailable
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {enabled
                                ? "Standard 1.95% fee + 18% GST (≈2.30% effective). Calculated before payment."
                                : "Cashfree online payment is temporarily unavailable. Please choose Cash on Delivery or WhatsApp order."}
                            </p>
                          </div>
                        </label>
                      );
                    })()}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="rounded-full border border-border px-6 py-3.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
                    >
                      Back
                    </button>
                    <button
                      disabled={placing}
                      onClick={handlePlaceOrder}
                      className="flex-1 rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {placing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          Processing Order...
                        </>
                      ) : (
                        <>
                          Confirm & Place Order ({inr(finalTotal)})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: LIVE CHECKOUT SUMMARY */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-border bg-background p-6 shadow-sm sticky top-24">
                <h3 className="font-display text-lg font-semibold mb-4 border-b border-border pb-3">
                  Checkout Summary
                </h3>

                {/* ITEMS BRIEF */}
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
                  {items.map((i) => (
                    <div key={i.slug} className="flex justify-between text-xs">
                      <span className="text-foreground/90 font-medium truncate max-w-[180px]">
                        {i.name} × {i.qty}
                      </span>
                      <span className="text-muted-foreground">
                        {inr(i.price * i.qty)} ({formatWeight(parseWeightToGrams(i.weight) * i.qty)})
                      </span>
                    </div>
                  ))}
                </div>

                {/* COUPON / PROMO CODE SECTION */}
                <div className="border-t border-border pt-4 pb-2 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span>Have a Coupon Code?</span>
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-2.5 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          <span className="font-mono font-bold text-primary">{appliedCoupon.code}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{appliedCoupon.discount.breakdown}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCheckoutCoupon}
                        className="rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Remove coupon"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCheckoutCoupon} className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={checkoutCouponCode}
                          onChange={(e) => {
                            setCheckoutCouponCode(e.target.value.toUpperCase());
                            setCheckoutCouponError(null);
                          }}
                          placeholder="ENTER CODE"
                          className="h-9 flex-1 rounded-xl border border-border bg-secondary/30 px-3 font-mono text-xs uppercase outline-none focus:border-primary placeholder:text-muted-foreground/60"
                        />
                        <button
                          type="submit"
                          disabled={applyingCheckoutCoupon}
                          className="h-9 rounded-xl bg-[#0F3D2E] px-3 text-xs font-semibold text-white hover:bg-[#154d3b] transition cursor-pointer disabled:opacity-50"
                        >
                          {applyingCheckoutCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                      {checkoutCouponError && (
                        <p className="text-[11px] text-destructive">{checkoutCouponError}</p>
                      )}
                    </form>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal (Taxable)</span>
                    <span>{inr(subtotal)}</span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-success font-medium">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>- {inr(couponDiscount)}</span>
                    </div>
                  )}

                  {totalGst > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST (Tax)</span>
                      <span>{inr(totalGst)}</span>
                    </div>
                  )}

                  {/* SHIPPING LIVE QUOTE BREAKDOWN */}
                  <div className="flex justify-between text-muted-foreground items-center">
                    <span>
                      Shipping ({shippingService === "speed_post" ? "Speed Post" : "India Post"})
                    </span>
                    {isFreeShipping ? (
                      <span className="font-semibold text-success bg-success/15 px-2 py-0.5 rounded-full text-[11px]">
                        FREE (Coupon)
                      </span>
                    ) : calculatingShipping ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" /> Calculating...
                      </span>
                    ) : shippingQuote ? (
                      <span className="font-semibold text-foreground">{inr(shippingCost)}</span>
                    ) : watchedPincode?.length === 6 ? (
                      <span className="text-amber-600">Pending Quote</span>
                    ) : (
                      <span className="text-muted-foreground">Enter Pincode</span>
                    )}
                  </div>

                  {shippingError && !isFreeShipping && (
                    <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-2.5 text-[11px] text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{shippingError}</span>
                    </div>
                  )}

                  {/* GATEWAY FEE OR COD SURCHARGE BREAKDOWN */}
                  {gatewayFee > 0 && (
                    <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded-xl text-xs">
                      <span>{paymentMethod === "cod" ? "COD Handling Fee" : `Gateway Fee (${paymentMethod ? paymentMethod.toUpperCase() : "ONLINE"})`}</span>
                      <span>+{inr(gatewayFee)}</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3 flex justify-between items-center text-sm font-semibold text-foreground">
                    <span>Total Amount Payable</span>
                    <span className="text-lg text-primary">{inr(finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
