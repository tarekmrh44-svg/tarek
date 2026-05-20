const { getOrCreateUser } = require("../utils/database");

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal", "coins", "money", "رصيد"],
    description: "عرض رصيد العملات الخاص بك",
    usage: "balance",
    adminOnly: false,
  },
  async run({ api, event, threadID, senderID }) {
    let name = "مستخدم";
    try {
      const info = await api.getUserInfo(senderID);
      if (info && info[senderID]) name = info[senderID].name;
    } catch {}

    const user = await getOrCreateUser(senderID, name);
    api.sendMessage(
      `💰 رصيد: ${name}\n` +
        `العملات: ${user.money || 0}\n` +
        `الخبرة: ${user.exp || 0}\n` +
        `المستوى: ${Math.floor((user.exp || 0) / 100) + 1}`,
      threadID
    );
  },
};
