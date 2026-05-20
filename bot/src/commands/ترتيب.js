module.exports = {
  config: {
    name: "ترتيب",
    aliases: ["sort", "رتب"],
    description: "ترتيب قائمة عشوائياً أو أبجدياً",
    usage: "ترتيب كلمة1 كلمة2 كلمة3",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    if (args.length < 2)
      return api.sendMessage("❌ اكتب عنصرين على الأقل.\nمثال: /ترتيب علي أحمد سارة محمد", threadID);

    const shuffled = [...args].sort(() => Math.random() - 0.5);
    const list = shuffled.map((item, i) => `${i + 1}. ${item}`).join("\n");
    api.sendMessage(`🔀 الترتيب العشوائي:\n\n${list}`, threadID);
  },
};
