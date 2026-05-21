"use strict";
/**
 * cookieRotator.js — تحديث الكوكيز من api.getAppState() كل ساعة
 * ══════════════════════════════════════════════════════════════
 * يجلب الكوكيز من الجلسة الحالية مباشرةً — لا يُسبب تغيير الجلسة أبداً
 * لا يُرسل أي طلبات HTTP إضافية لفيسبوك
 */

const fs    = require("fs-extra");
const path  = require("path");
const chalk = require("chalk");
const moment = require("moment-timezone");

const ACCOUNT_PATH       = path.join(__dirname, "../../account.txt");
const ROTATE_INTERVAL_MS = 60 * 60 * 1000; // ساعة واحدة

const ts  = () => moment().tz(global.config?.timezone || "Africa/Algiers").format("HH:mm:ss");
const log = {
  info:  m => console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} [COOKIE-ROT] ${m}`),
  ok:    m => console.log(`${chalk.gray(ts())} ${chalk.green("✔")} ${chalk.green("[COOKIE-ROT] " + m)}`),
  warn:  m => console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} ${chalk.yellow("[COOKIE-ROT] " + m)}`),
  error: m => console.log(`${chalk.gray(ts())} ${chalk.red("✘")} ${chalk.red("[COOKIE-ROT] " + m)}`),
};

let _interval    = null;
let _running     = false;
let _api         = null;
let _rotateCount = 0;
let _lastRotate  = 0;

// ─── الحفظ من api.getAppState() بدون تغيير الجلسة ────────────────────────────
async function doRotate() {
  if (!_running || !_api) return;

  try {
    const fresh = _api.getAppState?.();
    if (!Array.isArray(fresh) || !fresh.length) {
      log.warn("getAppState() أعاد فارغاً — تخطي");
      return;
    }

    const { dedup } = require("../utils/cookieParser");

    // اقرأ الكوكيز الموجودة ودمجها مع الجديدة (الجديد يكسب)
    let existing = [];
    try {
      const raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
      if (raw) existing = JSON.parse(raw);
    } catch (_) {}

    const freshKeys = new Set(fresh.map(c => c.key));
    const merged    = dedup([...fresh, ...existing.filter(c => !freshKeys.has(c.key))]);

    // اكتب بصمت — منع مراقب account.txt من إطلاق hot-swap
    global._selfWrite = true;
    fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
    setTimeout(() => { global._selfWrite = false; }, 8000);

    _rotateCount++;
    _lastRotate = Date.now();
    log.ok(`🔄 كوكيز مُحدَّثة من الجلسة ✔ — ${merged.length} كوكي (دور #${_rotateCount})`);

  } catch (e) {
    log.error(`خطأ أثناء التحديث: ${e.message}`);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────
function start(api) {
  stop();
  _api     = api;
  _running = true;
  _rotateCount = 0;

  log.ok(`🔄 Cookie Rotator نشط — تحديث كل ${ROTATE_INTERVAL_MS / 60000} دقيقة (${ROTATE_INTERVAL_MS / 3600000} ساعة)`);

  // أول تحديث بعد 5 دقائق من تسجيل الدخول
  const firstTimer = setTimeout(async () => {
    if (_running) await doRotate();
  }, 5 * 60 * 1000);

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
    running:     _running,
    rotateCount: _rotateCount,
    lastRotate:  _lastRotate,
    intervalMin: ROTATE_INTERVAL_MS / 60000,
  };
}

module.exports = { start, stop, getStatus, isRunning: () => _running };
