"use strict";

if (!global._protectedNames) global._protectedNames = new Map();

module.exports = {
  config: {
    name: "حماية",
    aliases: ["protect", "namelock", "قفل_اسم"],
    description: "حماية اسم الغروب — يُعيده تلقائياً بصمت عند التغيير",
    usage: "حماية تفعيل | حماية ايقاف | حماية حالة",
    adminOnly: true,
    category: "admin",
  },

  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    const sub = (args[0] || "").trim();

    // ── حالة ───────────────────────────────────────────────────────
    if (!sub || sub === "حالة" || sub === "status") {
      if (global._protectedNames.has(threadID)) {
        const name = global._protectedNames.get(threadID);
        return api.sendMessage(
          `🛡️ الحماية: مفعّلة ✅\n` +
          `━━━━━━━━━━\n` +
          `الاسم المحمي: "${name}"\n` +
          `أي تغيير للاسم سيُعاد فوراً بصمت 🔕`,
          threadID
        );
      }
      return api.sendMessage("🔓 الحماية: غير مفعّلة\nاستخدم /حماية تفعيل لتفعيلها.", threadID);
    }

    // ── تفعيل ──────────────────────────────────────────────────────
    if (sub === "تفعيل" || sub === "on") {
      // جلب اسم الغروب الحالي
      let currentName = "";
      try {
        const info = await new Promise((res, rej) =>
          api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
        );
        currentName = info.threadName || "";
      } catch (e) {
        return api.sendMessage(`❌ تعذّر جلب معلومات الغروب: ${e.message}`, threadID);
      }

      if (!currentName)
        return api.sendMessage("❌ الغروب ليس له اسم، غيّر اسمه أولاً ثم فعّل الحماية.", threadID);

      global._protectedNames.set(threadID, currentName);
      return api.sendMessage(
        `🛡️ تم تفعيل حماية الاسم ✅\n` +
        `━━━━━━━━━━\n` +
        `الاسم المحمي: "${currentName}"\n` +
        `🔕 البوت سيُعيد الاسم بصمت بدون أي رسالة`,
        threadID
      );
    }

    // ── إيقاف ──────────────────────────────────────────────────────
    if (sub === "ايقاف" || sub === "off") {
      if (!global._protectedNames.has(threadID))
        return api.sendMessage("🔓 الحماية غير مفعّلة أصلاً.", threadID);

      global._protectedNames.delete(threadID);
      return api.sendMessage("🔓 تم إيقاف حماية الاسم.", threadID);
    }

    // ── تغيير الاسم المحمي ─────────────────────────────────────────
    const customName = args.join(" ").trim();
    if (customName) {
      global._protectedNames.set(threadID, customName);
      // غيّر الاسم الفعلي أيضاً
      try {
        await new Promise((res, rej) =>
          api.setTitle(customName, threadID, e => e ? rej(e) : res())
        );
      } catch {}
      return api.sendMessage(
        `🛡️ تم تفعيل الحماية على الاسم الجديد ✅\n` +
        `الاسم: "${customName}"`,
        threadID
      );
    }

    api.sendMessage(
      "📋 أوامر حماية الاسم:\n" +
      "━━━━━━━━━━\n" +
      "• /حماية تفعيل — يحمي الاسم الحالي\n" +
      "• /حماية [اسم جديد] — يضع اسماً محدداً ويحميه\n" +
      "• /حماية ايقاف — يوقف الحماية\n" +
      "• /حماية حالة — يعرض حالة الحماية",
      threadID
    );
  },
};
