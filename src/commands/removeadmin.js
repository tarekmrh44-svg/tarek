"use strict";
/**
 * /removeadmin — إزالة أدمن
 * Copyright © 2025 DJAMEL
 */
const fs   = require("fs-extra");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "../../config.json");

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
  catch (_) { return null; }
}

function saveConfig(cfg) {
  try {
    global._selfWriteConfig = true;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
    setTimeout(() => { global._selfWriteConfig = false; }, 3000);
    if (global.GoatBot) global.GoatBot.config = cfg;
    global.config = cfg;
    return true;
  } catch (_) { return false; }
}

function isOwner(uid) {
  const cfg = global.GoatBot?.config || global.config || {};
  return (cfg.superAdminBot || []).includes(String(uid)) ||
         String(uid) === String(cfg.ownerID);
}

module.exports = {
  config: {
    name: "removeadmin",
    aliases: ["حذف_ادمن", "ادمن-"],
    version: "1.0",
    author: "DJAMEL",
    role: 3,
    category: "admin",
    description: "إزالة أدمن من القائمة",
    guide: { en: "{pn} [UID] — إزالة أدمن\n{pn} (رد على رسالة) — إزالة صاحب الرسالة" },
  },

  onStart: async function({ args, message, event, api }) {
    const callerID = String(event.senderID);
    if (!isOwner(callerID))
      return message.reply("❌ هذا الأمر للمالك فقط.");

    let targetID;
    if (event.messageReply?.senderID) {
      targetID = String(event.messageReply.senderID);
    } else if (args[0] && /^\d{10,}$/.test(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("📌 الاستخدام:\n/removeadmin [UID]\nأو رد على رسالة الشخص");
    }

    const cfg = loadConfig();
    if (!cfg) return message.reply("❌ فشل تحميل الإعدادات.");

    const inAdmin  = (cfg.adminBot      || []).includes(targetID);
    const inSuper  = (cfg.superAdminBot || []).includes(targetID);

    if (!inAdmin && !inSuper)
      return message.reply(`⚠️ ${targetID} ليس في قائمة الأدمن.`);

    // تأكيد أنه مش OwnerID الأساسي
    if (String(targetID) === String(cfg.ownerID))
      return message.reply("❌ لا يمكن إزالة المالك الأساسي.");

    cfg.adminBot      = (cfg.adminBot      || []).filter(id => id !== targetID);
    cfg.superAdminBot = (cfg.superAdminBot || []).filter(id => id !== targetID);

    if (!saveConfig(cfg))
      return message.reply("❌ فشل حفظ الإعدادات.");

    let name = targetID;
    try {
      const info = await new Promise((res, rej) =>
        api.getUserInfo(targetID, (e, d) => e ? rej(e) : res(d)));
      name = info?.[targetID]?.name || targetID;
    } catch (_) {}

    message.reply(`✅ تم إزالة ${name} (${targetID}) من قائمة الأدمن.\nالتغيير نشط فوراً.`);
  }
};
