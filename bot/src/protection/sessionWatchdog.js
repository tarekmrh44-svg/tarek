"use strict";
/**
 * sessionWatchdog.js — نظام مراقبة الجلسة ثلاثي الطبقات
 * ═══════════════════════════════════════════════════════
 * الطبقة 1: كشف موت الـ listener → إعادة تشغيله فقط
 * الطبقة 2: موت الجلسة → إعادة تسجيل الدخول الكامل
 * الطبقة 3: فشل متكرر → process.exit(1) → workflow يُعيد التشغيل
 */

const fs    = require("fs-extra");
const path  = require("path");
const chalk = require("chalk");
const moment = require("moment-timezone");

const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");

// ─── Logging ──────────────────────────────────────────────────────────────────
const ts = () => moment().tz(global.config?.timezone || "Africa/Algiers").format("HH:mm:ss");
const log = {
  info:  (m) => console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} [WATCHDOG] ${m}`),
  ok:    (m) => console.log(`${chalk.gray(ts())} ${chalk.green("✔")} ${chalk.green("[WATCHDOG] " + m)}`),
  warn:  (m) => console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} ${chalk.yellow("[WATCHDOG] " + m)}`),
  error: (m) => console.log(`${chalk.gray(ts())} ${chalk.red("✘")} ${chalk.red("[WATCHDOG] " + m)}`),
};

// ─── Config ───────────────────────────────────────────────────────────────────
const CHECK_INTERVAL_MS      = 6 * 60 * 1000;  // فحص كل 6 دقائق
const LISTENER_DEAD_LIMIT_MS = 12 * 60 * 1000; // listener ميت إذا لا نشاط 12 دقيقة
const MAX_API_FAILS          = 2;              // إعادة دخول بعد فشلين API
const MAX_RELOGIN_FAILS      = 3;              // process.exit بعد 3 فشل إعادة دخول
const RELOGIN_COOLDOWN_MS    = 4 * 60 * 1000; // 4 دقائق بين كل إعادة دخول

// ─── State ────────────────────────────────────────────────────────────────────
let _api              = null;
let _interval         = null;
let _firstTimer       = null;
let _consecutiveApiFails  = 0;
let _consecutiveReloginFails = 0;
let _checkCount       = 0;
let _lastRelogin      = 0;
let _running          = false;

// ─── Test FCA Session via API Call ───────────────────────────────────────────
function testApiAlive(api) {
  return new Promise((resolve) => {
    if (!api || typeof api.getUserInfo !== "function") return resolve(false);
    const uid = api.getCurrentUserID?.();
    if (!uid) return resolve(false);
    const timer = setTimeout(() => resolve(false), 12000);
    api.getUserInfo(uid, (err) => {
      clearTimeout(timer);
      resolve(!err);
    });
  });
}

// ─── Save Fresh Cookies (merge để giữ c_user/xs) ─────────────────────────────
function saveFreshCookies(api) {
  try {
    const fresh = api.getAppState?.() || [];
    if (!fresh.length) return;
    const { dedup } = require("../utils/cookieParser");
    let existing = [];
    try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
    const freshKeys = new Set(fresh.map(c => c.key));
    const merged = dedup([...fresh, ...existing.filter(c => !freshKeys.has(c.key))]);
    global._selfWrite = true;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
    setTimeout(() => { global._selfWrite = false; }, 6000);
    log.ok(`كوكيز مُحدَّثة ✔ (${merged.length} كوكي)`);
  } catch (_) {}
}

// ─── Tier 1: Restart Listener Only (no re-login) ─────────────────────────────
function restartListener(api) {
  log.warn("🔁 Tier-1: إعادة تشغيل الـ listener بدون إعادة دخول…");
  try {
    const { getIO } = require("../dashboard/server");
    const io = getIO();
    if (io) io.emit("bot-status", { status: "degraded", message: "⚠️ listener ميت — جارٍ إعادة التشغيل…" });
  } catch (_) {}

  try {
    const { stopPoller, startPoller } = require("../utils/customPoller");
    const handlerEvents = require("../handler/handlerEvents");
    stopPoller();
    global._listenerDead = false;
    // حاول Long-Poll أولاً
    const stop = api.listen((err, event) => {
      if (err) {
        const msg = String(err.error || err.message || err);
        const isBlocked = msg.includes("login_blocked") || msg.includes("auth_error");
        if (isBlocked) {
          log.warn("Tier-1: Long-Poll محجوب → Custom Poller…");
          startPoller(api, handlerEvents, global.config?.pollIntervalMs || 5000);
        } else {
          log.warn(`Tier-1: Long-Poll خطأ: ${msg}`);
        }
        return;
      }
      global._lastActivity = Date.now();
      if (event) handlerEvents(api, event, global.commands).catch(() => {});
    });
    global._currentListener = stop;
    log.ok("Tier-1: listener أُعيد تشغيله ✔");
  } catch (e) {
    log.error(`Tier-1 فشل: ${e.message} → تصعيد إلى Tier-2`);
    triggerRelogin("فشل إعادة تشغيل listener");
  }
}

