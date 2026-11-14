"use client";

import { FormEvent, useState } from "react";
import { InformationPage } from "@/components/marketing/InformationPage";

const field = "mt-1.5 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand";

export default function SurveyPage() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    setError(null);
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceArea: String(form.get("practiceArea") || ""),
          timeLost: String(form.get("timeLost") || ""),
          tools: String(form.get("tools") || ""),
          pilot: String(form.get("pilot") || ""),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "We could not send your answers. Please try again.");
      }
      setState("sent");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We could not send your answers. Please try again.");
      setState("idle");
    }
  }

  return (
    <InformationPage eyebrow="Discovery survey" title="Tell us what you need from Lirava.">
      <p>Your feedback helps us prioritise the legal work that matters most to your practice.</p>
      {state === "sent" ? (
        <p role="status" className="rounded-xl bg-background p-5 text-navy">
          Thank you for sharing your perspective.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-navy/10 bg-card p-6">
          <label className="block text-[13px] font-semibold">
            Practice area
            <input name="practiceArea" required maxLength={200} className={field} />
          </label>
          <label className="block text-[13px] font-semibold">
            Where do you lose the most time?
            <textarea name="timeLost" required maxLength={2000} className={`${field} min-h-28`} />
          </label>
          <label className="block text-[13px] font-semibold">
            Current tools
            <input name="tools" maxLength={500} className={field} placeholder="Optional" />
          </label>
          <label className="block text-[13px] font-semibold">
            Would you consider an early pilot?
            <select name="pilot" required className={field} defaultValue="">
              <option value="" disabled>
                Select one
              </option>
              <option>Yes</option>
              <option>Maybe</option>
              <option>Not currently</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="text-[13px] text-red-700">
              {error}
            </p>
          )}
          <button disabled={state === "sending"} className="rounded-lg bg-brand px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-60">
            {state === "sending" ? "Sending…" : "Send feedback"}
          </button>
        </form>
      )}
    </InformationPage>
  );
}
