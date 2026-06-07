"use strict";
/**
 * Connection Jitter — WHITE Engine
 * ===================================
 * يُضيف تأخيرات عشوائية صغيرة بين طلبات API المتتالية
 * يُحاكي تفاوت الشبكة الخلوية الطبيعي (3G/4G/5G)
 * يمنع نمط الطلبات المنتظمة المشبوهة
 */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.cyan("[JITTER]")} ${msg}`);
}

// ملف الشبكة الخلوية
const NETWORK_PROFILES = [
  { name: "5G Fast",  minMs: 10,  maxMs: 80,  spikeChance: 0.02, spikeMs: 500  },
  { name: "4G LTE",   minMs: 30,  maxMs: 200, spikeChance: 0.05, spikeMs: 1500 },
  { name: "4G Weak",  minMs: 80,  maxMs: 400, spikeChance: 0.08, spikeMs: 3000 },
  { name: "3G",       minMs: 150, maxMs: 700, spikeChance: 0.12, spikeMs: 5000 },
];

let _profileIdx = 1; // 4G LTE افتراضياً
let _lastCallTime = 0;
let _jitterCount = 0;
let _totalJitterMs = 0;
let _running = false;

function getProfile() { return NETWORK_PROFILES[_profileIdx]; }

function rotateProfile() {
  // تغيير ملف الشبكة أحياناً (يُحاكي التنقل)
  _profileIdx = randInt(0, NETWORK_PROFILES.length - 1);
  log(`🔄 Network profile: ${NETWORK_PROFILES[_profileIdx].name}`);
}

/**
 * يُطبّق jitter قبل أي طلب API
 * @param {string} [context] - سياق الطلب للتسجيل
 */
async function applyJitter(context) {
  const cfg = global.config?.connectionJitter || {};
  if (cfg.enable === false) return;

  const profile = getProfile();
  const now = Date.now();
  const timeSinceLast = now - _lastCallTime;

  // إذا مرّ وقت طويل منذ آخر طلب، لا نضيف jitter
  if (timeSinceLast > 30000) { _lastCallTime = now; return; }

  let delay = randInt(profile.minMs, profile.maxMs);

  // spike عرضي يُحاكي ضعف الشبكة
  if (Math.random() < profile.spikeChance) {
    delay += randInt(profile.spikeMs / 2, profile.spikeMs);
    log(`⚡ Network spike (${profile.name}): +${Math.round(delay)}ms`);
  }

  // تغيير ملف الشبكة بنسبة 2%
  if (Math.random() < 0.02) rotateProfile();

  if (delay > 0) {
    _jitterCount++;
    _totalJitterMs += delay;
    _lastCallTime = Date.now() + delay;
    await sleep(delay);
  }
}

/**
 * يُغلّف api.sendMessage بـ jitter
 */
function wrapWithJitter(api) {
  if (api.__jitterWrapped) return;
  api.__jitterWrapped = true;

  // تغليف sendMessage
  const _origSend = api.sendMessage.bind(api);
  api.sendMessage = async function(msg, threadID, callback, messageID) {
    try { await applyJitter("sendMessage"); } catch (_) {}
    return _origSend(msg, threadID, callback, messageID);
  };

  // تغليف getUserInfo
  if (api.getUserInfo) {
    const _origGetUser = api.getUserInfo.bind(api);
    api.getUserInfo = async function(ids, callback) {
      try { await applyJitter("getUserInfo"); } catch (_) {}
      return _origGetUser(ids, callback);
    };
  }

  log("✅ Connection Jitter active — network simulation enabled");
}

function start(api) {
  const cfg = global.config?.connectionJitter || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  wrapWithJitter(api);
  log(`🚀 Connection Jitter started (profile: ${getProfile().name})`);
}

function stop() { _running = false; log("🛑 Connection Jitter stopped"); }

module.exports = {
  start, stop, applyJitter, wrapWithJitter,
  getStatus: () => ({
    running: _running,
    networkProfile: getProfile().name,
    jitterCount: _jitterCount,
    avgJitterMs: _jitterCount ? Math.round(_totalJitterMs / _jitterCount) : 0,
  }),
  isRunning: () => _running,
};
