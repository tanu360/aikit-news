import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

const siteName = "AiKit News";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://news.aikit.club";
const tagline = "Search smarter. Research deeper.";
const description =
  "AiKit News is an AI search and deep research app with live web results, inline citations, and ChatJimmy-powered answers.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  weight: "variable",
  subsets: ["latin"],
  display: "block",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  weight: "variable",
  subsets: ["latin"],
  display: "block",
});

const fontStyle = {
  fontFamily: "var(--font-geist-sans), Geist, -apple-system, sans-serif",
  "--font-sans": "var(--font-geist-sans), Geist, -apple-system, sans-serif",
  "--font-mono":
    "var(--font-geist-mono), 'Geist Mono', 'SFMono-Regular', Consolas, monospace",
} as CSSProperties;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} - AI Search & Deep Research`,
    template: `%s | ${siteName}`,
  },
  description,
  keywords: [
    "News",
    "AiKit News",
    "AI search",
    "deep research",
    "AI research assistant",
    "web search AI",
    "cited AI answers",
    "ChatJimmy",
    "Exa search",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: `${siteName} - ${tagline}`,
    description,
    url: "/",
    siteName,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        type: "image/webp",
        alt: `${siteName} - AI Search & Deep Research`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - ${tagline}`,
    description,
    images: ["/og.webp"],
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
  ],
};

const themeBootScript = `
try {
  var theme = localStorage.getItem("aikit-theme");
  if (theme !== "light" && theme !== "dark" && theme !== "system") theme = "system";
  document.documentElement.dataset.theme = theme;
} catch (_) {
  document.documentElement.dataset.theme = "system";
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={fontStyle}
      >
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {children}
      </body>
    </html>
  );
}
