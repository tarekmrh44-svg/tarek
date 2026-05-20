const { getOrCreateUser, User } = require("../utils/database");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "daily",
    aliases: ["claim", "يومي"],
    description: "استلام المكافأة اليومية من العملات",
    usage: "daily",
    adminOnly: false,
  },
  async run({ api, event, threadID, senderID }) {
    let name = "مستخدم";
    try {
      const info = await api.getUserInfo(senderID);
      if (info && info[senderID]) name = info[senderID].name;
    } catch {}

    const user = await getOrCreateUser(senderID, name);
    const now = moment();
    const lastClaim = user.updatedAt ? moment(user.updatedAt) : null;

    if (lastClaim && now.diff(lastClaim, "hours") < 24) {
      const remaining = 24 - now.diff(lastClaim, "hours");
      return api.sendMessage(
        `⏳ استلمت مكافأتك اليوم بالفعل!\nعد بعد ${remaining} ساعة.`,
        threadID
      );
    }

    const reward = Math.floor(Math.random() * 200) + 100;
    const expGain = Math.floor(Math.random() * 30) + 10;

    await user.update({
      money: (user.money || 0) + reward,
      exp: (user.exp || 0) + expGain,
    });

    api.sendMessage(
      `🎁 تم استلام المكافأة اليومية!\n` +
        `💰 +${reward} عملة\n` +
        `⭐ +${expGain} خبرة\n` +
        `💼 رصيدك الإجمالي: ${(user.money || 0) + reward}`,
      threadID
    );
  },
};
