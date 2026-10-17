"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Minus,
  Plus,
  Star,
  Truck,
  ShieldCheck,
  Sprout,
  Award,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/layout";
import { ProductCard } from "@/components/store/product-card";
import { ProductReviews } from "@/components/store/product-reviews";
import { inr } from "@/lib/format";
import { useCart } from "@/lib/cart-store";

interface PackSizeOption {
  label: string;
  price: number;
  mrp: number;
  badge?: string;
  image?: string;
  images?: string[];
}

interface BenefitItem {
  icon: React.ReactNode;
  text: string;
}

function getPackSizes(product: any): PackSizeOption[] {
  if (product.variants && product.variants.length > 0) {
    return product.variants.map((v: any) => ({
      label: v.unit,
      price: v.price,
      mrp: v.mrp || Math.ceil(v.price * 1.25),
      badge: v.stock === 0 ? "Out of Stock" : undefined,
      image: v.image || "",
      images: v.images || [],
    }));
  }

  const basePrice = product.price;
  const baseMrp = product.mrp || Math.ceil(basePrice * 1.25);
  return [
    {
      label: product.weight || "Base Unit",
      price: basePrice,
      mrp: baseMrp,
    },
  ];
}

function getKeyBenefits(product: any): BenefitItem[] {
  const nameLower = (product.name || "").toLowerCase();
  const isLiquid =
    nameLower.includes("ghee") ||
    nameLower.includes("oil") ||
    nameLower.includes("honey") ||
    nameLower.includes("juice");

  if (isLiquid) {
    return [
      {
        icon: <Sprout className="h-5 w-5" />,
        text: "Naturally sourced, grass-fed & pure raw ingredients",
      },
      {
        icon: <Award className="h-5 w-5" />,
        text: "Tested on 600+ purity & chemical parameters",
      },
      {
        icon: <Heart className="h-5 w-5" />,
        text: "No synthetic additives, colors or hormones",
      },
    ];
  }

  return [
    {
      icon: <Sprout className="h-5 w-5" />,
      text: "Certified organic, pesticide-free harvest",
    },
    {
      icon: <Award className="h-5 w-5" />,
      text: "Tested on 600+ purity & heavy-metal parameters",
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      text: "Rich in antioxidants, essential vitamins & nutrients",
    },
  ];
}

