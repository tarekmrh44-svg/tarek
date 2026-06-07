"use strict";
/**
 * cookieRotator.js — تدوير الكوكيز كل 6 دقائق
 * ══════════════════════════════════════════════
 * يُرسل طلبات HTTP لفيسبوك ويلتقط الكوكيز المُحدَّثة
 * من ترويسات Set-Cookie ويحفظها في account.txt
 */

const axios  = require("axios");
const fs     = require("fs-extra");
const path   = require("path");
const chalk  = require("chalk");
const moment = require("moment-timezone");

const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");

const ts = () => moment().tz(global.config?.timezone || "Africa/Algiers").format("HH:mm:ss");
const log = {
  info:  (m) => console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} [COOKIE-ROT] ${m}`),
  ok:    (m) => console.log(`${chalk.gray(ts())} ${chalk.green("✔")} ${chalk.green("[COOKIE-ROT] " + m)}`),
  warn:  (m) => console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} ${chalk.yellow("[COOKIE-ROT] " + m)}`),
  error: (m) => console.log(`${chalk.gray(ts())} ${chalk.red("✘")} ${chalk.red("[COOKIE-ROT] " + m)}`),
};

// ─── الـ endpoints التي ترجع Set-Cookie بشكل موثوق ──────────────────────────
const ENDPOINTS = [
  { url: "https://m.facebook.com/home.php",              label: "m-home"     },
  { url: "https://mbasic.facebook.com/?_fb_noscript=1",  label: "mbasic"     },
  { url: "https://m.facebook.com/messages/",             label: "m-messages" },
  { url: "https://www.facebook.com/ajax/presence/update/?dpr=2&__a=1", label: "presence" },
];

let _rotateCount = 0;
let _lastRotate  = 0;
let _interval    = null;
let _running     = false;
let _api         = null;

// ─── بناء cookie string من account.txt ───────────────────────────────────────
function buildCookieStr() {
  try {
    const raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
    if (!raw) return null;
    const cookies = JSON.parse(raw);
    if (!Array.isArray(cookies) || !cookies.length) return null;
    return cookies.map(c => `${c.key}=${c.value}`).join("; ");
  } catch (_) { return null; }
}

// ─── تحليل Set-Cookie header ─────────────────────────────────────────────────
function parseSetCookie(setCookieArr) {
  const result = {};
  for (const line of (setCookieArr || [])) {
    const part = line.split(";")[0].trim();
    const eq   = part.indexOf("=");
    if (eq < 1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key && val) result[key] = val;
  }
  return result;
}

// ─── دمج الكوكيز الجديدة مع الموجودة ────────────────────────────────────────
function mergeCookies(existing, newPairs) {
  const map = {};
  for (const c of existing) map[c.key] = { ...c };
  for (const [key, value] of Object.entries(newPairs)) {
    if (map[key]) {
      map[key] = { ...map[key], value, lastAccessed: new Date().toISOString() };
    } else {
      map[key] = {
        key, value,
        domain: "facebook.com", path: "/",
        hostOnly: false,
        creation:     new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };
    }
  }
  return Object.values(map);
}

// ─── دورة التدوير ─────────────────────────────────────────────────────────────
async function doRotate() {
  if (!_running) return;

  const cookieStr = buildCookieStr();
  if (!cookieStr) {
    log.warn("لا توجد كوكيز في account.txt — تخطي");
    return;
  }

  const ua = global.config?.userAgent ||
    "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

  // اختر endpoint دورياً
  const ep = ENDPOINTS[_rotateCount % ENDPOINTS.length];

  let res;
  try {
    res = await axios.get(ep.url, {
      headers: {
        "cookie":          cookieStr,
        "user-agent":      ua,
        "accept":          "text/html,application/xhtml+xml,*/*;q=0.9",
        "accept-language": "ar-DZ,ar;q=0.9,en;q=0.7",
        "referer":         "https://m.facebook.com/",
        "dnt":             "1",
      },
      timeout:         20000,
      maxRedirects:    5,
      validateStatus:  null,
      // أهم جزء: التقاط الترويسات بالكامل
      decompress:      true,
    });
  } catch (e) {
    log.warn(`[${ep.label}] فشل الاتصال: ${e.message}`);
    return;
  }

  // فحص إذا الجلسة منتهية
  const loc = res.headers?.location || "";
  if (res.status === 302 && loc.includes("login")) {
    log.warn(`[${ep.label}] الجلسة منتهية (302 → login) — الـ Watchdog سيتولى الأمر`);
    return;
  }

  // التقاط Set-Cookie
  const rawSetCookie = res.headers?.["set-cookie"] || [];
  const newPairs = parseSetCookie(rawSetCookie);
  const newCount = Object.keys(newPairs).length;

  if (!newCount) {
    _rotateCount++;
    log.info(`[${ep.label}] لا كوكيز جديدة (${res.status}) — الجلسة ثابتة`);
    // حتى لو لا كوكيز جديدة، حدّث من api.getAppState()
    if (_api) {
      try {
        const fresh = _api.getAppState?.() || [];
        if (fresh.length) {
          const { dedup } = require("../utils/cookieParser");
          let existing = [];
          try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
          const freshKeys = new Set(fresh.map(c => c.key));
          const merged = dedup([...fresh, ...existing.filter(c => !freshKeys.has(c.key))]);
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000);
          log.ok(`AppState دُوِّر ✔ — ${merged.length} كوكي (دور #${_rotateCount})`);
          _lastRotate = Date.now();
        }
      } catch (_) {}
    }
    return;
  }

  // دمج الكوكيز الجديدة مع account.txt
  try {
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
    const merged = mergeCookies(existing, newPairs);
    global._selfWrite = true;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
    setTimeout(() => { global._selfWrite = false; }, 6000);
    _rotateCount++;
    _lastRotate = Date.now();
    log.ok(`[${ep.label}] ✔ كوكيز مُحدَّثة: ${newCount} جديد | إجمالي: ${merged.length} (دور #${_rotateCount})`);
  } catch (e) {
    log.error(`خطأ في حفظ الكوكيز: ${e.message}`);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
const ROTATE_INTERVAL_MS = 6 * 60 * 1000; // 6 دقائق

function start(api) {
  stop();
  _api     = api;
  _running = true;
  _rotateCount = 0;

  log.ok(`🔄 Cookie Rotator نشط — تدوير كل ${ROTATE_INTERVAL_MS / 60000} دقائق`);

  // أول تدوير بعد دقيقتين من الانطلاق
  const firstTimer = setTimeout(async () => {
    if (_running) await doRotate();
  }, 2 * 60 * 1000);
  _interval = setInterval(async () => {
    if (_running) await doRotate();
  }, ROTATE_INTERVAL_MS);
  _interval._firstTimer = firstTimer;
}

function stop() {
  _running = false;
  if (_interval) {
    clearInterval(_interval);
    if (_interval._firstTimer) clearTimeout(_interval._firstTimer);
    _interval = null;
  }
  _api = null;
}

function getStatus() {
  return {
    running:      _running,
    rotateCount:  _rotateCount,
    lastRotate:   _lastRotate,
    intervalMin:  ROTATE_INTERVAL_MS / 60000,
  };
}

module.exports = { start, stop, getStatus, isRunning: () => _running };
