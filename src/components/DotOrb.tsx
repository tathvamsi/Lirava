"use client";

import React from "react";
import { Clock, FileText, Scale, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DotStatus, Look } from "@/lib/types";

export interface CounselBadgeProps {
  look?: Look;
  status?: DotStatus;
  size?: number;
  name?: string;
  role?: string;
  className?: string;
}

interface PersonaTheme {
  Icon: LucideIcon;
}

function resolvePersonaTheme(name?: string, lookColor?: string): PersonaTheme {
  const n = (name || "").toLowerCase();
  const c = (lookColor || "").toLowerCase();

  // 1. Nyaya - Senior Legal Researcher & Jurist
  if (n.includes("nyaya") || n.includes("research") || c.includes("9fcbff") || c.includes("2a6fdb")) {
    return {
      Icon: Scale,
    };
  }

  // 2. Vakil - Courtroom Drafting Counsel
  if (n.includes("vakil") || n.includes("draft") || c.includes("97e0b8") || c.includes("1f8f5f")) {
    return {
      Icon: FileText,
    };
  }

  // 3. Pramaan - Forensic Case Scrutiny & Evidence Auditor
  if (n.includes("pramaan") || n.includes("audit") || n.includes("scrutiny") || c.includes("ffd98a") || c.includes("e0492d")) {
    return {
      Icon: ShieldCheck,
    };
  }

  // 4. Docket - Chamber Practice & Limitation Coordinator
  if (n.includes("docket") || n.includes("clerk") || n.includes("coord") || c.includes("e0b8ff") || c.includes("8a2be2")) {
    return {
      Icon: Clock,
    };
  }

  // Default: Master Chamber Lead / Soli Orchestrator
  return {
    Icon: Sparkles,
  };
}

/**
 * Court-grade counsel insignia badge replacing toy/puffball mascot animations.
 * Provides crisp vector symbolism matching advocate chamber designations.
 */
export default function DotOrb({
  look,
  status = "idle",
  size = 36,
  name,
  className = "",
}: CounselBadgeProps) {
  const theme = resolvePersonaTheme(name, look?.color);
  const Icon = theme.Icon;
  const isPaused = status === "paused";

  const iconSize = Math.max(12, Math.round(size * 0.52));

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${className}`}
      style={{ width: size, height: size }}
      title={name ? `${name}, Court Counsel` : "Chamber Counsel"}
    >
      <span
        className={`relative flex h-full w-full items-center justify-center rounded-xl border bg-highlight text-brand ${
          status === "working"
            ? "border-brand"
            : status === "waiting"
              ? "border-warning"
              : "border-border"
        }`}
        style={{
          filter: isPaused ? "grayscale(0.6) opacity(0.7)" : undefined,
        }}
      >
        <Icon size={iconSize} strokeWidth={1.8} />
      </span>
    </span>
  );
}
