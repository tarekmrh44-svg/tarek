"use strict";

// ألوان جاهزة
const COLORS = {
  "أحمر":    "#e84d3d",
  "أزرق":    "#0084ff",
  "أخضر":    "#44bec7",
  "أصفر":    "#ffc300",
  "بنفسجي":  "#7646ff",
  "وردي":    "#ff5ca1",
  "برتقالي": "#fa3c4c",
  "رمادي":   "#8e8e8e",
  "أبيض":    "#ffffff",
  "افتراضي": null,
};

module.exports = {
  config: {
    name: "لون",
    aliases: ["color", "colour", "اللون"],
    description: "تغيير لون المحادثة",
    usage: "/لون [أحمر|أزرق|أخضر|أصفر|بنفسجي|وردي|برتقالي] أو كود HEX",
    adminOnly: true,
    ownerOnly: false,
  },

  async run({ api, event, args, threadID, messageID }) {
    if (!args[0]) {
      const list = Object.keys(COLORS).map(k => `• ${k}`).join("\n");
      return api.sendMessage(`🎨 اختر لوناً:\n${list}\nأو أدخل كود HEX مثل: /لون #ff0000`, threadID, null, messageID);
    }

    const input = args.join(" ").trim();
    let color = COLORS[input];
    if (color === undefined) {
      // تحقق من HEX
      if (/^#[0-9a-fA-F]{6}$/.test(input)) {
        color = input;
      } else {
        return api.sendMessage("❌ لون غير معروف.\nاكتب /لون لرؤية الألوان المتاحة.", threadID, null, messageID);
      }
    }

    try {
      await new Promise((res, rej) =>
        api.changeThreadColor(color, threadID, e => e ? rej(e) : res())
      );
      api.sendMessage(
        color
          ? `✅ تم تغيير اللون إلى: ${input} ${color}`
          : "✅ تم إعادة اللون الافتراضي.",
        threadID, null, messageID
      );
    } catch (e) {
      api.sendMessage(`❌ فشل تغيير اللون: ${e.message || e}`, threadID, null, messageID);
    }
  },
};
