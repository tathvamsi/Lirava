/**
 * End-to-end test of the core flows in a real browser: sign up, chat, attach a document and get a cited
 * answer, stop an answer, create a matter, privacy between two people.
 *
 * It starts everything itself: a fake OpenAI-compatible model, the backend (../lirava-api, using its
 * .env for the database) and the web app, on spare ports, and removes them afterwards.
 *
 *   node tests/e2e/core.e2e.mjs            (Edge or Chrome must be installed)
 *
 * It creates throwaway `e2e_*@example.com` accounts in the configured database.
 */
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { PDFDocument, StandardFonts } from "pdf-lib";

const WEB_PORT = 3120;
const API_PORT = 4020;
const WEB = `http://localhost:${WEB_PORT}`;
const API = `http://127.0.0.1:${API_PORT}`;
const webDir = process.cwd();
const apiDir = path.resolve(webDir, "../lirava-api");
const shots = process.env.E2E_SHOTS || path.join(webDir, ".next", "e2e-shots");

let failures = 0;
const results = [];
async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push(`PASS  ${name} (${Math.round((Date.now() - started) / 100) / 10}s)`);
  } catch (error) {
    failures++;
    results.push(`FAIL  ${name}\n        ${String(error.message || error).split("\n").slice(0, 4).join("\n        ")}`);
    if (current.page) await current.page.screenshot({ path: path.join(shots, `${failures}-${name.replace(/\W+/g, "_").slice(0, 40)}.png`), fullPage: true }).catch(() => {});
  }
}
const current = { page: null };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, message) => { if (!cond) throw new Error(message); };

