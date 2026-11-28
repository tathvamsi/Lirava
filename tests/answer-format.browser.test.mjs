import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { chromium } from "playwright";
import { SignJWT } from "jose";

// Run with node --test tests/answer-format.browser.test.mjs (uses port 3114).
// The backend is a local fixture and the database URL points nowhere: no real accounts or data are touched.
test("an answer in the format is shown as blocks, and any other answer is shown as written", { timeout: 240000 }, async () => {
  const secret = "answer-format-browser-test-secret-not-used-outside-this-test";
  const now = Date.now() - 60_000;
  const vakil = { id: "vakil_fixture", name: "Counsel", purpose: "", instructions: "", look: { shape: "round", color: "#888", accent: "#666", eyeColor: "#111", material: "soft", eyes: "round", accessory: "none" }, status: "idle", activity: null, localAccess: false, model: null, createdAt: now };
  const conversation = { id: "chat_fixture", vakilId: vakil.id, title: "FIR", userId: "fixture_user", createdAt: now, updatedAt: now + 5 };
  const base = { vakilId: vakil.id, conversationId: conversation.id };
  const messages = [
    { ...base, id: "q1", role: "user", text: "What does the FIR say?", createdAt: now + 1 },
    {
      ...base,
      id: "a1",
      role: "vakil",
      text: "Bottom line: The FIR was registered on 16 August 2025 under BNSS section 173 [D1].\n\nThe informant is the wife of the deceased and names one accused [D1].\n\n- Place: Kodigehalli Police Station\n- Time: 06:40 hours\n\nGaps: No charge-sheet or bail order is in the documents.\n\nNext move: Ask the investigating officer for the case diary.",
      createdAt: now + 2,
      citations: [{ kind: "document", label: "D1", fileId: "file_fixture", name: "01-FIR-214-2025.pdf", page: 1, unit: "page", excerpt: "FIR No. 214/2025 registered at 06:40 hours." }],
    },
    { ...base, id: "q2", role: "user", text: "Anything else?", createdAt: now + 3 },
    { ...base, id: "a2", role: "vakil", text: "The accused is a lorry driver aged 34.\n\nGaps: this paragraph is not a block here.", createdAt: now + 4 },
    { ...base, id: "q3", role: "user", text: "How long to sue for money lent?", createdAt: now + 5 },
    // As the real model wrote it: blocks on consecutive lines, and "none" statements that must not be shown.
    { ...base, id: "a3", role: "vakil", text: "Bottom line: Three years from when the money was lent.\nThe limitation period is three years.\nGaps: none in the sources read.\nNext move: None.", createdAt: now + 6 },
  ];
  const snapshot = () => ({ vakils: [vakil], conversations: [conversation], messages, artifacts: [], routines: [], triggers: [], rules: [], memories: [], skills: [], passwords: [], channels: [], apps: [], computer: {} });
  const streams = new Set();

  const backend = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/api/auth/me") return res.end(JSON.stringify({ user: { id: "fixture_user", name: "Demo counsel", email: "fixture@example.test", role: "user" } }));
    if (url.pathname === `/api/vakils/${vakil.id}`) return res.end(JSON.stringify({ vakil }));
    if (url.pathname === `/api/conversations/${conversation.id}`) return res.end(JSON.stringify({ messages }));
    if (url.pathname === "/api/conversations") return res.end(JSON.stringify({ conversations: [conversation] }));
    if (url.pathname === "/api/artifacts") return res.end('{"artifacts":[]}');
    if (url.pathname === "/api/matters") return res.end('{"matters":[]}');
    if (url.pathname === "/api/events") {
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
  const port = 3114;
  const origin = `http://localhost:${port}`;
  const fixtureApp = ".next/answer-format-browser/app";
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
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("fixture_user").setJti("fixture_session").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(secret));
    await context.addCookies([{ name: "soli_session", value: token, url: origin }]);
    await context.addInitScript(() => localStorage.setItem("soli:conversation-title-backfill-v1", "done"));
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.setDefaultTimeout(20000);
    await page.goto(`${origin}/vakil/${vakil.id}?c=${conversation.id}`, { timeout: 90000 });

    const main = page.locator("main");
    const allBottomLines = main.locator("[data-answer-block='bottom-line']");
    const bottom = allBottomLines.first();
    await bottom.waitFor();

    // 1. The answer in the format becomes blocks, in order: bottom line, body, gaps, next move.
    assert.equal(await allBottomLines.count(), 2, "the two answers that start with a bottom line get blocks; the third does not");
    assert.match(await bottom.innerText(), /The FIR was registered on 16 August 2025 under BNSS section 173/);
    assert.doesNotMatch(await main.innerText(), /Bottom line:/, "the label is shown as a heading, not as text in the sentence");
    const gaps = main.locator("[data-answer-block='gaps']");
    const next = main.locator("[data-answer-block='next-move']");
    assert.match(await gaps.innerText(), /No charge-sheet or bail order is in the documents/);
    assert.match(await next.innerText(), /Ask the investigating officer for the case diary/);
    const order = await main.evaluate((el) => {
      const at = (sel) => { const n = el.querySelector(sel); return n ? n.getBoundingClientRect().top : -1; };
      return [at("[data-answer-block='bottom-line']"), at("[data-answer-block='gaps']"), at("[data-answer-block='next-move']")];
    });
    assert.ok(order[0] < order[1] && order[1] < order[2], `bottom line, then gaps, then next move (${order.join(", ")})`);
    assert.match(await main.innerText(), /Place: Kodigehalli Police Station/, "the body keeps its list");

    // 2. A citation inside the bottom line is a chip that opens its source.
    const chip = bottom.getByRole("button", { name: /Open source D1/ });
    await chip.click();
    await page.locator("dialog.source-popup").waitFor({ state: "visible" });
    assert.match(await page.locator("dialog.source-popup").innerText(), /FIR No\. 214\/2025 registered/);
    await page.keyboard.press("Escape");
    await page.locator("dialog.source-popup").waitFor({ state: "detached" });

    // 3. The badge says what the answer cites, and changes when the citation checker finds something to look at.
    assert.match(await bottom.innerText(), /Cites 1 source/);
    assert.match(await bottom.innerText(), /Not checked against the library/);
    assert.doesNotMatch(await bottom.innerText(), /sourced/i, "an attached source is not called a sourced answer");
    const verdict = { raw: "(2014) 8 SCC 273", span: [0, 16], kind: "reporter", status: "unverified", reason: "not_in_library" };
    for (const s of streams) s.write(`data: ${JSON.stringify({ type: "citation_check", vakilId: vakil.id, userId: "fixture_user", data: { messageId: "a1", verdicts: [verdict], counts: { verified: 0, partial: 0, unverified: 1 } } })}\n\n`);
    await bottom.getByText("Check before relying").waitFor();
    assert.match(await bottom.innerText(), /1 citation needs a look/);
    assert.doesNotMatch(await bottom.innerText(), /verified/i, "the badge never says verified");
    // What the checker could not confirm is added to the gaps by the app, next to the model's own note.
    assert.match(await gaps.innerText(), /No charge-sheet or bail order is in the documents/);
    assert.match(await gaps.innerText(), /The library could not confirm/);
    assert.match(await gaps.innerText(), /\(2014\) 8 SCC 273: not in the library/);

    // The model's "none" lines are not shown as reassurance: that answer has a bottom line and a body, and no gaps or next move.
    assert.equal(await main.locator("[data-answer-block='gaps']").count(), 1, "only the answer with a real gap has a Gaps block");
    assert.equal(await main.locator("[data-answer-block='next-move']").count(), 1, "'Next move: None.' is not shown");
    assert.match(await main.innerText(), /The limitation period is three years\./, "the body of the answer written on consecutive lines is kept");
    assert.doesNotMatch(await main.innerText(), /none in the sources read/i);

    // 4. An answer that does not start with a bottom line is shown exactly as written, even if it has a "Gaps:" paragraph.
    assert.match(await main.innerText(), /The accused is a lorry driver aged 34\./);
    assert.match(await main.innerText(), /Gaps: this paragraph is not a block here\./);

    await page.screenshot({ path: "../answer-format-desktop.png" });

    // 5. On a phone the blocks stay inside the screen.
    await page.setViewportSize({ width: 390, height: 844 });
    await bottom.waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `no sideways scrolling on a phone (${overflow}px)`);
    const box = await bottom.boundingBox();
    assert.ok(box.x >= 8 && box.x + box.width <= 390 - 8, `the bottom line has a gutter on a phone (x=${box.x}, w=${box.width})`);
    await page.screenshot({ path: "../answer-format-mobile.png" });

    assert.deepEqual(pageErrors, []);
  } finally {
    await browser?.close();
    server.kill();
    backend.close();
    for (const s of streams) s.end();
  }
});
