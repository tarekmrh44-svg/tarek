module.exports = {
    config: {
      name: "وضع",
      aliases: ["mode", "status"],
      description: "عرض الوضع الحالي للبوت مع إحصائيات سريعة",
      usage: "وضع",
      ownerOnly: true,
    },
    async run({ api, event, commands }) {
      const ownerOnly = global.ownerOnlyMode !== false;
      const upSec     = process.uptime();
      const h         = Math.floor(upSec / 3600);
      const m         = Math.floor((upSec % 3600) / 60);
      const s         = Math.floor(upSec % 60);
      const upStr     = h > 0 ? `${h}س ${m}د` : m > 0 ? `${m}د ${s}ث` : `${s}ث`;
      const memMB     = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
      const cmdCount  = commands ? commands.size : 0;

      const msg = [
        `🤖 Lucifer Bot — الوضع الحالي`,
        `━━━━━━━━━━━━━━━━━━━━`,
        `${ownerOnly ? "🔒 خاص" : "🔓 عام"} — ${ownerOnly ? "المالك فقط" : "الجميع يستجيب"}`,
        ``,
        `⏱ وقت التشغيل: ${upStr}`,
        `💾 الذاكرة: ${memMB} MB`,
        `⚡ الأوامر: ${cmdCount}`,
        ``,
        ownerOnly
          ? "💡 اكتب /عام لفتح البوت للجميع"
          : "💡 اكتب /خاص لإغلاق البوت للمالك فقط",
      ].join("\n");

      api.sendMessage(msg, event.threadID, event.messageID);
    },
  };
  