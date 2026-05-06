"use strict";
/**
 * غلق — قفل البوت على مستوى مجموعة أو الكل
 * أوامر: /غلق | /غلق الكل | /غلق ايقاف
 */

if (!global._lockedThreads) global._lockedThreads = new Set();
if (global._globalLock === undefined) global._globalLock = false;

module.exports = {
  config: {
    name: "غلق",
    aliases: [],
    description: "قفل البوت — لا يرد إلا لأدمن البوت | /غلق | /غلق الكل | /غلق ايقاف",
    usage: "غلق | غلق الكل | غلق ايقاف",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },
  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    const sub = args[0];

    // ── /غلق ايقاف
    if (sub === "ايقاف") {
      const wasGlobal = global._globalLock;
      const wasLocal  = global._lockedThreads.has(threadID);
      global._globalLock = false;
      global._lockedThreads.clear();
      if (!wasGlobal && !wasLocal)
        return api.sendMessage("⚠️ البوت ليس مغلقاً.", threadID);
      return api.sendMessage("🔓 تم فتح البوت — يرد على الجميع الآن.", threadID);
    }

    // ── /غلق الكل
    if (sub === "الكل") {
      global._globalLock = true;
      global._lockedThreads.clear();
      return api.sendMessage("🔒 تم قفل البوت على جميع المجموعات.\nلن يرد إلا لأدمن البوت.\nأرسل /غلق ايقاف لفتحه.", threadID);
    }

    // ── /غلق (مجموعة محددة)
    if (!args.length || args[0] === undefined) {
      global._lockedThreads.add(threadID);
      return api.sendMessage(
        "🔒 تم قفل البوت في هذه المجموعة.\n" +
        "لن يرد إلا لأدمن البوت.\n" +
        "أرسل /غلق ايقاف لفتحه.", threadID);
    }

    // /غلق [threadID] - قفل مجموعة محددة
    const targetTID = String(args[0]);
    global._lockedThreads.add(targetTID);
    return api.sendMessage(`🔒 تم قفل المجموعة ${targetTID}.`, threadID);
  },
};
