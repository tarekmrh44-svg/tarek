"use strict";
module.exports = {
  config: {
    name: "ping", aliases: ["p","بينج","اختبار","سرعة","ping"], version: "1.0", author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 3, role: 0, category: "info",
    description: "تحقق من استجابة البوت",
    guide: { en: "{pn}" }
  },
  onStart: async function({ api, message }) {
    const start = Date.now();
    const ping = Date.now() - start;
    message.reply(
      `🏓 Pong!\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `⚡ Ping: ${ping}ms\n` +
      `🤖 Bot: 𝐀𝐢𝐳𝐞𝐧\n` +
      `🆔 UID: ${api.getCurrentUserID()}\n` +
      `📌 Prefix: ${global.GoatBot?.config?.prefix || "/"}\n` +
      `✅ البوت يعمل بشكل طبيعي`
    );
  }
};
