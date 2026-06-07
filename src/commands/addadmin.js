"use strict";
/**
 * /addadmin — إضافة أدمن جديد
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
    // تحديث global فوراً
    if (global.GoatBot) global.GoatBot.config = cfg;
    global.config = cfg;
    return true;
  } catch (_) { return false; }
}

function isOwner(uid) {
  const cfg = global.GoatBot?.config || global.config || {};
  const sup  = cfg.superAdminBot || [];
  return sup.includes(String(uid)) || String(uid) === String(cfg.ownerID);
}

module.exports = {
  config: {
    name: "addadmin",
    aliases: ["اضافة_ادمن", "ادمن+"],
    version: "1.0",
    author: "DJAMEL",
    role: 3,
    category: "admin",
    description: "إضافة أدمن جديد عن طريق الرد أو الـ UID",
    guide: { en: "{pn} [UID] — إضافة أدمن\n{pn} (رد على رسالة) — إضافة صاحب الرسالة" },
  },

  onStart: async function({ args, message, event, api }) {
    const callerID = String(event.senderID);
    if (!isOwner(callerID))
      return message.reply("❌ هذا الأمر للمالك فقط.");

    // الحصول على الـ UID
    let targetID;
    if (event.messageReply?.senderID) {
      targetID = String(event.messageReply.senderID);
    } else if (args[0] && /^\d{10,}$/.test(args[0])) {
      targetID = args[0];
    } else {
      return message.reply("📌 الاستخدام:\n/addadmin [UID]\nأو رد على رسالة الشخص");
    }

    const cfg = loadConfig();
    if (!cfg) return message.reply("❌ فشل تحميل الإعدادات.");

    if (!Array.isArray(cfg.adminBot))      cfg.adminBot      = [];
    if (!Array.isArray(cfg.superAdminBot)) cfg.superAdminBot = [];

    if (cfg.adminBot.includes(targetID) && cfg.superAdminBot.includes(targetID))
      return message.reply(`⚠️ ${targetID} موجود بالفعل في قائمة الأدمن.`);

    if (!cfg.adminBot.includes(targetID))      cfg.adminBot.push(targetID);
    if (!cfg.superAdminBot.includes(targetID)) cfg.superAdminBot.push(targetID);

    if (!saveConfig(cfg))
      return message.reply("❌ فشل حفظ الإعدادات.");

    // جلب اسم المستخدم
    let name = targetID;
    try {
      const info = await new Promise((res, rej) =>
        api.getUserInfo(targetID, (e, d) => e ? rej(e) : res(d)));
      name = info?.[targetID]?.name || targetID;
    } catch (_) {}

    message.reply(`✅ تم إضافة ${name} (${targetID}) كـ أدمن سوبر ✔\nالصلاحيات نشطة فوراً بدون إعادة تشغيل.`);
  }
};
