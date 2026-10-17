"use client";

import { MarketingLayout } from "@/components/marketing/layout";
import { Sparkles, ShieldCheck, ArrowRight, Leaf, HeartHandshake } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F2] via-background to-background pt-8 pb-5 sm:pt-10 sm:pb-6 border-b border-border/40">
        <div className="container-prj">
          <div className="max-w-4xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest font-subhead">
              <Leaf className="h-3.5 w-3.5" />
              Our Purpose & Story
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#173328] leading-tight text-left">
              Connecting the Hands that Grow with the Homes that Care.
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-left">
              From Soil to Soul, Naturally. Bringing authentic Himalayan and indigenous farm produce closer to households across India.
            </p>
          </div>
        </div>
      </section>

      {/* Alternating 50:50 Story Sections */}
      <div className="container-prj py-8 sm:py-10 lg:py-14 space-y-10 sm:space-y-14 lg:space-y-16">
        
        {/* Section 01: Left Text, Right Image (50:50) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Text (50%) */}
          <div className="lg:col-span-6 space-y-3">
            <span className="font-subhead text-xs font-bold uppercase tracking-[0.18em] text-[#C06A17] block">
              01 OUR STORY
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#173328] leading-tight">
              Good food should have a story — and a reason to trust it.
            </h2>
            <div className="space-y-3 text-sm text-foreground/85 leading-relaxed text-justify">
              <p>
                Prajnaa Market was created to make authentic, natural and seasonal produce easier to discover and bring closer to people across India. Himalayan produce remains an important part of our identity, but our purpose is broader: we look for good produce that is true to its source, carefully handled and worth bringing to the customer&apos;s table.
              </p>
              <p>
                We believe the journey matters. The people who grow the food matter. The way it is cultivated, harvested, processed and brought to market matters. And so does the person on the other side — the customer choosing food for themselves, their family or someone they love.
              </p>
              <p className="font-medium text-[#173328] pt-1 border-l-2 border-primary/40 pl-3">
                Prajnaa Market is built around that connection: <strong>from people who grow and make authentic produce to people who genuinely care about what they eat and serve.</strong>
              </p>
            </div>
          </div>

          {/* Right Image (50%) */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden shadow-sm border border-[#dcd5c2] group bg-secondary/30">
              <img
                src="/assets/story-1.jpg"
                alt="Himalayan farm valley with fresh harvest baskets and mountain backdrop"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Section 02: Left Image, Right Text (50:50) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Image (50%) - Desktop 1st, Mobile 2nd */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden shadow-sm border border-[#dcd5c2] group bg-secondary/30">
              <img
                src="/assets/story-2.jpg"
                alt="Himalayan elder farmer sharing fresh organic harvest with an urban family"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>

          {/* Right Text (50%) - Desktop 2nd, Mobile 1st */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-3">
            <span className="font-subhead text-xs font-bold uppercase tracking-[0.18em] text-[#C06A17] block">
              02 WHY WE STARTED
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#173328] leading-tight">
              For the people who grow good food — and the people who choose it.
            </h2>
            <div className="space-y-3 text-sm text-foreground/85 leading-relaxed text-justify">
              <p>
                Prajnaa began with a simple belief: quality produce should have a fair path to the people who value it. That means making room for farmers who may cultivate very small plots, farming families, women-led Self-Help Groups and other community producers — not only large-scale producers.
              </p>
              <p>
                At the same time, Prajnaa Market is not only a farmer-focused initiative. Our customers are an equally important part of the story. We serve health-conscious people looking for natural and authentic food, as well as people who want to bring better-quality produce home for their families and loved ones.
              </p>
              <p className="font-medium text-[#173328] pt-1 border-l-2 border-primary/40 pl-3">
                The goal is to build a marketplace where both sides matter: <strong>the producer who cares about the harvest and the customer who cares about what reaches the table.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Section 03: Left Text, Right Image (50:50) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Text (50%) */}
          <div className="lg:col-span-6 space-y-3">
            <span className="font-subhead text-xs font-bold uppercase tracking-[0.18em] text-[#C06A17] block">
              03 THE PEOPLE & PRODUCERS BEHIND THE PRODUCE
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#173328] leading-tight">
              We make room for the small farmer.
            </h2>
            <div className="space-y-3 text-sm text-foreground/85 leading-relaxed text-justify">
              <p>
                Our sourcing is intentionally designed to look beyond scale. A farm does not need to be large to matter. Whether someone cultivates a very small plot — even a small patch of land such as a single bigha or less — or manages a larger family farm, we care about the quality of the produce and the people and practices behind it.
              </p>
              <p>
                We also recognise the role of women-led Self-Help Groups (SHGs) and community-based producers, especially where traditional processing, preparation or local knowledge contributes to the identity of a product.
              </p>
              <p className="font-medium text-[#173328] pt-1 border-l-2 border-primary/40 pl-3">
                For Prajnaa, value is not measured only by volume or acreage. It is also measured by care, knowledge, authenticity and the quality of what finally reaches the customer.
              </p>
            </div>
          </div>

          {/* Right Image (50%) */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden shadow-sm border border-[#dcd5c2] group bg-secondary/30">
              <img
                src="/assets/story-3.jpg"
                alt="Mountain women and farmers sorting and sun drying fresh walnuts and apricots"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Section 04: Left Image, Right Text & Bullet Points (50:50) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Image (50%) - Desktop 1st, Mobile 2nd */}
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden shadow-sm border border-[#dcd5c2] group bg-secondary/30">
              <img
                src="/assets/story-4.jpg"
                alt="From soil harvest to sustainable packaging and transport"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>

          {/* Right Text & Principles Bullet Points (50%) - Desktop 2nd, Mobile 1st */}
          <div className="lg:col-span-6 order-1 lg:order-2 space-y-4">
            <div>
              <span className="font-subhead text-xs font-bold uppercase tracking-[0.18em] text-[#C06A17] block">
                04 OUR SOURCING PHILOSOPHY
              </span>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#173328] leading-tight mt-1">
                We look beyond the product — and we care about the journey.
              </h2>
              <p className="mt-2 text-sm text-foreground/85 leading-relaxed text-justify">
                Prajnaa Market looks at more than appearance and price. We want to understand where produce comes from, who grows or prepares it, how it is cultivated or processed, and what makes it authentic to its source.
              </p>
              <p className="mt-2 text-xs font-semibold text-[#173328] uppercase tracking-wider font-subhead">
                Our sourcing philosophy is built around four principles:
              </p>
            </div>

            {/* Bullet Points / Principles formatted cleanly in bullet style with green accents */}
            <div className="space-y-2.5 pt-1">
              {[
                {
                  num: "01",
                  title: "KNOW THE SOURCE",
                  desc: "Understand the farm, region and people behind the produce.",
                },
                {
                  num: "02",
                  title: "VALUE SMALL PRODUCERS",
                  desc: "Scale should not decide whose produce gets seen. We look toward small farms, farming families and women-led SHGs where their produce and practices align with Prajnaa’s standards.",
                },
                {
                  num: "03",
                  title: "RESPECT THE PROCESS",
                  desc: "Traditional knowledge and local methods matter. We seek to preserve what makes a product distinctive rather than strip away its identity.",
                },
                {
                  num: "04",
                  title: "FRESHNESS OVER LONG STORAGE",
                  desc: "We focus on fresh, seasonal produce rather than building our model around long-term storage. The intention is to provide customers with produce closer to its natural harvest cycle and quality.",
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="rounded-xl border border-[#173328]/15 bg-[#173328]/[0.03] hover:bg-[#173328]/[0.06] p-3.5 sm:p-4 transition-colors flex items-start gap-3 sm:gap-3.5"
                >
                  <div className="h-6 w-6 rounded-md bg-[#173328] text-white flex items-center justify-center font-display font-bold text-[11px] shrink-0 mt-0.5 shadow-xs">
                    {item.num}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-subhead text-xs sm:text-sm font-bold uppercase tracking-wider text-[#173328]">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed text-justify">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 05: Left Text, Right Image (50:50) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Text (50%) */}
          <div className="lg:col-span-6 space-y-3">
            <span className="font-subhead text-xs font-bold uppercase tracking-[0.18em] text-[#C06A17] block">
              05 THE PRAJNAA PROMISE
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#173328] leading-tight">
              Not just about selling more. About helping good food reach the right people.
            </h2>
            <div className="space-y-3 text-sm text-foreground/85 leading-relaxed text-justify">
              <p>
                Prajnaa Market is not built around profit alone. Commercial sustainability matters, but the purpose is bigger: to help good-quality, fresh and seasonal produce reach people who consciously choose what they eat and what they serve to their loved ones.
              </p>
              <p>
                We want to create a marketplace where farmers and community producers have a place to be discovered, while customers have a clearer path to natural, authentic produce they can feel good about bringing home.
              </p>
              <p>
                By focusing on freshness and seasonal availability rather than relying on long-term storage, we aim to keep the quality of the produce central to the customer experience.
              </p>
              <p className="font-medium text-[#173328] pt-1 border-l-2 border-primary/40 pl-3">
                <strong>From Soil to Soul, Naturally.</strong>
              </p>
            </div>
          </div>

          {/* Right Image (50%) */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden shadow-sm border border-[#dcd5c2] group bg-secondary/30">
              <img
                src="/assets/story-5.jpg"
                alt="Family gathered happily enjoying fresh mountain produce on an outdoor terrace"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          </div>
        </section>

      </div>

      {/* Bottom CTA Strip */}
      <section className="border-t border-border/40 bg-[#FAF7F2] py-8 sm:py-10">
        <div className="container-prj text-center max-w-2xl mx-auto space-y-3">
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#173328]">
            Experience Pure, Authentic Harvests
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Explore seasonal produce grown with traditional wisdom and care.
          </p>
          <div className="pt-1 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow hover:shadow-md transition-all active:scale-95"
            >
              Explore Products
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/farmers"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary hover:bg-secondary transition-colors"
            >
              Meet Our Farmers
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
