const { getOrCreateUser } = require("../utils/database");
const { generateProfileCard } = require("../utils/imageGen");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "profile",
    aliases: ["prof", "stats", "ملف"],
    description: "عرض بطاقتك الشخصية",
    usage: "profile [@مستخدم]",
    adminOnly: false,
  },
  async run({ api, event, args, threadID, senderID }) {
    let targetID = senderID;

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    }

    let name = "مستخدم";
    try {
      const info = await api.getUserInfo(targetID);
      if (info && info[targetID]) name = info[targetID].name;
    } catch {}

    const user = await getOrCreateUser(targetID, name);
    const exp = user.exp || 0;
    const level = Math.floor(exp / 100) + 1;

    try {
      const imgPath = await generateProfileCard({
        name,
        exp,
        money: user.money || 0,
        level,
      });

      api.sendMessage(
        {
          body: `📊 ملف: ${name}`,
          attachment: fs.createReadStream(imgPath),
        },
        threadID
      );
    } catch (e) {
      api.sendMessage(
        `📊 ملف: ${name}\nالمستوى: ${level}\nالخبرة: ${exp}\n💰 العملات: ${user.money || 0}`,
        threadID
      );
    }
  },
};
