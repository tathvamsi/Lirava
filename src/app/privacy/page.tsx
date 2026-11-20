import type { Metadata } from "next";
import { InformationPage } from "@/components/marketing/InformationPage";
import { PrivacyContent } from "@/components/marketing/PrivacyContent";
export const metadata: Metadata = { title: "Privacy | Lirava", description: "Placeholder privacy notice for Lirava." };
export default function PrivacyPage() { return <InformationPage eyebrow="Privacy" title="Privacy notice"><PrivacyContent /></InformationPage>; }
