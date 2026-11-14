# Lirava web

The Lirava web app: an AI workspace for Indian litigation teams. Matter-centred chats, saved drafts with Word/PDF export, and answers grounded in a statute library.

Next.js 16 (App Router), React 19, Tailwind 4. It talks to the **Lirava backend** (`../lirava-api`) for everything that needs data or a model.

## How the pieces fit

| Piece | Role |
|---|---|
| `Lirava` (this app) | Pages, sign-in cookie, proxies browser calls to the backend |
| `lirava-api` | Auth, chats (PostgreSQL), matters, documents, files, the model and legal search |
| PostgreSQL | Users, sessions and **all chats**, each tied to its owner |
| Model server + Qdrant | An OpenAI-compatible LLM and the vector store for the statute library |

The browser never calls the backend directly. The web app forwards the signed-in user's session token, and the backend takes the user's identity from that token only.

## Run locally

```bash
pnpm install
cp .env.example .env      # set SESSION_SECRET, BACKEND_URL, DATABASE_URL
pnpm dev                  # http://localhost:3100
```

Start the backend too (see `../lirava-api/README.md`). `SESSION_SECRET` must be identical in both.

## Checks

```bash
pnpm check     # typecheck + lint + tests
pnpm build     # production build
pnpm e2e       # real-browser test of the core flows (see below)
```

`pnpm e2e` starts a fake model server, the backend (`../lirava-api`, using its `.env` for the database) and this app on spare ports, then drives Chrome or Edge through sign-up, chat, attaching a document and getting a cited answer, Stop, matters, privacy between two people and sign-out. It creates throwaway `e2e_*@example.com` accounts.

## Deploy

`Dockerfile` builds a standalone image (`node server.js`, port 3100). `../docker-compose.yml` runs the web app and backend together. Put both behind HTTPS: the session cookie is `Secure` in production, and the site sends HSTS.

## What is stored where

The browser keeps nothing that belongs to a person's work: pins, archives, read marks and the document preview width are saved in PostgreSQL with the account, so they follow the person to any device and never leak between people sharing a computer. The only thing kept in the browser is whether the sidebar is collapsed, which is a layout choice for that screen.

## Before you launch

- `/terms` and `/privacy` are **placeholders**. Replace them with documents reviewed by counsel.
- Decide who may sign up: set `SIGNUP_INVITE_CODES` or `SIGNUP_ALLOWED_DOMAINS` on the backend (it refuses to start in production otherwise).
- The sign-in limits are held in memory, so they are per backend instance. Run more than one instance and move them to a shared store.
- This version of Next.js has breaking changes from older releases: read `node_modules/next/dist/docs/` before changing framework-level code (see `AGENTS.md`).
