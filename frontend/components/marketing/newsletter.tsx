"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");
  return (
    <section className="container-prj mt-10 mb-8 md:mt-14 md:mb-10">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary/70 via-background to-secondary/40 p-10 md:p-14">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl animate-blob" />
            <div
              className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-blob"
              style={{ animationDelay: "-9s" }}
            />
          </div>
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">
              Stay in the loop
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-[1.1] md:text-4xl">
              New harvests. Farmer stories. Quiet inbox.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              One thoughtful email a month. Unsubscribe anytime.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) return;
                toast.success("Welcome to the field. Check your inbox.");
                setEmail("");
              }}
              className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@harvest.in"
                className="font-subhead w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring sm:w-80"
              />
              <button
                type="submit"
                className="font-subhead inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                Subscribe <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
