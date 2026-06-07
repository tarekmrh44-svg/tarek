module.exports = {
  config: {
    name: "say",
    aliases: ["echo", "قل"],
    description: "اجعل البوت يرسل رسالة",
    usage: "say <الرسالة>",
    adminOnly: true,
  },
  async run({ api, event, args, threadID, messageID }) {
    if (!args.length) return api.sendMessage("❌ الاستخدام: /say <الرسالة>", threadID);
    api.unsendMessage(messageID);
    api.sendMessage(args.join(" "), threadID);
  },
};
