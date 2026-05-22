const fs = require("fs");
  const path = require("path");

  module.exports = {
    config: {
      name: "restart",
      aliases: ["ريستارت", "اعادة"],
      description: "إعادة تشغيل البوت (المالك فقط)",
      usage: "restart",
      ownerOnly: true,
    },
    async run({ api, event, config }) {
      const ownerID = config?.ownerID || process.env.OWNER_ID;
      if (event.senderID !== String(ownerID)) {
        return api.sendMessage("❌ هذا الأمر للمالك فقط.", event.threadID);
      }

      await api.sendMessage("🔄 جارٍ إعادة تشغيل البوت...\nسيعود خلال ثوانٍ ✅", event.threadID, event.messageID);

      // Small delay so the message is sent before exit
      setTimeout(() => process.exit(0), 1500);
    },
  };
  