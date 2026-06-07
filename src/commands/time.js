const moment = require("moment-timezone");

const TIMEZONES = {
  algeria: "Africa/Algiers",
  algiers: "Africa/Algiers",
  dz: "Africa/Algiers",
  الجزائر: "Africa/Algiers",
  egypt: "Africa/Cairo",
  cairo: "Africa/Cairo",
  مصر: "Africa/Cairo",
  القاهرة: "Africa/Cairo",
  london: "Europe/London",
  لندن: "Europe/London",
  paris: "Europe/Paris",
  باريس: "Europe/Paris",
  dubai: "Asia/Dubai",
  دبي: "Asia/Dubai",
  riyadh: "Asia/Riyadh",
  الرياض: "Asia/Riyadh",
  newyork: "America/New_York",
  "new york": "America/New_York",
  tokyo: "Asia/Tokyo",
  طوكيو: "Asia/Tokyo",
  beijing: "Asia/Shanghai",
  moscow: "Europe/Moscow",
  موسكو: "Europe/Moscow",
  sydney: "Australia/Sydney",
};

module.exports = {
  config: {
    name: "time",
    aliases: ["clock", "وقت"],
    description: "معرفة الوقت الحالي لمدينة أو منطقة زمنية",
    usage: "time [المدينة]",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    const defaultTZ = (global.config && global.config.timezone) || "Africa/Algiers";
    const query = args.join(" ").toLowerCase() || defaultTZ;
    const tz = TIMEZONES[query] || query;

    try {
      const now = moment().tz(tz);
      api.sendMessage(
        `🕐 الوقت في ${tz.replace("_", " ")}\n` +
          `📅 ${now.format("dddd، D MMMM YYYY")}\n` +
          `⏰ ${now.format("HH:mm:ss")}`,
        threadID
      );
    } catch {
      api.sendMessage(
        `❌ منطقة زمنية غير معروفة "${tz}".\nجرب: egypt، london، dubai، tokyo، newyork`,
        threadID
      );
    }
  },
};
