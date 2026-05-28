module.exports = {
    config: {
      name: "push-cookies",
      aliases: ["رفع-كوكيز", "pushcookies"],
      description: "رفع الكوكيز الحالية لـ GitHub تلقائياً (للمالك فقط)",
      usage: "push-cookies",
      ownerOnly: true,
    },
    async run({ api, event }) {
      const { threadID, messageID } = event;
      const ownerID = global.config?.ownerID;
      if (event.senderID !== ownerID) {
        return api.sendMessage("❌ هذا الأمر للمالك فقط.", threadID, messageID);
      }

      api.sendMessage("🔄 جارٍ رفع الكوكيز لـ GitHub...", threadID);

      try {
        const pusher = require("../utils/cookiePusher");
        const ok = await pusher.pushNow();
        if (ok) {
          const status = pusher.getStatus();
          api.sendMessage(
            `✅ تم رفع الكوكيز لـ GitHub بنجاح!\n` +
            `📊 إجمالي المرات: ${status.pushCount}\n` +
            `🕐 آخر رفع: الآن`,
            threadID
          );
        } else {
          api.sendMessage(
            "❌ فشل رفع الكوكيز.\n" +
            "⚠️ تأكد من إضافة GITHUB_TOKEN و GITHUB_REPO في متغيرات Railway.",
            threadID
          );
        }
      } catch (e) {
        api.sendMessage(`❌ خطأ: ${e.message}`, threadID);
      }
    },
  };
  