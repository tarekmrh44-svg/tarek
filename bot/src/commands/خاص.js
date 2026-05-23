module.exports = {
    config: {
      name: "خاص",
      aliases: ["owneronly", "lockbot"],
      description: "تفعيل وضع المالك فقط — يتجاهل البوت الجميع",
      usage: "خاص",
      ownerOnly: true,
    },
    async run({ api, event }) {
      global.ownerOnlyMode = true;
      api.sendMessage("🔒 وضع المالك فقط مُفعَّل\nالبوت يتجاهل الجميع الآن.", event.threadID, event.messageID);
    },
  };
  