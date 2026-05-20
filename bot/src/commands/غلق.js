"use strict";

if (!global._lockedThreads) global._lockedThreads = new Set();
if (global._globalLock === undefined) global._globalLock = false;

module.exports = {
  config: {
    name: "off",
    aliases: ["غلق", "autostop"],
    description: "إيقاف البوت والإرسال التلقائي في هذه المجموعة | /off | /off all",
    usage: "off | off all",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },
  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    if (!global._autoThreads) global._autoThreads = new Set();

    if (args[0] === "all" || args[0] === "الكل") {
      global._globalLock = true;
      global._lockedThreads.clear();
      global._autoThreads.clear();
      global._autoMsgPaused = true;
      return api.sendMessage(
        "🔒 تم إيقاف البوت والإرسال التلقائي في جميع المجموعات.\nأرسل /on لتشغيله.", threadID);
    }

    global._lockedThreads.add(String(threadID));
    global._autoThreads.delete(String(threadID));
    return api.sendMessage(
      "🔒 تم إيقاف البوت والإرسال التلقائي في هذه المجموعة.\n" +
      "أرسل /on لتشغيله.", threadID);
  },
};
