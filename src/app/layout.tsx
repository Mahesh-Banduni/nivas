import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Nivas",
    template: "%s · Nivas",
  },
  description: "Property listings, bookings and host tools.",
  applicationName: "Nivas",
  authors: [{ name: "Nivas" }],
  openGraph: {
    title: "Nivas",
    description: "Property listings, bookings and host tools.",
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
