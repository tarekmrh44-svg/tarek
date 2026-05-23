module.exports = {
    config: {
      name: "عام",
      aliases: ["publicmode", "unlockbot"],
      description: "تعطيل وضع المالك فقط — يستجيب البوت للجميع",
      usage: "عام",
      ownerOnly: true,
    },
    async run({ api, event }) {
      global.ownerOnlyMode = false;
      api.sendMessage("🔓 الوضع العام مُفعَّل\nالبوت يستجيب للجميع الآن.", event.threadID, event.messageID);
    },
  };
  