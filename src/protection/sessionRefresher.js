"use strict";
/**
 * Session Refresher — WHITE Engine
 * ===================================
 * يُحافظ على الجلسة حيّة بلمس نقاط FB auth الحساسة بانتظام
 * يُجدّد الكوكيز ويحفظها دورياً لمنع انتهاء الصلاحية
 */

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randMs(minMin, maxMin) { return randInt(minMin * 60000, maxMin * 60000); }

function log(level, msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  if (level === "ok")   console.log(`${chalk.gray(ts)} ${chalk.green("✔")} ${chalk.green("[SESS_REF] " + msg)}`);
  if (level === "warn") console.log(`${chalk.gray(ts)} ${chalk.yellow("⚠")} ${chalk.yellow("[SESS_REF] " + msg)}`);
  if (level === "info") console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} [SESS_REF] ${msg}`);
}

// نقاط refresh للجلسة — مُرتّبة من الأكثر أماناً للأقل
const REFRESH_ENDPOINTS = [
  { url: "https://www.facebook.com/ajax/presence/update/",          label: "presence",     priority: 1 },
  { url: "https://m.facebook.com/home.php?_fb_noscript=1",          label: "mobile home",  priority: 2 },
  { url: "https://m.facebook.com/messages/",                        label: "messages",     priority: 2 },
  { url: "https://mbasic.facebook.com/?_fb_noscript=1",             label: "mbasic",       priority: 3 },
  { url: "https://m.facebook.com/profile.php?v=timeline",           label: "profile",      priority: 3 },
  { url: "https://m.facebook.com/ajax/mercury/thread_list.php",     label: "thread-list",  priority: 1 },
];

let _running = false;
let _api = null;
let _refreshCount = 0;
let _lastRefresh = 0;
const _timers = [];

function addTimer(fn, ms) {
  const id = setTimeout(() => { const i = _timers.indexOf(id); if (i !== -1) _timers.splice(i, 1); fn(); }, ms);
  _timers.push(id); return id;
}
function clearAll() { _timers.forEach(id => clearTimeout(id)); _timers.length = 0; }

function cookieStr(api) {
  try {
    const st = api.getAppState();
    return st?.length ? st.map(c => `${c.key}=${c.value}`).join("; ") : null;
  } catch (_) { return null; }
}

function getUA() {
  try {
    const ad = require("./antiDetection");
    if (ad.isRunning()) return ad.getCurrentProfile().ua;
  } catch (_) {}
  try {
    const stealth = require("./stealth");
    if (stealth.isRunning()) return stealth.getCurrentUA();
  } catch (_) {}
  return global.config?.userAgent ||
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";
}

async function doRefresh() {
  if (!_running || !_api) return;

  const cookies = cookieStr(_api);
  if (!cookies) return addTimer(doRefresh, randMs(15, 30));

  const ua = getUA();
  // اختار نقطة بناءً على الأولوية
  const endpoint = REFRESH_ENDPOINTS[randInt(0, REFRESH_ENDPOINTS.length - 1)];

  try {
    const res = await axios.get(endpoint.url, {
      headers: {
        cookie: cookies,
        "user-agent": ua,
        "accept": "text/html,*/*;q=0.9",
        "accept-language": "ar-DZ,ar;q=0.9,en;q=0.7",
        "referer": "https://m.facebook.com/",
      },
      timeout: 15000, validateStatus: null, maxRedirects: 4,
    });

    const expired = res.status === 302 && (res.headers?.location || "").includes("login");
    if (expired) {
      log("warn", `⚠️ Session expired (${endpoint.label}) — إشعار المالك`);
      try {
        const api = global.api;
        const owner = String(global.ownerID || "");
        if (api && owner) api.sendMessage("⚠️ Session Refresher: الجلسة قد انتهت — أعد رفع الكوكيز من الداشبورد", owner, () => {});
      } catch (_) {}
    } else {
      _refreshCount++;
      _lastRefresh = Date.now();
      log("ok", `✅ Session refreshed via ${endpoint.label} (×${_refreshCount})`);

      // حفظ AppState المحدَّث إذا تغيَّر
      try {
        const fresh = _api.getAppState();
        if (fresh?.length) {
          const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");
          const { dedup } = require("../utils/cookieParser");
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(dedup(fresh), null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000);
        }
      } catch (_) {}
    }
  } catch (_) {}

  const cfg = global.config?.sessionRefresher || {};
  const minMin = cfg.minIntervalMinutes ?? 20;
  const maxMin = cfg.maxIntervalMinutes ?? 50;
  addTimer(doRefresh, randMs(minMin, maxMin));
}

function start(api) {
  const cfg = global.config?.sessionRefresher || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  _api = api;
  log("info", "🚀 Session Refresher started");
  addTimer(doRefresh, randMs(10, 25));
}

function stop() { _running = false; clearAll(); log("warn", "🛑 Session Refresher stopped"); }

module.exports = {
  start, stop,
  getStatus: () => ({ running: _running, refreshCount: _refreshCount, lastRefresh: _lastRefresh }),
  isRunning: () => _running,
};
