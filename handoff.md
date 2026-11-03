# Lirava project handoff

> Update: The dark-teal Stitch direction is retired and must not be restored. The `.lirava-dark` implementation and simplified Stitch login were removed. Treat the current light/mineral foundation as the baseline until the replacement theme is specified.

## What the user wants

Lirava is an AI workspace for Indian lawyers, with matter-centered chats, documents, research, and artifacts. The active task is to redesign the public landing page, authentication, and signed-in workspace with a new color theme and design system while preserving existing behavior. The user prefers a clean, minimal, professional interface with clear visual hierarchy and a distinctive identity rather than a close imitation of another AI product.

This is an **in-progress implementation**, not a finished redesign. Continue by inspecting the running application and the current uncommitted changes before modifying anything.

## Workspace and safeguards

- Workspace: `C:\Users\HP\Desktop\Company\Products`
- Web: `soli-web` — Next.js 16.3.6, React 19, Tailwind CSS 4; development port 3100.
- Admin: `soli-admin` — separate Next.js application; development port 3200.
- API and agent services: `soli-backend`.
- Read `soli-web/AGENTS.md` and the relevant local Next.js documentation under `node_modules/next/dist/docs/` before editing.
- `soli-web` has many existing uncommitted changes, including a separate agent terminology migration. Preserve all work. Do not reset, clean, delete, or overwrite unrelated changes.
- `soli-backend` and `soli-admin` may resolve Git commands to an accidental parent repository rather than their own repository. Verify the repository root before using Git there; avoid broad `git status`, `reset`, or `clean` against the parent.
- Backend files `src/services/agent/personas.ts`, `src/services/agent/runtime.ts`, and `src/services/legal/knowledge.ts` contain user changes. Preserve them.
- Do not change authentication, database behavior, API contracts, matter links, stored IDs, or routes as part of the visual redesign. Do not expose credentials or private case data.

## Current visual baseline

Use the existing light/mineral foundation documented in `docs/design-system.md` until the replacement color theme is approved.

Use readable interface typography, restrained editorial headings, modest borders and spacing, and minimal visual clutter. Prioritize the active conversation and citations. Keep matter chats nested beneath their matter, with general chats separate. Preserve chat actions including move, archive, delete, attachment, and stop streaming.

Do not restore the retired dark-teal palette, `.lirava-dark`, or the historical Stitch workspace direction.

## Historical Stitch reference

The private Stitch project is historical only and is not an approved design source.

Do not inspect or implement the retired screens. Any future visual reference remains illustrative, not production-ready; do not copy unverified citations, invented pricing, security guarantees, company names, features, or integrations into the product.

## Current implementation

- Shared base tokens are in `src/app/lirava-tokens.css`. A matching copy exists in `soli-admin/src/app/lirava-tokens.css` because the apps deploy independently. `tests/theme.test.ts` checks their parity when both are present.
- `src/app/login/page.tsx`, `src/components/marketing/MarketingSite.tsx`, `src/components/Sidebar.tsx`, and `src/components/Chat.tsx` use the current light/base styling. Their existing content and behavior remain in progress for the replacement redesign.
- `src/app/signup/page.tsx` uses the base shell; two unsupported pre-existing claims about training and SOC 2 were removed.
- `docs/design-system.md` documents the current light/mineral foundation and should be updated when the replacement design system is chosen.
- `src/app/page.tsx` renders the marketing homepage for signed-out users and the workspace home for signed-in users. `/landing` also renders the marketing page; preserve this behavior.

## Verification so far

Last run from `soli-web`:

```powershell
pnpm typecheck
node --import tsx --test tests/theme.test.ts tests/agent-compatibility.test.ts
git diff --check
```

TypeScript and all four targeted tests passed; `git diff --check` passed with existing line-ending warnings. Browser checks covered desktop `/landing`, `/login`, `/signup`, and mobile login. Desktop screenshots were visually inspected; the waitlist field styling was corrected afterward. The previous theme pass checked mobile landing and admin, but those checks do not validate every state of the latest dark theme.

**Not verified:** signed-in chat, matter pages, message streaming/stop, file uploads, chat menus, authenticated navigation, login/signup submissions, full mobile coverage, production build, and accessibility beyond the existing token contrast checks. Avoid claiming these flows are verified until they are tested.

## Recommended next steps

1. Inspect the latest Stitch screenshots and current app pages. Review the full diffs and existing user changes before editing.
2. Use an existing authenticated session or an isolated test account/environment to inspect the actual workspace; do not modify real matters or documents for testing without a safe test fixture.
3. Complete the chat and matter experience using the existing components and functionality. Check nested matter/general chats, sidebar menus, source visibility, responsive layout, and composer/stop controls.
4. Refine the landing and signup pages to match the agreed direction while preserving real content, links, and working waitlist/auth forms. Audit text and controls for dark-mode contrast; do not add unsupported claims.
5. Decide how admin should share the dark design, retaining any existing theme toggle and operational behavior.
6. Test key desktop, tablet, and mobile states in a browser, including reduced motion and keyboard focus; run appropriate type checks and targeted tests. Update the design-system documentation and dark-token contrast coverage.

## Separate unfinished agent terminology migration

The earlier work added backward-compatible `agentId` and `/api/agents` aliases while retaining legacy `dotId`, `/api/dots`, database tables, identifiers, and routes. Migration remains incomplete: internal chat state, events, file routes, types, database names, and URLs still use `dot` terminology. Do not delete legacy storage or break old conversations. This is separate from the UI task and should only be resumed if the user requests it.

No commit or push was made for the current work. Do not commit or deploy unless asked.
