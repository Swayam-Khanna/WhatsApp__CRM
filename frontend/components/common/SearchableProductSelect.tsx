"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, Package, X } from "lucide-react";

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  weight?: string;
  category?: string;
  image?: string;
  stock?: string;
}

export interface SearchableProductSelectProps {
  products: ProductOption[];
  selectedProductId?: string;
  selectedId?: string;
  onSelectProduct?: (product: ProductOption) => void;
  onSelect?: (product: ProductOption) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const SearchableProductSelect: React.FC<SearchableProductSelectProps> = ({
  products,
  selectedProductId,
  selectedId,
  onSelectProduct,
  onSelect,
  placeholder = "Search and select Himalayan product...",
  className = "",
  disabled = false,
}) => {
  const effectiveSelectedId = selectedProductId || selectedId || "";
  const effectiveOnSelect = onSelectProduct || onSelect || (() => {});
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === effectiveSelectedId),
    [products, effectiveSelectedId]
  );

  // Filter products by name, category, or ID
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.weight && p.weight.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (product: ProductOption) => {
    effectiveOnSelect(product);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={containerRef} className={`relative ${isOpen ? "z-[80]" : "z-10"} ${className}`}>
      {/* Selected Product Display / Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-2.5 rounded-xl border transition text-left flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-800 ${
          isOpen
            ? "border-emerald-600 ring-2 ring-emerald-500/20 dark:border-emerald-500 shadow-sm"
            : "border-neutral-200 dark:border-slate-700 hover:border-neutral-300"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          {selectedProduct ? (
            <div className="flex items-center gap-2 flex-1 min-w-0" title={`${selectedProduct.name}${selectedProduct.weight ? ` (${selectedProduct.weight})` : ""} - ₹${selectedProduct.price}`}>
              <span className="font-semibold text-neutral-900 dark:text-white text-xs leading-snug break-words flex-1 text-left">
                {selectedProduct.name}
              </span>
              {selectedProduct.weight && (
                <span className="text-[10px] text-neutral-600 dark:text-slate-300 shrink-0 font-medium bg-neutral-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                  {selectedProduct.weight}
                </span>
              )}
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0 ml-auto">
                ₹{selectedProduct.price.toLocaleString("en-IN")}
              </span>
            </div>
          ) : (
            <span className="text-neutral-400 truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu with Live Search */}
      {isOpen && (
        <div className="absolute z-[85] left-0 right-0 min-w-full sm:min-w-[440px] mt-1.5 bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[300px]">
          {/* Search Box Header */}
          <div className="p-2 border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/80 dark:bg-slate-800/80 shrink-0 relative">
            <Search className="h-3.5 w-3.5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to filter products..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Product List Options */}
          <div className="overflow-y-auto divide-y divide-neutral-100 dark:divide-slate-800/60 p-1 flex-1">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-400">
                No produce found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === effectiveSelectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold"
                        : "hover:bg-neutral-50 dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-neutral-900 dark:text-white break-words">{p.name}</span>
                        {p.weight && (
                          <span className="text-[10px] text-neutral-500 font-medium shrink-0 bg-neutral-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {p.weight}
                          </span>
                        )}
                      </div>
                      {p.category && (
                        <span className="text-[10px] text-neutral-400 block font-normal capitalize mt-0.5">
                          {p.category.replace("-", " ")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        ₹{p.price.toLocaleString("en-IN")}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;
