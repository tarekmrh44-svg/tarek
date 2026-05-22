"use strict";

module.exports = {
  config: {
    name: "عشوائي",
    aliases: ["نرد", "random", "dice", "رقم"],
    description: "رقم عشوائي أو رمي نرد",
    usage: "/عشوائي  |  /عشوائي [max]  |  /عشوائي [min] [max]",
    adminOnly: false,
    ownerOnly: false,
  },

  run({ api, event, args, threadID, messageID }) {
    // نرد عادي بدون args
    if (!args[0]) {
      const faces = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣"];
      const roll  = Math.floor(Math.random() * 6);
      return api.sendMessage(
        `🎲 رميت النرد...\n${faces[roll]} الناتج: **${roll + 1}**`,
        threadID, null, messageID
      );
    }

    let min = 1, max = parseInt(args[0]);
    if (args[1]) { min = max; max = parseInt(args[1]); }
    if (isNaN(min) || isNaN(max) || min >= max) {
      return api.sendMessage("❌ أرقام غير صحيحة.\nمثال: /عشوائي 1 100", threadID, null, messageID);
    }

    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    api.sendMessage(
      `🎰 رقم عشوائي بين ${min} و ${max}:\n🔢 النتيجة: **${result}**`,
      threadID, null, messageID
    );
  },
};
