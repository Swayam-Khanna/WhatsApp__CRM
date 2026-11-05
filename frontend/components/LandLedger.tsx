import React from "react";
// @ts-ignore
import LandLedgerJsx from "../signature/components/LandLedger";

export interface LandLedgerProps {
  farmerId: string;
  initialData?: any;
}

export default function LandLedger({ farmerId, initialData }: LandLedgerProps) {
  return <LandLedgerJsx farmerId={farmerId} initialData={initialData} />;
}

export { LandLedger };
