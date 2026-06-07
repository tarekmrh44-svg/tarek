module.exports = {
  config: {
    name: "roll",
    aliases: ["dice", "random", "نرد"],
    description: "رمي النرد (افتراضي 1-6، أو حدد الحد الأقصى)",
    usage: "roll [الحد الأقصى]",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    const max = parseInt(args[0]) || 6;
    const result = Math.floor(Math.random() * max) + 1;
    api.sendMessage(`🎲 رميت النرد: ${result} (من 1 إلى ${max})`, threadID);
  },
};
