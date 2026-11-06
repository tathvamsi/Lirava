export const marketing = {
  name: "Lirava",
  tagline: "Counsel, meet your tireless paralegal.",
  contactEmail: "hello@lirava.legal",
  navigation: [
    { href: "#product", label: "Product" },
    { href: "#knowledge", label: "Knowledge base" },
    { href: "#security", label: "Security" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ],
  pricing: [
    { name: "Solo Advocate", detail: "For individual litigation practices", price: "Contact for pricing", items: ["Private workspace", "Matter-based research", "Cited answers", "Personal document library", "Draft-ready research"] },
    { name: "Chambers / Firm", detail: "For practice groups and growing firms", price: "Contact for pricing", items: ["Shared knowledge library", "Private lawyer workspaces", "Matter and storage controls", "Shared source context", "Firm library controls", "Team onboarding"] },
    { name: "Enterprise", detail: "For larger legal teams", price: "Contact for pricing", items: ["Custom rollout", "Administrative controls", "Dedicated onboarding", "Structured knowledge migration", "Workspace support"] },
  ],
} as const;
