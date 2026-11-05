import { NextResponse } from "next/server.js";
import {
  getAllGatewaysConfig,
  getAvailableGateways,
  getDefaultPaymentMethod,
  RESTRICTED_GATEWAYS,
  COD_FLAT_FEE,
} from "../../../../frontend/config/payment-gateways.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gateways = getAllGatewaysConfig();
    const available = getAvailableGateways();
    const defaultMethod = getDefaultPaymentMethod();

    return NextResponse.json({
      success: true,
      gateways,
      availableGateways: available.map((g) => g.id),
      restrictedGateways: RESTRICTED_GATEWAYS,
      defaultPaymentMethod: defaultMethod,
      codFlatFee: COD_FLAT_FEE,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load payment gateways config" },
      { status: 500 }
    );
  }
}

