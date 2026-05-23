"use strict";

  if (!global._protectedNames) global._protectedNames = new Map();

  module.exports = {
    config: {
      name: "حماية",
      aliases: ["protect", "namelock"],
      description: "حماية اسم الغروب — يُعيده تلقائياً عند التغيير",
      usage: "حماية [اسم] | حماية تفعيل | حماية ايقاف | حماية حالة",
      ownerOnly: true,
    },

    async run({ api, event, args, threadID }) {
      const sub  = (args[0] || "").trim();
      const map  = global._protectedNames;

      // ── حالة ──────────────────────────────────────────────────────────────
      if (!sub || sub === "حالة" || sub === "status") {
        if (map.has(threadID)) {
          return api.sendMessage(
            `🛡️ الحماية: مفعّلة ✅\n` +
            `━━━━━━━━━━━━━━━━━━━` + "\n" +
            `الاسم المحمي: "${map.get(threadID)}"\n` +
            `أي تغيير للاسم سيُعاد فوراً بصمت 🔕`,
            threadID, event.messageID
          );
        }
        return api.sendMessage(
          "🔓 الحماية غير مفعّلة\n" +
          "━━━━━━━━━━━━━━━━━━━\n" +
          "• /حماية تفعيل — يحمي الاسم الحالي\n" +
          "• /حماية [اسم] — يضع اسماً ويحميه",
          threadID, event.messageID
        );
      }

      // ── إيقاف ─────────────────────────────────────────────────────────────
      if (sub === "ايقاف" || sub === "off" || sub === "stop") {
        map.delete(threadID);
        return api.sendMessage("🔓 تم إيقاف حماية الاسم.", threadID, event.messageID);
      }

      // ── تفعيل (يحمي الاسم الحالي) ─────────────────────────────────────────
      if (sub === "تفعيل" || sub === "on") {
        let currentName = "";
        try {
          const info = await new Promise((res, rej) =>
            api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
          );
          currentName = info?.threadName || "";
        } catch (e) {
          return api.sendMessage(`❌ فشل جلب معلومات الغروب: ${e.message}`, threadID, event.messageID);
        }

        if (!currentName)
          return api.sendMessage(
            "❌ الغروب ليس له اسم بعد.\nغيّر الاسم أولاً ثم استخدم /حماية تفعيل",
            threadID, event.messageID
          );

        map.set(threadID, currentName);
        return api.sendMessage(
          `🛡️ تم تفعيل الحماية ✅\n` +
          `━━━━━━━━━━━━━━━━━━━` + "\n" +
          `الاسم المحمي: "${currentName}"\n` +
          `🔕 البوت سيُعيد الاسم بصمت عند أي تغيير`,
          threadID, event.messageID
        );
      }

      // ── اسم مخصص: /حماية [الاسم هنا] ────────────────────────────────────
      const customName = args.join(" ").trim();
      if (!customName)
        return api.sendMessage("❌ أدخل اسماً. مثال: /حماية اسم الغروب", threadID, event.messageID);

      // تغيير اسم الغروب
      try {
        await new Promise((res, rej) =>
          api.setTitle(customName, threadID, e => e ? rej(e) : res())
        );
      } catch (e) {
        // إذا فشل setTitle (صلاحيات) نحمي الاسم فقط بدون تغييره
        map.set(threadID, customName);
        return api.sendMessage(
          `🛡️ تم حفظ الاسم للحماية ✅\n` +
          `الاسم: "${customName}"\n` +
          `⚠️ ملاحظة: تعذّر تغيير اسم الغروب (ربما البوت ليس أدمن)`,
          threadID, event.messageID
        );
      }

      map.set(threadID, customName);
      return api.sendMessage(
        `🛡️ تم تفعيل الحماية ✅\n` +
        `━━━━━━━━━━━━━━━━━━━` + "\n" +
        `الاسم الجديد: "${customName}"\n` +
        `🔕 سيُعاد تلقائياً عند أي تغيير`,
        threadID, event.messageID
      );
    },
  };
  