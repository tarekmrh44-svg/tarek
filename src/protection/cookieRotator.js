"use strict";
/**
 * DAVID V1 — Cookie Rotator (Layer 17)
 * يُرسل طلبات HTTP لفيسبوك ويلتقط Set-Cookie
 * ويحفظها في account.txt كل 6 دقائق
 * Copyright © 2025 DJAMEL
 */
const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const { dedup } = require("../../Djamel-fca");
const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");

function getLog() { return global.log || require("../engine/logger"); }

const ENDPOINTS = [
  { url: "https://m.facebook.com/home.php",             label: "m-home"   },
  { url: "https://mbasic.facebook.com/?_fb_noscript=1", label: "mbasic"   },
  { url: "https://m.facebook.com/messages/",            label: "messages" },
  { url: "https://www.facebook.com/ajax/presence/update/?dpr=2&__a=1", label: "presence" },
];

let _rotateCount = 0, _lastRotate = 0, _interval = null, _running = false, _api = null;

function buildCookieStr() {
  try {
    const raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
    if (!raw) return null;
    const c = JSON.parse(raw);
    return Array.isArray(c) && c.length ? c.map(x => x.key + "=" + x.value).join("; ") : null;
  } catch (_) { return null; }
}

function parseSetCookie(arr) {
  const r = {};
  for (const line of (arr || [])) {
    const p = line.split(";")[0].trim(), eq = p.indexOf("=");
    if (eq < 1) continue;
    const k = p.slice(0, eq).trim(), v = p.slice(eq + 1).trim();
    if (k && v) r[k] = v;
  }
  return r;
}

function mergeCookies(existing, newPairs) {
  const map = {};
  for (const c of existing) map[c.key] = { ...c };
  for (const [key, value] of Object.entries(newPairs)) {
    map[key] = map[key]
      ? { ...map[key], value, lastAccessed: new Date().toISOString() }
      : { key, value, domain: ".facebook.com", path: "/", secure: true, httpOnly: false };
  }
  return Object.values(map);
}

async function doRotate() {
  if (!_running) return;
  const log = getLog();
  const cookieStr = buildCookieStr();
  if (!cookieStr) { log.warn("COOKIE-ROT", "لا توجد كوكيز — تخطي"); return; }

  const cfg = global.GoatBot?.config || global.config || {};
  const ua = cfg.facebookAccount?.userAgent ||
    "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";
  const ep = ENDPOINTS[_rotateCount % ENDPOINTS.length];

  let res;
  try {
    res = await axios.get(ep.url, {
      headers: { "cookie": cookieStr, "user-agent": ua, "accept": "text/html,*/*;q=0.9",
        "accept-language": "ar-DZ,ar;q=0.9", "referer": "https://m.facebook.com/", "dnt": "1" },
      timeout: 20000, maxRedirects: 5, validateStatus: null, decompress: true,
    });
  } catch (e) { log.warn("COOKIE-ROT", "[" + ep.label + "] فشل: " + e.message); return; }

  if (res.status === 302 && (res.headers?.location || "").includes("login")) {
    log.warn("COOKIE-ROT", "[" + ep.label + "] الجلسة منتهية (302→login)");
    return;
  }

  const newPairs = parseSetCookie(res.headers?.["set-cookie"] || []);
  const newCount = Object.keys(newPairs).length;

  if (!newCount) {
    _rotateCount++;
    log.info("COOKIE-ROT", "[" + ep.label + "] لا كوكيز جديدة — تحديث AppState");
    if (_api) {
      try {
        const fresh = _api.getAppState?.() || [];
        if (fresh.length) {
          let existing = [];
          try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
          const freshKeys = new Set(fresh.map(c => c.key));
          const merged = dedup([...fresh, ...existing.filter(c => !freshKeys.has(c.key))]);
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000);
          log.ok("COOKIE-ROT", "AppState دُوِّر — " + merged.length + " كوكي (دور #" + _rotateCount + ")");
          _lastRotate = Date.now();
        }
      } catch (_) {}
    }
    return;
  }

  try {
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
    const merged = mergeCookies(existing, newPairs);
    global._selfWrite = true;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
    setTimeout(() => { global._selfWrite = false; }, 6000);
    _rotateCount++;
    _lastRotate = Date.now();
    log.ok("COOKIE-ROT", "[" + ep.label + "] " + newCount + " كوكي جديدة | إجمالي: " + merged.length + " (دور #" + _rotateCount + ")");
  } catch (e) { log.error("COOKIE-ROT", "خطأ: " + e.message); }
}

const INTERVAL_MS = 6 * 60 * 1000;

function start(api) {
  stop(); _api = api; _running = true; _rotateCount = 0;
  getLog().ok("COOKIE-ROT", "🔄 Cookie Rotator نشط — كل " + (INTERVAL_MS / 60000) + " دقائق");
  const first = setTimeout(async () => { if (_running) await doRotate(); }, 2 * 60 * 1000);
  _interval = setInterval(async () => { if (_running) await doRotate(); }, INTERVAL_MS);
  _interval._first = first;
}

function stop() {
  _running = false;
  if (_interval) { clearInterval(_interval); if (_interval._first) clearTimeout(_interval._first); _interval = null; }
  _api = null;
}

module.exports = { start, stop, isRunning: () => _running,
  getStatus: () => ({ running: _running, rotateCount: _rotateCount, lastRotate: _lastRotate }) };
