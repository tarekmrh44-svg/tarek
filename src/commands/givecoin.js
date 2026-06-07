const { getOrCreateUser } = require("../utils/database");

module.exports = {
  config: {
    name: "givecoin",
    aliases: ["give", "transfer", "تحويل"],
    description: "تحويل عملات لمستخدم آخر",
    usage: "givecoin @مستخدم <الكمية>",
    adminOnly: false,
  },
  async run({ api, event, args, threadID, senderID }) {
    const mentions = event.mentions || {};
    const ids = Object.keys(mentions);
    if (!ids.length || !args[args.length - 1])
      return api.sendMessage("❌ الاستخدام: /givecoin @مستخدم <الكمية>", threadID);

    const amount = parseInt(args[args.length - 1]);
    if (isNaN(amount) || amount <= 0)
      return api.sendMessage("❌ كمية غير صالحة.", threadID);

    let senderName = "مستخدم";
    try {
      const info = await api.getUserInfo(senderID);
      if (info && info[senderID]) senderName = info[senderID].name;
    } catch {}

    const sender = await getOrCreateUser(senderID, senderName);
    if ((sender.money || 0) < amount)
      return api.sendMessage(`❌ رصيدك غير كافٍ. رصيدك الحالي: ${sender.money || 0}`, threadID);

    const targetID = ids[0];
    const target = await getOrCreateUser(targetID, mentions[targetID]);

    await sender.update({ money: (sender.money || 0) - amount });
    await target.update({ money: (target.money || 0) + amount });

    api.sendMessage(
      `✅ تم التحويل بنجاح!\n` +
        `💸 ${senderName} ← ${mentions[targetID]}: ${amount} عملة\n` +
        `رصيدك المتبقي: ${(sender.money || 0) - amount}`,
      threadID
    );
  },
};
