"use strict";

  // خزّن الـ intervals بالـ threadID حتى يمكن إيقافهم
  const activeThreads = new Map();

  const MESSAGE = `⇭ 【 𝑎𝑛𝑎 𝑙 𝑎𝑠2𝑙 𝑓𝑖 𝑘𝑜𝑙 3𝑎𝑠𝑒𝑟 】 ⇭
            𝑛𝑦2𝑘 𝑐ℎ𝑎𝑟𝑓2𝑘 𝑐ℎ5𝑠𝑦𝑎  ✊🏼
                
  ‌َ𓇳   ➤ 𝑁𝐴𝐻 𝐼'𝐷 𝑊𝐼𝑁 ┋𓁾┋ 🤞🏻
  ╰➤ ⌯『 𝘽𝙊𝙏 𝙏𝘼𝙍𝙀𝙆 』⁽🌫₎

  ➥𝙏𝙊𝘽 𝘽𝘼𝙇𝙇𝙊𝙉𝘿𝙊𝙍𝙄𝙉𝙂 𝙏𝘼𝙍𝙀𝙆 𝙎𝘼𝙈𝘼 🔵  ➢【𝕶𝖎𝖓𝖌 ዐቻ 𝑆ℎ𝑎𝑑𝑜𝑠 shiga 𝙆𝙪𝙨𝙝𝙢𝙖𝙧】


  ֙𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃𝕋    ⃢🔵𒅃𒅒𒅃𝐀   ⃢🟦𒅃𒅒 𒅃𒅒𒅃ℝ   ⃢🔵𒅃𒅒𒅃𝐄   ⃢🟦𒅃𒅒𒅃 𝕂   ⃢🔵 𒅃𒅒𒅃

   ☢️ ↜
  َ    𒁈    ༈ 𝑇𝐻𝐸 𝗞𝗜𝗡𝗚 𝑜𝑓 𝜔𝚨𝛶  َ   𒁈    ༈       


  𝑇𝐸𝐶𝐻𝑁𝐼𝑄𝑈𝐸 ♢✘ ┋🫸🪃🫷┋𝔗𝔥𝔢 𝔣𝔦𝔯𝔢𝔰︱𝑇ℎ𝑒 𝑙𝑒𝑔𝑒𝑛𝑑𝑎𝑟𝑦『🔵』


  [🔇]  𝙏𝘼𝙍𝙀𝙆 𝙁𝘼𝘾𝙆𝙄𝙉𝙂 𝑌𝑂𝑈𝑅 ✗ 𝑀𝑂𝑇𝐻𝐸𝑅


           ❀                🏴‍☠️                ❀`;

  module.exports = {
    config: {
      name: "لوسيفر",
      aliases: ["lucifer"],
      description: "يرسل رسالة لوسيفر كل 40 ثانية — اكتب /لوسيفر مرة ثانية لإيقافه",
      usage: "لوسيفر",
      adminOnly: false,
    },
    async run({ api, event }) {
      const { threadID } = event;

      // إذا كان يعمل بالفعل — أوقفه
      if (activeThreads.has(threadID)) {
        clearInterval(activeThreads.get(threadID));
        activeThreads.delete(threadID);
        return api.sendMessage("🔴 لوسيفر توقف.", threadID);
      }

      // أرسل الرسالة أول مرة فوراً
      api.sendMessage(MESSAGE, threadID);

      // ثم كل 40 ثانية
      const iv = setInterval(() => {
        api.sendMessage(MESSAGE, threadID);
      }, 40 * 1000);

      activeThreads.set(threadID, iv);
      api.sendMessage("🟢 لوسيفر يشتغل — كل 40 ثانية\nاكتب /لوسيفر مرة ثانية لإيقافه.", threadID);
    },
  };
  