const axios = require("axios");

module.exports = {
  config: {
    name: "weather",
    aliases: ["w", "طقس"],
    description: "معرفة حالة الطقس لمدينة ما",
    usage: "weather <المدينة>",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    if (!args.length) return api.sendMessage("❌ الاستخدام: /weather <المدينة>", threadID);

    const city = args.join(" ");
    try {
      const res = await axios.get(
        `https://wttr.in/${encodeURIComponent(city)}?format=j1`
      );
      const data = res.data;
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      const areaName = area.areaName[0].value;
      const country = area.country[0].value;

      const desc = current.weatherDesc[0].value;
      const temp = current.temp_C;
      const feels = current.FeelsLikeC;
      const humidity = current.humidity;
      const wind = current.windspeedKmph;
      const uv = current.uvIndex;

      api.sendMessage(
        `🌤️ الطقس في ${areaName}، ${country}\n` +
          `━━━━━━━━━━━━━━━━\n` +
          `🌡️ الحرارة: ${temp}°م (تبدو كـ ${feels}°م)\n` +
          `☁️ الحالة: ${desc}\n` +
          `💧 الرطوبة: ${humidity}%\n` +
          `🌬️ الرياح: ${wind} كم/س\n` +
          `☀️ مؤشر UV: ${uv}`,
        threadID
      );
    } catch (e) {
      api.sendMessage(`❌ تعذّر الحصول على طقس "${city}"`, threadID);
    }
  },
};
