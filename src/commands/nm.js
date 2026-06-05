/**
 * /nm — قفل اسم الغروب مع تجديد دوري
 * Copyright © 2025
 */
"use strict";

if (!global._nmIntervals) global._nmIntervals = new Map();
if (!global._nmLocks)     global._nmLocks     = new Map();

function isAdmin(id) { return (global.GoatBot?.config?.adminBot||[]).map(String).includes(String(id)); }
function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function getMs(lock) { const min=lock.minDelay??lock.delay??30, max=lock.maxDelay??min; return rand(min,max)*1000; }

// FIX: wrap callback-based setTitle in Promise
function setTitleP(api, name, tid) {
  return new Promise((res,rej) => {
    try { api.setTitle(name, tid, e => e ? rej(e) : res()); }
    catch(e) { rej(e); }
  });
}

function stopInterval(tid) {
  if (global._nmIntervals.has(tid)) { clearTimeout(global._nmIntervals.get(tid)); global._nmIntervals.delete(tid); }
}

function startInterval(api, tid, lock) {
  stopInterval(tid);
  if (!lock?.enabled || !lock?.name) return;
  global._nmLocks.set(tid, lock);
  function schedule() {
    const t = setTimeout(async () => {
      global._nmIntervals.delete(tid);
      const cur = global._nmLocks.get(tid);
      if (!cur?.enabled || !cur?.name) return;
      try { await setTitleP(api, cur.name, tid); } catch(_) {}
      schedule();
    }, getMs(lock));
    global._nmIntervals.set(tid, t);
  }
  schedule();
}

function restoreAll(api) {
  if (global._nmRestored) return; global._nmRestored = true;
  for (const [tid, lock] of global._nmLocks) {
    if (lock?.enabled && lock?.name) startInterval(api, tid, lock);
  }
}

module.exports = {
  config: {
    name: "nm", aliases: ["namemute","غلق"], version: "2.1", author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 3, role: 2, category: "management",
    description: "قفل اسم الغروب مع تجديد دوري",
    guide: { en: "{pn} [اسم] — قفل\n{pn} off — فك قفل\n{pn} time [min] [max] — وقت التجديد\n{pn} status" }
  },

  onStart: async function({ api, event, args, message }) {
    const tid = event.threadID;
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");
    restoreAll(api);
    const sub = args[0]?.toLowerCase();

    if (sub === "status") {
      const lock = global._nmLocks.get(tid);
      if (!lock?.enabled) return message.reply("💤 NM غير مفعل.");
      return message.reply(`✅ NM مفعل\n📝 "${lock.name}"\n⏱ ${lock.minDelay}–${lock.maxDelay}s`);
    }

    if (sub === "off" || sub === "فك" || sub === "unm") {
      stopInterval(tid);
      const l = global._nmLocks.get(tid);
      if (l) { l.enabled = false; global._nmLocks.set(tid, l); }
      return message.reply("✅ تم فك قفل NM.");
    }

    if (sub === "time") {
      const lock = global._nmLocks.get(tid) || {};
      lock.minDelay = parseInt(args[1]) || 30;
      lock.maxDelay = Math.max(parseInt(args[2]) || lock.minDelay, lock.minDelay);
      global._nmLocks.set(tid, lock);
      if (lock.enabled) startInterval(api, tid, lock);
      return message.reply(`✅ وقت التجديد: ${lock.minDelay}–${lock.maxDelay}s`);
    }

    const name = args.join(" ").trim();
    if (!name) return message.reply("❌ اكتب الاسم.\nمثال: /nm AIZEN GROUP");

    const lock = { enabled: true, name, minDelay: 30, maxDelay: 60, ...(global._nmLocks.get(tid)||{}) };
    lock.name = name; lock.enabled = true;
    startInterval(api, tid, lock);
    try { await setTitleP(api, name, tid); } catch(_) {}
    message.reply(`✅ تم قفل الاسم: "${name}"\n⏱ تجديد كل ${lock.minDelay}–${lock.maxDelay}s`);
  }
};
