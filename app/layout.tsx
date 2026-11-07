import { type ReactNode } from "react";
import { Providers } from "./providers";
import { TrafficTracker } from "@/components/traffic-tracker";
import "@/styles.css"; // Reference existing styles or copy later

export const metadata = {
  title: "Prajnaa CRM",
  description:
    "A premium farm-to-consumer marketplace. Authentic produce, traceable to the farmer who grew it.",
  authors: [{ name: "Prajnaa CRM" }],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/favicon-16x16.png?v=3", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png?v=3", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico?v=3"],
  },
  openGraph: {
    siteName: "Prajnaa CRM",
    title: "Prajnaa CRM",
    description:
      "A premium farm-to-consumer marketplace. Authentic produce, traceable to the farmer who grew it.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport = {
  themeColor: "#0F3D2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Prajnaa CRM</title>
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=3" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=3" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3" />
        <link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png?v=3" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Prajnaa CRM",
              url: "/",
              slogan: "From Soil to Soul, Naturally",
            }),
          }}
        />
      </head>
      <body>
        <Providers>
          <TrafficTracker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
