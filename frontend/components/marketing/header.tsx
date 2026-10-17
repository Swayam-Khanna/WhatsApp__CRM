"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, ShoppingBag, User, Menu, X, Truck, ArrowRight, Heart } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useCart, cartTotals } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useAuth } from "@/hooks/use-auth";
import { categories } from "@/lib/mock/categories";
import { AccountSidebar } from "@/components/account/sidebar";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const { count } = cartTotals(items);
  const wishlistItems = useWishlist((s) => s.items);
  const wishlistCount = wishlistItems.length;
  const { user } = useAuth();

  // Search parameters state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");

  const accountHref = user ? "/account" : "/auth/login";

  // Track scroll position cleanly for subtle shadow only — NO layout height change
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // Trigger search navigation
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (searchCategory !== "all") params.set("cat", searchCategory);
    const queryString = params.toString();
    router.push(`/shop${queryString ? `?${queryString}` : ""}`);
  };

  return (
    <header className="w-full z-50 sticky top-0 transition-all duration-300">
      {/* 1. Top Bar Banner (Green Strip) */}
      <div className="bg-[#0F3D2E] text-white text-xs border-b border-primary/20">
        <div className="container-prj flex flex-row items-center justify-between gap-1 sm:gap-2 py-1.5 sm:py-2">
          <div className="flex items-center gap-1.5 sm:gap-4 text-[10px] sm:text-[11px] tracking-wide overflow-hidden whitespace-nowrap">
            <span className="flex items-center gap-1 font-medium truncate">
              <Truck className="h-3 w-3 text-accent shrink-0" /> Farm to doorstep, across India
            </span>
            <span className="opacity-45 shrink-0">|</span>
            <span className="text-emerald-300 font-bold shrink-0">
              🌱 100% TRACEABLE
            </span>
            <span className="opacity-45 shrink-0 hidden md:inline">|</span>
            <a
              href="https://wa.me/917650065690"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 font-semibold hidden md:inline-flex items-center gap-1 hover:text-white transition"
            >
              💬 WhatsApp: +91 76500 65690
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] shrink-0">
            <a
              href="https://wa.me/917650065690"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 font-semibold md:hidden hover:text-white transition"
            >
              WhatsApp Support
            </a>
            <span className="opacity-30 md:hidden">|</span>
            <Link href="/track-order" className="hover:text-accent transition duration-200">
              Track Order
            </Link>
            <span className="opacity-30">|</span>
            <Link href="/farmer-login" className="hover:text-accent transition font-semibold">
              Partner
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Search Header + Sub Navigation in a unified card */}
      <div
        className={`w-full border-b border-border/40 transition-shadow duration-200 bg-background/95 backdrop-blur-md py-2.5 ${
          isScrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="container-prj flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0 transition-transform duration-300 hover:scale-105">
            <Logo />
          </div>

          {/* Integrated Search Bar with Autocomplete */}
          <div className="relative hidden md:flex flex-1 max-w-xl">
            <form
              onSubmit={handleSearchSubmit}
              className="w-full flex items-center border border-border/60 rounded-full overflow-hidden shadow-sm bg-secondary/10 hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-300"
            >
              {/* Category select */}
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="bg-transparent pl-4 pr-2 py-2 text-xs font-semibold text-foreground/80 outline-none border-r border-border/60 cursor-pointer select-none max-w-[140px] truncate transition hover:text-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Input field */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, farmers, categories..."
                className="flex-1 bg-transparent px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
              />

              {/* Submit button */}
              <button
                type="submit"
                className="bg-primary text-primary-foreground p-2.5 px-5 hover:opacity-95 hover:shadow-inner transition duration-300 flex items-center justify-center cursor-pointer"
                aria-label="Search"
              >
                <Search className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            {searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-background p-3 shadow-xl backdrop-blur-lg animate-scale-up">
                <p className="font-subhead text-[10px] uppercase tracking-wider text-muted-foreground px-3 py-1">
                  Instant Suggestions
                </p>
                <div className="space-y-1 mt-1">
                  {categories
                    .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 2)
                    .map((c) => (
                      <Link
                        key={c.slug}
                        href={`/shop?cat=${c.slug}`}
                        onClick={() => setSearchQuery("")}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs hover:bg-secondary transition"
                      >
                        <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Category</span>
                        <span>{c.name}</span>
                      </Link>
                    ))}

                  <Link
                    href={`/shop?q=${encodeURIComponent(searchQuery)}`}
                    onClick={() => setSearchQuery("")}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition"
                  >
                    <span>Search for "{searchQuery}"</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Action Icons (Cart, Account, Mobile Toggle) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Search Icon (Mobile Only) */}
            <Link
              href="/shop"
              aria-label="Search products"
              className="md:hidden h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-foreground/75 hover:bg-secondary/60 hover:text-primary transition-all duration-200 flex"
            >
              <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </Link>

            {/* Account Icon */}
            <Link
              href={accountHref}
              aria-label={user ? "Account" : "Sign in"}
              className="h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-foreground/75 hover:bg-secondary/60 hover:text-primary transition-all duration-200 flex"
            >
              <User className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </Link>

            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-foreground/75 hover:bg-secondary/60 hover:text-primary transition-all duration-200"
            >
              <Heart className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 font-display text-[9px] font-semibold text-primary-foreground shadow-sm animate-scale-in">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Icon */}
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-foreground/75 hover:bg-secondary/60 hover:text-primary transition-all duration-200"
            >
              <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 font-display text-[9px] font-semibold text-primary-foreground shadow-sm animate-scale-in">
                  {count}
                </span>
              )}
            </Link>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-foreground/75 hover:bg-secondary/60 hover:text-primary transition-all flex cursor-pointer shrink-0"
            >
              {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Unified sticky scroll sub-navigation */}
        <div className="container-prj mt-2.5 pt-2 border-t border-border/20 items-center justify-between hidden md:flex">
          <nav className="flex items-center gap-4 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar py-0.5">
            {[
              { label: "Home", path: "/" },
              { label: "Shop Harvest", path: "/shop" },
              { label: "Meet Farmers", path: "/farmers" },
              { label: "Our Story", path: "/about" },
              { label: "Contact Us", path: "/contact" },
            ].map((link) => {
              const active = link.path === "/" ? pathname === "/" : Boolean(pathname?.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`font-subhead text-xs font-semibold relative py-1 transition-colors duration-300 hover:text-primary whitespace-nowrap ${
                    active ? "text-primary font-bold" : "text-foreground/70"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-full animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="font-subhead text-[10px] uppercase tracking-widest font-semibold items-center gap-1.5 overflow-hidden w-[240px] lg:w-[280px] relative select-none hidden xl:flex shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="overflow-hidden w-full relative h-4 flex items-center [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div className="flex w-max items-center animate-marquee-fast">
                <div className="flex items-center gap-4 whitespace-nowrap shrink-0 pr-4">
                  <span className="text-primary font-bold">100% TRACEABLE TO SOIL</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-700 font-bold dark:text-emerald-400">DIRECT FROM VERIFIED FARMERS</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-primary font-bold">RIGOROUSLY LAB TESTED & PURE</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-700 font-bold dark:text-emerald-400">ZERO PESTICIDES & CHEMICALS</span>
                  <span className="text-muted-foreground/40">•</span>
                </div>
                <div className="flex items-center gap-4 whitespace-nowrap shrink-0 pr-4" aria-hidden="true">
                  <span className="text-primary font-bold">100% TRACEABLE TO SOIL</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-700 font-bold dark:text-emerald-400">DIRECT FROM VERIFIED FARMERS</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-primary font-bold">RIGOROUSLY LAB TESTED & PURE</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-700 font-bold dark:text-emerald-400">ZERO PESTICIDES & CHEMICALS</span>
                  <span className="text-muted-foreground/40">•</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {open && (
        <div className="border-t border-border/50 bg-background md:hidden animate-fade-in shadow-xl">
          {pathname?.startsWith("/account") ? (
            <div className="container-prj py-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm">
                    {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate max-w-[170px]">
                      {user?.name || "My Account"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="font-subhead inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full hover:bg-primary/20 transition"
                >
                  <ArrowRight className="h-3 w-3 rotate-180" /> Store Home
                </Link>
              </div>

              <p className="font-subhead text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
                Account Navigation
              </p>

              {/* Render Account Nav Items */}
              <div className="pb-2">
                <AccountSidebar onNavigate={() => setOpen(false)} />
              </div>
            </div>
          ) : (
            <nav className="container-prj flex flex-col py-3 space-y-1">
              {/* Mobile Category Search */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex border border-border rounded-full overflow-hidden my-3 bg-secondary/10"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, spices..."
                  className="flex-1 bg-transparent px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
                />
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-4 text-xs font-medium hover:opacity-90 cursor-pointer"
                >
                  Go
                </button>
              </form>

              {[
                { label: "Home", path: "/" },
                { label: "Shop Harvest", path: "/shop" },
                { label: "Meet Farmers", path: "/farmers" },
                { label: "Our Story", path: "/about" },
                { label: "Contact Us", path: "/contact" },
              ].map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setOpen(false)}
                  className="font-subhead py-2.5 text-sm text-foreground/85 border-b border-border/10 flex transition hover:pl-2 hover:text-primary duration-200"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={accountHref}
                onClick={() => setOpen(false)}
                className="font-subhead py-3 text-sm text-primary font-medium flex hover:text-primary/80"
              >
                {user ? "My Account Dashboard" : "Sign In / Register"}
              </Link>
            </nav>
          )}
        </div>
      )}
    </header>
  );
}
