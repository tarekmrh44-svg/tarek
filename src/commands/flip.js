module.exports = {
  config: {
    name: "flip",
    aliases: ["coin", "coinflip", "عملة"],
    description: "قلب عملة معدنية",
    usage: "flip",
    adminOnly: false,
  },
  async run({ api, event, threadID }) {
    const result = Math.random() < 0.5 ? "صورة 🪙" : "كتابة 🪙";
    api.sendMessage(`🎲 نتيجة قلب العملة: ${result}`, threadID);
  },
};
