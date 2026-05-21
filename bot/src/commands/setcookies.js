const fs = require("fs-extra");
const path = require("path");

const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");

module.exports = {
  config: {
    name: "setcookies",
    aliases: ["setcookie", "updatecookies", "cookies"],
    description: "تحديث كوكيز البوت مباشرة من المحادثة — للمالك فقط",
    usage: "/setcookies [JSON أو Netscape أو token]",
    adminOnly: false,
    ownerOnly: true,
  },

  async run({ api, event, args, threadID, messageID }) {
    // ─── 1. جمع النص الكامل من الرسالة (بعد اسم الأمر) ─────────────────────
    const body = (event.body || "").trim();
    const prefixLen = (global.config?.prefix || "/").length;
    // قطع اسم الأمر من أول الرسالة
    const afterCmd = body.slice(prefixLen).replace(/^setcookies?|^updatecookies?|^cookies/i, "").trim();

    // ─── 2. دعم الإرسال كمرفق نصي (reply على رسالة تحتوي على الكوكيز) ────────
    let rawInput = afterCmd;

    if (!rawInput && event.type === "message_reply") {
      rawInput = (event.messageReply?.body || "").trim();
    }

    if (!rawInput) {
      return api.sendMessage(
        "📋 **طريقة الاستخدام:**\n\n" +
        "1️⃣ أرسل الكوكيز بعد الأمر مباشرة:\n" +
        "   /setcookies [{...}]\n\n" +
        "2️⃣ أو أرسل الكوكيز في رسالة ثم رُد عليها بـ /setcookies\n\n" +
        "✅ الصيغ المقبولة: JSON / Netscape / token",
        threadID,
        null,
        messageID
      );
    }

    // ─── 3. تحقق بسيط من وجود c_user أو xs ──────────────────────────────────
    const looksLikeToken = /^EAA[A-Za-z0-9]+$/.test(rawInput);
    const looksLikeJson  = rawInput.includes("c_user") || rawInput.includes("xs") ||
                           rawInput.includes("[{") || rawInput.startsWith("[");
    const looksLikeNetscape = rawInput.includes("\t");

    if (!looksLikeToken && !looksLikeJson && !looksLikeNetscape) {
      return api.sendMessage(
        "❌ لم أتعرف على صيغة الكوكيز.\n" +
        "تأكد أن الكوكيز تحتوي على c_user و xs.",
        threadID,
        null,
        messageID
      );
    }

    // ─── 4. حفظ الكوكيز في account.txt ثم استدعاء reLoginBot مباشرةً ────────
    try {
      await api.sendMessage("⏳ جارٍ حفظ الكوكيز وإعادة تسجيل الدخول…", threadID);

      // منع مراقب account.txt من إطلاق hot-swap مرة ثانية
      global._selfWrite = true;
      fs.writeFileSync(ACCOUNT_PATH, rawInput, "utf8");
      setTimeout(() => { global._selfWrite = false; }, 4000);

      // استدعاء reLoginBot المعرَّفة عالمياً في index.js
      setTimeout(async () => {
        try {
          if (typeof global.reLoginBot === "function") {
            await global.reLoginBot();
          }
        } catch (_) {}
      }, 1500);

      await api.sendMessage(
        "✅ تم حفظ الكوكيز بنجاح!\n" +
        "🔄 إعادة تسجيل الدخول جارية…\n\n" +
        "⏱ انتظر 5–10 ثوانٍ.",
        threadID
      );
    } catch (e) {
      global._selfWrite = false;
      await api.sendMessage(`❌ خطأ في الحفظ: ${e.message}`, threadID, null, messageID);
    }
  },
};
