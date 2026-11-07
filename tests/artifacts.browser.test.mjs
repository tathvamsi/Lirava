import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { chromium } from "playwright";
import { SignJWT } from "jose";

// Run with node --test tests/artifacts.browser.test.mjs (uses port 3111).
// Both authentication and document data use a local fixture backend; no real accounts are touched.
test("artifact library: search, filters, preview, downloads, recovery and mobile", { timeout: 240000 }, async () => {
  const secret = "artifact-browser-test-secret-not-used-outside-this-test";
  const base = { dotId: "dot_fixture", conversationId: "chat_fixture", filename: "document.md", createdAt: 1770000000000, updatedAt: 1770000000000, pdfFileId: null, docxFileId: null };
  const documents = [
    { ...base, id: "research", title: "Service of notice — research note", kind: "markdown", summary: "Dispatch records, acknowledgements, and gaps to verify before drafting.", content: "# Research note\n\nReview the dispatch receipt and returned envelope.\n\n## Documents to verify\n\n- Notice and proof of dispatch\n- Address stated in the agreement\n- Returned postal cover\n\nThe available record is incomplete. Confirm service against the original documents.", updatedAt: 1772000000000 },
    { ...base, id: "pleading", title: "Application for interim relief", kind: "legal_paper", summary: "Working draft with facts, grounds, and the relief sought.", content: "# Application for interim relief\n\n## Facts\n\nThe applicant seeks interim relief pending disposal of the matter.\n\n## Grounds\n\nInsert the verified facts and supporting authorities before filing.", pdfFileId: "pdf_fixture" },
    { ...base, id: "contract", title: "Consultancy agreement — review", kind: "contract", content: "# Consultancy agreement\n\nReview termination obligations and the indemnity clause.", conversationId: "chat_contract" },
    { ...base, id: "legacy", title: "Conference notes", kind: "document", content: "Client conference notes and follow-up questions.", conversationId: null, updatedAt: 1771000000000 },
  ];
  let mode = "documents";
  const receivedUsers = [];
  const backend = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/api/auth/me") return res.end(JSON.stringify({ user: { id: "fixture_user", name: "Demo counsel", email: "fixture@example.test", role: "user" } }));
    if (url.pathname === "/api/artifacts") {
      receivedUsers.push(url.searchParams.get("userId"));
      if (mode === "error") { res.statusCode = 503; return res.end(JSON.stringify({ error: "Fixture outage" })); }
      if (mode === "malformed") return res.end(JSON.stringify({ artifacts: [{ id: "broken" }] }));
      return res.end(JSON.stringify({ artifacts: mode === "empty" ? [] : documents.filter((artifact) => artifact.conversationId) }));
    }
    if (url.pathname === "/api/events") {
      res.setHeader("Content-Type", "text/event-stream");
      res.write(`data: ${JSON.stringify({ type: "snapshot", data: { dots: [], conversations: [], messages: [], artifacts: [], routines: [], triggers: [], rules: [], memories: [], skills: [], passwords: [], channels: [], apps: [], computer: {} } })}\n\n`);
      return;
    }
    if (url.pathname === "/api/matters") return res.end('{"matters":[]}');
    if (url.pathname === "/api/conversations") return res.end('{"conversations":[]}');
    res.statusCode = 404;
    res.end('{"error":"Not found"}');
  }).listen(0, "127.0.0.1");
  await once(backend, "listening");
  const backendUrl = `http://127.0.0.1:${backend.address().port}`;
  const port = 3111;
  const origin = `http://localhost:${port}`;
  const fixtureApp = ".next/artifacts-browser/app";
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
    const chrome = process.env.CHROME_PATH || (existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe") ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined);
    browser = await chromium.launch({ headless: true, executablePath: chrome });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.setDefaultTimeout(15000);
    await page.goto(`${origin}/artifacts`, { timeout: 90000 });
    await page.waitForURL("**/login");
    assert.equal(new URL(page.url()).pathname, "/login", "anonymous visitors must log in");
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("fixture_user").setJti("fixture_session").setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode(secret));
    await context.addCookies([{ name: "soli_session", value: token, url: origin }]);
    await context.addInitScript(() => localStorage.setItem("soli:conversation-title-backfill-v1", "done"));
    await page.goto(`${origin}/artifacts`);
    await page.getByRole("button", { name: "Open Service of notice — research note", exact: true }).waitFor();
    const cards = page.locator('section[aria-labelledby="artifacts-heading"] button[aria-label^="Open "]');
    assert.equal(await cards.count(), 3);
    assert.equal(await cards.first().getAttribute("aria-label"), "Open Service of notice — research note");
    assert.ok(receivedUsers.every((id) => id === "fixture_user"), "list requests must carry the authenticated user");
    await page.screenshot({ path: "../artifacts-library-desktop.png", fullPage: true });

    await page.getByRole("searchbox", { name: "Search documents" }).fill(" INDEMNITY ");
    assert.equal(await cards.count(), 1);
    await page.getByRole("button", { name: "Open Consultancy agreement — review", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("link", { name: "Open chat", exact: true }).count(), 1);
    await page.keyboard.press("Escape");
    await page.getByRole("searchbox").fill("");
    await page.getByRole("button", { name: "Pleadings", exact: true }).click();
    assert.equal(await cards.count(), 1);
    await page.getByRole("button", { name: "Open Application for interim relief", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.match(await dialog.getByRole("link", { name: "Open chat" }).getAttribute("href"), /\/vakil\/vakil_fixture\?c=chat_fixture/);
    await page.route("**/api/files/pdf_fixture?download=1", (route) => route.fulfill({ status: 503, body: "Offline" }));
    await dialog.getByRole("button", { name: "Download PDF", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.match(await dialog.getByRole("alert").innerText(), /still saved/);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Open Application for interim relief", "closing restores focus to the document");
    await page.getByRole("button", { name: "All documents", exact: true }).click();
    await page.getByLabel("Sort documents").selectOption("title");
    assert.equal(await cards.first().getAttribute("aria-label"), "Open Application for interim relief");
    await page.getByRole("button", { name: "Open Service of notice — research note", exact: true }).click();
    await dialog.waitFor();
    assert.ok(await dialog.getByText("The available record is incomplete.", { exact: false }).count());
    const downloadEvent = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download text", exact: true }).click();
    const download = await downloadEvent;
    assert.equal(await readFile(await download.path(), "utf8"), documents[0].content, "text download must preserve the complete document");
    await page.screenshot({ path: "../artifacts-library-preview.png" });
    await page.keyboard.press("Escape");

    await page.getByRole("searchbox").fill("not a matching phrase");
    await page.getByRole("heading", { name: "No documents found" }).waitFor();
    await page.getByRole("button", { name: "Clear filters" }).click();
    assert.equal(await cards.count(), 3);
    for (const state of ["error", "malformed", "empty", "documents"]) {
      mode = state;
      await page.getByRole("button", { name: "Refresh documents" }).click();
      if (state === "error" || state === "malformed") {
        await page.getByRole("heading", { name: "Documents are unavailable" }).waitFor();
        assert.equal(await page.getByText("Good work deserves a place to live.").count(), 0);
      } else if (state === "empty") await page.getByRole("heading", { name: "Good work deserves a place to live." }).waitFor();
      else await cards.first().waitFor();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "../artifacts-library-mobile.png", fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "mobile page must not overflow horizontally");
    await cards.first().click();
    await dialog.waitFor();
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    assert.ok(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth), "reader must not overflow on mobile");
    await page.keyboard.press("Escape");
    assert.deepEqual(pageErrors, []);
  } catch (error) {
    console.error(logs.slice(-6000));
    throw error;
  } finally {
    await browser?.close();
    if (server.exitCode === null) {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      else server.kill("SIGTERM");
    }
    backend.closeAllConnections();
    backend.close();
  }
});
