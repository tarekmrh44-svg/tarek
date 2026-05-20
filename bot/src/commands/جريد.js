"use strict";
/**
 * جريد — بث تلقائي دوري
 * أوامر:
 * /جريد [رسالة]
 * /وقت [min] [max]
 * /جريدة تشغيل
 * /جريدة ايقاف
 */

if (!global._broadcasts) global._broadcasts = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

async function scheduleBroadcast(api, threadID) {
  const job = global._broadcasts.get(threadID);
  if (!job || !job.running || !job.message) return;

  const delay = rand(job.minSec, job.maxSec) * 1000;

  const timer = setTimeout(async () => {
    const j = global._broadcasts.get(threadID);
    if (!j || !j.running) return;

    try {
      try { await require("../protection/connectionJitter").applyJitter("broadcast"); } catch (_) {}

      const typingMs = Math.min(j.message.length * 28, 3000) + rand(300, 800);
      try { if (api.sendTypingIndicator) api.sendTypingIndicator(threadID, () => {}); } catch (_) {}
      await sleep(typingMs);

      await new Promise((resolve, reject) => {
        api.sendMessage(j.message, threadID, (err) => err ? reject(err) : resolve());
      });
    } catch (_) {}

    if (global._broadcasts.get(threadID)?.running) scheduleBroadcast(api, threadID);
  }, delay);

  job.timer = timer;
}

function stopBroadcast(threadID) {
  const job = global._broadcasts.get(threadID);
  if (job?.timer) clearTimeout(job.timer);
  global._broadcasts.delete(threadID);
}

module.exports = {
  config: {
    name: "جريد",
    aliases: ["وقت", "جريدة"],
    description: "بث تلقائي دوري",
    usage: "جريد [رسالة] | وقت [min] [max] | جريدة تشغيل | جريدة ايقاف",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },

  async run({ api, event, args, threadID, body, prefix, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    const rawCmd = body.slice(prefix.length).trim().split(/\s+/)[0];
    const sub = args[0];

    let job = global._broadcasts.get(threadID) || {};

    // ── إيقاف
    if (rawCmd === "جريدة" && sub === "ايقاف") {
      if (!global._broadcasts.has(threadID))
        return api.sendMessage("⚠️ لا يوجد بث نشط.", threadID);

      stopBroadcast(threadID);
      return api.sendMessage("🛑 تم إيقاف البث.", threadID);
    }

    // ── تشغيل (NEW 🔥)
    if (rawCmd === "جريدة" && sub === "تشغيل") {
      if (!job.message)
        return api.sendMessage("❌ لا توجد رسالة. استخدم /جريد [رسالة]", threadID);

      if (!job.minSec)
        return api.sendMessage("❌ لم يتم تحديد الوقت. استخدم /وقت [min] [max]", threadID);

      if (job.running)
        return api.sendMessage("⚠️ البث يعمل بالفعل.", threadID);

      job.running = true;
      global._broadcasts.set(threadID, job);
      scheduleBroadcast(api, threadID);

      return api.sendMessage(
        `🚀 تم تشغيل البث!\n📢 "${job.message}"\n⏱️ كل ${job.minSec}–${job.maxSec} ثانية`,
        threadID
      );
    }

    // ── وقت
    if (rawCmd === "وقت") {
      const min = parseFloat(args[0]);
      const max = parseFloat(args[1]);

      if (isNaN(min) || isNaN(max) || min < 1 || max < min)
        return api.sendMessage("❌ /وقت 10 30", threadID);

      if (job.timer) clearTimeout(job.timer);

      job.minSec = min;
      job.maxSec = max;
      job.running = false;

      global._broadcasts.set(threadID, job);

      return api.sendMessage(
        `✅ تم ضبط الوقت: ${min} — ${max} ثانية\nاستخدم /جريدة تشغيل`,
        threadID
      );
    }

    // ── رسالة
    const message = args.join(" ").trim();
    if (!message)
      return api.sendMessage(
        "📡 الأوامر:\n" +
        "• /جريد [رسالة]\n" +
        "• /وقت [min max]\n" +
        "• /جريدة تشغيل\n" +
        "• /جريدة ايقاف",
        threadID
      );

    if (job.timer) clearTimeout(job.timer);

    job.message = message;
    job.running = false;

    global._broadcasts.set(threadID, job);

    return api.sendMessage(
      `✅ تم حفظ الرسالة:\n"${message}"\n\nاستخدم /وقت ثم /جريدة تشغيل`,
      threadID
    );
  },
};
