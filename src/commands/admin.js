/**
 * /ادمن — إدارة الأدمن مباشرة من الشات
 * فقط المالك يستطيع إضافة/حذف الأدمن
 * Copyright © 2025
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const CFG  = path.join(process.cwd(), "config.json");

function loadCfg() {
  try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch (_) { return global.GoatBot?.config || {}; }
}

function saveCfg(cfg) {
  try {
    global._selfWriteConfig = true;
    fs.writeFileSync(CFG, JSON.stringify(cfg, null, 2));
    setTimeout(() => { global._selfWriteConfig = false; }, 3000);
    // Sync in-memory
    if (global.GoatBot) global.GoatBot.config = cfg;
    global.config = cfg;
  } catch (_) {}
}

function isOwner(id) {
  const cfg = loadCfg();
  const sid = String(id);
  return [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String).includes(sid);
}

function isAdmin(id) {
  const cfg = loadCfg();
  const sid = String(id);
  const supers = [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String);
  return supers.includes(sid) || (cfg.adminBot || []).map(String).includes(sid);
}

async function getName(api, uid) {
  try {
    const info = await new Promise((res, rej) => api.getUserInfo(uid, (e, d) => e ? rej(e) : res(d)));
    return info?.[uid]?.name || String(uid);
  } catch (_) { return String(uid); }
}

module.exports = {
  config: {
    name: "admin",
    aliases: ["ادمن", "أدمن", "admins", "إدارة"],
    version: "1.0",
    author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 3,
    role: 2,
    category: "management",
    description: "إدارة الأدمن مباشرة من الشات",
    guide: {
      en: "{pn} add [ID] — إضافة أدمن\n{pn} remove [ID] — حذف أدمن\n{pn} list — قائمة الأدمن"
    }
  },

  onStart: async function({ api, event, args, message }) {
    const senderID = String(event.senderID);
    const sub      = (args[0] || "").toLowerCase();
    const cfg      = loadCfg();

    // ── قائمة الأدمن (/ادمن list) ─────────────────────────────────────
    if (!sub || sub === "list" || sub === "قائمة") {
      const owner   = cfg.ownerID ? [String(cfg.ownerID)] : [];
      const supers  = (cfg.superAdminBot || []).map(String).filter(id => !owner.includes(id));
      const admins  = (cfg.adminBot || []).map(String).filter(id => !owner.includes(id) && !supers.includes(id));

      let body = "╔══════════════════════════════════╗\n";
      body    += "║    👑 قائمة الأدمن — 𝐀𝐢𝐳𝐞𝐧       ║\n";
      body    += "╠══════════════════════════════════╣\n";

      if (owner.length) {
        body += "║  🔑 المالك:\n";
        for (const id of owner) {
          const name = await getName(api, id);
          body += "║    • " + name + " (" + id + ")\n";
        }
      }
      if (supers.length) {
        body += "║  ⭐ سوبر أدمن:\n";
        for (const id of supers) {
          const name = await getName(api, id);
          body += "║    • " + name + " (" + id + ")\n";
        }
      }
      if (admins.length) {
        body += "║  🛡 أدمن:\n";
        for (const id of admins) {
          const name = await getName(api, id);
          body += "║    • " + name + " (" + id + ")\n";
        }
      }
      if (!owner.length && !supers.length && !admins.length) {
        body += "║  لا يوجد أدمن مسجّل\n";
      }

      body += "╠══════════════════════════════════╣\n";
      body += "║  الإجمالي: " + (owner.length + supers.length + admins.length) + " شخص\n";
      body += "╚══════════════════════════════════╝";
      return message.reply(body);
    }

    // ── إضافة أدمن (/ادمن add [ID]) ──────────────────────────────────
    if (sub === "add" || sub === "إضافة" || sub === "اضافة") {
      if (!isOwner(senderID)) return message.reply("⛔ فقط المالك يستطيع إضافة أدمن.");

      let targetID = args[1] ? String(args[1]).trim() : null;

      // لو ردّ على رسالة شخص
      if (!targetID && event.messageReply?.senderID)
        targetID = String(event.messageReply.senderID);

      if (!targetID || !/^\d+$/.test(targetID))
        return message.reply("❌ اكتب ID الشخص بعد الأمر.\nمثال: /ادمن add 100012345678\nأو رد على رسالة شخص ثم اكتب /ادمن add");

      if (isAdmin(targetID))
        return message.reply("ℹ️ هذا الشخص أدمن بالفعل.\nID: " + targetID);

      cfg.adminBot = [...new Set([...(cfg.adminBot || []), targetID])];
      saveCfg(cfg);

      const name = await getName(api, targetID);
      return message.reply(
        "✅ تمت إضافة أدمن جديد!\n" +
        "━━━━━━━━━━━━━━━━\n" +
        "👤 الاسم : " + name + "\n" +
        "🆔 ID    : " + targetID + "\n" +
        "🛡 الدور  : أدمن\n\n" +
        "يمكنه الآن استخدام جميع الأوامر."
      );
    }

    // ── حذف أدمن (/ادمن remove [ID]) ────────────────────────────────
    if (sub === "remove" || sub === "del" || sub === "حذف" || sub === "حدف") {
      if (!isOwner(senderID)) return message.reply("⛔ فقط المالك يستطيع حذف الأدمن.");

      let targetID = args[1] ? String(args[1]).trim() : null;
      if (!targetID && event.messageReply?.senderID)
        targetID = String(event.messageReply.senderID);

      if (!targetID || !/^\d+$/.test(targetID))
        return message.reply("❌ اكتب ID الشخص.\nمثال: /ادمن remove 100012345678");

      if (String(targetID) === String(cfg.ownerID))
        return message.reply("⛔ لا يمكن حذف المالك.");

      const before = (cfg.adminBot || []).map(String);
      if (!before.includes(targetID))
        return message.reply("ℹ️ هذا الشخص ليس في قائمة الأدمن.\nID: " + targetID);

      cfg.adminBot    = before.filter(id => id !== targetID);
      cfg.superAdminBot = (cfg.superAdminBot || []).map(String).filter(id => id !== targetID);
      saveCfg(cfg);

      const name = await getName(api, targetID);
      return message.reply(
        "✅ تم حذف الأدمن.\n" +
        "━━━━━━━━━━━━━━━━\n" +
        "👤 الاسم : " + name + "\n" +
        "🆔 ID    : " + targetID + "\n\n" +
        "لم يعد يستطيع استخدام الأوامر."
      );
    }

    // ── ترقية لسوبر أدمن ─────────────────────────────────────────────
    if (sub === "super" || sub === "ترقية") {
      if (!isOwner(senderID)) return message.reply("⛔ فقط المالك يستطيع إضافة سوبر أدمن.");

      let targetID = args[1] ? String(args[1]).trim() : null;
      if (!targetID && event.messageReply?.senderID)
        targetID = String(event.messageReply.senderID);

      if (!targetID || !/^\d+$/.test(targetID))
        return message.reply("❌ اكتب ID.\nمثال: /ادمن super 100012345678");

      cfg.adminBot      = [...new Set([...(cfg.adminBot || []),      targetID])];
      cfg.superAdminBot = [...new Set([...(cfg.superAdminBot || []), targetID])];
      saveCfg(cfg);

      const name = await getName(api, targetID);
      return message.reply(
        "⭐ تمت الترقية لسوبر أدمن!\n" +
        "👤 " + name + " (" + targetID + ")"
      );
    }

    // Default
    message.reply(
      "📌 أوامر /ادمن:\n" +
      "━━━━━━━━━━━━━━━━\n" +
      "/ادمن list         — قائمة الأدمن\n" +
      "/ادمن add [ID]     — إضافة أدمن\n" +
      "/ادمن remove [ID]  — حذف أدمن\n" +
      "/ادمن super [ID]   — ترقية لسوبر أدمن\n\n" +
      "💡 يمكن الرد على رسالة شخص بدل كتابة الـ ID"
    );
  }
};
