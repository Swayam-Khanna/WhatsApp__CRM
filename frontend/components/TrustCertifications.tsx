import React from "react";
// @ts-ignore
import TrustCertificationsJsx from "../signature/components/TrustCertifications";

export interface TrustCertificationsProps {
  farmerId: string;
}

export default function TrustCertifications({ farmerId }: TrustCertificationsProps) {
  return <TrustCertificationsJsx farmerId={farmerId} />;
}

export { TrustCertifications };
