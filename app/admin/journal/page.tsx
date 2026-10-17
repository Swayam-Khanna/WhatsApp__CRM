"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit2, Trash2, BookOpen, Eye, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/admin/audit-logger";

interface JournalArticle {
  id: string;
  title: string;
  slug: string;
  cover_image: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  status: "published" | "draft";
  created_at: string;
}

const INITIAL_FORM = {
  id: "",
  title: "",
  slug: "",
  cover_image: "/assets/hero-farm.jpg",
  category: "Sustainable Farming",
  author: "Prajnaa Editorial",
  excerpt: "",
  content: "",
  status: "published" as "published" | "draft",
};

export default function AdminJournal() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Fetch journal articles (or mock fallback if DB table is initializing)
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-journal-articles"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_notifications")
          .select("*")
          .eq("type", "journal_article")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            slug: d.metadata?.slug || d.id,
            cover_image: d.metadata?.cover_image || "/assets/hero-farm.jpg",
            category: d.metadata?.category || "Sourcing Story",
            author: d.metadata?.author || "Prajnaa Desk",
            excerpt: d.message || "",
            content: d.metadata?.content || d.message || "",
            status: d.metadata?.status || "published",
            created_at: d.created_at,
          }));
        }
      } catch (err) {
        console.warn("Journal DB fallback:", err);
      }

      // Default articles for initial display
      return [
        {
          id: "j-1",
          title: "Preserving Ancestral Heritage Almond Orchards in Kashmir",
          slug: "heritage-almonds-kashmir",
          cover_image: "/assets/prod-almonds.jpg",
          category: "Farmer Spotlight",
          author: "Prajnaa Sourcing Desk",
          excerpt: "How traditional mountain farmers cultivate wild-harvested almonds with zero synthetic inputs.",
          content: "Full Kashmiri almond cultivation story detailing soil preparation and traditional harvesting methods.",
          status: "published",
          created_at: new Date().toISOString(),
        },
        {
          id: "j-2",
          title: "Zero-Chemical Soil Health Protocols for Smallholders",
          slug: "soil-health-protocols",
          cover_image: "/assets/hero-farm.jpg",
          category: "Sustainable Agriculture",
          author: "Agri Sciences Team",
          excerpt: "Natural compost formulas and bio-fertilizer recipes deployed across our partner farmsteads.",
          content: "Comprehensive bio-input guidelines and soil regeneration techniques.",
          status: "draft",
          created_at: new Date().toISOString(),
        },
      ] as JournalArticle[];
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Please fill in article title and content body.");
      return;
    }

    setSubmitting(true);
    try {
      const slug = form.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "");
      const articlePayload = {
        type: "journal_article",
        title: form.title,
        message: form.excerpt || form.content.substring(0, 120),
        read: true,
        metadata: {
          slug,
          cover_image: form.cover_image,
          category: form.category,
          author: form.author,
          content: form.content,
          status: form.status,
        },
        created_at: new Date().toISOString(),
      };

      await supabase.from("system_notifications").insert(articlePayload);

      toast.success(form.id ? "Article updated successfully!" : "New Journal Article published!");
      logAuditEvent({
        type: "general_audit",
        title: "Journal Article Published",
        message: `Article "${form.title}" marked as ${form.status}.`,
      });

      setShowForm(false);
      setForm(INITIAL_FORM);
      qc.invalidateQueries({ queryKey: ["admin-journal-articles"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save article");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="font-display text-3xl font-semibold text-[#0F3D2E]">Journal & Stories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish blog articles, sourcing stories, and sustainable farming insights for buyers.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setForm(INITIAL_FORM);
              setShowForm(true);
            }}
            className="font-subhead inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Article
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-background p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-display text-xl font-bold text-foreground">
              {form.id ? "Edit Article" : "Create New Journal Article"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Article Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Preserving Organic Almond Orchards"
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Category *
              </label>
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Farmer Spotlight, Organic Guide"
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Author Name
              </label>
              <input
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Publish Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Short Excerpt / Summary
            </label>
            <input
              type="text"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Brief 1-2 sentence preview..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Full Article Body Content *
            </label>
            <textarea
              rows={8}
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write the article content..."
              className="w-full rounded-xl border border-border bg-background p-3.5 text-xs outline-none focus:border-primary resize-y font-sans"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-full border border-border text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {form.status === "published" ? "Publish Article" : "Save Draft"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((art: any) => (
            <div key={art.id} className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                    {art.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      art.status === "published"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {art.status}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">{art.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{art.excerpt}</p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>By {art.author}</span>
                <span className="font-mono text-[10px]">
                  {new Date(art.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
