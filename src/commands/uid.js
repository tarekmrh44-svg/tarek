module.exports = {
  config: {
    name: "uid",
    aliases: ["id"],
    description: "معرفة ID المستخدم أو الغروب",
    usage: "uid [@مستخدم]",
    adminOnly: false,
  },
  async run({ api, event, args, threadID, senderID }) {
    const mentions = event.mentions || {};
    const ids = Object.keys(mentions);

    if (!ids.length) {
      return api.sendMessage(`🆔 معرّفك: ${senderID}\n📌 معرّف المحادثة: ${threadID}`, threadID);
    }

    const list = ids.map((id) => `• ${mentions[id]}: ${id}`).join("\n");
    api.sendMessage(`🆔 معرّفات المستخدمين:\n${list}`, threadID);
  },
};
