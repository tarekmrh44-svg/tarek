module.exports = {
  config: {
    name: "kick",
    aliases: ["طرد"],
    description: "طرد مستخدم من الغروب",
    usage: "kick @مستخدم",
    adminOnly: true,
  },
  async run({ api, event, args, threadID }) {
    const mentions = event.mentions || {};
    const ids = Object.keys(mentions);
    if (!ids.length) return api.sendMessage("❌ تاغ المستخدم الذي تريد طرده.", threadID);

    for (const id of ids) {
      try {
        await api.removeUserFromGroup(id, threadID);
        api.sendMessage(`✅ تم طرد ${mentions[id]} من الغروب.`, threadID);
      } catch (e) {
        api.sendMessage(`❌ تعذّر طرد ${mentions[id]}: ${e.message}`, threadID);
      }
    }
  },
};
