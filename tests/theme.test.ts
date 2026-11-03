import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const tokens = readFileSync(new URL("../src/app/lirava-tokens.css", import.meta.url), "utf8");
const admin = new URL("../../soli-admin/src/app/lirava-tokens.css", import.meta.url);

test("independently deployed web and admin share the same foundation", { skip: !existsSync(admin) }, () => {
  assert.equal(tokens, readFileSync(admin, "utf8"));
});

function luminance(hex: string) {
  const channels = hex.match(/\w\w/g)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function color(name: string) {
  const match = tokens.match(new RegExp(`--lirava-${name}: (#[A-Fa-f0-9]{6});`));
  assert.ok(match, `Missing color token: ${name}`);
  return luminance(match[1]);
}

test("body text and primary action labels meet normal-text contrast", () => {
  for (const [foreground, background] of [["text", "ivory"], ["muted", "white"], ["white", "action"], ["white", "action-hover"]]) {
    const values = [color(foreground), color(background)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${foreground} on ${background}`);
  }
});
