/**
 * /angel — رسائل تلقائية للغروبات
 * Copyright © 2025
 */
"use strict";
const fs   = require("fs-extra");
const path = require("path");
const DATA = path.join(process.cwd(), "database/data/angelData.json");

function load() { try { if(fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA,"utf8")); } catch(_){} return {}; }
function save(d) { fs.ensureDirSync(path.dirname(DATA)); fs.writeFileSync(DATA,JSON.stringify(d,null,2)); }
function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
function rand(a,b){ return a + Math.random()*(b-a); }

// FIX: was top-level global.GoatBot.angelIntervals = {} — crashes if GoatBot not ready
function getIntervals() {
  if (!global.GoatBot) return {};
  if (!global.GoatBot.angelIntervals) global.GoatBot.angelIntervals = {};
  return global.GoatBot.angelIntervals;
}

function scheduleNext(api, tid, td) {
  const iv = getIntervals();
  clearInterval(iv[tid]);
  delete iv[tid];
  if (!td?.active || !td?.message) return;
  const ms = Math.round(rand(td.minSeconds??60, td.maxSeconds??(td.minSeconds??60)) * 1000);
  iv[tid] = setTimeout(async () => {
    delete iv[tid];
    try {
      const delay = global.utils?.calcHumanTypingDelay?.(td.message) || 1500;
      await global.utils?.simulateTyping?.(api, tid, delay);
      await api.sendMessage(td.message, tid);
    } catch(_) {}
    const d = load(); if (d[tid]?.active) scheduleNext(api, tid, d[tid]);
  }, ms);
}

function restoreAll(api) {
  if (global.GoatBot?._angelRestored) return;
  if (global.GoatBot) global.GoatBot._angelRestored = true;
  const data = load();
  for (const [tid, td] of Object.entries(data))
    if (td.active && td.message) scheduleNext(api, tid, td);
}

module.exports = {
  config: {
    name: "angel", aliases: ["ang"], version: "3.1", author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 3, role: 2, category: "management",
    description: "رسائل تلقائية دورية للغروب",
    guide: { en: "{pn} [رسالة] [min-max ثانية]\n{pn} off\n{pn} status" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid  = event.threadID;
    const sid  = event.senderID;
    if (!isAdmin(sid)) return message.reply("⛔ للأدمن فقط.");
    restoreAll(api);
    const data = load();
    const iv   = getIntervals();
    const sub  = args[0]?.toLowerCase();

    if (!sub || sub === "status") {
      const td = data[tid];
      if (!td?.active) return message.reply("💤 Angel غير مفعل في هذا الغروب.");
      return message.reply(`✅ Angel نشط\n📝 الرسالة: ${td.message}\n⏱ كل: ${td.minSeconds}–${td.maxSeconds}s`);
    }

    if (sub === "off") {
      clearTimeout(iv[tid]);
      delete iv[tid];
      if (data[tid]) { data[tid].active = false; save(data); }
      return message.reply("✅ تم إيقاف Angel.");
    }

    const nums      = args.filter(a => /^\d+$/.test(a));
    const textParts = args.filter(a => !/^\d+$/.test(a) && a.toLowerCase() !== "on");
    const msg  = textParts.join(" ").trim() || data[tid]?.message || "🌸 مرحباً!";
    const minS = parseInt(nums[0]) || 60;
    const maxS = parseInt(nums[1]) || minS;

    data[tid] = { active: true, message: msg, minSeconds: minS, maxSeconds: Math.max(minS, maxS) };
    save(data);
    scheduleNext(api, tid, data[tid]);
    message.reply(`✅ تم تفعيل Angel\n📝 "${msg}"\n⏱ كل ${minS}–${Math.max(minS,maxS)} ثانية`);
  }
};
