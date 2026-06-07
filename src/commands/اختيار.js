module.exports = {
  config: {
    name: "اختيار",
    aliases: ["choose", "خيار", "pick"],
    description: "اختيار عشوائي من بين خيارات (افصل بـ أو)",
    usage: "اختيار خيار1 أو خيار2 أو خيار3",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    if (!args.length)
      return api.sendMessage("❌ الاستخدام: /اختيار خيار1 أو خيار2 أو خيار3", threadID);

    const text = args.join(" ");
    const options = text.split(/\s+أو\s+/i).map(o => o.trim()).filter(Boolean);

    if (options.length < 2)
      return api.sendMessage("❌ اكتب خيارين على الأقل مفصولين بـ (أو)\nمثال: /اختيار شاي أو قهوة أو عصير", threadID);

    const chosen = options[Math.floor(Math.random() * options.length)];
    api.sendMessage(`🎯 البوت يختار:\n\n✅ ${chosen}`, threadID);
  },
};
