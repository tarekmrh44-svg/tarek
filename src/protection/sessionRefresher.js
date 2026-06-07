"use strict";
/**
 * DAVID V1 — Session Refresher (Layer 9)
 * يُجدِّد الجلسة كل ~2 ساعة ويحفظ الكوكيز فوراً عند تغيّر AppState
 * Copyright © 2025 DJAMEL
 */
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const { dedup } = require("../../Djamel-fca");

const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");
function getLog() { return global.log || require("../engine/logger"); }

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randMs(a, b)  { return randInt(a * 60000, b * 60000); }

const ENDPOINTS = [
  { url: "https://www.facebook.com/ajax/presence/update/",  label: "presence"    },
  { url: "https://m.facebook.com/home.php?_fb_noscript=1",  label: "mobile-home" },
  { url: "https://m.facebook.com/messages/",                label: "messages"    },
  { url: "https://mbasic.facebook.com/?_fb_noscript=1",     label: "mbasic"      },
  { url: "https://m.facebook.com/profile.php?v=timeline",   label: "profile"     },
];

let _running = false, _api = null, _refreshCount = 0, _lastRefresh = 0;
const _timers = [];
let _watchInterval = null, _lastHash = "";

function addTimer(fn, ms) {
  const id = setTimeout(() => { const i = _timers.indexOf(id); if (i !== -1) _timers.splice(i, 1); fn(); }, ms);
  _timers.push(id); return id;
}
function clearAll() { _timers.forEach(id => clearTimeout(id)); _timers.length = 0; }

function hashState(arr) {
  return Array.isArray(arr) ? arr.map(c => c.key + "=" + c.value).join("|") : "";
}

function saveAppState(fresh) {
  try {
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
    const freshKeys = new Set(fresh.map(c => c.key));
    const merged = dedup([...fresh, ...existing.filter(c => !freshKeys.has(c.key))]);
    global._selfWrite = true;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
    setTimeout(() => { global._selfWrite = false; }, 5000);
    return merged.length;
  } catch (_) { return 0; }
}

function startWatcher(api) {
  if (_watchInterval) clearInterval(_watchInterval);
  _lastHash = hashState(api.getAppState?.() || []);
  _watchInterval = setInterval(() => {
    if (!_running || !api) return;
    try {
      const fresh = api.getAppState?.() || [];
      if (!fresh.length) return;
      const h = hashState(fresh);
      if (h === _lastHash) return;
      _lastHash = h;
      const n = saveAppState(fresh);
      getLog().ok("SESS_REF", "🔄 AppState تغيّر — تم حفظ " + n + " كوكي تلقائياً");
    } catch (_) {}
  }, 30 * 1000);
}

async function doRefresh() {
  if (!_running || !_api) return;
  const log = getLog();

  let cookies;
  try {
    const st = _api.getAppState();
    cookies = st?.length ? st.map(c => c.key + "=" + c.value).join("; ") : null;
  } catch (_) { cookies = null; }

  if (!cookies) { addTimer(doRefresh, randMs(15, 30)); return; }

  const cfg = global.GoatBot?.config || global.config || {};
  const ua  = cfg.facebookAccount?.userAgent ||
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36";
  const ep = ENDPOINTS[randInt(0, ENDPOINTS.length - 1)];

  try {
    const res = await axios.get(ep.url, {
      headers: { cookie: cookies, "user-agent": ua, "accept": "text/html,*/*;q=0.9",
        "accept-language": "ar-DZ,ar;q=0.9", "referer": "https://m.facebook.com/" },
      timeout: 15000, validateStatus: null, maxRedirects: 4,
    });

    if (res.status === 302 && (res.headers?.location || "").includes("login")) {
      log.warn("SESS_REF", "⚠️ جلسة منتهية (" + ep.label + ") — إعادة تسجيل الدخول…");
      const reLogin = global.GoatBot?.reLoginBot || global.startBot;
      if (typeof reLogin === "function") setTimeout(reLogin, 3000);
    } else {
      _refreshCount++;
      _lastRefresh = Date.now();
      log.ok("SESS_REF", "✅ Session refreshed via " + ep.label + " (×" + _refreshCount + ")");
      try {
        const fresh = _api.getAppState();
        if (fresh?.length) saveAppState(fresh);
      } catch (_) {}
    }
  } catch (_) {}

  addTimer(doRefresh, randMs(115, 125));
}

function start(api) {
  if (_running) return;
  _running = true; _api = api;
  getLog().ok("SESS_REF", "🚀 Session Refresher + AppState Watcher نشط (تجديد كل ~2 ساعة)");
  startWatcher(api);
  addTimer(doRefresh, randMs(10, 25));
}

function stop() {
  _running = false;
  clearAll();
  if (_watchInterval) { clearInterval(_watchInterval); _watchInterval = null; }
  getLog().warn("SESS_REF", "🛑 Session Refresher متوقف");
}

function wrapSendMessage(api) { try { start(api); } catch (_) {} }
function wrapWithTyping(api)  { try { start(api); } catch (_) {} }

module.exports = { start, stop, wrapSendMessage, wrapWithTyping,
  isActive: () => _running, isRunning: () => _running,
  getStatus: () => ({ running: _running, refreshCount: _refreshCount, lastRefresh: _lastRefresh }) };
