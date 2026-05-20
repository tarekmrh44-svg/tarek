module.exports = {
  config: {
    name: "math",
    aliases: ["calc", "calculate", "حساب"],
    description: "حساب عملية رياضية",
    usage: "math <العملية>",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    if (!args.length) return api.sendMessage("❌ الاستخدام: /math <العملية>", threadID);
    const expr = args.join(" ");
    try {
      const result = Function(
        '"use strict"; const Math = globalThis.Math; return (' + expr + ")"
      )();
      api.sendMessage(`🧮 ${expr} = ${result}`, threadID);
    } catch {
      api.sendMessage(`❌ عملية غير صالحة: ${expr}`, threadID);
    }
  },
};
