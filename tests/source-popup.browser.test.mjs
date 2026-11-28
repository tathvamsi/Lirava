import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { chromium } from "playwright";
import { SignJWT } from "jose";

// Run with node --test tests/source-popup.browser.test.mjs (uses port 3112).
// The backend is a local fixture and the database URL points nowhere: no real accounts or data are touched.
test("a source opens as a pop-up over the chat, not in the side panel", { timeout: 240000 }, async () => {
  const secret = "source-popup-browser-test-secret-not-used-outside-this-test";
  const now = 1770000000000;
  const vakil = { id: "vakil_fixture", name: "Counsel", purpose: "", instructions: "", look: { shape: "round", color: "#888", accent: "#666", eyeColor: "#111", material: "soft", eyes: "round", accessory: "none" }, status: "idle", activity: null, localAccess: false, model: null, createdAt: now };
  const conversation = { id: "chat_fixture", vakilId: vakil.id, title: "Bail status", userId: "fixture_user", createdAt: now, updatedAt: now + 3 };
  const excerpt = "The petitioner was arrested on 16 August 2025 and produced before the Magistrate the next day.";
  const messages = [
    { id: "m1", vakilId: vakil.id, conversationId: conversation.id, role: "user", text: "What is the status of the case?", createdAt: now + 1 },
    {
      id: "m2",
      vakilId: vakil.id,
      conversationId: conversation.id,
      role: "vakil",
      text: "The FIR was registered on 16 August 2025 [D1]. Anticipatory bail is dealt with under BNSS section 482 [S1]. The opposite party is not recorded [T1].",
      createdAt: now + 2,
      citations: [
        { kind: "document", label: "D1", fileId: "file_fixture", name: "01-FIR-214-2025.pdf", page: 2, unit: "page", excerpt },
        { kind: "statute", label: "S1", title: "Bharatiya Nagarik Suraksha Sanhita, 2023", act: "BNSS", section: "Section 482", source: "India Code" },
        { kind: "case", label: "T1", nodeId: "node_opp", title: "Opposite party: not recorded", section: "Parties", nodeKind: "party" },
      ],
    },
  ];
  // A plan for this chat opens by itself in the right-hand board, so we can check that a source does not displace it.
  const artifact = { id: "plan_fixture", conversationId: conversation.id, vakilId: vakil.id, title: "Bail plan", filename: "plan.md", kind: "plan", content: "# Bail plan\n\nStep one: confirm the custody dates.", createdAt: now, updatedAt: now + 2 };
  const snapshot = { vakils: [vakil], conversations: [conversation], messages, artifacts: [artifact], routines: [], triggers: [], rules: [], memories: [], skills: [], passwords: [], channels: [], apps: [], computer: {} };

  const backend = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/api/auth/me") return res.end(JSON.stringify({ user: { id: "fixture_user", name: "Demo counsel", email: "fixture@example.test", role: "user" } }));
    if (url.pathname === `/api/vakils/${vakil.id}`) return res.end(JSON.stringify({ vakil }));
    if (url.pathname === `/api/conversations/${conversation.id}`) return res.end(JSON.stringify({ messages }));
    if (url.pathname === "/api/conversations") return res.end(JSON.stringify({ conversations: [conversation] }));
    if (url.pathname === "/api/artifacts") return res.end(JSON.stringify({ artifacts: [artifact] }));
    if (url.pathname === "/api/matters") return res.end('{"matters":[]}');
    if (url.pathname === "/api/events") {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(`data: ${JSON.stringify({ type: "snapshot", data: snapshot })}\n\n`);
      return;
    }
    res.statusCode = 404;
    res.end('{"error":"Not found"}');
  }).listen(0, "127.0.0.1");
  await once(backend, "listening");
  const backendUrl = `http://127.0.0.1:${backend.address().port}`;
  const port = 3112;
  const origin = `http://localhost:${port}`;
  const fixtureApp = ".next/source-popup-browser/app";
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
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("fixture_user").setJti("fixture_session").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(secret));
    await context.addCookies([{ name: "soli_session", value: token, url: origin }]);
    await context.addInitScript(() => localStorage.setItem("soli:conversation-title-backfill-v1", "done"));
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.setDefaultTimeout(20000);
    await page.goto(`${origin}/vakil/${vakil.id}?c=${conversation.id}`, { timeout: 90000 });

    const chips = page.getByRole("group", { name: /Sources \(3\)/ });
    await chips.waitFor();
    const board = page.getByRole("button", { name: "Maximize", exact: true });
    await board.waitFor();
    const popup = page.locator("dialog.source-popup");
    assert.equal(await popup.count(), 0, "nothing is open before a source is clicked");

    // 1. A document source opens as a modal dialog, centred over the chat.
    const documentChip = chips.getByRole("button", { name: /D1/ });
    await documentChip.click();
    await popup.waitFor({ state: "visible" });
    assert.ok(await popup.evaluate((el) => el.matches(":modal")), "it is a real modal dialog (top layer, page inert)");
    assert.equal(await popup.getAttribute("aria-labelledby"), "source-popup-title");
    assert.match(await page.locator("#source-popup-title").innerText(), /01-FIR-214-2025\.pdf/);
    assert.match(await popup.innerText(), /arrested on 16 August 2025/, "it shows the retrieved excerpt");
    assert.match(await popup.innerText(), /Page 2/);
    assert.match(await popup.getByRole("link", { name: /Open at page 2/ }).getAttribute("href"), /\/api\/files\/file_fixture#page=2$/);
    await popup.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const box = await popup.boundingBox();
    const view = page.viewportSize();
    assert.ok(Math.abs(box.x + box.width / 2 - view.width / 2) < 3, `centred horizontally (x=${box.x}, w=${box.width})`);
    assert.ok(Math.abs(box.y + box.height / 2 - view.height / 2) < 3, `centred vertically (y=${box.y}, h=${box.height}, viewport=${view.height})`);
    assert.ok(box.width <= 576 + 1, "it is a compact card, not a side panel");
    await page.screenshot({ path: "../source-popup-desktop.png" });

    // 2. It sits over the chat: the plan board is still there, and the page behind it is inert.
    assert.ok(await board.isVisible(), "opening a source does not replace the document board");
    assert.equal(await page.locator("aside[aria-label^='Source']").count(), 0, "there is no source side panel any more");

    // 3. Esc closes it and focus returns to the chip. It fades out first (data-closing) instead of vanishing.
    await page.evaluate(() => {
      const dialog = document.querySelector("dialog.source-popup");
      window.__fadedOut = false;
      new MutationObserver(() => {
        if (dialog.hasAttribute("data-closing") && dialog.open && getComputedStyle(dialog).display !== "none") window.__fadedOut = true;
      }).observe(dialog, { attributes: true });
    });
    await page.keyboard.press("Escape");
    await popup.waitFor({ state: "detached" });
    assert.ok(await page.evaluate(() => window.__fadedOut), "it fades out before it is removed");
    assert.match((await page.evaluate(() => document.activeElement?.textContent || "")), /D1/, "focus returns to the chip that opened it");

    // 4. Clicking outside closes it.
    await documentChip.click();
    await popup.waitFor({ state: "visible" });
    await page.mouse.click(8, 8);
    await popup.waitFor({ state: "detached" });

    // 5. Clicking inside it (title bar padding, text) does not close it; the close button does.
    await documentChip.click();
    await popup.waitFor({ state: "visible" });
    await popup.locator("p", { hasText: "This is the passage" }).click();
    await page.waitForTimeout(250);
    assert.ok(await popup.isVisible(), "a click inside stays open");
    await popup.getByRole("button", { name: "Close source" }).click();
    await popup.waitFor({ state: "detached" });

    // 6. A statute source shows its act and section.
    await chips.getByRole("button", { name: /S1/ }).click();
    await popup.waitFor({ state: "visible" });
    const text = await popup.innerText();
    assert.match(text, /Bharatiya Nagarik Suraksha Sanhita/);
    assert.match(text, /BNSS · Section 482/);
    assert.equal(await popup.getByRole("link").count(), 0, "a statute has no file to open");
    await page.keyboard.press("Escape");
    await popup.waitFor({ state: "detached" });

    // 6b. A case-tree entry is a source too, and it says it is a recorded fact, not legal authority.
    await chips.getByRole("button", { name: /T1/ }).click();
    await popup.waitFor({ state: "visible" });
    const treeText = await popup.innerText();
    assert.match(treeText, /Opposite party: not recorded/);
    assert.match(treeText, /Parties/);
    assert.match(treeText, /not legal authority/);
    assert.doesNotMatch(treeText, /Yet to Know/i);
    assert.equal(await popup.getByRole("link").count(), 0, "a tree entry has no file to open");
    await page.keyboard.press("Escape");
    await popup.waitFor({ state: "detached" });

    // 6c. The [D1] and [T1] markers inside the answer are chips that open the same sources.
    const inlineDocument = page.getByRole("button", { name: /^Open source D1:/ });
    await inlineDocument.waitFor();
    await inlineDocument.click();
    await popup.waitFor({ state: "visible" });
    assert.match(await popup.innerText(), /arrested on 16 August 2025/, "the inline [D1] opens the document passage");
    await page.keyboard.press("Escape");
    await popup.waitFor({ state: "detached" });
    await page.getByRole("button", { name: /^Open source T1:/ }).click();
    await popup.waitFor({ state: "visible" });
    assert.match(await popup.innerText(), /Opposite party: not recorded/, "the inline [T1] opens the tree entry");
    await page.keyboard.press("Escape");
    await popup.waitFor({ state: "detached" });

    // 7. On a phone it still fits with a gutter either side. (An open board takes the whole phone screen, so close it first.)
    await page.setViewportSize({ width: 390, height: 800 });
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await documentChip.click();
    await popup.waitFor({ state: "visible" });
    await popup.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const small = await popup.boundingBox();
    assert.ok(small.x >= 15 && small.x + small.width <= 390 - 15, `fits a phone with a side gutter (x=${small.x}, w=${small.width})`);
    await page.screenshot({ path: "../source-popup-mobile.png" });
    await page.keyboard.press("Escape");

    assert.deepEqual(pageErrors, [], `no page errors: ${pageErrors.join("; ")}`);
  } finally {
    await browser?.close();
    server.kill();
    backend.close();
  }
});
