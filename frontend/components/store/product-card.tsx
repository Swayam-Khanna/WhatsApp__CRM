import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { Heart, Star, Eye, X, ShoppingBag, ArrowRight, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/mock/types";
import { inr } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { farmerBySlug } from "@/lib/mock/farmers";
import { resolveSafeProductImage } from "@/lib/services/productSyncService";
import { formatStock } from "@/lib/weight-utils";

export function ProductCard({ product }: { product: Product }) {
  const [showQuickView, setShowQuickView] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showQuickView) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showQuickView]);

  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  const cartItem = useCart((s) => s.items.find((i) => i.slug === product.slug));
  const currentQty = cartItem ? cartItem.qty : 0;

  const toggleWish = useWishlist((s) => s.toggle);
  const saved = useWishlist((s) => s.items.some((i) => i.slug === product.slug));
  const farmer = farmerBySlug(product.farmerSlug);
  const location = farmer ? `${farmer.village}, ${farmer.state}` : (product as any).farmerLocation;

  const discountPercent =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  const allowsPreorder = Boolean(
    product.is_preorder ||
    (product as any).isPreorder ||
    product.preOrder?.enabled ||
    (Array.isArray(product.badges) &&
      product.badges.some((b: any) =>
        typeof b === "string"
          ? b.toLowerCase().includes("pre-order") || b.toLowerCase().includes("preorder")
          : (b.label || b.text || "").toLowerCase().includes("pre-order") ||
            (b.label || b.text || "").toLowerCase().includes("preorder")
      ))
  );

  // If product is in stock (> 0), customers buy normally from shelf inventory.
  // It only enters Pre-Order reservation mode if shelf stock is 0 and pre-order is enabled!
  const isOutOfStock = Number(product.stock ?? 0) <= 0;
  const isPreOrder = isOutOfStock && allowsPreorder;

  const safeImage = resolveSafeProductImage(product.image, product.category);
  const isDataUrl = typeof safeImage === "string" && (safeImage.startsWith("data:") || safeImage.startsWith("blob:"));

  const secondaryImage =
    product.images && product.images[1] && typeof product.images[1] === "string" && product.images[1].trim() !== ""
      ? product.images[1]
      : null;
  const isSecondaryDataUrl =
    typeof secondaryImage === "string" &&
    (secondaryImage.startsWith("data:") || secondaryImage.startsWith("blob:"));

  return (
    <>
      <div
        className="group flex h-full flex-col pb-2 transition-transform duration-300 hover:-translate-y-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative block overflow-hidden rounded-2xl bg-secondary">
          <Link href={`/product/${product.slug}`}>
            <div className="aspect-square w-full overflow-hidden relative rounded-2xl">
              <Image
                src={safeImage}
                alt={product.name || "Product"}
                fill
                unoptimized={isDataUrl}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-contain p-2 rounded-2xl transition-opacity duration-300 ease-in-out ${
                  secondaryImage && isHovered ? "opacity-0" : "opacity-100"
                }`}
              />
              {secondaryImage && isHovered && (
                <Image
                  src={secondaryImage}
                  alt={`${product.name} Raw`}
                  fill
                  unoptimized={isSecondaryDataUrl}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain p-2 rounded-2xl transition-opacity duration-300 ease-in-out pointer-events-none"
                />
              )}
            </div>
          </Link>

          {/* Quick View Button on Hover */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowQuickView(true);
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full bg-background/95 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow backdrop-blur flex items-center gap-1.5 hover:bg-primary hover:text-primary-foreground cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" /> Quick View
          </button>

          {/* Stock status badge / Pre-Order badge / Discount badge / Product Badges */}
          {isPreOrder ? (
            <span className="font-subhead absolute left-3 top-3 rounded-full bg-[#E8A317] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white font-bold backdrop-blur shadow-xs">
              PRE-ORDER
            </span>
          ) : product.stock <= 0 ? (
            <span className="font-subhead absolute left-3 top-3 rounded-full bg-destructive/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-destructive-foreground backdrop-blur">
              Sold Out
            </span>
          ) : product.stock <= 10 ? (
            <span className="font-subhead absolute left-3 top-3 rounded-full bg-amber-500/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white backdrop-blur">
              Only {product.stock} left
            </span>
          ) : discountPercent ? (
            <span className="font-subhead absolute left-3 top-3 rounded-full bg-primary/95 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-primary-foreground backdrop-blur font-bold">
              {discountPercent}% OFF
            </span>
          ) : product.badges && product.badges.length > 0 ? (
            (() => {
              const firstBadge = (product.badges as any[])[0];
              const label = typeof firstBadge === "string" ? firstBadge : firstBadge?.label;
              const isLabTested = typeof firstBadge !== "string" && firstBadge?.type === "lab_tested";
              const isTrust = typeof firstBadge !== "string" && firstBadge?.type === "trust";
              
              if (!label) return null;
              return (
                <span className={`font-subhead absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] backdrop-blur font-bold flex items-center gap-1 ${
                  isLabTested
                    ? "bg-[#1b3c29] text-white"
                    : isTrust
                    ? "bg-amber-600 text-white"
                    : "bg-background/90 text-foreground"
                }`}>
                  {isLabTested && "🧪 "}
                  {isTrust && "🛡️ "}
                  {label}
                </span>
              );
            })()
          ) : null}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleWish({
                slug: product.slug,
                name: product.name,
                image: product.image,
                price: product.price,
                weight: product.weight,
              });
              toast.success(saved ? "Removed from wishlist" : "Added to wishlist");
            }}
            className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full transition-all duration-200 cursor-pointer ${
              saved
                ? "bg-primary text-primary-foreground shadow"
                : "bg-background/80 text-foreground backdrop-blur hover:bg-background"
            }`}
            aria-label="Wishlist"
          >
            <Heart className={`h-4 w-4 ${saved ? "fill-primary-foreground" : ""}`} />
          </button>
        </div>

        {/* Content Details */}
        <div className="mt-3 flex flex-1 flex-col justify-between">
          <div>
            {location && (
              <p className="font-subhead text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
                {location}
              </p>
            )}
            <h3 className="font-display mt-0.5 text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              <Link href={`/product/${product.slug}`}>{product.name}</Link>
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="h-3.5 w-3.5 fill-amber-500" /> {product.rating}
              </span>
              <span>({product.reviews})</span>
              <span>·</span>
              <span>{product.weight}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            {isPreOrder ? (
              <div className="w-full flex items-center justify-between gap-1.5 min-w-0">
                <Link
                  href={`/product/${product.slug}`}
                  className="font-subhead text-[11px] sm:text-xs font-semibold text-[#0F3D2E] flex items-center gap-1.5 min-w-0 leading-tight hover:opacity-80 transition"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#E8A317] animate-pulse" />
                  <span className="line-clamp-1">Reserve Harvest</span>
                </Link>
                <Link
                  href={`/product/${product.slug}`}
                  className="shrink-0 rounded-full bg-[#0F3D2E] text-white hover:bg-[#184028] px-3.5 sm:px-4 py-1.5 text-xs font-semibold shadow-xs transition duration-200 whitespace-nowrap cursor-pointer"
                >
                  Pre-Order
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-lg font-bold text-foreground">
                    {inr(product.price)}
                  </span>
                  {product.mrp && product.mrp > product.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {inr(product.mrp)}
                    </span>
                  )}
                </div>

                {/* Out of Stock Badge / Quantity Stepper Control (- QTY +) or Add Button */}
                {(() => {
                  const stockGrams = (product as any).stock_grams !== undefined
                    ? Number((product as any).stock_grams)
                    : Math.max(0, Math.round(Number(product.stock ?? 0) * 1000));

                  if (stockGrams <= 0) {
                    return (
                      <span className="rounded-full border border-rose-200 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3.5 py-1 text-xs font-bold select-none">
                        Out of stock
                      </span>
                    );
                  }

                  if (currentQty > 0) {
                    return (
                      <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-bold text-primary animate-fade-in shadow-2xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentQty === 1) {
                              remove(product.slug);
                              toast.info(`${product.name} removed from cart`);
                            } else {
                              setQty(product.slug, currentQty - 1);
                            }
                          }}
                          className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20 transition cursor-pointer text-primary"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span className="w-5 text-center font-bold text-foreground text-xs select-none">
                          {currentQty}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            const stepGrams = 500;
                            if ((currentQty + 1) * stepGrams > stockGrams) {
                              toast.error(`Only ${formatStock(stockGrams)} available in stock`);
                              return;
                            }
                            setQty(product.slug, currentQty + 1);
                          }}
                          className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20 transition cursor-pointer text-primary"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        add({
                          slug: product.slug,
                          name: product.name,
                          image: product.image,
                          price: product.price,
                          weight: product.weight,
                        });
                        toast.success(`${product.name} added to cart`);
                      }}
                      className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition cursor-pointer"
                    >
                      Add
                    </button>
                  );
                })()}
            </>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal rendered via Portal to document.body */}
      {showQuickView &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 sm:p-6 animate-fade-in"
            onClick={() => setShowQuickView(false)}
          >
            <div
              className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-background border border-border p-6 sm:p-8 shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowQuickView(false)}
                className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition cursor-pointer shadow-sm"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Modal Content Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* Left Column: Product Image */}
                <div className="relative aspect-square w-full rounded-2xl bg-secondary/30 p-4 flex items-center justify-center overflow-hidden border border-border/40">
                  <Image
                    src={safeImage}
                    alt={product.name || "Product"}
                    fill
                    unoptimized={isDataUrl}
                    sizes="(max-width: 640px) 100vw, 300px"
                    className="object-contain p-2"
                  />
                  {isPreOrder ? (
                    <span className="font-subhead absolute top-3 left-3 rounded-full bg-[#E8A317] px-2.5 py-1 text-[10px] uppercase tracking-wider text-white font-bold shadow-xs z-10">
                      PRE-ORDER
                    </span>
                  ) : discountPercent ? (
                    <span className="font-subhead absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-[10px] uppercase tracking-wider text-primary-foreground font-bold shadow-xs z-10">
                      {discountPercent}% OFF
                    </span>
                  ) : null}
                </div>

                {/* Right Column: Product Details */}
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div>
                    <span className="font-subhead text-[10px] uppercase tracking-widest text-primary font-bold">
                      {isPreOrder ? "Harvest Pre-Order" : "Quick Preview"}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-foreground mt-1 leading-tight">
                      {product.name}
                    </h3>

                    {location && (
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        📍 {location}
                      </p>
                    )}

                    {/* Rating Stars */}
                    {product.rating && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`h-3.5 w-3.5 ${
                                idx < Math.floor(product.rating)
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {product.rating}
                        </span>
                        {product.reviews && (
                          <span className="text-xs text-muted-foreground">
                            ({product.reviews} reviews)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-2.5">
                      <span className="font-display text-2xl font-bold text-primary">
                        {inr(product.price)}
                      </span>
                      {product.mrp && product.mrp > product.price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {inr(product.mrp)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        / {product.weight}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-4">
                      {product.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3">
                    {isPreOrder ? (
                      <Link
                        href={`/product/${product.slug}`}
                        onClick={() => setShowQuickView(false)}
                        className="w-full sm:flex-1 rounded-full bg-[#0F3D2E] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#184028] transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span className="h-2 w-2 rounded-full bg-[#E8A317] animate-pulse" />
                        Pre-Order Harvest
                      </Link>
                    ) : product.stock <= 0 ? (
                      <button
                        disabled
                        className="w-full sm:flex-1 rounded-full bg-secondary px-6 py-2.5 text-xs font-bold text-muted-foreground cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    ) : currentQty > 0 ? (
                      <div className="w-full sm:flex-1 flex items-center justify-between gap-3 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary shadow-2xs">
                        <span className="text-[11px] font-semibold text-muted-foreground">Qty in Cart:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (currentQty === 1) {
                                remove(product.slug);
                                toast.info(`${product.name} removed from cart`);
                              } else {
                                setQty(product.slug, currentQty - 1);
                              }
                            }}
                            className="grid h-6 w-6 place-items-center rounded-full bg-background border border-primary/30 hover:bg-primary hover:text-primary-foreground transition cursor-pointer text-primary"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center font-bold text-foreground text-xs">{currentQty}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (currentQty >= product.stock) {
                                toast.error(`Only ${product.stock} items available in stock`);
                                return;
                              }
                              setQty(product.slug, currentQty + 1);
                            }}
                            className="grid h-6 w-6 place-items-center rounded-full bg-background border border-primary/30 hover:bg-primary hover:text-primary-foreground transition cursor-pointer text-primary"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          add({
                            slug: product.slug,
                            name: product.name,
                            image: product.image,
                            price: product.price,
                            weight: product.weight,
                          });
                          toast.success(`${product.name} added to cart`);
                        }}
                        className="w-full sm:flex-1 rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add to Cart
                      </button>
                    )}

                    <Link
                      href={`/product/${product.slug}`}
                      onClick={() => setShowQuickView(false)}
                      className="w-full sm:w-auto text-center px-4 py-2.5 text-xs font-bold text-foreground hover:text-primary transition flex items-center justify-center gap-1 border border-border/80 rounded-full hover:border-primary/40"
                    >
                      Full Details <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
