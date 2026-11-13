import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Nivas — stays with a story",
    template: "%s · Nivas",
  },
  description:
    "A multi-vendor property marketplace: hand-picked villas, heritage homes and city apartments across India, with real-time availability, secure payments and host tools.",
  applicationName: "Nivas",
  authors: [{ name: "Nivas" }],
  openGraph: {
    title: "Nivas — stays with a story",
    description:
      "Hand-picked villas, heritage homes and city apartments across India. Book with live availability and secure payments.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
