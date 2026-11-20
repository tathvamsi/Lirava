import { Section } from "@/components/SettingsKit";

// Only shortcuts that exist in the app. Add a row here when a new one is built.
const SHORTCUTS: Array<{ group: string; rows: Array<{ keys: string[]; action: string }> }> = [
  {
    group: "Navigation",
    rows: [{ keys: ["Ctrl / ⌘", "B"], action: "Show or hide the sidebar" }],
  },
  {
    group: "Message box",
    rows: [
      { keys: ["Enter"], action: "Send the message" },
      { keys: ["Shift", "Enter"], action: "Start a new line" },
    ],
  },
  {
    group: "Menus and rename boxes",
    rows: [{ keys: ["Esc"], action: "Close the menu, or cancel renaming a chat" }],
  },
];

function Key({ children }: { children: string }) {
  return <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11.5px] text-foreground/80">{children}</kbd>;
}

/** A read-only list of the keyboard shortcuts the app supports. */
export default function ShortcutsPanel() {
  return (
    <>
      {SHORTCUTS.map((g) => (
        <Section key={g.group} title={g.group}>
          <ul className="surface divide-y divide-border">
            {g.rows.map((r) => (
              <li key={r.action} className="flex items-center gap-3 p-3">
                <span className="flex-1 text-body-sm">{r.action}</span>
                <span className="flex items-center gap-1">
                  {r.keys.map((k) => (
                    <Key key={k}>{k}</Key>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}
