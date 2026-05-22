"use strict";

module.exports = {
  config: {
    name: "اسم",
    aliases: ["rename", "عنوان", "سمي"],
    description: "تغيير اسم المجموعة",
    usage: "/اسم [الاسم الجديد]",
    adminOnly: true,
    ownerOnly: false,
  },

  async run({ api, event, args, threadID, messageID }) {
    const newName = args.join(" ").trim();
    if (!newName) {
      return api.sendMessage("❌ اكتب الاسم الجديد.\nمثال: /اسم مجموعة تارك", threadID, null, messageID);
    }

    try {
      await new Promise((res, rej) =>
        api.setTitle(newName, threadID, e => e ? rej(e) : res())
      );
      api.sendMessage(`✅ تم تغيير اسم المجموعة إلى:\n"${newName}"`, threadID, null, messageID);
    } catch (e) {
      api.sendMessage(`❌ فشل تغيير الاسم: ${e.message || e}`, threadID, null, messageID);
    }
  },
};
