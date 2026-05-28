"use strict";

  module.exports = {
    config: {
      name:        "اعادة",
      aliases:     ["relogin", "restart", "اعادة تشغيل"],
      description: "إعادة تسجيل دخول البوت من الشات",
      usage:       "اعادة",
      adminOnly:   true,
    },

    async run({ api, event }) {
      const { threadID, messageID } = event;

      await api.sendMessage(
        [
          `╔══════════════════╗`,
          `  🔄  إعادة التشغيل`,
          `╚══════════════════╝`,
          ``,
          `⏳ جارٍ إعادة تسجيل الدخول...`,
          `سأعود خلال ثوانٍ ✦`,
          ``,
          `╰─ BOT TAREK ✦ Lucifer`,
        ].join("\n"),
        threadID, undefined, messageID
      );

      // أعطِ وقتاً للرسالة تتبعث، ثم أعد الدخول
      setTimeout(() => {
        if (global.reLoginBot) {
          global.reLoginBot();
        } else {
          process.exit(0); // Railway يعيد التشغيل تلقائياً
        }
      }, 1500);
    },
  };
  