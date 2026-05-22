"use strict";

module.exports = {
  config: {
    name:        "help",
    aliases:     ["مساعدة", "?"],
    description: "قائمة جميع الأوامر المتاحة",
    usage:       "/help  |  /help [اسم أمر]",
    adminOnly:   false,
    ownerOnly:   false,
  },

  run({ api, event, args, threadID, messageID }) {
    const query    = (args[0] || "").trim().toLowerCase();
    const commands = global.commands || new Map();
    const prefix   = global.config?.prefix || "/";

    // ─── تفاصيل أمر واحد ──────────────────────────────────────────────────────
    if (query) {
      let mod = commands.get(query);
      if (!mod) {
        for (const [, m] of commands) {
          if ((m.config?.aliases || []).includes(query)) { mod = m; break; }
        }
      }
      if (!mod) {
        return api.sendMessage(
          `❌ "${query}" غير موجود.\n\n اكتب /help لرؤية كل الأوامر.`,
          threadID, null, messageID
        );
      }
      const c = mod.config;
      const aliases = (c.aliases || []).map(a => `${prefix}${a}`).join(" | ") || "—";
      return api.sendMessage(
`┌─────────────────────┐
│  📌 ${prefix}${c.name}
├─────────────────────┤
│ 📝 ${c.description || "—"}
│ 💡 ${c.usage || "—"}
│ 🔗 ${aliases}
│ 👑 للمالك : ${c.ownerOnly ? "✅" : "❌"}
│ 🔒 للأدمن : ${c.adminOnly ? "✅" : "❌"}
└─────────────────────┘`,
        threadID, null, messageID
      );
    }

    // ─── قائمة كل الأوامر ─────────────────────────────────────────────────────
    const seen     = new Set();
    const regular  = [];
    const adminCmd = [];
    const ownerCmd = [];

    for (const [, mod] of commands) {
      const name = mod.config?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      if (mod.config?.ownerOnly)      ownerCmd.push(name);
      else if (mod.config?.adminOnly) adminCmd.push(name);
      else                            regular.push(name);
    }

    const fmt = (arr) => arr.map(n => `${prefix}${n}`).join("  ");

    let msg = `╔══════════════════════════╗\n`;
    msg    += `║  📋 قائمة الأوامر — ${seen.size} أمر\n`;
    msg    += `╠══════════════════════════╣\n`;

    if (regular.length) {
      msg += `║ 🌐 عامة:\n`;
      msg += `║  ${fmt(regular)}\n`;
    }
    if (adminCmd.length) {
      msg += `║\n║ 🔒 أدمن فقط:\n`;
      msg += `║  ${fmt(adminCmd)}\n`;
    }
    if (ownerCmd.length) {
      msg += `║\n║ 👑 مالك فقط:\n`;
      msg += `║  ${fmt(ownerCmd)}\n`;
    }

    msg += `╠══════════════════════════╣\n`;
    msg += `║ 💡 /help [أمر] ← تفاصيل\n`;
    msg += `╚══════════════════════════╝`;

    api.sendMessage(msg, threadID, null, messageID);
  },
};
