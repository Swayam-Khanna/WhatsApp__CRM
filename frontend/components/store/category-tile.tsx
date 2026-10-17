import Link from "next/link";
import type { Category } from "@/lib/mock/types";
import { products } from "@/lib/mock/products";

export function CategoryTile({ category }: { category: Category }) {
  const itemCount = products.filter((p) => p.category === category.slug).length;

  return (
    <Link
      href={`/shop?cat=${category.slug}`}
      className="group block text-center w-full max-w-[110px] transition-transform duration-300 select-none"
    >
      <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-secondary/80 overflow-hidden border border-border/60 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_10px_20px_-10px_rgba(0,0,0,0.15)] bg-background">
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          width={120}
          height={120}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          onError={(e) => {
            // Fallback gracefully if image path has issue
            (e.target as HTMLImageElement).src = "/assets/prod-almonds.jpg";
          }}
        />
      </div>
      <h3 className="font-display mt-3 text-xs font-semibold text-foreground/90 transition-colors group-hover:text-primary tracking-tight truncate">
        {category.name}
      </h3>
      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {category.slug === "plants" ? "Live saplings" : `${itemCount || 3}+ items`}
      </p>
    </Link>
  );
}