function readEnv(file) {
  return readFile(file, "utf8").then((text) =>
    Object.fromEntries(text.split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")])),
  );
}

// ---- fake model -----------------------------------------------------------------------------
function startMockLlm() {
  const server = createServer((req, res) => {
    const url = req.url || "";
    if (req.method === "GET" && url.endsWith("/models")) return void res.end(JSON.stringify({ data: [{ id: "mock" }] }));
    if (req.method === "POST" && url.endsWith("/chat/completions")) {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw);
        const user = [...body.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const slow = user.includes("SLOW");
        const words = slow ? Array.from({ length: 40 }, (_, i) => `word${i}`) : ["Per", "the", "order", "[D1],", "bail", "was", "sought."];
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        let i = 0, closed = false;
        res.on("close", () => (closed = true));
        const tick = () => {
          if (closed) return;
          if (i >= words.length) { res.write("data: [DONE]\n\n"); return void res.end(); }
          res.write(`data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", choices: [{ index: 0, delta: { content: `${words[i++]} ` }, finish_reason: null }] })}\n\n`);
          setTimeout(tick, slow ? 250 : 20);
        };
        tick();
      });
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/v1` })));
}

function waitForLog(child, pattern, label, ms = 120000) {
  return new Promise((resolve, reject) => {
    let logs = "";
    const timer = setTimeout(() => reject(new Error(`${label} did not start in time. Log tail:\n${logs.slice(-1500)}`)), ms);
    const onData = (chunk) => {
      logs += chunk;
      if (pattern.test(logs)) { clearTimeout(timer); resolve(() => logs); }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`${label} exited (${code}):\n${logs.slice(-1500)}`)); });
  });
}

const procs = [];
async function stopAll() {
  for (const child of procs) {
    try {
      if (process.platform === "win32") spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    } catch { /* already gone */ }
  }
}

let browser;
const mock = await startMockLlm();
try {
  assert(existsSync(apiDir), `Backend not found at ${apiDir}`);
  const apiEnv = await readEnv(path.join(apiDir, ".env"));
  assert(apiEnv.SESSION_SECRET && apiEnv.DATABASE_URL, "The backend .env needs SESSION_SECRET and DATABASE_URL");

  const api = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
    cwd: apiDir,
    env: { ...process.env, NODE_ENV: "development", PORT: String(API_PORT), HOST: "127.0.0.1", TRUST_PROXY: "true", CUSTOM_LLM_BASE_URL: mock.url, UPSTREAM_TIMEOUT_MS: "3000", QDRANT_URL: "" },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  procs.push(api);
  await waitForLog(api, /listening on/, "backend", 60000);

  const fixture = path.join(webDir, ".next", "e2e-app");
  await rm(fixture, { recursive: true, force: true });
  await mkdir(fixture, { recursive: true });
  for (const entry of ["src", "public", "package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"]) {
    if (existsSync(entry)) await cp(entry, path.join(fixture, entry), { recursive: true });
  }
  const web = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", fixture, "--port", String(WEB_PORT)], {
    cwd: webDir,
    env: { ...process.env, BACKEND_URL: API, SESSION_SECRET: apiEnv.SESSION_SECRET, DATABASE_URL: apiEnv.DATABASE_URL, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  procs.push(web);
  await waitForLog(web, /Ready in/, "web app", 120000);

  const exe = process.env.CHROME_PATH || [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
  assert(exe, "No Chrome or Edge found. Set CHROME_PATH.");
  browser = await chromium.launch({ headless: true, executablePath: exe });
  await mkdir(shots, { recursive: true });

  async function openPage(context) {
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.errors = [];
    page.on("pageerror", (e) => page.errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && /hydrat|nested|cannot contain|Warning:/i.test(m.text())) page.errors.push(m.text().slice(0, 200)); });
    return page;
  }

  const stamp = Date.now();
  const alice = { name: "E2E Alice", email: `e2e_alice_${stamp}@example.com`, password: "Password123!E2e" };
  const bob = { name: "E2E Bob", email: `e2e_bob_${stamp}@example.com`, password: "Password123!E2e" };

  const aliceCtx = await browser.newContext({ viewport: { width: 1440, height: 950 }, reducedMotion: "reduce" });
  const page = await openPage(aliceCtx);
  current.page = page;

  await step("signed-out visitors are sent to the login page", async () => {
    await page.goto(`${WEB}/matters`, { timeout: 120000 });
    await page.waitForURL("**/login**");
    assert(new URL(page.url()).pathname === "/login", "not redirected to /login");
  });

  async function signUp(p, who) {
    await p.goto(`${WEB}/signup`, { timeout: 120000 });
    await p.fill("#signup-name", who.name);
    await p.fill("#signup-email", who.email);
    await p.fill("#signup-password", who.password);
    const invite = p.locator("#signup-invite");
    if (await invite.count()) throw new Error("Signup asks for an invite code here: unset SIGNUP_INVITE_CODES for this test.");
    await p.locator('form button[type="submit"]').click();
    await p.waitForURL((url) => new URL(url).pathname === "/", { timeout: 60000 });
  }

  await step("a new user can sign up and lands on the home page", async () => {
    await signUp(page, alice);
    await page.locator('textarea[placeholder*="Message Lirava"]').waitFor();
  });

  await step("the first message opens a chat and is answered", async () => {
    const box = page.locator('textarea[placeholder*="Message Lirava"]');
    await box.fill("Hello");
    await box.press("Enter");
    await page.waitForURL(/\/vakil\/.+\?c=/, { timeout: 60000 });
    await page.getByText("I'm Lirava", { exact: false }).first().waitFor();
  });

  const chatAddress = page.url(); // this chat, for the privacy check later
  const chatUrl = () => chatAddress;

  await step("the conversation survives a reload", async () => {
    await page.reload();
    await page.getByText("Hello", { exact: true }).first().waitFor();
    await page.getByText("I'm Lirava", { exact: false }).first().waitFor();
  });

  await step("a PDF can be attached, is read, and the answer cites its page", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    pdf.addPage().drawText("Cover page of the file.", { x: 50, y: 700, size: 12, font });
    pdf.addPage().drawText("The applicant claims parity with the co-accused who were granted bail on 12 November.", { x: 50, y: 700, size: 12, font, maxWidth: 480 });
    // Wait for the upload itself (the first one also compiles the route in dev mode); Enter is ignored while a file is uploading.
    const uploaded = page.waitForResponse((r) => r.url().includes("/api/vakils/") && r.url().endsWith("/files") && r.request().method() === "POST", { timeout: 90000 });
    await page.locator('input[type="file"]').setInputFiles({ name: "order.pdf", mimeType: "application/pdf", buffer: Buffer.from(await pdf.save()) });
    const response = await uploaded.catch((e) => {
      throw new Error(`the upload request never completed: ${String(e.message).split("\n")[0]}`);
    });
    assert(response.ok(), `upload failed with ${response.status()}`);
    assert((await response.json()).files[0].index.status === "ready", "the PDF was not indexed as readable");
    await page.getByText("order.pdf").first().waitFor();
    await sleep(300);
    assert((await page.getByText("not searchable").count()) === 0, "a normal PDF was reported as not searchable");

    const composer = page.locator('textarea[aria-label="Message Lirava"]');
    await composer.fill("What does the applicant say about parity with the co-accused?");
    await composer.press("Enter");
    await page.getByText("bail was sought", { exact: false }).first().waitFor({ timeout: 60000 });
    const sources = page.locator("summary", { hasText: "Sources consulted" });
    await sources.waitFor({ timeout: 30000 });
    await sources.click();
    // Inside the sources panel (the attachment chip in the question also links to the file).
    const link = page.locator("details", { hasText: "Sources consulted" }).locator("a", { hasText: "order.pdf" }).first();
    await link.waitFor();
    const href = await link.getAttribute("href");
    assert(/#page=2$/.test(href || ""), `the source link should open page 2, got ${href}`);
    assert((await link.innerText()).includes("page 2"), "the source shows its page");
  });

  await step("Stop ends a long answer and keeps what was written", async () => {
    const composer = page.locator('textarea[aria-label="Message Lirava"]');
    await composer.fill("SLOW answer please");
    await composer.press("Enter");
    await page.getByText("word1", { exact: false }).first().waitFor({ timeout: 40000 });
    await page.locator('button[aria-label="Stop response"]').click();
    await page.locator('button[aria-label="Send"]').waitFor({ timeout: 15000 });
    await sleep(1500);
    assert((await page.getByText("word39", { exact: false }).count()) === 0, "the answer kept going after Stop");
    assert((await page.getByText("word1", { exact: false }).count()) > 0, "the partial answer disappeared");
    await page.reload();
    await page.getByText("word1", { exact: false }).first().waitFor();
  });

  await step("a matter can be created and shows its documents section", async () => {
    await page.goto(`${WEB}/matters`);
    await page.getByRole("button", { name: /New matter/i }).first().click();
    await page.fill('input[name="title"]', "E2E v. State");
    await page.fill('input[name="client"]', "E2E Client");
    await page.getByRole("button", { name: /^Create matter$/ }).click();
    await page.getByText("E2E v. State").first().waitFor();
    await page.getByText("E2E v. State").first().click();
    await page.getByText("Documents in this matter").waitFor();
  });

  /** The options button appears only while the chat row is hovered. */
  async function openOptions(p) {
    const trigger = p.locator("[data-conv-trigger]").first();
    await trigger.waitFor({ state: "attached" });
    await trigger.locator("xpath=..").hover();
    await trigger.click();
  }

  await step("pinning a chat is saved with the account, so it appears in a different browser", async () => {
    await page.goto(chatAddress);
    await openOptions(page);
    await page.getByText("Pin", { exact: true }).click();
    await sleep(800);
    await page.reload();
    await openOptions(page);
    await page.getByText("Unpin", { exact: true }).waitFor();
    await page.keyboard.press("Escape");

    // A brand-new browser profile (no local storage at all) signs in as the same person.
    const freshCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const fresh = await openPage(freshCtx);
    await fresh.goto(`${WEB}/login`, { timeout: 60000 });
    await fresh.fill("#login-email", alice.email);
    await fresh.fill("#login-password", alice.password);
    await fresh.locator('form button[type="submit"]').click();
    await fresh.waitForURL((url) => new URL(url).pathname === "/", { timeout: 60000 });
    await openOptions(fresh);
    await fresh.getByText("Unpin", { exact: true }).waitFor({ timeout: 30000 });
    const stored = await fresh.evaluate(() => Object.keys(localStorage).filter((k) => /pinned|archived|lastRead|board_width/i.test(k)));
    assert(stored.length === 0, `settings were still kept in the browser: ${stored.join(", ")}`);
    await freshCtx.close();
  });

  await step("the document preview width is saved with the account", async () => {
    const res = await page.request.put(`${WEB}/api/preferences/artifactBoardWidth`, { data: { value: 777 } });
    assert(res.ok(), `saving the width failed (${res.status()})`);
    const prefs = await (await page.request.get(`${WEB}/api/preferences`)).json();
    assert(prefs.preferences.artifactBoardWidth === 777, "the saved width was not returned");
    assert((await page.request.put(`${WEB}/api/preferences/artifactBoardWidth`, { data: { value: 3 } })).status() === 400, "an invalid width was accepted");
  });

  await step("another person cannot see this person's chat or documents", async () => {
    const bobCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const bobPage = await openPage(bobCtx);
    await signUp(bobPage, bob);
    const convId = new URL(chatUrl()).searchParams.get("c");
    assert(convId, "no conversation id in the chat address");
    const res = await bobPage.request.get(`${WEB}/api/conversations/${convId}`);
    assert(res.status() === 404, `Bob got ${res.status()} for Alice's chat`);
    assert(((await res.json()).messages || []).length === 0, "Bob received messages");
    await bobPage.goto(`${WEB}/vakil/soli_master?c=${convId}`);
    await sleep(2500);
    assert((await bobPage.getByText("I'm Lirava", { exact: false }).count()) === 0, "Alice's greeting is visible to Bob");
    assert(bobPage.errors.length === 0, `Bob's page had errors: ${bobPage.errors.join(" | ")}`);
    await bobCtx.close();
  });

  await step("no hydration or page errors were reported while using the app", async () => {
    assert(page.errors.length === 0, page.errors.join("\n"));
  });

  await step("signing out returns to the login page and closes the session", async () => {
    await page.goto(`${WEB}/settings`);
    await page.getByRole("button", { name: /log ?out|sign ?out/i }).first().click();
    await page.waitForURL("**/login**", { timeout: 30000 });
    const after = await page.request.get(`${WEB}/api/auth/me`);
    assert((await after.json()).user === null, "still signed in after logging out");
  });
} catch (error) {
  failures++;
  results.push(`FAIL  harness\n        ${String(error.message || error)}`);
} finally {
  await browser?.close().catch(() => {});
  await stopAll();
  mock.server.close();
  await sleep(1500);
  await rm(path.join(webDir, ".next", "e2e-app"), { recursive: true, force: true }).catch(() => {});
}

console.log("\n" + results.join("\n"));
console.log(failures ? `\n${failures} step(s) failed. Screenshots: ${shots}` : "\nAll steps passed.");
process.exit(failures ? 1 : 0);
