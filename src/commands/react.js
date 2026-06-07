module.exports = {
  config: {
    name: "react",
    aliases: ["like", "تفاعل"],
    description: "التفاعل على الرسالة المردود عليها",
    usage: "react <إيموجي>",
    adminOnly: false,
  },
  async run({ api, event, args, threadID, messageID }) {
    const emoji = args[0] || "👍";
    const targetID = event.messageReply?.messageID || messageID;
    try {
      await api.setMessageReaction(emoji, targetID, () => {}, true);
    } catch (e) {
      api.sendMessage(`❌ تعذّر التفاعل: ${e.message}`, threadID);
    }
  },
};
