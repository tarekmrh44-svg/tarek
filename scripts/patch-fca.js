#!/usr/bin/env node
/**
 * patch-fca.js — Patches @dongdev/fca-unofficial dist bundle:
 * 1. Cookie merger: merge facebook.com + messenger.com cookies for MQTT headers
 * 2. MQTT host → edge-chat.messenger.com when m_sess cookie present
 * 3. WebSocket Origin/Referer → messenger.com when using messenger host
 */

const fs   = require("fs");
const path = require("path");

const FCA_DIR    = path.join(__dirname, "../node_modules/@dongdev/fca-unofficial");
const DIST_INDEX = path.join(FCA_DIR, "dist/index.js");

if (!fs.existsSync(DIST_INDEX)) {
  console.error("  ✘ @dongdev/fca-unofficial dist/index.js not found — skipping patch");
  process.exit(0);
}

let src = fs.readFileSync(DIST_INDEX, "utf8");
let changed = false;

// ─── 1. Cookie merger — merge messenger.com cookies into MQTT header ──────────
// Pattern: where the MQTT websocket cookie header is built from jar cookies
const OLD_FB_COOKIE = `var cookies = ctx.jar.getCookies("https://www.facebook.com").join("; ");`;
const NEW_FB_COOKIE = `var fbCookies = ctx.jar.getCookies("https://www.facebook.com").join("; ");
  var msCookies = ctx.jar.getCookies("https://www.messenger.com").join("; ");
  var cookies = msCookies ? fbCookies + "; " + msCookies : fbCookies;
  var hasMsess = !!(msCookies && msCookies.includes("m_sess="));`;

if (src.includes(OLD_FB_COOKIE)) {
  src = src.replace(OLD_FB_COOKIE, NEW_FB_COOKIE);
  console.log("  ✔ Patched: cookie merger (facebook + messenger)");
  changed = true;
} else {
  console.log("  ℹ Cookie merger: pattern not found (may be built-in or changed)");
}

// ─── 2. MQTT host → messenger.com when m_sess ─────────────────────────────────
const OLD_HOST = `  } else {\n    host = \`wss://edge-chat.facebook.com/chat?sid=\${sessionID}\`;\n  }`;
const NEW_HOST = `  } else if (hasMsess) {\n    host = \`wss://edge-chat.messenger.com/chat?sid=\${sessionID}\`;\n  } else {\n    host = \`wss://edge-chat.facebook.com/chat?sid=\${sessionID}\`;\n  }`;

if (src.includes(OLD_HOST)) {
  src = src.replace(OLD_HOST, NEW_HOST);
  console.log("  ✔ Patched: MQTT host → messenger.com when m_sess");
  changed = true;
} else {
  console.log("  ℹ MQTT host: pattern not found (may already handle messenger.com)");
}

// ─── 3. WebSocket Origin header ───────────────────────────────────────────────
const OLD_ORIGIN = `        'Origin': 'https://www.facebook.com',`;
const NEW_ORIGIN = `        'Origin': (typeof hasMsess !== 'undefined' && hasMsess) ? "https://www.messenger.com" : "https://www.facebook.com",`;

if (src.includes(OLD_ORIGIN)) {
  src = src.replace(OLD_ORIGIN, NEW_ORIGIN);
  console.log("  ✔ Patched: WebSocket Origin header");
  changed = true;
} else {
  console.log("  ℹ Origin header: pattern not found (may already be handled)");
}

// ─── 4. WebSocket Referer header ──────────────────────────────────────────────
const OLD_REF = `        'Referer': 'https://www.facebook.com/',`;
const NEW_REF = `        'Referer': (typeof hasMsess !== 'undefined' && hasMsess) ? "https://www.messenger.com/" : "https://www.facebook.com/",`;

if (src.includes(OLD_REF)) {
  src = src.replace(OLD_REF, NEW_REF);
  console.log("  ✔ Patched: WebSocket Referer header");
  changed = true;
} else {
  console.log("  ℹ Referer header: pattern not found (may already be handled)");
}

if (changed) {
  fs.writeFileSync(DIST_INDEX, src, "utf8");
  console.log("\n  ✔ Saved dist/index.js\n");
} else {
  console.log("\n  ℹ No patches applied — @dongdev/fca-unofficial already handles these cases\n");
}

console.log("✔ patch-fca complete\n");
