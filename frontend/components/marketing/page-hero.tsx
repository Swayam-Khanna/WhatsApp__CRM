import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  children?: ReactNode;
};

export function PageHero({ eyebrow, title, subtitle, align = "left", children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div
          className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-accent/15 blur-3xl animate-blob"
          style={{ animationDelay: "-7s" }}
        />
      </div>
      <div className="container-prj py-10 md:py-14">
        <Reveal
          inline
          className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}
        >
          <p className="font-subhead text-[11px] uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold leading-[1.08] md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
          )}
          {children && <div className="mt-7">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
