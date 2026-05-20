module.exports = {
  config: {
    name: "هجاء",
    aliases: ["spell", "حروف"],
    description: "كتابة كل حرف في كلمة على حدة",
    usage: "هجاء <الكلمة>",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    if (!args.length)
      return api.sendMessage("❌ الاستخدام: /هجاء <الكلمة>", threadID);

    const word = args.join(" ");
    const letters = [...word].join(" - ");
    api.sendMessage(`🔤 هجاء "${word}":\n\n${letters}`, threadID);
  },
};
