# Lirava visual foundation

Marketing, authentication, workspace and admin use the same Newsprint foundation: pale paper, warm ink, ruled records, slab-serif heads and a restrained dried-brick signal. Brand colors, radii, elevation and motion values live in `src/app/lirava-tokens.css`. The file is mirrored in `soli-admin/src/app` so both apps can deploy independently; `tests/theme.test.ts` checks parity when both repositories are present.

Use semantic Tailwind utilities (`bg-background`, `bg-card`, `text-foreground`, `text-muted`, `border-border`) in web components. Use the existing `btn-primary`, `btn-secondary`, `btn-quiet`, `field` and `surface` primitives. Admin's existing semantic variables resolve to the same foundation. Do not append page-specific root palettes or selector overrides.

- Inter: interface, navigation and body copy.
- DM Serif Display: editorial headings; preserve serif document previews.
- JetBrains Mono: metadata, timestamps and technical values.
- Ink board: headings, primary controls, navigation, and strong surfaces.
- Dried brick: links, focus, and one settled-state accent only.
- Tertiary sand `#E9D3B8`: supporting highlights and non-critical emphasis.
- Neutral slate `#6C7A89`: secondary text, metadata, and quiet controls.
- Light blue `#E8F1FC`: page canvas and selected backgrounds. White: panels and forms.
- Do not introduce the retired dark-teal workspace palette or `.lirava-dark` overrides.

Keep the existing responsive layouts and reduced-motion support. Check public pages at desktop and mobile widths and verify authenticated workflows with a signed-in session when changing shared primitives.
