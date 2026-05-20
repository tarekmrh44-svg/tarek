module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "وقت_التشغيل"],
    description: "عرض مدة تشغيل البوت",
    usage: "uptime",
    adminOnly: false,
  },
  async run({ api, event, threadID }) {
    const totalSeconds = Math.floor(process.uptime());
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0) parts.push(`${minutes} دقيقة`);
    parts.push(`${seconds} ثانية`);

    api.sendMessage(`⏱️ البوت يعمل منذ: ${parts.join(" و ")}`, threadID);
  },
};
