module.exports = {
  config: {
    name: "add",
    aliases: ["اضافة"],
    description: "إضافة مستخدم للغروب (عن طريق ID)",
    usage: "add <ID المستخدم>",
    adminOnly: true,
  },
  async run({ api, event, args, threadID }) {
    if (!args[0]) return api.sendMessage("❌ الاستخدام: /add <ID المستخدم>", threadID);
    try {
      await api.addUserToGroup(args[0], threadID);
      api.sendMessage(`✅ تمت إضافة المستخدم ${args[0]} للغروب.`, threadID);
    } catch (e) {
      api.sendMessage(`❌ تعذّرت الإضافة: ${e.message}`, threadID);
    }
  },
};