export default function ProductPageClient({
  initialData,
}: {
  initialData: {
    product: any;
    farmer: any;
    related: any[];
  };
}) {
  const { product, farmer, related } = initialData;
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const { user } = useAuth();

  const packSizes = getPackSizes(product);
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "how-to-use" | "manufacturer">(
    "description",
  );

  const currentSize = packSizes[selectedSizeIdx] || packSizes[0] || {};
  const selectedPrice = currentSize.price || 0;
  const selectedMrp = currentSize.mrp || 0;
  const selectedUnit = currentSize.label || "";

  const images = useMemo(() => {
    if (currentSize && currentSize.images && currentSize.images.length > 0) {
      return currentSize.images.filter((_: string, idx: number) => idx !== 1);
    }
    if (currentSize && currentSize.image) {
      return [currentSize.image];
    }
    if ((product as any).images && (product as any).images.length > 0) {
      return (product as any).images.filter((_: string, idx: number) => idx !== 1);
    }
    return [product.image];
  }, [currentSize, product]);

  const [activeImage, setActiveImage] = useState(images[0]);
  const benefits = getKeyBenefits(product);

  useEffect(() => {
    setSelectedSizeIdx(0);
  }, [product]);

  useEffect(() => {
    setActiveImage(images[0]);
  }, [images]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("recently_viewed")
      .upsert(
        { user_id: user.id, product_slug: product.slug, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,product_slug" },
      );
  }, [user, product.slug]);

  return (
    <MarketingLayout>
      <div className="container-prj pt-10 md:pt-14 pb-20 sm:pb-28 lg:pb-32">
        <nav className="font-subhead mb-6 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-foreground">
            Shop
          </Link>
          <span>/</span>
          <Link href={`/category/${product.category}`} className="hover:text-foreground capitalize">
            {(product.category || "other").replace("-", " ")}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl bg-secondary border border-border">
              <img
                src={activeImage}
                alt={product.name}
                width={800}
                height={800}
                className="aspect-square w-full object-contain p-4 transition-all duration-300"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`h-16 w-16 rounded-xl overflow-hidden border-2 bg-secondary cursor-pointer transition-all ${
                      activeImage === img
                        ? "border-primary scale-95"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="h-full w-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary capitalize">
              {(product.category || "other").replace("-", " ")}
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold leading-[1.05] md:text-5xl">
              {product.name}
            </h1>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-accent">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(product.rating) ? "fill-accent" : "opacity-30"}`}
                  />
                ))}
              </div>
              <span className="font-subhead">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviews} reviews)</span>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-semibold text-[#111827]">
                {inr(selectedPrice)}
              </span>
              <span className="font-subhead text-sm text-muted-foreground font-medium">
                / {selectedUnit}
              </span>
            </div>

            <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-foreground/80">
              {product.description}
            </p>

            {/* Pack Size Selector */}
            {packSizes.length > 0 && (
              <div className="mt-6">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Available Sizes
                </h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {packSizes.map((opt, idx) => {
                    const isActive = selectedSizeIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSizeIdx(idx)}
                        className={`flex flex-col w-32 justify-center rounded-xl border p-3.5 transition-all text-center cursor-pointer ${
                          isActive
                            ? "bg-[#0F3D2E] border-[#0F3D2E] text-white shadow-md scale-[1.02]"
                            : "bg-[#f7f5f0] border-border text-[#111827] hover:border-[#0F3D2E] hover:shadow-sm"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold font-subhead ${isActive ? "text-white" : "text-muted-foreground"}`}
                        >
                          {opt.label}
                        </span>
                        <span
                          className={`mt-1 text-sm font-semibold ${isActive ? "text-white" : "text-[#111827]"}`}
                        >
                          {inr(opt.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Key Benefits */}
            <div className="mt-6 border-t border-border pt-5">
              <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key Benefits
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center text-center gap-2 rounded-2xl border border-[#f0e6d2] bg-[#fdfbf7] p-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5efe4] text-primary">
                      {b.icon}
                    </div>
                    <span className="text-[10px] font-medium text-foreground/80 leading-normal">
                      {b.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex h-12 items-center rounded-full border border-border">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease"
                  className="grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-subhead w-8 text-center text-sm">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  aria-label="Increase"
                  className="grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  add(
                    {
                      slug: `${product.slug}-${selectedUnit.replace(/\s+/g, "").toLowerCase()}`,
                      name: `${product.name} (${selectedUnit})`,
                      image: product.image,
                      price: selectedPrice,
                      weight: selectedUnit,
                      baseSlug: product.slug,
                    } as any,
                    qty,
                  );
                  toast.success(`${product.name} (${selectedUnit}) added to cart`);
                }}
                className="font-subhead h-12 flex-1 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Add to cart
              </button>
              <Link
                href="/checkout"
                onClick={() =>
                  add(
                    {
                      slug: `${product.slug}-${selectedUnit.replace(/\s+/g, "").toLowerCase()}`,
                      name: `${product.name} (${selectedUnit})`,
                      image: product.image,
                      price: selectedPrice,
                      weight: selectedUnit,
                      baseSlug: product.slug,
                    } as any,
                    qty,
                  )
                }
                className="font-subhead h-12 inline-flex items-center justify-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Buy now
              </Link>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              <li className="font-subhead flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> Quality guarantee
              </li>
              <li className="font-subhead flex items-center gap-2 text-xs text-muted-foreground">
                <Sprout className="h-4 w-4 text-primary" /> Naturally grown
              </li>
            </ul>

            {/* Farmer card */}
            <Link
              href={`/farmer/${farmer.slug}`}
              className="mt-8 flex items-center gap-4 rounded-2xl border border-border bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            >
              <img
                src={farmer.image}
                alt={farmer.name}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Grown by
                </p>
                <p className="font-display text-base font-medium">{farmer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {farmer.village}, {farmer.state} · {farmer.method}
                </p>
              </div>
              <span className="font-subhead text-xs text-primary">Read story →</span>
            </Link>
          </div>
        </div>

        {/* Product Info Tabs */}
        <div className="mt-16 border-t border-border pt-10">
          <div className="flex flex-wrap border-b border-border justify-center sm:justify-start gap-2">
            {[
              { id: "description", label: "Description" },
              { id: "how-to-use", label: "How to Use" },
              { id: "manufacturer", label: "Manufacturer Information" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`font-subhead px-6 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === "description" && (
              <div className="max-w-3xl space-y-4">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                  {product.description || "No description available."}
                </p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2 text-xs">
                  <div className="flex justify-between border-b border-border/60 py-1.5">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold capitalize">{product.category}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/60 py-1.5">
                    <span className="text-muted-foreground">Verification status</span>
                    <span className="font-semibold text-success flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> PGS-India Certified
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "how-to-use" && (
              <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-foreground/80">
                <h4 className="font-display font-semibold text-foreground">Usage Directions:</h4>
                <p>
                  {product.category === "dry-fruits" ||
                  product.category === "nuts" ||
                  product.category === "seeds"
                    ? "Enjoy as a healthy standalone snack, mix with breakfast cereals like muesli or oats, or use as a topping for desserts and salads."
                    : product.category === "spices" ||
                        product.category === "masalas" ||
                        product.category === "salts"
                      ? "Add to hot oil or ghee at the beginning of cooking to release aromatic essential oils, or sprinkle over finished dishes for direct seasoning."
                      : "Add to daily cooking, tea, hot milk, or warm water. Store in a cool, dry place away from direct sunlight in an airtight container."}
                </p>
              </div>
            )}

            {activeTab === "manufacturer" && (
              <div className="max-w-2xl overflow-hidden rounded-2xl border border-[#f0e6d2] bg-[#fdfbf7]">
                <table className="w-full text-left text-sm">
                  <tbody>
                    <tr className="border-b border-[#f0e6d2]/60">
                      <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50 w-1/3">
                        Grown By
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground">{farmer.name}</td>
                    </tr>
                    <tr className="border-b border-[#f0e6d2]/60">
                      <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50">
                        Farm Location
                      </td>
                      <td className="px-5 py-3.5 text-foreground">
                        {farmer.village}, {farmer.state}
                      </td>
                    </tr>
                    <tr className="border-b border-[#f0e6d2]/60">
                      <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50">
                        Farming Method
                      </td>
                      <td className="px-5 py-3.5 text-foreground capitalize">
                        {farmer.method || "Natural Farming"}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-3.5 font-medium text-muted-foreground bg-[#faf6ed]/50">
                        Traceability ID
                      </td>
                      <td className="px-5 py-3.5 text-xs text-primary font-mono font-semibold">
                        PRJ-{farmer.slug.toUpperCase()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 4-Step Production Process */}
        <div className="mt-8 mb-16 overflow-hidden rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 relative shadow-lg">
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight text-white">
              Organic From The Start, Nourishing To The Last
            </h3>
            <p className="font-subhead text-xs tracking-widest text-[#dca842] mt-2 font-bold uppercase">
              With 0 Chemical Intervention
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
            {[
              {
                step: "Step 1",
                title: "Sourced Organically",
                desc: "Raw ingredients collected from pesticide-free, certified local Indian farms.",
              },
              {
                step: "Step 2",
                title: "Quality Tested",
                desc: "Tested thoroughly to ensure it passes all organic purity and heavy metal parameters.",
              },
              {
                step: "Step 3",
                title: "Hygienically Processed",
                desc: "Meticulously processed and churned in a temperature-controlled environment.",
              },
              {
                step: "Step 4",
                title: "Pure & Authentic",
                desc: "Delivered fresh to ensure you get the highest quality authentic nutrition.",
              },
            ].map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/10 backdrop-blur-md p-5 border border-white/10 flex flex-col items-center text-center"
              >
                <span className="font-subhead text-[10px] uppercase font-bold text-[#dca842] tracking-wider">
                  {s.step}
                </span>
                <h4 className="font-display font-semibold text-white mt-1.5 text-sm">{s.title}</h4>
                <p className="text-white/80 text-[11px] mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <ProductReviews productSlug={product.slug} />

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20 sm:mt-28 border-t border-[#E6E0D4] pt-12 sm:pt-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
              <div>
                <span className="font-subhead text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#0F3D2E] bg-[#E8EFE8] px-3 py-1 rounded-full inline-block mb-2">
                  Similar Harvests
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#173328]">
                  You may also like
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  Handpicked unadulterated essentials from our certified partner farms
                </p>
              </div>
              <Link
                href="/shop"
                className="font-subhead inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#0F3D2E] hover:text-[#184028] hover:underline transition self-start sm:self-auto shrink-0"
              >
                <span>Browse all harvests</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </MarketingLayout>
  );
}
