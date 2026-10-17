"use client";

import { createFileRoute, Link } from "@/lib/tanstack-compat";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Sparkles,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/marketing/layout";
import { Reveal } from "@/components/reveal";

const TOPICS = ["General question", "Order help", "Wholesale", "Partnerships", "Press"] as const;
type Topic = (typeof TOPICS)[number];

const SHORTCUTS = [
  {
    icon: Truck,
    title: "Where's my order?",
    desc: "Track every milestone from farm to door.",
    to: "/track-order" as const,
  },
  {
    icon: RotateCcw,
    title: "Returns & refunds",
    desc: "Our 7-day no-questions promise.",
    to: "/returns" as const,
  },
  {
    icon: Package,
    title: "Shipping & delivery",
    desc: "Cities, timelines and packaging.",
    to: "/shipping" as const,
  },
  {
    icon: MessageCircle,
    title: "Full FAQ",
    desc: "100+ answers from our customers.",
    to: "/faq" as const,
  },
];

function ContactPage() {
  const [topic, setTopic] = useState<Topic>("General question");
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Newsletter field notes state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [stage, setStage] = useState<"idle" | "verifying" | "subscribed">("idle");
  const [prefs, setPrefs] = useState({ stories: true, drops: true, recipes: false });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fullName.trim() || !contactEmail.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const accessKey =
        process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ||
        "fc69be37-50bd-4768-b3a0-a8e9151f5a3a";

      const payload: Record<string, string> = {
        access_key: accessKey,
        name: fullName.trim(),
        email: contactEmail.trim(),
        topic: topic,
        message: message.trim(),
        from_name: "Prajnaa Farm Website",
        subject: `[Contact Form] ${topic} inquiry from ${fullName.trim()}`,
      };

      if (topic === "Order help" && orderId.trim()) {
        payload.order_id = orderId.trim();
      }

      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setSent(true);
        toast.success("Message sent! We'll be in touch within one business day.");
        setFullName("");
        setContactEmail("");
        setOrderId("");
        setMessage("");
      } else {
        toast.error(data.message || "Failed to send message. Please try again.");
      }
    } catch (err: any) {
      console.error("Web3Forms submission error:", err);
      toast.error("Failed to submit message. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEmailNext(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail.includes("@")) return toast.error("Enter a valid email");
    setStage("verifying");
  }

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStage("subscribed");
    toast.success("Welcome to the field notes.");
  }

  return (
    <MarketingLayout>
      <section className="container-prj pt-6 md:pt-8">
        <div className="grid gap-10 md:grid-cols-2">
          <Reveal inline>
            <div>
              <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">
                Contact
              </p>
              <h1 className="font-display mt-1.5 text-3xl font-semibold leading-tight md:text-4xl">
                Say hello.
              </h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">
                Questions, partnerships, press, or feedback — we read every message and respond
                within one business day.
              </p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <Mail className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Email
                    </p>
                    <a
                      href="mailto:prajnaafarm@gmail.com"
                      className="font-display mt-1 block text-base hover:text-primary"
                    >
                      prajnaafarm@gmail.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Phone · Mon–Sat, 10–6 IST
                    </p>
                    <a
                      href="tel:+917650065690"
                      className="font-display mt-1 block text-base hover:text-primary"
                    >
                      +91 76500 65690
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Address
                    </p>
                    <p className="font-display mt-1 text-base">Solan, Himachal Pradesh, India</p>
                  </div>
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal inline delay={80}>
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-border bg-secondary/40 p-6 md:p-8"
            >
              {/* Web3forms Honeypot Botcheck */}
              <input
                type="checkbox"
                name="botcheck"
                className="hidden"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />

              {sent ? (
                <div className="grid place-items-center py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                  <p className="font-display mt-4 text-xl font-semibold">Message on its way.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We'll reply to you within one business day.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setFullName("");
                      setContactEmail("");
                      setOrderId("");
                      setMessage("");
                    }}
                    className="font-subhead mt-6 rounded-full border border-border px-4 py-2 text-xs hover:bg-background transition-colors"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    What's it about?
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TOPICS.map((t) => (
                      <button
                        type="button"
                        key={t}
                        disabled={isSubmitting}
                        onClick={() => setTopic(t)}
                        aria-pressed={topic === t}
                        className={`font-subhead rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          topic === t
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground/80 hover:border-primary/40"
                        } ${isSubmitting ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    <label className="block">
                      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Your name
                      </span>
                      <input
                        name="name"
                        required
                        disabled={isSubmitting}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Email
                      </span>
                      <input
                        name="email"
                        type="email"
                        required
                        disabled={isSubmitting}
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                      />
                    </label>
                    {topic === "Order help" && (
                      <label className="block">
                        <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Order ID
                        </span>
                        <input
                          name="order_id"
                          placeholder="PRJ-10241"
                          disabled={isSubmitting}
                          value={orderId}
                          onChange={(e) => setOrderId(e.target.value)}
                          className="font-subhead mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                        />
                      </label>
                    )}
                    <label className="block">
                      <span className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        Message
                      </span>
                      <textarea
                        name="message"
                        required
                        rows={5}
                        disabled={isSubmitting}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us how we can help..."
                        className="font-subhead mt-1.5 w-full rounded-xl border border-border bg-background p-3.5 text-sm outline-none focus:border-primary disabled:opacity-60"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="font-subhead mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send message</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </section>

      {/* FAQ shortcuts */}
      <section className="container-prj py-12 md:py-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">
                Quick answers
              </p>
              <h2 className="font-display mt-1.5 text-2xl md:text-3xl font-semibold">
                Find it faster.
              </h2>
            </div>
            <Link
              to="/faq"
              className="font-subhead inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              All FAQs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {SHORTCUTS.map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <Link
                to={s.to}
                className="group flex h-full flex-col rounded-2xl border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:shadow-[0_20px_50px_-25px_oklch(0.34_0.06_156_/_0.35)]"
              >
                <s.icon className="h-6 w-6 text-primary" />
                <p className="font-display mt-4 text-lg font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                <span className="font-subhead mt-auto inline-flex items-center gap-1 pt-5 text-[11px] uppercase tracking-[0.14em] text-primary">
                  Open{" "}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Email capture flow */}
      <section className="container-prj pb-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 md:p-12">
            <Sparkles className="absolute right-8 top-8 h-6 w-6 text-primary/40" />
            <div className="max-w-xl">
              <p className="font-subhead text-xs uppercase tracking-[0.18em] text-primary">
                Field notes
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold md:text-4xl">
                Letters from the farm.
              </h2>
              <p className="mt-3 text-muted-foreground">
                One thoughtful email a month — harvest notes, new drops, and the people behind your
                pantry. No spam, unsubscribe anytime.
              </p>

              {stage === "idle" && (
                <form onSubmit={handleEmailNext} className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="font-subhead h-12 flex-1 rounded-full border border-border bg-background px-5 text-sm outline-none focus:border-primary"
                  />
                  <button className="font-subhead h-12 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg">
                    Continue
                  </button>
                </form>
              )}

              {stage === "verifying" && (
                <form
                  onSubmit={handleSubscribe}
                  className="mt-6 rounded-2xl border border-border bg-background p-6"
                >
                  <p className="font-subhead text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Subscribing
                  </p>
                  <p className="font-display mt-1 text-lg font-medium">{newsletterEmail}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Pick what you'd like to hear about:
                  </p>
                  <div className="mt-3 space-y-2">
                    {(
                      [
                        ["stories", "Farmer stories & journal"],
                        ["drops", "New product drops & seasonal harvests"],
                        ["recipes", "Recipes & pantry ideas"],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={prefs[key]}
                          onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="font-subhead text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button className="font-subhead h-11 flex-1 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:-translate-y-0.5">
                      Confirm subscription
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage("idle")}
                      className="font-subhead h-11 rounded-full border border-border px-5 text-sm hover:bg-secondary"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {stage === "subscribed" && (
                <div className="mt-6 rounded-2xl border border-border bg-background p-6">
                  <CheckCircle2 className="h-7 w-7 text-success" />
                  <p className="font-display mt-3 text-lg font-medium">You're in.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A confirmation is on its way to <span className="font-medium">{newsletterEmail}</span>.
                    The first letter lands at the next new moon.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}

export default ContactPage;
