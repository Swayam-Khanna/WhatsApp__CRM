import { NextRequest, NextResponse } from "next/server.js";
import { getStoredTeam, saveStoredTeam } from "../../../../backend/lib/crm-store.server.ts";
import { getDatabase } from "../../../../lib/mongodb.ts";

export const dynamic = "force-dynamic";

// Authoritative default roster if none exists
const DEFAULT_TEAM = [
  {
    id: "tm_1",
    name: "Nishant",
    email: "admin@prajnaamarket.com",
    phone: "+91 80912 65690",
    role: "Store Admin",
    status: "Online",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
    tempPassword: "adminPrajnaa#2024",
    createdAt: "10 Jan 2024",
    credentialsStatus: "active",
  },
  {
    id: "tm_2",
    name: "Rajat Gupta",
    email: "rajat@prajnaamarket.com",
    phone: "+91 98101 44556",
    role: "Senior Concierge",
    status: "Online",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    tempPassword: "Rajat#Prajnaa88",
    createdAt: "15 Jan 2024",
    credentialsStatus: "active",
  },
  {
    id: "tm_3",
    name: "Anita Rawat",
    email: "anita.rawat@prajnaamarket.com",
    phone: "+91 97600 88991",
    role: "Fulfillment Officer",
    status: "Online",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    tempPassword: "Anita#Dispatch33",
    createdAt: "01 Feb 2024",
    credentialsStatus: "active",
  },
  {
    id: "tm_4",
    name: "Vikram Negi",
    email: "vikram.negi@prajnaamarket.com",
    phone: "+91 98970 12345",
    role: "Inventory Associate",
    status: "On Break",
    assignedChats: 0,
    avgResponseTime: "—",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    tempPassword: "Vikram#Negi2024",
    createdAt: "12 Feb 2024",
    credentialsStatus: "active",
  },
];

export async function GET() {
  try {
    const team = getStoredTeam(DEFAULT_TEAM);
    return NextResponse.json({ success: true, team });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, team: DEFAULT_TEAM }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = getStoredTeam(DEFAULT_TEAM);

    let updatedTeam: any[] = [];
    if (Array.isArray(body.team)) {
      updatedTeam = body.team;
    } else if (body.member && typeof body.member === "object") {
      const targetId = body.member.id;
      const targetEmail = (body.member.email || "").toLowerCase();
      const existingIdx = current.findIndex(
        (m: any) => (targetId && m.id === targetId) || (targetEmail && m.email?.toLowerCase() === targetEmail)
      );

      if (existingIdx >= 0) {
        current[existingIdx] = { ...current[existingIdx], ...body.member };
      } else {
        current.push(body.member);
      }
      updatedTeam = current;
    } else {
      return NextResponse.json({ error: "Invalid payload: 'team' array or 'member' object required" }, { status: 400 });
    }

    saveStoredTeam(updatedTeam);

    // Asynchronously try MongoDB if available
    try {
      const mongoDb = await getDatabase();
      if (mongoDb) {
        await mongoDb.collection("crm_team").deleteMany({});
        await mongoDb.collection("crm_team").insertMany(updatedTeam);
      }
    } catch {}

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update team" }, { status: 500 });
  }
}
