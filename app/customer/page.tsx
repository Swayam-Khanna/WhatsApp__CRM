import { redirect } from "next/navigation";

/**
 * Redirects any legacy or mistyped /customer links directly to /catalogue.
 */
export default function CustomerRedirectPage() {
  redirect("/catalogue");
}
