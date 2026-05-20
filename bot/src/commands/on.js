"use strict";

module.exports = {
  config: {
    name: "on",
    aliases: ["تشغيل", "autostart"],
    description: "تشغيل البوت والإرسال التلقائي في هذه المجموعة | /on",
    usage: "on",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },
  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    if (!global._autoThreads) global._autoThreads = new Set();

    global._globalLock = false;
    if (global._lockedThreads) global._lockedThreads.delete(String(threadID));
    global._autoThreads.add(String(threadID));
    global._autoMsgPaused = false;

    return api.sendMessage(
      "✅ تم تشغيل البوت والإرسال التلقائي في هذه المجموعة!\n" +
      `⏱ يرسل كل 40 ثانية.\n` +
      `📋 عدد المجموعات النشطة: ${global._autoThreads.size}`, threadID);
  },
};
