/**
 * /تنظيف — مسح جميع الكنيات من الغروب مرة واحدة
 * Copyright © 2025 𝐀𝐢𝐳𝐞𝐧
 */
"use strict";

module.exports = {
  config: {
    name: "cleannick",
    aliases: [
      "تنظيف", "مسح_كنيات", "مسح_اسماء", "تنظيف_كنيات",
      "حذف_كنيات", "ريسيت_كنيات", "cleannicks", "resetnicks",
      "resetnick", "clearnick", "clearnick", "clearnicks"
    ],
    version: "1.0",
    author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 10,
    role: 2,
    category: "management",
    description: "مسح جميع الكنيات في الغروب دفعة واحدة",
    guide: {
      en: "{pn} — يمسح كل الكنيات\n{pn} confirm — تأكيد بدون رسالة سؤال"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const threadID = event.threadID;
    const sub      = (args[0] || "").trim().toLowerCase();

    // ── 1. جلب معلومات الغروب ────────────────────────────────────────
    let threadInfo;
    try {
      threadInfo = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );
    } catch (err) {
      return message.reply("❌ فشل في جلب معلومات الغروب.\n" + err.message);
    }

    const participants = threadInfo.userInfo || [];
    const total        = participants.length;

    if (total === 0)
      return message.reply("⚠️ لا يوجد أعضاء في هذا الغروب.");

    // ── 2. إذا لم يكن confirm — اعرض تأكيد ─────────────────────────
    if (sub !== "confirm") {
      return message.reply(
        "╔═══════════════════════════════╗\n" +
        "║   🧹 تنظيف الكنيات — 𝐀𝐢𝐳𝐞𝐧   ║\n" +
        "╠═══════════════════════════════╣\n" +
        "║  سيتم مسح كنيات " + total + " عضو\n" +
        "║  في هذا الغروب نهائياً.\n" +
        "╠═══════════════════════════════╣\n" +
        "║  للتأكيد اكتب:\n" +
        "║  /تنظيف confirm\n" +
        "╚═══════════════════════════════╝"
      );
    }

    // ── 3. بدء التنظيف ───────────────────────────────────────────────
    const statusMsg = await message.reply(
      "⏳ جاري مسح الكنيات...\n" +
      "0 / " + total + " تم"
    );

    let done  = 0;
    let failed = 0;
    const errors = [];

    for (const user of participants) {
      const uid = user.id;
      try {
        await new Promise((res, rej) =>
          api.changeNickname("", threadID, uid,
            (err) => err ? rej(err) : res()
          )
        );
        done++;
      } catch (err) {
        failed++;
        errors.push(uid);
      }

      // تحديث الرسالة كل 5 عمليات
      if ((done + failed) % 5 === 0 || (done + failed) === total) {
        try {
          api.editMessage(
            "⏳ جاري مسح الكنيات...\n" +
            (done + failed) + " / " + total + " تم",
            statusMsg.messageID
          );
        } catch (_) {}
      }

      // تأخير صغير تفادياً للـ rate limit
      await new Promise(r => setTimeout(r, 400));
    }

    // ── 4. النتيجة النهائية ──────────────────────────────────────────
    let result =
      "╔═══════════════════════════════╗\n" +
      "║   ✅ اكتمل التنظيف — 𝐀𝐢𝐳𝐞𝐧   ║\n" +
      "╠═══════════════════════════════╣\n" +
      "║  ✔ تم مسح : " + done + " كنية\n";

    if (failed > 0) {
      result +=
        "║  ✖ فشل    : " + failed + " (صلاحيات؟)\n";
    }

    result +=
      "╠═══════════════════════════════╣\n" +
      "║  🧹 الغروب نظيف الآن!\n" +
      "╚═══════════════════════════════╝";

    message.reply(result);
  }
};
