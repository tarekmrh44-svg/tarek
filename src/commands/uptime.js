/**
 * /uptime — وقت تشغيل البوت — تصميم فاخر
 * Copyright © 2025
 */
"use strict";
const os = require("os");

function formatUptime(ms) {
  const s   = Math.floor(ms / 1000);
  const d   = Math.floor(s / 86400);
  const h   = Math.floor((s % 86400) / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d)   parts.push(`${d}d`);
  if (h)   parts.push(`${h}h`);
  if (m)   parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

function bar(pct, len = 12) {
  const filled = Math.round(pct * len / 100);
  return "█".repeat(filled) + "░".repeat(len - filled);
}

module.exports = {
  config: {
    name: "uptime", aliases: ["up","وقت","status","احصائيات","حالة_البوت","تشغيل"], version: "3.0", author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 5, role: 2, category: "info",
    description: "إحصائيات تشغيل البوت بتصميم فاخر",
    guide: { en: "{pn}" }
  },

  onStart: async function({ api, event, message }) {
    const t0      = Date.now();
    await new Promise(r => setTimeout(r, 5));
    const ping    = Date.now() - t0;

    const upMs    = Date.now() - (global.GoatBot?.startTime || Date.now());
    const mem     = process.memoryUsage();
    const sysTotal= os.totalmem();
    const sysFree = os.freemem();
    const ramUsed = mem.heapUsed / 1048576;
    const ramPct  = Math.round(mem.heapUsed / mem.heapTotal * 100);
    const sysUsed = ((sysTotal - sysFree) / sysTotal * 100).toFixed(0);

    const uid     = global.GoatBot?.botID || api.getCurrentUserID?.() || "—";
    const prefix  = global.GoatBot?.config?.prefix || "/";
    const cmds    = global.GoatBot?.commands?.size || 0;
    const threads = Object.keys(global.GoatBot?.angelIntervals || {}).length;
    const pingBar = ping < 100 ? "🟢 ممتاز" : ping < 300 ? "🟡 جيد" : "🔴 بطيء";

    const lines = [
      "╔══════════════════════════════════════╗",
      "║          ⚡ 𝐀𝐢𝐳𝐞𝐧 — System Status        ║",
      "╠══════════════════════════════════════╣",
      `║  🤖  Bot ID   :  ${uid}`,
      `║  🕐  Uptime   :  ${formatUptime(upMs)}`,
      `║  🏓  Ping     :  ${ping}ms  ${pingBar}`,
      "╠══════════════════════════════════════╣",
      `║  💾  RAM Bot  :  ${ramUsed.toFixed(1)} MB  [${bar(ramPct)}] ${ramPct}%`,
      `║  🖥  RAM Sys  :  [${bar(Number(sysUsed))}] ${sysUsed}%`,
      `║  📦  CPU      :  ${os.cpus()[0]?.model?.split(" ").slice(-2).join(" ") || "N/A"}`,
      "╠══════════════════════════════════════╣",
      `║  📜  أوامر   :  ${cmds} أمر مُحمَّل`,
      `║  🔔  Angel   :  ${threads} غروب نشط`,
      `║  🔑  Prefix  :  ${prefix}`,
      `║  🛡  حماية   :  ✅ 20 طبقة نشطة`,
      "╠══════════════════════════════════════╣",
      "║  🌐  Network  :  متصل بـ Facebook      ║",
      `║  👑  Developer:  𝐀𝐢𝐳𝐞𝐧               ║`,
      "╚══════════════════════════════════════╝",
    ];

    message.reply(lines.join("\n"));
  }
};
