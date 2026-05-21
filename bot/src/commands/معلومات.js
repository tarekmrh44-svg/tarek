"use strict";

const os     = require("os");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name:        "معلومات",
    aliases:     ["info", "help", "اوامر", "أوامر", "مساعدة"],
    description: "عرض معلومات البوت وقائمة الأوامر المتاحة",
    usage:       "/معلومات  |  /اوامر  |  /info",
    adminOnly:   false,
    ownerOnly:   false,
  },

  async run({ api, event, args, threadID, messageID }) {
    const sub = (args[0] || "").trim().toLowerCase();

    // ─── وضع الأوامر فقط ───────────────────────────────────────────────────────
    if (sub === "اوامر" || sub === "أوامر" || sub === "commands" || sub === "cmds") {
      return sendCommandsList(api, threadID, messageID);
    }

    // ─── وضع معلومات البوت ────────────────────────────────────────────────────
    if (!sub || sub === "بوت" || sub === "bot" || sub === "info") {
      return sendBotInfo(api, threadID, messageID);
    }

    // ─── /معلومات [اسم أمر] ───────────────────────────────────────────────────
    const cmd = findCommand(sub);
    if (cmd) return sendCommandDetail(api, threadID, messageID, cmd);

    // لم يُعثر على الأمر
    return api.sendMessage(
      `❌ الأمر "${sub}" غير موجود.\n\nاكتب /اوامر لرؤية القائمة الكاملة.`,
      threadID, null, messageID
    );
  },
};

// ─── معلومات البوت ─────────────────────────────────────────────────────────────
async function sendBotInfo(api, threadID, messageID) {
  const cfg      = global.config || {};
  const tz       = cfg.timezone || "Africa/Algiers";
  const uptime   = formatUptime(process.uptime());
  const mem      = process.memoryUsage();
  const memMB    = (mem.rss / 1024 / 1024).toFixed(1);
  const now      = moment().tz(tz).format("YYYY-MM-DD  HH:mm:ss");
  const cmdsCount = (global.commands || new Map()).size;
  const prefix   = cfg.prefix || "/";

  // جلب اسم البوت من FCA
  let botName = "Lucifer Bot";
  try {
    const uid  = global._botUID || (await new Promise((res, rej) =>
      api.getCurrentUserID
        ? res(api.getCurrentUserID())
        : res(null)
    ));
    if (uid) {
      const info = await new Promise((res, rej) =>
        api.getUserInfo(uid, (e, d) => e ? rej(e) : res(d || {}))
      );
      botName = info[uid]?.name || botName;
    }
  } catch (_) {}

  const msg =
`╔══════════════════════════════╗
║   🤖  معلومات البوت
╠══════════════════════════════╣
║ 📛  الاسم    : ${botName}
║ 🔑  البادئة  : ${prefix}
║ 👑  المالك   : ${cfg.ownerID || "—"}
║ ⚙️   الإصدار  : v3.1.0
╠══════════════════════════════╣
║ 📋  الأوامر  : ${cmdsCount} أمر محمَّل
║ ⏱️   التشغيل  : ${uptime}
║ 🧠  الذاكرة  : ${memMB} MB
║ 🕐  التوقيت  : ${now}
╠══════════════════════════════╣
║ 💡  اكتب /اوامر لرؤية القائمة
╚══════════════════════════════╝`;

  return api.sendMessage(msg, threadID, null, messageID);
}

// ─── قائمة الأوامر ─────────────────────────────────────────────────────────────
function sendCommandsList(api, threadID, messageID) {
  const commands = global.commands || new Map();
  const prefix   = (global.config?.prefix || "/");

  if (!commands.size) {
    return api.sendMessage("⚠️ لا توجد أوامر محمَّلة حالياً.", threadID, null, messageID);
  }

  // اجمع الأوامر (بدون aliases مكررة)
  const seen = new Set();
  const lines = [];
  for (const [, mod] of commands) {
    const name = mod.config?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const desc    = mod.config?.description || "";
    const owner   = mod.config?.ownerOnly   ? " 👑" : "";
    const admin   = mod.config?.adminOnly   ? " 🔒" : "";
    lines.push(`${prefix}${name}${owner}${admin}`);
    if (desc) lines[lines.length - 1] += `\n  └ ${desc}`;
  }

  const body =
`╔══════════════════════════════╗
║   📋  قائمة الأوامر (${seen.size})
╠══════════════════════════════╣
${lines.join("\n──────────────────────────────\n")}
╠══════════════════════════════╣
║ 👑 = للمالك فقط  |  🔒 = للأدمن
║ /معلومات [أمر] لتفاصيل أمر معين
╚══════════════════════════════╝`;

  return api.sendMessage(body, threadID, null, messageID);
}

// ─── تفاصيل أمر واحد ────────────────────────────────────────────────────────────
function sendCommandDetail(api, threadID, messageID, mod) {
  const c      = mod.config || {};
  const prefix = global.config?.prefix || "/";
  const aliases = (c.aliases || []).map(a => `${prefix}${a}`).join("، ") || "—";

  const msg =
`╔══════════════════════╗
║ 📌  ${prefix}${c.name}
╠══════════════════════╣
║ 📝  ${c.description || "—"}
║ 💡  ${c.usage ? prefix + c.usage.replace(/^\//, "") : "—"}
║ 🔗  المرادفات: ${aliases}
║ 👑  للمالك : ${c.ownerOnly ? "نعم" : "لا"}
║ 🔒  للأدمن : ${c.adminOnly ? "نعم" : "لا"}
╚══════════════════════╝`;

  return api.sendMessage(msg, threadID, null, messageID);
}

// ─── البحث عن أمر بالاسم أو الـ alias ────────────────────────────────────────
function findCommand(query) {
  const commands = global.commands || new Map();
  if (commands.has(query)) return commands.get(query);
  for (const [, mod] of commands) {
    if ((mod.config?.aliases || []).includes(query)) return mod;
  }
  return null;
}

// ─── تنسيق وقت التشغيل ─────────────────────────────────────────────────────────
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}ي ${h}س ${m}د`;
  if (h > 0) return `${h}س ${m}د ${s}ث`;
  return `${m}د ${s}ث`;
}
