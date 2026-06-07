module.exports = {
  config: {
    name: "unsend",
    aliases: ["delete", "حذف"],
    description: "حذف رسالة البوت (رد على رسالة البوت)",
    usage: "unsend (رد على رسالة البوت)",
    adminOnly: true,
  },
  async run({ api, event, threadID }) {
    const reply = event.messageReply;
    if (!reply) return api.sendMessage("❌ رد على رسالة البوت لحذفها.", threadID);

    const botID = api.getCurrentUserID();
    if (reply.senderID !== botID) {
      return api.sendMessage("❌ لا يمكنني حذف إلا رسائلي فقط.", threadID);
    }

    try {
      await api.unsendMessage(reply.messageID);
    } catch (e) {
      api.sendMessage(`❌ تعذّر الحذف: ${e.message}`, threadID);
    }
  },
};
