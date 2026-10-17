import { db } from "../db";
import { farmerProducts, farmerProfiles, productReviews } from "../schema";
import { eq, and } from "drizzle-orm";
import { productBySlug, productsByCategory } from "@/lib/mock/products";
import { farmerBySlug } from "@/lib/mock/farmers";

export async function fetchProductDetail(slug: string) {
  // 1. Try mock products first
  let product = productBySlug(slug);
  let farmer = product ? farmerBySlug(product.farmerSlug)! : null;
  let related = product
    ? productsByCategory(product.category)
        .filter((p) => p.slug !== product!.slug)
        .slice(0, 4)
    : [];

  if (!product) {
    // 2. Query Postgres database
    const dbProduct = await db.query.farmerProducts.findFirst({
      where: eq(farmerProducts.slug, slug),
    });

    if (dbProduct) {
      // Fetch farmer profile
      const dbFarmer = dbProduct.farmerId
        ? await db.query.farmerProfiles.findFirst({
            where: eq(farmerProfiles.id, dbProduct.farmerId),
          })
        : null;

      // Fetch related products
      const dbRelated = await db.query.farmerProducts.findMany({
        where: and(
          eq(farmerProducts.category, dbProduct.category),
          eq(farmerProducts.status, "published"),
        ),
        limit: 5,
      });

      // Map database format + 10% commission markup
      product = {
        slug: dbProduct.slug,
        name: dbProduct.name,
        category: dbProduct.category,
        farmerSlug: dbFarmer?.slug || "unknown",
        image: dbProduct.images?.[0] || "",
        images: dbProduct.images || [],
        price: Math.ceil(Number(dbProduct.price || 0) * 1.1),
        weight: dbProduct.unit || "unit",
        stock: Number(dbProduct.stock || 0),
        rating: 4.8,
        reviews: 0,
        description: dbProduct.description || "",
        variants: null, // Add custom variant mapping if needed
      } as any;

      farmer = dbFarmer
        ? ({
            slug: dbFarmer.slug || "verified-farmer",
            name: dbFarmer.fullName || "Verified Farmer",
            image: dbFarmer.portraitUrl || "",
            village: dbFarmer.village || "India",
            state: dbFarmer.state || "Farm",
            region: "Local Farm",
            storyPreview: (dbFarmer as any).headline || "",
            story: dbFarmer.story || "",
            upcomingHarvests: dbFarmer.crops || [],
            method: dbFarmer.farmingMethod || "Natural Farming",
          } as any)
        : null;

      related = (dbRelated || [])
        .filter((r) => r.id !== dbProduct.id)
        .slice(0, 4)
        .map((r) => ({
          slug: r.slug,
          name: r.name,
          category: r.category,
          farmerSlug: dbFarmer?.slug || "unknown",
          image: r.images?.[0] || "",
          images: r.images || [],
          price: Math.ceil(Number(r.price || 0) * 1.1),
          weight: r.unit || "unit",
          rating: 4.8,
          reviews: 0,
        })) as any;
    }
  }

  if (product) {
    // Fetch review stats
    const dbReviews = await db.query.productReviews.findMany({
      where: eq(productReviews.productSlug, product.slug),
      columns: { rating: true },
    });

    const reviewsCount = dbReviews?.length || 0;
    if (reviewsCount > 0) {
      const avgRating = Number(
        (dbReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsCount).toFixed(1),
      );
      product.rating = avgRating;
      product.reviews = reviewsCount;
    } else {
      product.rating = 4.8;
      product.reviews = 3;
    }
  }

  return {
    product,
    farmer: farmer || {
      slug: "unknown",
      name: "Verified Farmer",
      image: "",
      village: "India",
      state: "Farm",
      region: "Local Farm",
      storyPreview: "",
      story: "",
      upcomingHarvests: [],
      method: "Natural Farming",
    },
    related: related || [],
  };
}
