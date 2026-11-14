import { NextRequest, NextResponse } from "next/server";
import {
  AUTOMATED_TEMPLATES,
  getAutomatedTemplateStats,
  getAutomatedTemplateById,
  AutomatedTemplate,
} from "../../../../backend/lib/automation-templates";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/automated-templates
 * Returns the authoritative library of automated response templates (113+ templates across 13 categories).
 * NOTE: These templates are dedicated strictly to the AI Automated Messaging Engine
 * and are kept separate from the CRM Inbox manual templates to prevent inbox clutter.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const intent = searchParams.get("intent");
    const search = searchParams.get("search")?.toLowerCase();

    let templates = [...AUTOMATED_TEMPLATES];

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    if (intent) {
      templates = templates.filter((t) => t.intent === intent);
    }

    if (search) {
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.en.toLowerCase().includes(search) ||
          t.hinglish.toLowerCase().includes(search) ||
          t.hi.includes(search)
      );
    }

    const stats = getAutomatedTemplateStats();

    return NextResponse.json({
      success: true,
      totalTemplates: AUTOMATED_TEMPLATES.length,
      filteredCount: templates.length,
      categoryStats: stats,
      templates,
    });
  } catch (error: any) {
    console.error("[API] Failed to retrieve automated templates:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/crm/automated-templates
 * Updates or overrides an automated response template.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, en, hinglish, hi } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    const template = getAutomatedTemplateById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: `Template with ID '${id}' not found` },
        { status: 404 }
      );
    }

    if (en) template.en = en;
    if (hinglish) template.hinglish = hinglish;
    if (hi) template.hi = hi;

    return NextResponse.json({
      success: true,
      message: `Template '${id}' updated successfully`,
      template,
    });
  } catch (error: any) {
    console.error("[API] Failed to update automated template:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
