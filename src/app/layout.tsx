import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import "./globals.css";

const display = DM_Serif_Display({ variable: "--font-dm-serif", subsets: ["latin"], weight: "400", display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Lirava — AI legal work for Indian litigation teams",
  description: "Lirava researches Indian law, reads case files, and answers with pinpoint citations for legal professionals.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#14161a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en" className={`${display.variable} ${inter.variable} ${mono.variable} h-full`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@500&family=Spectral:ital,wght@0,400;0,500;1,400&family=Zilla+Slab:wght@700&display=swap" />
      </head>
      <body className="flex h-full overflow-hidden">
        <AppFrame hasUser={Boolean(user)}>{children}</AppFrame>
      </body>
    </html>
  );
}
