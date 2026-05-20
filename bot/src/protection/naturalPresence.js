"use strict";
/**
 * Natural Presence — WHITE Engine
 * =================================
 * محاكاة أنماط الحضور الطبيعية للإنسان بناءً على الوقت
 * أوقات الذروة: 8-11 صباحاً، 12-14 ظهراً، 18-23 مساءً
 * النوم: 1-7 صباحاً
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(level, msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  if (level === "info") console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.blue("[NAT_PRES]")} ${msg}`);
  if (level === "warn") console.log(`${chalk.gray(ts)} ${chalk.yellow("⚠")} ${chalk.yellow("[NAT_PRES] " + msg)}`);
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randMs(minMin, maxMin) { return randInt(minMin * 60000, maxMin * 60000); }

function localHour() {
  const tz = global.config?.timezone || "Africa/Algiers";
  try {
    return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10);
  } catch (_) { return new Date().getHours(); }
}

/**
 * أنماط الحضور حسب الساعة
 * يُرجع: { onlineChance, breakChance, sleepChance, minGap, maxGap } (دقائق)
 */
function getHourProfile(h) {
  if (h >= 1 && h < 7)   return { online: 0.03, idle: 0.12, offline: 0.85, minGap: 40, maxGap: 90 };   // نوم
  if (h >= 7 && h < 8)   return { online: 0.25, idle: 0.35, offline: 0.40, minGap: 15, maxGap: 35 };   // استيقاظ
  if (h >= 8 && h < 12)  return { online: 0.65, idle: 0.25, offline: 0.10, minGap: 5,  maxGap: 18 };   // صباح ذروة
  if (h >= 12 && h < 14) return { online: 0.55, idle: 0.30, offline: 0.15, minGap: 6,  maxGap: 20 };   // غداء
  if (h >= 14 && h < 17) return { online: 0.40, idle: 0.35, offline: 0.25, minGap: 10, maxGap: 30 };   // بعد الظهر
  if (h >= 17 && h < 20) return { online: 0.60, idle: 0.28, offline: 0.12, minGap: 5,  maxGap: 15 };   // مساء ذروة
  if (h >= 20 && h < 23) return { online: 0.70, idle: 0.22, offline: 0.08, minGap: 4,  maxGap: 14 };   // ليل ذروة
  if (h >= 23)           return { online: 0.35, idle: 0.30, offline: 0.35, minGap: 15, maxGap: 40 };   // منتصف الليل
  return { online: 0.45, idle: 0.30, offline: 0.25, minGap: 10, maxGap: 25 };
}

let _running = false;
let _api = null;
const _timers = [];

function addTimer(fn, ms) {
  const id = setTimeout(() => {
    const i = _timers.indexOf(id); if (i !== -1) _timers.splice(i, 1); fn();
  }, ms);
  _timers.push(id); return id;
}
function clearAll() { _timers.forEach(id => clearTimeout(id)); _timers.length = 0; }

// مخزن جلسات الحضور
let _currentState = "offline";
let _sessionStart = Date.now();
let _sessionCount = 0;
let _totalOnlineMinutes = 0;

async function presenceLoop() {
  if (!_running || !_api) return;

  const h = localHour();
  const profile = getHourProfile(h);
  const cfg = global.config?.naturalPresence || {};

  const roll = Math.random();
  let newState;
  if (roll < profile.online)                      newState = "online";
  else if (roll < profile.online + profile.idle)  newState = "idle";
  else                                             newState = "offline";

  // تتبع مدة الجلسة الحالية
  if (newState !== _currentState) {
    const elapsed = (Date.now() - _sessionStart) / 60000;
    if (_currentState === "online") _totalOnlineMinutes += elapsed;
    _sessionStart = Date.now();
    _currentState = newState;
    _sessionCount++;
  }

  try {
    if (newState === "online") {
      _api.setOptions({ online: true });
      log("info", `🟢 online (${h}:xx — ذروة: ${(profile.online * 100).toFixed(0)}%)`);
    } else if (newState === "idle") {
      _api.setOptions({ online: false });
      log("info", `💤 idle — ${h}:xx`);
    } else {
      _api.setOptions({ online: false });
      if (h >= 1 && h < 7) log("info", `🌙 offline (نوم)`);
      else log("info", `📴 offline — ${h}:xx`);
    }
  } catch (_) {}

  const gap = randMs(
    Math.max(profile.minGap, cfg.minGapMinutes ?? 0),
    Math.max(profile.maxGap, cfg.maxGapMinutes ?? profile.maxGap)
  );
  addTimer(presenceLoop, gap);
}

function start(api) {
  const cfg = global.config?.naturalPresence || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  _api = api;
  _sessionStart = Date.now();
  _currentState = "offline";
  log("info", `🚀 Natural Presence started (tz: ${global.config?.timezone || "Africa/Algiers"})`);
  addTimer(presenceLoop, randInt(2000, 8000));
}

function stop() {
  _running = false; clearAll();
  log("warn", "🛑 Natural Presence stopped");
}

function getStatus() {
  const h = localHour();
  return {
    running: _running, currentState: _currentState,
    localHour: h, profile: getHourProfile(h),
    sessionCount: _sessionCount,
    totalOnlineMinutes: Math.round(_totalOnlineMinutes),
  };
}

module.exports = { start, stop, getStatus, isRunning: () => _running };
