import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/integrations/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase().trim();

    const { data: farmers, error } = await supabase
      .from("farmer_profiles")
      .select("id, full_name, farm_name, slug, village, state, phone, status")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[API /messages/conversations] Error:", error.message);
      return NextResponse.json({ conversations: [] });
    }

    const conversations = (farmers || []).map((f: any) => ({
      id: `conv_${f.id}`,
      farmerId: f.id,
      farmerName: f.full_name || "Registered Farmer",
      farmerSlug: f.slug,
      farmName: f.farm_name || "Organic Farm",
      village: f.village || "Local Farm",
      state: f.state || "India",
      phone: f.phone,
      isVerified: f.status === "approved",
      lastMessageText: "No messages yet",
      lastMessageAt: f.created_at || new Date().toISOString(),
      lastMessageSender: "admin",
      unreadByFarmer: 0,
      unreadByAdmin: 0,
      isOnline: true,
    }));

    let filtered = conversations;
    if (search) {
      filtered = conversations.filter(
        (c: any) =>
          c.farmerName.toLowerCase().includes(search) ||
          c.farmName.toLowerCase().includes(search) ||
          (c.village && c.village.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ conversations: filtered });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch conversations" }, { status: 500 });
  }
}
