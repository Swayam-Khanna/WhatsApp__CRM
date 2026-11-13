import { redirect } from "next/navigation";

/**
 * Redirects /catalog directly to /catalogue.
 */
export default function CatalogRedirectPage() {
  redirect("/catalogue");
}
