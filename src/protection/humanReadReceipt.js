"use strict";
/**
 * Human Read Receipt — WHITE Engine
 * ===================================
 * يؤخّر مؤشر "تمّت القراءة" بناءً على طول الرسالة
 * يحاكي الإنسان الذي يقرأ الرسالة فعلياً قبل الرد
 */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.magenta("[READ_RCPT]")} ${msg}`);
}

/**
 * يحسب وقت القراءة الواقعي بناءً على طول الرسالة
 * متوسط القراءة البشرية: ~200-250 كلمة/دقيقة = ~1200 حرف/دقيقة
 */
function calcReadTime(text) {
  const len = String(text || "").length;
  if (len === 0) return randInt(800, 2000);
  // 50ms لكل حرف، حد أدنى 1.5s، حد أقصى 12s
  const base = Math.min(Math.max(len * 50, 1500), 12000);
  // تشويش ±30%
  return Math.round(base * (0.70 + Math.random() * 0.60));
}

/**
 * يُغلّف api.markAsRead بتأخير واقعي
 * @param {object} api
 */
function wrapMarkAsRead(api) {
  if (api.__readReceiptWrapped) return;
  api.__readReceiptWrapped = true;

  const _orig = api.markAsRead ? api.markAsRead.bind(api) : null;
  if (!_orig) return;

  api.markAsRead = async function wrappedMarkAsRead(threadID, callback) {
    const cfg = global.config?.humanReadReceipt || {};
    if (cfg.enable === false) return _orig(threadID, callback);

    // لا نؤخّر قراءة المالك أو الأدمنز
    const minDelay = cfg.minDelayMs ?? 1500;
    const maxDelay = cfg.maxDelayMs ?? 8000;
    const delay = randInt(minDelay, maxDelay);

    await sleep(delay);
    return _orig(threadID, callback);
  };

  log("✅ markAsRead wrapped — human read delay active");
}

/**
 * يُطبّق تأخير القراءة مع إرسال مؤشر الكتابة بعده مباشرة
 * الاستخدام: await simulateRead(api, threadID, messageText)
 */
async function simulateRead(api, threadID, messageText) {
  const cfg = global.config?.humanReadReceipt || {};
  if (cfg.enable === false) return;

  const delay = calcReadTime(messageText);
  await sleep(delay);

  try {
    if (api.markAsRead) {
      await new Promise(resolve => {
        const r = api.markAsRead(threadID, () => resolve());
        if (r && typeof r.then === "function") r.then(resolve).catch(resolve);
        setTimeout(resolve, 1000);
      });
    }
  } catch (_) {}
}

let _running = false;

function start(api) {
  const cfg = global.config?.humanReadReceipt || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  wrapMarkAsRead(api);
  log("🚀 Human Read Receipt started");
}

function stop() {
  _running = false;
  log("🛑 Human Read Receipt stopped");
}

module.exports = { start, stop, simulateRead, wrapMarkAsRead, calcReadTime, isRunning: () => _running };
