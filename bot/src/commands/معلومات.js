"use strict";

const moment = require("moment-timezone");

module.exports = {
  config: {
    name:        "معلومات",
    aliases:     ["info", "بوت"],
    description: "معلومات البوت أو تفاصيل أمر معين",
    usage:       "/معلومات | /معلومات [اسم الأمر]",
    adminOnly:   false,
    ownerOnly:   false,
  },

  run({ api, event, args, threadID, messageID }) {
    const query = (args[0] || "").trim().toLowerCase();

    // ── تفاصيل أمر معيّن ─────────────────────────────────────────────────────
    if (query) {
      const commands = global.commands || new Map();
      const prefix   = global.config?.prefix || "/";

      let mod = commands.get(query);
      if (!mod) {
        for (const [, m] of commands) {
          if ((m.config?.aliases || []).includes(query)) { mod = m; break; }
        }
      }
      if (!mod) {
        return api.sendMessage(
          `❌ الأمر "${query}" غير موجود.\nاكتب /اوامر لرؤية القائمة.`,
          threadID, null, messageID
        );
      }
      const c       = mod.config;
      const aliases = (c.aliases || []).map(a => `${prefix}${a}`).join("، ") || "—";
      return api.sendMessage(
`╔══════════════════╗
║ 📌 ${prefix}${c.name}
╠══════════════════╣
║ 📝 ${c.description || "—"}
║ 💡 ${c.usage || "—"}
║ 🔗 ${aliases}
║ 👑 للمالك: ${c.ownerOnly ? "نعم" : "لا"}
╚══════════════════╝`,
        threadID, null, messageID
      );
    }

    // ── معلومات البوت (بدون async) ────────────────────────────────────────────
    const cfg      = global.config || {};
    const tz       = cfg.timezone || "Africa/Algiers";
    const uptime   = formatUptime(process.uptime());
    const memMB    = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const now      = moment().tz(tz).format("HH:mm:ss");
    const cmds     = (global.commands || new Map()).size;
    const prefix   = cfg.prefix || "/";

    api.sendMessage(
`╔══════════════════════╗
║  🤖 Lucifer Bot v3.1
╠══════════════════════╣
║ 🔑 البادئة : ${prefix}
║ 👑 المالك  : ${cfg.ownerID || "—"}
║ 📋 الأوامر : ${cmds}
║ ⏱️  التشغيل : ${uptime}
║ 🧠 الذاكرة : ${memMB} MB
║ 🕐 الوقت   : ${now}
╠══════════════════════╣
║ /اوامر ← قائمة الأوامر
╚══════════════════════╝`,
      threadID, null, messageID
    );
  },
};

function formatUptime(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}ي ${h}س ${m}د`;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د ${Math.floor(s % 60)}ث`;
}
