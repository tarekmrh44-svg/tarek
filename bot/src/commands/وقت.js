"use strict";

const moment = require("moment-timezone");

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"
];

module.exports = {
  config: {
    name: "وقت",
    aliases: ["time", "تاريخ", "date", "الوقت"],
    description: "عرض الوقت والتاريخ الحالي",
    usage: "/وقت  |  /وقت [منطقة زمنية]",
    adminOnly: false,
    ownerOnly: false,
  },

  run({ api, event, args, threadID, messageID }) {
    const tz  = args[0] || global.config?.timezone || "Africa/Algiers";
    let   now;
    try {
      now = moment().tz(tz);
    } catch (_) {
      now = moment().tz("Africa/Algiers");
    }

    const dayAr   = DAYS_AR[now.day()];
    const monthAr = MONTHS_AR[now.month()];

    api.sendMessage(
`🕐 الوقت والتاريخ
━━━━━━━━━━━━━━━
🗓  ${dayAr}، ${now.date()} ${monthAr} ${now.year()}
⏰  ${now.format("HH:mm:ss")}
🌍  التوقيت: ${tz}`,
      threadID, null, messageID
    );
  },
};
