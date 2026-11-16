import type { Metadata } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import "./globals.css";

// Only Inter is used on every page, so only it is preloaded. The serif is for court-paper documents and the mono
// font for code, so they load when something on the page needs them (preloading them on every page made the
// browser warn that the files were "not used" and wasted a download).
const display = DM_Serif_Display({ variable: "--font-dm-serif", subsets: ["latin"], weight: "400", display: "swap", preload: false });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"], display: "swap", preload: false });

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
      <body className="flex h-full overflow-hidden">
        <AppFrame hasUser={Boolean(user)}>{children}</AppFrame>
      </body>
    </html>
  );
}
