module.exports = {
  config: {
    name: "mycommand",
    aliases: [],
    description: "وصف الأمر",
    usage: "mycommand",
    adminOnly: false,
    ownerOnly: false,
    category: "general",
  },
  async run({ api, event, args, threadID, senderID, prefix, isAdmin }) {
    // كودك هنا
    await api.sendMessage("مرحباً! هذا أمر mycommand", threadID);
  },
};