"use client";

import { useState, useMemo, useEffect } from "react";
import { Star, Search, Filter, ArrowUpDown, Check, Sparkles, Shield, Eye, EyeOff, Edit3, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useFarmerStore, resolveFarmerImage } from "@/lib/farmers-store";
import { useIsAdmin } from "@/lib/admin/use-admin";
import { farmers as mockFarmers } from "@/lib/mock/farmers";
import { EditFarmerModal } from "@/components/admin/edit-farmer-modal";

interface FarmerShowcaseManagerProps {
  dbFarmers?: any[];
}

export function FarmerShowcaseManager({ dbFarmers = [] }: FarmerShowcaseManagerProps) {
  const { isAdmin } = useIsAdmin();
  const storeRatings = useFarmerStore((s) => s.ratings);
  const storeHomepageVisibility = useFarmerStore((s) => s.homepageVisibility);
  const getRating = useFarmerStore((s) => s.getRating);
  const setRating = useFarmerStore((s) => s.setRating);
  const getHomepageVisibility = useFarmerStore((s) => s.getHomepageVisibility);
  const toggleHomepageVisibility = useFarmerStore((s) => s.toggleHomepageVisibility);

  const [search, setSearch] = useState("");
  const [filterHomepage, setFilterHomepage] = useState<"all" | "yes" | "no">("all");
  const [sortBy, setSortBy] = useState<"rating-desc" | "rating-asc" | "name-asc">("rating-desc");
  const [editingFarmer, setEditingFarmer] = useState<any | null>(null);

  useEffect(() => {
    try {
      useFarmerStore.persist.rehydrate();
    } catch {}
  }, []);

  // Combine DB farmers and mock farmers with unique keys
  const allFarmers = useMemo(() => {
    const list: any[] = [];
    const seenSlugs = new Set<string>();

    // 1. Process DB farmers
    for (const f of dbFarmers) {
      const slug = f.slug || f.id;
      seenSlugs.add(slug);
      if (f.id) seenSlugs.add(f.id);
      const rating = getRating(slug, getRating(f.id, f.rating ?? null));
      const showOnHomepage = getHomepageVisibility(slug, getHomepageVisibility(f.id, f.show_on_homepage ?? false));
      list.push({
        id: f.id || slug,
        slug,
        name: f.full_name || f.name || "Unnamed Farmer",
        image: resolveFarmerImage(f.portrait_url || f.image),
        village: f.village || "India",
        state: f.state || "Farm",
        method: f.farming_method || f.method || "Natural Farming",
        yearsExperience: f.years_farming || f.yearsExperience || 0,
        rating,
        showOnHomepage,
        isDb: true,
        rawDb: f,
      });
    }

    // 2. Add mock farmers if not already present
    for (const f of mockFarmers) {
      if (!seenSlugs.has(f.slug)) {
        const rating = getRating(f.slug, f.rating ?? 5);
        const showOnHomepage = getHomepageVisibility(f.slug, f.showOnHomepage ?? true);
        list.push({
          id: f.slug,
          slug: f.slug,
          name: f.name,
          image: resolveFarmerImage(f.image),
          village: f.village,
          state: f.state,
          method: f.method,
          yearsExperience: f.yearsExperience,
          rating,
          showOnHomepage,
          isDb: false,
          rawDb: f,
        });
      }
    }

    return list;
  }, [dbFarmers, storeRatings, storeHomepageVisibility, getRating, getHomepageVisibility]);

  // Filter and sort farmers
  const filteredFarmers = useMemo(() => {
    return allFarmers
      .filter((f) => {
        // Search filter
        const matchSearch =
          !search ||
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.village.toLowerCase().includes(search.toLowerCase()) ||
          f.state.toLowerCase().includes(search.toLowerCase());

        // Homepage showcase filter
        const matchHomepage =
          filterHomepage === "all"
            ? true
            : filterHomepage === "yes"
            ? f.showOnHomepage === true
            : f.showOnHomepage === false;

        return matchSearch && matchHomepage;
      })
      .sort((a, b) => {
        if (sortBy === "rating-desc") {
          const rA = a.rating != null ? a.rating : -1;
          const rB = b.rating != null ? b.rating : -1;
          if (rB !== rA) return rB - rA;
          return b.yearsExperience - a.yearsExperience;
        }
        if (sortBy === "rating-asc") {
          const rA = a.rating != null ? a.rating : 99;
          const rB = b.rating != null ? b.rating : 99;
          if (rA !== rB) return rA - rB;
          return a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [allFarmers, search, filterHomepage, sortBy]);

  const qc = useQueryClient();

  const invalidateFarmerQueries = () => {
    qc.refetchQueries({ queryKey: ["public-featured-farmers"] });
    qc.refetchQueries({ queryKey: ["public-featured-farmers-top-component"] });
    qc.refetchQueries({ queryKey: ["public-all-farmers"] });
    qc.refetchQueries({ queryKey: ["admin-all-farmers-showcase"] });
    qc.refetchQueries({ queryKey: ["admin-farmers"] });
  };

  // Handle rating click with auto-suggestion
  const handleRatingClick = async (farmer: any, starIndex: number) => {
    const currentRating = farmer.rating;
    // If clicking the same rating star again, reset/clear to null
    const newRating = currentRating === starIndex ? null : starIndex;

    await setRating(farmer.slug, newRating, true);
    if (farmer.id && farmer.id !== farmer.slug) {
      await setRating(farmer.id, newRating, true);
    }

    invalidateFarmerQueries();

    if (newRating === null) {
      toast.info(`Cleared rating for ${farmer.name}`);
    } else {
      toast.success(`Updated rating for ${farmer.name} to ${newRating} ★`);

      // Auto-suggestion: If rated 4 or 5 stars for the first time and not currently shown on homepage
      if (newRating >= 4 && !farmer.showOnHomepage) {
        await toggleHomepageVisibility(farmer.slug, true, farmer.showOnHomepage);
        if (farmer.id && farmer.id !== farmer.slug) {
          await toggleHomepageVisibility(farmer.id, true, farmer.showOnHomepage);
        }
        invalidateFarmerQueries();
        toast.success(`Rated ${newRating}★! Auto-featured ${farmer.name} on Homepage`, {
          action: {
            label: "Undo",
            onClick: async () => {
              await toggleHomepageVisibility(farmer.slug, false, true);
              if (farmer.id && farmer.id !== farmer.slug) {
                await toggleHomepageVisibility(farmer.id, false, true);
              }
              invalidateFarmerQueries();
            },
          },
        });
      }
    }
  };

  // Handle homepage toggle click
  const handleToggleHomepage = async (farmer: any) => {
    const nextVal = !farmer.showOnHomepage;
    await toggleHomepageVisibility(farmer.slug, nextVal, farmer.showOnHomepage);
    if (farmer.id && farmer.id !== farmer.slug) {
      await toggleHomepageVisibility(farmer.id, nextVal, farmer.showOnHomepage);
    }

    invalidateFarmerQueries();

    if (nextVal) {
      toast.success(`Featured ${farmer.name} on Top Performer Farmers homepage section!`);
    } else {
      toast.info(`Removed ${farmer.name} from homepage showcase.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-background p-4 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmer by name, village, state..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-full border border-border bg-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filters and Sorting controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Homepage Showcase Filter */}
          <div className="flex items-center gap-1.5 text-xs bg-secondary/30 p-1 rounded-full border border-border">
            <span className="px-2 text-muted-foreground font-medium flex items-center gap-1">
              <Filter className="h-3 w-3" /> Showcase:
            </span>
            {(["all", "yes", "no"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFilterHomepage(opt)}
                className={`px-3 py-1 rounded-full capitalize font-medium transition ${
                  filterHomepage === opt
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground/75 hover:bg-secondary"
                }`}
              >
                {opt === "all" ? "All" : opt === "yes" ? "Yes (Featured)" : "No (Hidden)"}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-background border border-border rounded-full px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="rating-desc">Rating: High to Low (5★ → 1★)</option>
              <option value="rating-asc">Rating: Low to High (1★ → 5★)</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Farmers Table / Grid */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-subhead uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Farmer Profile</th>
                <th className="px-5 py-3.5 font-semibold">Region & Method</th>
                <th className="px-5 py-3.5 font-semibold">
                  Rating (1–5 Stars)
                  <span className="block text-[10px] text-muted-foreground font-normal normal-case">
                    Click star to rate / click again to clear
                  </span>
                </th>
                <th className="px-5 py-3.5 font-semibold text-center">
                  Show on Homepage
                  <span className="block text-[10px] text-muted-foreground font-normal normal-case">
                    Top Performer Showcase Toggle
                  </span>
                </th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredFarmers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    No farmers found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFarmers.map((farmer) => {
                  const rating = farmer.rating;
                  const isFeatured = farmer.showOnHomepage;

                  return (
                    <tr
                      key={farmer.slug}
                      className="hover:bg-secondary/20 transition-colors duration-150"
                    >
                      {/* Farmer Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={farmer.image}
                            alt={farmer.name}
                            className="w-11 h-11 rounded-full object-cover border border-border shadow-xs shrink-0"
                          />
                          <div>
                            <p className="font-display font-semibold text-foreground text-sm sm:text-base">
                              {farmer.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {farmer.yearsExperience} yrs experience
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Region & Method */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground text-xs sm:text-sm">
                          {farmer.village}, {farmer.state}
                        </p>
                        <p className="text-xs text-muted-foreground/80">{farmer.method}</p>
                      </td>

                      {/* Interactive 5-Star Rating Widget */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((starIndex) => {
                              const isFilled = rating != null && starIndex <= rating;
                              return (
                                <button
                                  key={starIndex}
                                  type="button"
                                  onClick={() => handleRatingClick(farmer, starIndex)}
                                  title={
                                    rating === starIndex
                                      ? `Click to clear rating`
                                      : `Rate ${starIndex} star${starIndex > 1 ? "s" : ""}`
                                  }
                                  className="p-1 rounded-md transition-all duration-150 cursor-pointer hover:scale-125 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                >
                                  <Star
                                    className={`h-5 w-5 transition-colors ${
                                      isFilled
                                        ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                                        : "text-muted-foreground/30 hover:text-amber-300"
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                          <span className="ml-1 text-xs font-semibold text-muted-foreground">
                            {rating != null ? `${rating}.0` : "Unrated"}
                          </span>
                        </div>
                      </td>

                      {/* Homepage Showcase Switch Toggle */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleHomepage(farmer)}
                            title={isFeatured ? "Click to remove from Homepage showcase" : "Click to feature on Homepage showcase"}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                              isFeatured ? "bg-emerald-600" : "bg-muted-foreground/30"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-xs ${
                                isFeatured ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[11px] font-semibold tracking-wide ${
                              isFeatured ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground/60"
                            }`}
                          >
                            {isFeatured ? "★ Featured" : "Hidden"}
                          </span>
                        </div>
                      </td>

                      {/* Actions (Edit Farmer & View Profile) */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingFarmer(farmer.rawDb || farmer)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer text-[#0F3D2E] shadow-2xs"
                            title="Edit Farmer Details (Bio, Land, Quote, Photos)"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#8D3C1B]" /> Edit Details
                          </button>
                          <a
                            href={`/farmer/${farmer.slug || farmer.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border bg-background text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                            title="View Public Profile Page"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
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

      {/* Edit Farmer Details Modal */}
      <EditFarmerModal
        farmer={editingFarmer}
        isOpen={!!editingFarmer}
        onClose={() => setEditingFarmer(null)}
      />
    </div>
  );
}
