"use strict";

const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "تقرير",
    aliases: ["group", "غروب", "info_group", "معلومات_غروب"],
    description: "معلومات المجموعة الحالية",
    usage: "/تقرير",
    adminOnly: false,
    ownerOnly: false,
  },

  async run({ api, event, threadID, messageID }) {
    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d || {}))
      );

      const tz      = global.config?.timezone || "Africa/Algiers";
      const name    = info.threadName || "بدون اسم";
      const members = info.participantIDs?.length || 0;
      const admins  = (info.adminIDs || []).length;
      const emoji   = info.emoji || "💬";
      const color   = info.color || "افتراضي";
      const created = info.timestamp
        ? moment(info.timestamp).tz(tz).format("YYYY-MM-DD")
        : "—";

      api.sendMessage(
`📊 معلومات المجموعة
━━━━━━━━━━━━━━━━━━
📛 الاسم   : ${name}
👥 الأعضاء : ${members}
🛡️  الأدمنز  : ${admins}
${emoji} الإيموجي: ${emoji}
🎨 اللون   : ${color}
🆔 Thread  : ${threadID}
📅 التاريخ : ${created}`,
        threadID, null, messageID
      );
    } catch (e) {
      api.sendMessage(`❌ فشل جلب معلومات المجموعة: ${e.message}`, threadID, null, messageID);
    }
  },
};
