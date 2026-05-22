"use strict";

module.exports = {
  config: {
    name: "uid",
    aliases: ["id", "ايدي", "هوية"],
    description: "عرض UID الخاص بك أو بأي شخص في الرسالة",
    usage: "/uid  |  /uid @شخص  |  (رد على رسالة)",
    adminOnly: false,
    ownerOnly: false,
  },

  async run({ api, event, threadID, messageID }) {
    const senderID = event.senderID;
    const threadID2 = event.threadID;

    // إذا ردَّ على رسالة شخص آخر
    const targetID = event.type === "message_reply"
      ? event.messageReply?.senderID
      : senderID;

    let name = "مجهول";
    try {
      const info = await new Promise((res, rej) =>
        api.getUserInfo(targetID, (e, d) => e ? rej(e) : res(d || {}))
      );
      name = info[targetID]?.name || name;
    } catch (_) {}

    api.sendMessage(
      `🆔 معلومات الهوية\n━━━━━━━━━━━━━\n👤 الاسم : ${name}\n🔢 UID   : ${targetID}\n💬 Thread: ${threadID2}`,
      threadID, null, messageID
    );
  },
};
