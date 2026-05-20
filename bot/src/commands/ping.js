module.exports = {
  config: {
    name: "ping",
    aliases: ["p"],
    description: "قياس سرعة استجابة البوت",
    usage: "ping",
    adminOnly: false,
  },
  async run({ api, event, threadID }) {
    const start = Date.now();
    api.sendMessage("🏓 جاري القياس...", threadID, (err, info) => {
      const ms = Date.now() - start;
      api.editMessage(`🏓 بونج! زمن الاستجابة: ${ms}ms`, info.messageID);
    });
  },
};
