"use strict";
/**
 * Duplicate Guard — WHITE Engine
 * =================================
 * يمنع إرسال نفس الرسالة مرتين في فترة قصيرة
 * يكتشف الرسائل المكررة بسبب أخطاء البوت أو إعادة المحاولات
 */

const crypto = require("crypto");

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.green("[DEDUP]")} ${msg}`);
}

// مخزن الرسائل المُرسَلة: threadID → [{hash, ts}]
const _sentCache = new Map();
let _blockedCount = 0;
let _running = false;

function hashMsg(msg) {
  const text = typeof msg === "string" ? msg : (msg?.body || msg?.message || JSON.stringify(msg) || "");
  return crypto.createHash("md5").update(text.slice(0, 500)).digest("hex").slice(0, 16);
}

function isDuplicate(threadID, msg, windowMs) {
  const h = hashMsg(msg);
  const now = Date.now();
  const key = String(threadID);

  if (!_sentCache.has(key)) _sentCache.set(key, []);
  const recent = _sentCache.get(key).filter(e => now - e.ts < windowMs);
  _sentCache.set(key, recent);

  const dup = recent.some(e => e.hash === h);
  if (!dup) recent.push({ hash: h, ts: now });
  return dup;
}

// تنظيف دوري
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of _sentCache.entries()) {
    const fresh = v.filter(e => e.ts > cutoff);
    if (fresh.length === 0) _sentCache.delete(k); else _sentCache.set(k, fresh);
  }
}, 5 * 60 * 1000);

function wrapSendMessage(api) {
  if (api.__dedupWrapped) return;
  api.__dedupWrapped = true;

  const _orig = api.sendMessage.bind(api);
  api.sendMessage = async function(msg, threadID, callback, messageID) {
    const cfg = global.config?.duplicateGuard || {};
    if (cfg.enable === false) return _orig(msg, threadID, callback, messageID);

    const windowMs = (cfg.windowSeconds ?? 8) * 1000;

    if (isDuplicate(threadID, msg, windowMs)) {
      _blockedCount++;
      log(`🚫 Blocked duplicate message to ${threadID} (blocked: ${_blockedCount})`);
      if (typeof callback === "function") callback(null, { messageID: "dedup_blocked" });
      return;
    }

    return _orig(msg, threadID, callback, messageID);
  };

  log("✅ Duplicate Guard active — duplicate messages will be blocked");
}

function start(api) {
  const cfg = global.config?.duplicateGuard || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  wrapSendMessage(api);
  log("🚀 Duplicate Guard started");
}

function stop() { _running = false; log("🛑 Duplicate Guard stopped"); }

module.exports = {
  start, stop, wrapSendMessage,
  getStatus: () => ({ running: _running, blockedCount: _blockedCount, trackedThreads: _sentCache.size }),
  isRunning: () => _running,
};
