import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});

const siteUrl = "https://klyro.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Klyro — AI Automation Agency",
    template: "%s — Klyro",
  },
  description:
    "Klyro designs and deploys custom AI agents that run your operations, support, and sales workflows — so your team can focus on growth.",
  keywords: [
    "AI automation agency",
    "AI agents",
    "workflow automation",
    "business automation",
    "Klyro",
  ],
  openGraph: {
    title: "Klyro — AI Automation Agency",
    description:
      "Custom AI agents and automations that run your business operations around the clock.",
    url: siteUrl,
    siteName: "Klyro",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Klyro — AI Automation Agency",
    description:
      "Custom AI agents and automations that run your business operations around the clock.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
