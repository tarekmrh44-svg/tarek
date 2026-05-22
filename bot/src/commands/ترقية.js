"use strict";

module.exports = {
  config: {
    name: "ترقية",
    aliases: ["admin", "ادمن", "مشرف", "إزالة_ادمن", "نزل"],
    description: "ترقية عضو لأدمن أو إزالة صلاحياته",
    usage: "/ترقية @شخص  |  /نزل @شخص",
    adminOnly: false,
    ownerOnly: true,
  },

  async run({ api, event, args, threadID, messageID }) {
    const body    = (event.body || "").toLowerCase();
    const isRemove = body.includes("نزل") || body.includes("إزالة");

    let targetID = null;
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } else if (event.type === "message_reply") {
      targetID = event.messageReply?.senderID;
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetID = args[0];
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ حدد الشخص بـ @ أو الرد على رسالته.",
        threadID, null, messageID
      );
    }

    try {
      let name = targetID;
      try {
        const info = await new Promise((res, rej) =>
          api.getUserInfo(targetID, (e, d) => e ? rej(e) : res(d || {}))
        );
        name = info[targetID]?.name || targetID;
      } catch (_) {}

      await new Promise((res, rej) =>
        api.changeAdminStatus(threadID, targetID, !isRemove, e => e ? rej(e) : res())
      );

      api.sendMessage(
        isRemove
          ? `✅ تم إزالة صلاحية الأدمن من ${name}.`
          : `✅ تم ترقية ${name} لأدمن. 🎉`,
        threadID, null, messageID
      );
    } catch (e) {
      api.sendMessage(`❌ فشلت العملية: ${e.message || e}`, threadID, null, messageID);
    }
  },
};
