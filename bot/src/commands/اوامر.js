"use strict";

module.exports = {
  config: {
    name:        "اوامر",
    aliases:     ["cmds", "commands", "help"],
    description: "قائمة الأوامر المتاحة",
    usage:       "/اوامر",
    adminOnly:   false,
    ownerOnly:   false,
  },

  run({ api, event, threadID, messageID }) {
    const commands = global.commands || new Map();
    const prefix   = global.config?.prefix || "/";

    const seen  = new Set();
    const lines = [];

    for (const [, mod] of commands) {
      const name = mod.config?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const tag = mod.config?.ownerOnly ? "👑" : mod.config?.adminOnly ? "🔒" : "▪️";
      lines.push(`${tag} ${prefix}${name}`);
    }

    const msg =
`📋 الأوامر المتاحة (${seen.size}):
━━━━━━━━━━━━━━━━
${lines.join("\n")}
━━━━━━━━━━━━━━━━
👑 للمالك  🔒 للأدمن
/معلومات [أمر] ← تفاصيل أمر`;

    api.sendMessage(msg, threadID, null, messageID);
  },
};
