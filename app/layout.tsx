import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.validatemyidea.app"),
  title: {
    default: "ValidateMyIdea.app | Validate Startup Ideas in 90 Seconds",
    template: "%s | ValidateMyIdea.app"
  },
  description:
    "Validate startup ideas in 90 seconds using real signals from Reddit, Hacker News, Product Hunt, Google Trends, and more. Get a BUILD, PIVOT, or PASS verdict with a practical roadmap.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "ValidateMyIdea.app | Validate Startup Ideas in 90 Seconds",
    description:
      "From brainstorm to data-backed verdict in 90 seconds. Aggregate 7 market signals and get a clear BUILD, PIVOT, or PASS recommendation.",
    url: "https://www.validatemyidea.app",
    siteName: "ValidateMyIdea.app",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ValidateMyIdea.app | Validate Startup Ideas in 90 Seconds",
    description:
      "Use real market signals to test startup ideas before building. Get a clear verdict and roadmap in under 2 minutes."
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} min-h-screen bg-background font-sans text-foreground`}>{children}</body>
    </html>
  );
}
