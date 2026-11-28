import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { chromium } from "playwright";
import { SignJWT } from "jose";

// Run with node --test tests/answer-recovery.browser.test.mjs (uses port 3113).
// The backend is a local fixture and the database URL points nowhere: no real accounts or data are touched.
// It checks that an answer still reaches the page when the live stream is broken, without asking twice or reloading.
test("an answer appears without a reload when the live stream is broken", { timeout: 300000 }, async () => {
  const secret = "answer-recovery-browser-test-secret-not-used-outside-this-test";
  const now = Date.now() - 60_000;
  const vakil = { id: "vakil_fixture", name: "Counsel", purpose: "", instructions: "", look: { shape: "round", color: "#888", accent: "#666", eyeColor: "#111", material: "soft", eyes: "round", accessory: "none" }, status: "idle", activity: null, localAccess: false, model: null, createdAt: now };
  const conversation = { id: "chat_fixture", vakilId: vakil.id, title: "FIR", userId: "fixture_user", createdAt: now, updatedAt: now + 3 };
  const saved = [
    { id: "m1", vakilId: vakil.id, conversationId: conversation.id, role: "user", text: "Hello", createdAt: now + 1 },
    { id: "m2", vakilId: vakil.id, conversationId: conversation.id, role: "vakil", text: "Hello. How can I help with your legal matter today?", createdAt: now + 2 },
  ];
  const snapshot = () => ({ vakils: [vakil], conversations: [conversation], messages: saved, artifacts: [], routines: [], triggers: [], rules: [], memories: [], skills: [], passwords: [], channels: [], apps: [], computer: {} });

  // The first connection works (the page loads), then the test cuts it. "dead": every later attempt is refused, as when the API is
  // unreachable for the proxy. "flaky": the next attempt is refused, the one after works, and the answer is pushed down the stream only.
  let eventsMode = "dead";
  let eventRequests = 0;
  const streams = new Set();
  const answerDelayMs = 5000;
  let answerReadyAt = Infinity;

  const backend = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/api/auth/me") return res.end(JSON.stringify({ user: { id: "fixture_user", name: "Demo counsel", email: "fixture@example.test", role: "user" } }));
    if (url.pathname === `/api/vakils/${vakil.id}`) return res.end(JSON.stringify({ vakil }));
    if (url.pathname === `/api/conversations/${conversation.id}`) {
      // The answer is saved only once it is finished, in one piece.
      const ready = eventsMode === "dead" && Date.now() >= answerReadyAt && !saved.some((m) => m.id === "answer");
      if (ready) saved.push({ id: "answer", vakilId: vakil.id, conversationId: conversation.id, role: "vakil", text: "The FIR was registered on 16 August 2025.", createdAt: Date.now() });
      return res.end(JSON.stringify({ messages: saved }));
    }
    if (url.pathname === "/api/conversations") return res.end(JSON.stringify({ conversations: [conversation] }));
    if (url.pathname === "/api/artifacts") return res.end('{"artifacts":[]}');
    if (url.pathname === "/api/matters") return res.end('{"matters":[]}');
    if (url.pathname === "/api/agent/message" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        const sent = JSON.parse(body);
        const userMessage = { id: sent.messageId, vakilId: vakil.id, conversationId: conversation.id, role: "user", text: sent.text, createdAt: Date.now() };
        saved.push(userMessage);
        answerReadyAt = Date.now() + answerDelayMs;
        if (eventsMode === "flaky") {
          // Only the live stream carries this answer.
          setTimeout(() => {
            const message = { id: "answer2", vakilId: vakil.id, conversationId: conversation.id, role: "vakil", text: "Pushed through the stream.", createdAt: Date.now() };
            for (const s of streams) s.write(`data: ${JSON.stringify({ type: "message", vakilId: vakil.id, userId: "fixture_user", data: message })}\n\n`);
          }, 6000);
        }
        res.end(JSON.stringify({ userMessage }));
      });
      return;
    }
    if (url.pathname === "/api/events") {
      eventRequests += 1;
      if (eventRequests > 1 && (eventsMode === "dead" || eventRequests === 2)) {
        res.statusCode = 502;
        return res.end('{"error":"bad gateway"}');
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.write(`data: ${JSON.stringify({ type: "snapshot", data: snapshot() })}\n\n`);
      streams.add(res);
      req.on("close", () => streams.delete(res));
      return;
    }
    res.statusCode = 404;
    res.end('{"error":"Not found"}');
  }).listen(0, "127.0.0.1");
  await once(backend, "listening");
  const backendUrl = `http://127.0.0.1:${backend.address().port}`;
  const port = 3113;
  const origin = `http://localhost:${port}`;
  const fixtureApp = ".next/answer-recovery-browser/app";
  await mkdir(fixtureApp, { recursive: true });
  for (const entry of ["src", "package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"]) {
    await cp(entry, `${fixtureApp}/${entry}`, { recursive: true });
  }
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", fixtureApp, "--port", String(port)], {
    env: { ...process.env, BACKEND_URL: backendUrl, SESSION_SECRET: secret, DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:1/fixture", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let logs = "";
  server.stdout.on("data", (chunk) => { logs += chunk; });
  server.stderr.on("data", (chunk) => { logs += chunk; });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(poll); reject(new Error("Next dev did not become ready")); }, 60000);
      const poll = setInterval(() => {
        if (/Ready in/.test(logs)) { clearInterval(poll); clearTimeout(timeout); resolve(); }
        else if (server.exitCode !== null) { clearInterval(poll); clearTimeout(timeout); reject(new Error(`Next exited: ${logs}`)); }
      }, 100);
    });
    const chromePaths = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"];
    const chrome = process.env.CHROME_PATH || chromePaths.find((p) => existsSync(p));
    browser = await chromium.launch({ headless: true, executablePath: chrome });
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("fixture_user").setJti("fixture_session").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(secret));

    async function openChat() {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context.addCookies([{ name: "soli_session", value: token, url: origin }]);
      await context.addInitScript(() => localStorage.setItem("soli:conversation-title-backfill-v1", "done"));
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      await page.goto(`${origin}/vakil/${vakil.id}?c=${conversation.id}`, { timeout: 90000 });
      await page.locator("main").getByText("How can I help with your legal matter today?").waitFor().catch(async (e) => {
        await page.screenshot({ path: "../answer-recovery-debug.png" });
        throw new Error(`${e.message}
${(await page.locator("body").innerText()).slice(0, 600)}`);
      });
      return { context, page };
    }
    /** Cuts the working stream, as a dropped connection does. */
    async function dropStream() {
      for (const s of streams) s.destroy();
      streams.clear();
    }
    async function ask(page, text) {
      await page.getByLabel("Message Lirava").fill(text);
      await page.getByRole("button", { name: "Send" }).click();
      await page.locator("main").getByText(text, { exact: true }).waitFor();
    }

    // 1. The stream never works. The answer is saved after about five seconds and must still appear, with no reload.
    {
      const { context, page } = await openChat();
      await dropStream();
      await page.waitForTimeout(1500); // the browser tries again, is refused, and gives up
      const asked = Date.now();
      await ask(page, "what does the FIR says?");
      await page.locator("main").getByText("The FIR was registered on 16 August 2025.").waitFor({ timeout: 25000 });
      const waited = Date.now() - asked;
      assert.ok(waited >= answerDelayMs - 1000, `it arrived when the answer was saved, not before (${waited} ms)`);
      assert.equal(await page.getByRole("button", { name: "Stop response" }).count(), 0, "the page is no longer waiting for an answer");
      assert.equal(await page.locator("main").getByText("what does the FIR says?", { exact: true }).count(), 1, "the question was asked once");
      await context.close();
    }

    // 2. The first attempt to open the stream is refused (the browser would give up for good). It is opened again, and the answer
    // that only the stream carries arrives. The saved chat never has this answer, so only the reconnected stream can deliver it.
    {
      eventsMode = "flaky";
      eventRequests = 0;
      const { context, page } = await openChat();
      await dropStream();
      await page.waitForFunction(() => true);
      await ask(page, "and who is the informant?");
      await page.locator("main").getByText("Pushed through the stream.").waitFor({ timeout: 25000 });
      assert.ok(eventRequests >= 2, `the stream was opened again after it was refused (${eventRequests} attempts)`);
      await context.close();
    }
  } finally {
    await browser?.close();
    server.kill();
    backend.close();
    for (const s of streams) s.end();
  }
});
