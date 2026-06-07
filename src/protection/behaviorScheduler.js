"use strict";
/**
 * Behavior Scheduler — WHITE Engine
 * =====================================
 * يُجدول سلوك البوت بأنماط بشرية واقعية:
 * - تأخير عشوائي قبل الرد على كل رسالة
 * - "قراءة المحادثة" قبل الرد
 * - حالات "مشغول" لا يرد فيها
 * - أنماط زمنية مختلفة صباح/مساء
 */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.blue("[BEHAVIOR]")} ${msg}`);
}

function localHour() {
  const tz = global.config?.timezone || "Africa/Algiers";
  try { return parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10); }
  catch (_) { return new Date().getHours(); }
}

// إحصاءات
let _responseCount = 0;
let _delayedCount  = 0;
let _skippedCount  = 0;
let _running = false;

/**
 * يُحسب تأخير الرد بناءً على:
 * - وقت اليوم
 * - طول الرسالة الواردة
 * - عشوائية اجتماعية
 */
function calcResponseDelay(incomingText) {
  const cfg = global.config?.behaviorScheduler || {};
  if (cfg.enable === false) return 0;

  const h = localHour();
  const len = String(incomingText || "").length;

  // تأخير أساسي حسب الوقت
  let baseMin, baseMax;
  if (h >= 1 && h < 7)   { baseMin = 15000; baseMax = 60000; } // نوم — تأخير كبير
  else if (h >= 7 && h < 9)  { baseMin = 3000;  baseMax = 12000; } // صباح — يستيقظ
  else if (h >= 9 && h < 17) { baseMin = 1000;  baseMax = 6000;  } // نهار — عادي
  else if (h >= 17 && h < 22){ baseMin = 800;   baseMax = 4000;  } // مساء — نشيط
  else                        { baseMin = 2000;  baseMax = 10000; } // ليل متأخر

  // تأخير إضافي للرسائل الطويلة (وقت القراءة)
  const readDelay = Math.min(len * 40, 5000);

  // تشويش اجتماعي
  const social = Math.random() < 0.15 ? randInt(3000, 12000) : 0; // 15% من الوقت "مشغول"

  return randInt(baseMin, baseMax) + readDelay + social;
}

/**
 * هل البوت "مشغول" الآن ولا يجب أن يرد؟
 * احتمال: 3% في الذروة، 8% في غير الذروة، 25% في النوم
 */
function isBusy() {
  const cfg = global.config?.behaviorScheduler || {};
  if (cfg.enable === false) return false;

  const h = localHour();
  let busyChance;
  if (h >= 1 && h < 7)  busyChance = cfg.sleepBusyChance ?? 0.20;
  else if ((h >= 9 && h < 12) || (h >= 18 && h < 22)) busyChance = cfg.peakBusyChance ?? 0.03;
  else busyChance = cfg.normalBusyChance ?? 0.07;

  return Math.random() < busyChance;
}

/**
 * الدالة الرئيسية — استدعاءها قبل معالجة أي حدث رسالة
 * @returns {boolean} false إذا يجب تخطي الرسالة تماماً
 */
async function scheduleResponse(incomingText, threadID) {
  const cfg = global.config?.behaviorScheduler || {};
  if (cfg.enable === false) return true;

  // تحقق "مشغول"
  if (isBusy()) {
    _skippedCount++;
    log(`🔕 Busy — skipping response to ${threadID}`);
    return false; // لا ترد
  }

  const delay = calcResponseDelay(incomingText);
  if (delay > 0) {
    _delayedCount++;
    await sleep(delay);
  }

  _responseCount++;
  return true; // تابع الرد
}

function start() {
  const cfg = global.config?.behaviorScheduler || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  log("🚀 Behavior Scheduler started");
}

function stop() { _running = false; log("🛑 Behavior Scheduler stopped"); }

module.exports = {
  start, stop, scheduleResponse, calcResponseDelay, isBusy,
  getStatus: () => ({
    running: _running,
    responseCount: _responseCount,
    delayedCount:  _delayedCount,
    skippedCount:  _skippedCount,
    localHour:     localHour(),
  }),
  isRunning: () => _running,
};
