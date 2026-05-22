"use strict";

module.exports = {
  config: {
    name: "طرد",
    aliases: ["kick", "remove", "ازل"],
    description: "طرد عضو من المجموعة",
    usage: "/طرد @شخص  |  ردَّ على رسالته",
    adminOnly: true,
    ownerOnly: false,
  },

  async run({ api, event, args, threadID, messageID }) {
    // الحصول على الـ UID المستهدف
    let targetID = null;

    // من mention
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }
    // من الرد على رسالة
    else if (event.type === "message_reply") {
      targetID = event.messageReply?.senderID;
    }
    // من args مباشر
    else if (args[0] && /^\d+$/.test(args[0])) {
      targetID = args[0];
    }

    if (!targetID) {
      return api.sendMessage(
        "❌ يجب تحديد الشخص:\n• ردَّ على رسالته\n• اذكره @\n• اكتب UID مباشرة",
        threadID, null, messageID
      );
    }

    // لا تطرد المالك
    if (targetID === global.config?.ownerID) {
      return api.sendMessage("⛔ لا يمكن طرد المالك.", threadID, null, messageID);
    }
    // لا تطرد البوت نفسه
    if (targetID === event.senderID && targetID !== global.config?.ownerID) {
      // يسمح فقط للمالك أن يطرد نفسه
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
        api.removeUserFromGroup(targetID, threadID, e => e ? rej(e) : res())
      );

      api.sendMessage(`✅ تم طرد ${name} من المجموعة.`, threadID, null, messageID);
    } catch (e) {
      api.sendMessage(`❌ فشل الطرد: ${e.message || e}`, threadID, null, messageID);
    }
  },
};
