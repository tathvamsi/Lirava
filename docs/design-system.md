# Lirava visual foundation

Marketing, authentication, workspace and admin share one dark "graphite and coral" foundation: a near-black graphite ground, slightly lighter graphite panels, light text, and a single coral accent. Brand colors, radii, elevation and motion values live in `src/app/lirava-tokens.css`. The file is mirrored in `soli-admin/src/app` so both apps can deploy independently; `tests/theme.test.ts` checks parity when both repositories are present. The app is dark only (`color-scheme: dark`); there is no light theme.

## Tokens

`lirava-tokens.css` defines raw `--lirava-*` values in OKLCH. `globals.css` maps them to semantic variables (`--background`, `--card`, `--foreground`, `--border`, `--ring`, `--brand`, ...) and exposes those to Tailwind through `@theme inline`.

Some token names are historical and no longer describe their value. Use the semantic names in components, not the raw ones.

| Raw token | Actual value | Use via |
| --- | --- | --- |
| `--lirava-ivory` | graphite page ground (16% L) | `bg-background` |
| `--lirava-white` | raised panel graphite (22% L) | `bg-card`, `bg-popover` |
| `--lirava-text` | near-white (94% L) | `text-foreground` |
| `--lirava-muted` / `--lirava-neutral` | mid grey (70% L) | `text-muted`, `text-neutral` |
| `--lirava-border` | graphite line (32% L) | `border-border` |
| `--lirava-tint` | selected / hover background (27% L) | `bg-highlight` |
| `--lirava-desk` | deepest ground (13% L) | `bg-desk`, `.desk` |
| `--lirava-accent` / `--lirava-action` | coral, hue 30 (51% L) | `bg-action`, `bg-brand` |
| `--lirava-accent-readable` | lighter coral for text on dark (69% L) | `text-brand-readable`, links |
| `--lirava-focus` | focus ring coral | `ring`, focus outlines |

Also available: `--lirava-success`, `--lirava-warning`, `--lirava-destructive`, and the `--lirava-on-dark*` pair for text on filled controls. `--lirava-paper-ink` is near-white and is used for text inside court-paper previews.

Radii: `--lirava-radius-sm` 6px, `-md` 10px, `-lg` 14px. Shadows: `--lirava-shadow` and `--lirava-shadow-elevated`. Motion: `--lirava-duration` 220ms and `--lirava-ease`. `--lirava-texture-cotton` and `--lirava-texture-desk` are currently `none`.

## Typography

- Inter (`--font-inter`): all interface text, navigation, body copy, and headings. `--font-serif` is mapped to Inter, so `font-serif` and the `text-display`, `text-h1`-`text-h3` helpers render in Inter, not a serif.
- DM Serif Display (`--font-dm-serif`): loaded in `layout.tsx` and used only by `.court-paper-prose`, the formal court-document preview. Preserve this.
- JetBrains Mono (`--font-jetbrains-mono`): metadata, timestamps, technical values.

Headings are weight 600 with tight tracking. On marketing pages (`.soli-marketing`), `h1`/`h2`/`h3` are bold Inter with fixed clamp sizes set with `!important`.

## Color roles

- Graphite (`background`, `card`): page ground and panels. Separate them with a 1px `border-border`, not heavy shadows.
- Coral (`action`, `brand`): primary buttons, links, focus ring, text selection, scrollbar hover. It is the only accent. Use `brand-readable` for coral text on dark backgrounds, since the base coral is too dark for small text.
- Muted grey: secondary text, metadata, quiet controls.
- Status colors (`success`, `warning`, `destructive`) are for state only.
- Do not reintroduce the retired dark-teal workspace palette, the Stitch direction, or `.lirava-dark` overrides.

## Primitives

Use the semantic utilities and the shared primitives in `globals.css`:

- `btn`, `btn-primary`, `btn-secondary`, `btn-quiet`, `btn-brand`. `btn-primary` and `btn-brand` are identical (coral fill).
- `field` for inputs; `surface` for cards; `rails` for hairline side borders; `dot-grid` for dotted backgrounds; `desk` for the deepest ground.
- `composer-shell` for the chat composer (card background, shadow, no visible border).
- `dot-prose` for markdown replies; `court-paper-prose` for formal court drafts.
- Motion helpers: `animate-page-rise`, `animate-auth-rise`, `animate-message-rise`, `motion-stagger`, `motion-card`.

Marketing aliases (`--soli-*`) and `.soli-*` classes in `globals.css` are legacy names from the earlier "Soli" brand. They resolve to the same tokens. The marketing page and screenshots may still show "Soli"; the product name is Lirava.

Do not append page-specific root palettes or selector overrides. The end of `globals.css` contains global overrides (radii, `.surface`, `.composer-shell`, `.soli-marketing` button and link styles); add to the primitives rather than adding more.

## Layout

- `AppFrame` renders a bare `<main>` (no sidebar) for `/login`, `/signup`, `/landing`, `/security`, `/survey`, `/privacy`, `/terms`, and for `/` when signed out. All other routes get the sidebar, mobile bar and toasts.
- Container widths: `page` 1240px, `prose` 720px, `narrow` 520px, `tight` 380px.
- Workspace home is a centered "Welcome back." heading and a single composer.

## Accessibility and motion

Focus-visible outlines use `--ring` with 3px offset. `prefers-reduced-motion` disables animations and transitions globally. Placeholder and label text uses reduced opacity (`/35` to `/55`); contrast has not been audited, so check it when changing those.

Check public pages at desktop and mobile widths and verify authenticated workflows with a signed-in session when changing shared primitives.
