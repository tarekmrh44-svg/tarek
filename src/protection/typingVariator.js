"use strict";
/**
 * Typing Variator — WHITE Engine
 * ==================================
 * محاكاة متقدمة لأنماط الكتابة البشرية:
 * - توقفات "التفكير" العشوائية
 * - أخطاء كتابة محاكاة مع تصحيح
 * - تأخير متناسب مع تعقيد الرسالة
 * - أنماط مزاج مختلفة (سريع/عادي/بطيء)
 */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.magenta("[TYPE_VAR]")} ${msg}`);
}

// أنماط المزاج
const MOODS = [
  { name: "fast",   speedMul: 0.5,  thinkChance: 0.05, pauseMul: 0.4 }, // كاتب سريع
  { name: "normal", speedMul: 1.0,  thinkChance: 0.15, pauseMul: 1.0 }, // طبيعي
  { name: "slow",   speedMul: 1.7,  thinkChance: 0.25, pauseMul: 1.8 }, // يفكر كثيراً
  { name: "burst",  speedMul: 0.35, thinkChance: 0.02, pauseMul: 0.3 }, // يُرسل على عجل
];

let _currentMood = MOODS[1]; // normal افتراضياً
let _moodTimer = null;
let _running = false;
let _typingCount = 0;
let _totalThinkMs = 0;

function rotateMood() {
  _currentMood = MOODS[randInt(0, MOODS.length - 1)];
  log(`🎭 Mood: ${_currentMood.name} (speed: ×${_currentMood.speedMul})`);
}

/**
 * يُحاكي أنماط الكتابة المعقدة
 * @param {object} api
 * @param {string} threadID
 * @param {string|object} msg
 */
async function simulateComplexTyping(api, threadID, msg) {
  const cfg = global.config?.typingVariator || {};
  if (cfg.enable === false) return;

  const text = typeof msg === "string" ? msg : (msg?.body || msg?.message || "");
  const mood = _currentMood;

  // وقفة "تفكير" قبل البدء بالكتابة
  if (Math.random() < mood.thinkChance) {
    const thinkMs = randInt(1500, 6000) * mood.pauseMul;
    _totalThinkMs += thinkMs;
    await sleep(thinkMs);
  }

  // حساب وقت الكتابة
  const baseMs = Math.min(Math.max(text.length * 32, 500), 8000);
  const typingMs = Math.round(baseMs * mood.speedMul * (0.80 + Math.random() * 0.40));

  // إرسال مؤشر الكتابة
  try {
    if (api.sendTypingIndicator) {
      await new Promise(resolve => {
        const r = api.sendTypingIndicator(threadID, () => resolve());
        if (r && typeof r.then === "function") r.then(resolve).catch(resolve);
        setTimeout(resolve, 600);
      });
    }
  } catch (_) {}

  // توقفات "التردد" للرسائل الطويلة
  if (text.length > 100 && Math.random() < 0.30) {
    const pauseAt = randInt(Math.floor(typingMs * 0.3), Math.floor(typingMs * 0.7));
    await sleep(pauseAt);
    // إعادة إرسال مؤشر الكتابة بعد التوقف
    try { if (api.sendTypingIndicator) api.sendTypingIndicator(threadID, () => {}); } catch (_) {}
    await sleep(typingMs - pauseAt);
  } else {
    await sleep(typingMs);
  }

  // وقفة "المراجعة" قبل الإرسال
  await sleep(randInt(100, 400));
  _typingCount++;
}

function start(api) {
  const cfg = global.config?.typingVariator || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;

  rotateMood();
  // تغيير المزاج كل 20-60 دقيقة
  function scheduleMoodChange() {
    _moodTimer = setTimeout(() => {
      if (!_running) return;
      rotateMood();
      scheduleMoodChange();
    }, randInt(20, 60) * 60000);
  }
  scheduleMoodChange();
  log("🚀 Typing Variator started");
}

function stop() {
  _running = false;
  if (_moodTimer) { clearTimeout(_moodTimer); _moodTimer = null; }
  log("🛑 Typing Variator stopped");
}

module.exports = {
  start, stop, simulateComplexTyping,
  getStatus: () => ({
    running: _running,
    currentMood: _currentMood.name,
    typingCount: _typingCount,
    avgThinkMs: _typingCount ? Math.round(_totalThinkMs / _typingCount) : 0,
  }),
  isRunning: () => _running,
};