// ─── Tier 2: Full Re-login ────────────────────────────────────────────────────
function triggerRelogin(reason) {
  const now = Date.now();
  if (now - _lastRelogin < RELOGIN_COOLDOWN_MS) {
    const wait = Math.round((RELOGIN_COOLDOWN_MS - (now - _lastRelogin)) / 1000);
    log.warn(`Tier-2: تخطي (cooldown ${wait}s متبقية)`);
    return;
  }
  _lastRelogin = now;
  _consecutiveApiFails = 0;

  log.error(`🔄 Tier-2: إعادة تسجيل الدخول — السبب: ${reason}`);

  try {
    const { getIO } = require("../dashboard/server");
    const io = getIO();
    if (io) io.emit("bot-status", { status: "reconnecting", message: `⚠️ جارٍ التجديد… (${reason})` });
  } catch (_) {}

  // إشعار المالك
  try {
    const owner = String(global.ownerID || "");
    if (global.api && owner) {
      global.api.sendMessage(
        `🔄 [Watchdog] الجلسة انتهت\nالسبب: ${reason}\nجارٍ إعادة تسجيل الدخول تلقائياً…`,
        owner, () => {}
      );
    }
  } catch (_) {}

  setTimeout(() => {
    if (typeof global.reLoginBot === "function") {
      global.reLoginBot();
    }
  }, 3000);
}

// ─── Tier 3: Process Exit (workflow يُعيد التشغيل) ──────────────────────────
function triggerProcessRestart(reason) {
  log.error(`💀 Tier-3: ${MAX_RELOGIN_FAILS} محاولات فاشلة — إعادة تشغيل العملية…`);
  log.error(`السبب: ${reason}`);

  try {
    const { getIO } = require("../dashboard/server");
    const io = getIO();
    if (io) io.emit("bot-status", { status: "offline", message: "🔄 إعادة تشغيل العملية…" });
  } catch (_) {}

  // أعطِ ثانيتين لإرسال الأحداث ثم أعد التشغيل
  setTimeout(() => {
    log.error("💀 process.exit(1) — workflow سيُعيد التشغيل تلقائياً");
    process.exit(1);
  }, 2000);
}

// ─── Main Check Loop ──────────────────────────────────────────────────────────
async function runCheck() {
  if (!_running) return;

  _checkCount++;
  const api = _api || global.api;
  if (!api) {
    log.warn(`فحص #${_checkCount}: لا يوجد api — تخطي`);
    return;
  }

  const lastActivity     = global._lastActivity || 0;
  const sinceActivity    = Date.now() - lastActivity;
  const sinceMin         = Math.round(sinceActivity / 60000);
  const listenerDead     = global._listenerDead === true;
  const noActivity       = lastActivity > 0 && sinceActivity > LISTENER_DEAD_LIMIT_MS;

  log.info(`فحص #${_checkCount} | آخر نشاط: ${sinceMin} دقيقة${listenerDead ? " | ⚠️ listener ميت" : ""}`);

  // Tier 1 check: هل الـ listener مات؟
  if (listenerDead || noActivity) {
    log.warn(`Tier-1 triggered (listenerDead=${listenerDead}, noActivity=${noActivity})`);

    // تحقق أولاً أن الـ API لا يزال حياً
    const apiAlive = await testApiAlive(api);
    if (apiAlive) {
      // API حي لكن listener ميت → أعد الـ listener فقط
      _consecutiveApiFails = 0;
      saveFreshCookies(api);
      restartListener(api);
      return;
    }
    // API ميت أيضاً → Tier 2
  }

  // Tier 2 check: هل الجلسة ماتت؟
  const apiAlive = await testApiAlive(api);
  if (apiAlive) {
    _consecutiveApiFails = 0;
    _consecutiveReloginFails = 0;
    log.ok(`الجلسة حية ✔ (فحص #${_checkCount})`);
    saveFreshCookies(api);
    return;
  }

  _consecutiveApiFails++;
  log.warn(`فشل API ${_consecutiveApiFails}/${MAX_API_FAILS}`);

  if (_consecutiveApiFails >= MAX_API_FAILS) {
    _consecutiveReloginFails++;

    if (_consecutiveReloginFails >= MAX_RELOGIN_FAILS) {
      triggerProcessRestart(`فشل ${_consecutiveReloginFails} مرات متتالية`);
      return;
    }

    triggerRelogin(`فشل API متكرر (×${_consecutiveApiFails})`);
  }
}

// ─── Re-login result tracking ─────────────────────────────────────────────────
// يُستدعى من index.js بعد نجاح/فشل إعادة الدخول
function onReloginSuccess() {
  _consecutiveReloginFails = 0;
  _consecutiveApiFails = 0;
  log.ok("إعادة الدخول نجحت ✔ — عداد الفشل صُفِّر");
}

function onReloginFail() {
  _consecutiveReloginFails++;
  log.warn(`إعادة الدخول فشلت — إجمالي فشل: ${_consecutiveReloginFails}/${MAX_RELOGIN_FAILS}`);
  if (_consecutiveReloginFails >= MAX_RELOGIN_FAILS) {
    triggerProcessRestart(`${_consecutiveReloginFails} محاولات إعادة دخول فاشلة`);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
function start(api) {
  stop();
  _api                     = api;
  _running                 = true;
  _consecutiveApiFails     = 0;
  _checkCount              = 0;

  log.ok(`🛡️ Session Watchdog نشط — فحص كل ${CHECK_INTERVAL_MS / 60000} دقيقة`);

  // أول فحص بعد 5 دقائق من الدخول
  _firstTimer = setTimeout(() => { if (_running) runCheck(); }, 5 * 60 * 1000);

  _interval = setInterval(() => { if (_running) runCheck(); }, CHECK_INTERVAL_MS);
}

function stop() {
  _running = false;
  if (_firstTimer) { clearTimeout(_firstTimer); _firstTimer = null; }
  if (_interval)   { clearInterval(_interval);  _interval   = null; }
  _api = null;
}

function getStatus() {
  return {
    running:              _running,
    checkCount:           _checkCount,
    consecutiveApiFails:  _consecutiveApiFails,
    consecutiveReloginFails: _consecutiveReloginFails,
    lastRelogin:          _lastRelogin,
  };
}

module.exports = { start, stop, getStatus, isRunning: () => _running, onReloginSuccess, onReloginFail };
