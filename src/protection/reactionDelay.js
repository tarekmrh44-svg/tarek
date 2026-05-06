"use strict";
/**
 * Reaction Delay — WHITE Engine
 * ================================
 * يُغلّف api.setMessageReaction بتأخير بشري واقعي
 * الإنسان لا يُعطي ردود فعل فورية — يستغرق 0.5-8 ثوانٍ للتفكير
 */

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const chalk = require("chalk");
  const ts = new Date().toLocaleTimeString("en", { hour12: false });
  console.log(`${chalk.gray(ts)} ${chalk.cyan("•")} ${chalk.yellow("[REACT_DLY]")} ${msg}`);
}

// احتمال التوقف عن الرد على الإطلاق (يُحاكي "رأيت ولم أرد")
const SKIP_CHANCE = 0.05; // 5%

// توزيع التأخير حسب نوع الرد العاطفي
const REACTION_DELAY_PROFILE = {
  "😍": { min: 500,  max: 3000  }, // إعجاب شديد — سريع
  "😂": { min: 800,  max: 4000  }, // ضحك — بعد التأمل
  "😢": { min: 2000, max: 8000  }, // حزن — بطيء
  "😡": { min: 3000, max: 10000 }, // غضب — متأخر (تفكير)
  "👍": { min: 400,  max: 2500  }, // إعجاب — سريع
  "❤":  { min: 600,  max: 3500  }, // حب — طبيعي
  "default": { min: 800, max: 5000 },
};

let _running = false;
let _reactionCount = 0;

function getDelay(reaction) {
  const profile = REACTION_DELAY_PROFILE[reaction] || REACTION_DELAY_PROFILE["default"];
  return randInt(profile.min, profile.max);
}

function wrapSetReaction(api) {
  if (api.__reactionDelayWrapped) return;
  api.__reactionDelayWrapped = true;

  const _orig = api.setMessageReaction ? api.setMessageReaction.bind(api) : null;
  if (!_orig) { log("⚠️ api.setMessageReaction not found — skipping"); return; }

  api.setMessageReaction = async function wrappedSetReaction(reaction, messageID, callback, forceCustom) {
    const cfg = global.config?.reactionDelay || {};
    if (cfg.enable === false) return _orig(reaction, messageID, callback, forceCustom);

    // احتمال التخطي
    if (Math.random() < SKIP_CHANCE) {
      log(`🚫 Skipped reaction (human skip simulation)`);
      if (typeof callback === "function") callback(null);
      return;
    }

    const delay = getDelay(reaction);
    await sleep(delay);

    _reactionCount++;
    return _orig(reaction, messageID, callback, forceCustom);
  };

  log("✅ setMessageReaction wrapped — human reaction delay active");
}

function start(api) {
  const cfg = global.config?.reactionDelay || {};
  if (cfg.enable === false) return;
  if (_running) return;
  _running = true;
  wrapSetReaction(api);
  log("🚀 Reaction Delay started");
}

function stop() { _running = false; log("🛑 Reaction Delay stopped"); }

module.exports = {
  start, stop, wrapSetReaction,
  getStatus: () => ({ running: _running, reactionCount: _reactionCount }),
  isRunning: () => _running,
};
