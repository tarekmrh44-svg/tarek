const { User } = require("../utils/database");

module.exports = {
  config: {
    name: "rank",
    aliases: ["leaderboard", "top", "ترتيب"],
    description: "عرض أفضل المستخدمين بالخبرة",
    usage: "rank",
    adminOnly: false,
  },
  async run({ api, event, threadID }) {
    const top = await User.findAll({
      order: [["exp", "DESC"]],
      limit: 10,
    });

    if (!top.length) return api.sendMessage("لا يوجد مستخدمون مصنّفون بعد!", threadID);

    const medals = ["🥇", "🥈", "🥉"];
    const list = top.map((u, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const level = Math.floor((u.exp || 0) / 100) + 1;
      return `${medal} ${u.name} — مستوى ${level} (${u.exp} خبرة)`;
    });

    api.sendMessage(`🏆 أفضل المستخدمين\n━━━━━━━━━━\n${list.join("\n")}`, threadID);
  },
};
