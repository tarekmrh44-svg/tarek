"use strict";

module.exports = {
  config: {
    name: "ping",
    aliases: ["بينج", "سرعة"],
    description: "قياس سرعة استجابة البوت",
    usage: "/ping",
    adminOnly: false,
    ownerOnly: false,
  },

  async run({ api, event, threadID, messageID }) {
    const start = Date.now();
    await new Promise((res, rej) =>
      api.sendMessage("🏓 جاري القياس...", threadID, (e, info) => {
        if (e) return rej(e);
        const ms = Date.now() - start;
        api.editMessage(
          `🏓 Pong!\n⚡ الاستجابة: ${ms}ms\n${ms < 500 ? "🟢 سريع جداً" : ms < 1500 ? "🟡 جيد" : "🔴 بطيء"}`,
          info.messageID,
          res
        );
      })
    ).catch(() => {});
  },
};
