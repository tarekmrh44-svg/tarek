"use strict";
/**
 * Anti-Detection — WHITE Engine
 * ================================
 * يُدير بصمة الجهاز: يُدوّر sec-ch-ua، viewport، platform، Accept headers
 * يجعل كل طلب HTTP يبدو وكأنه من جهاز مختلف قليلاً
 */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.red("[ANTI-DET]")} ${msg}`);
}

// مجموعة بصمات جهاز واقعية
const DEVICE_PROFILES = [
  {
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    platform: "Android", brand: '"Google";v="124"', model: "Pixel 8 Pro",
    viewport: { w: 412, h: 915, dpr: 3.5 }, lang: "ar-DZ,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.122 Mobile Safari/537.36",
    platform: "Android", brand: '"Samsung";v="123"', model: "Galaxy S22",
    viewport: { w: 393, h: 851, dpr: 3.0 }, lang: "ar;q=0.9,en-US;q=0.8",
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 13; Redmi Note 12 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    platform: "Android", brand: '"Chromium";v="122"', model: "Redmi Note 12 Pro",
    viewport: { w: 390, h: 844, dpr: 2.75 }, lang: "ar-DZ,ar;q=0.9,fr;q=0.7",
  },
  {
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1",
    platform: "iPhone", brand: '"Apple";v="17"', model: "iPhone 15",
    viewport: { w: 390, h: 844, dpr: 3.0 }, lang: "ar-DZ,ar;q=0.9",
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 14; OnePlus 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    platform: "Android", brand: '"OnePlus";v="124"', model: "OnePlus 12",
    viewport: { w: 412, h: 919, dpr: 3.0 }, lang: "ar;q=0.9,en;q=0.8",
  },
  {
    ua: "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/459.0.0.29.109;]",
    platform: "Android", brand: '"Facebook";v="459"', model: "Xiaomi Mi 11",
    viewport: { w: 393, h: 851, dpr: 2.75 }, lang: "ar-DZ,ar;q=0.9",
  },
];

let _profileIdx = randInt(0, DEVICE_PROFILES.length - 1);
let _rotateCount = 0;
let _running = false;
const _timers = [];

function getCurrentProfile() { return DEVICE_PROFILES[_profileIdx]; }

function rotateProfile() {
  const next = (_profileIdx + randInt(1, DEVICE_PROFILES.length - 1)) % DEVICE_PROFILES.length;
  _profileIdx = next;
  _rotateCount++;
  log(`🔄 Profile rotated → ${DEVICE_PROFILES[next].model} (rotations: ${_rotateCount})`);
  // حدّث UA في config الحالي
  if (global.config) global.config._activeUA = DEVICE_PROFILES[next].ua;
  return DEVICE_PROFILES[next];
}

/**
 * بنيّ headers واقعية للطلب الحالي
 */
function buildHeaders(extraReferer) {
  const p = getCurrentProfile();
  const headers = {
    "user-agent":       p.ua,
    "accept":           "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language":  p.lang,
    "accept-encoding":  "gzip, deflate, br",
    "cache-control":    Math.random() < 0.5 ? "max-age=0" : "no-cache",
    "sec-fetch-dest":   "document",
    "sec-fetch-mode":   "navigate",
    "sec-fetch-site":   extraReferer ? "same-origin" : "none",
    "sec-fetch-user":   "?1",
    "upgrade-insecure-requests": "1",
  };
  if (p.platform !== "iPhone") {
    headers["sec-ch-ua"]                  = `"Chromium";v="124", ${p.brand}, "Not-A.Brand";v="99"`;
    headers["sec-ch-ua-mobile"]           = "?1";
    headers["sec-ch-ua-platform"]         = `"${p.platform}"`;
    headers["sec-ch-ua-platform-version"] = `"${randInt(12, 14)}.0.0"`;
    headers["sec-ch-ua-model"]            = `"${p.model}"`;
  }
  if (extraReferer) headers["referer"] = extraReferer;
  return headers;
}

function addTimer(fn, ms) {
  const id = setTimeout(() => { const i = _timers.indexOf(id); if (i !== -1) _timers.splice(i, 1); fn(); }, ms);
  _timers.push(id); return id;
}
function clearAll() { _timers.forEach(id => clearTimeout(id)); _timers.length = 0; }

function rotationLoop() {
  if (!_running) return;
  rotateProfile();
  const cfg = global.config?.antiDetection || {};
  const intervalMin = cfg.rotateIntervalMinutes ?? randInt(45, 120);
  addTimer(rotationLoop, intervalMin * 60000);
}

function start() {
  const cfg = global.config?.antiDetection || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  log(`🚀 Anti-Detection started (profile: ${getCurrentProfile().model})`);
  addTimer(rotationLoop, randInt(45, 90) * 60000);
}

function stop() { _running = false; clearAll(); log("🛑 Anti-Detection stopped"); }

module.exports = {
  start, stop,
  buildHeaders,
  getCurrentProfile,
  rotateProfile,
  getStatus: () => ({
    running: _running,
    currentProfile: getCurrentProfile().model,
    rotateCount: _rotateCount,
    currentUA: getCurrentProfile().ua.slice(0, 80) + "…",
  }),
  isRunning: () => _running,
};
