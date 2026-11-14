import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync(new URL("../src/app/lirava-tokens.css", import.meta.url), "utf8");
const admin = new URL("../../soli-admin/src/app/lirava-tokens.css", import.meta.url);

test("independently deployed web and admin share the same foundation", { skip: !existsSync(admin) }, () => {
  assert.equal(tokens, readFileSync(admin, "utf8"));
});

/** Relative luminance (WCAG) of an `oklch(L% C h)` colour, via OKLab to linear sRGB. */
function luminance(oklch: string): number {
  const match = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/.exec(oklch);
  assert.ok(match, `Unsupported colour: ${oklch}`);
  const L = Number(match[1]) / 100;
  const C = Number(match[2]);
  const h = (Number(match[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function token(name: string): string {
  const match = tokens.match(new RegExp(`--lirava-${name}: (oklch\\([^)]*\\));`));
  assert.ok(match, `Missing colour token: ${name}`);
  return match[1];
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(token(foreground)), luminance(token(background))].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

test("body text, secondary text and button labels meet normal-text contrast (4.5:1)", () => {
  for (const [foreground, background] of [
    ["text", "ivory"], // body text on the page
    ["text", "white"], // body text on cards
    ["muted", "ivory"], // secondary text on the page
    ["muted", "white"], // secondary text on cards
    ["on-dark", "action"], // primary button label
    ["on-dark", "action-hover"], // primary button label while hovered
    ["accent-readable", "ivory"], // links and highlighted text
  ]) {
    const ratio = contrast(foreground, background);
    assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}:1, below 4.5:1`);
  }
});

test("focus outlines are visible against the page (3:1)", () => {
  for (const background of ["ivory", "white"]) {
    const ratio = contrast("focus", background);
    assert.ok(ratio >= 3, `focus on ${background} is ${ratio.toFixed(2)}:1, below 3:1`);
  }
});
