"use strict";
  const https  = require("https");
  const http   = require("http");
  const path   = require("path");
  const os     = require("os");
  const fs     = require("fs");

  // تحميل صورة من URL إلى ملف مؤقت
  function downloadImage(url) {
    return new Promise((resolve, reject) => {
      const tmp  = path.join(os.tmpdir(), `fb_pic_${Date.now()}.jpg`);
      const file = fs.createWriteStream(tmp);
      const get  = url.startsWith("https") ? https : http;
      get.get(url, (res) => {
        // تتبع redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(tmp, () => {});
          return downloadImage(res.headers.location).then(resolve).catch(reject);
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(tmp)));
      }).on("error", (e) => { fs.unlink(tmp, () => {}); reject(e); });
    });
  }

  function fmt(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + " ساعة " + m + " دقيقة";
    if (m > 0) return m + " دقيقة";
    return s + " ثانية";
  }

  module.exports = {
    config: {
      name:        "كوكيز",
      aliases:     ["cookie", "ckstatus", "session"],
      description: "يعرض حالة الكوكيز وصورة حساب الفيسبوك",
      usage:       "كوكيز",
      adminOnly:   false,
    },

    async run({ api, event }) {
      const { threadID, messageID } = event;

      try {
        // ── جلب بيانات الحساب ──────────────────────────────────────────────────
        const uid   = api.getCurrentUserID();
        const info  = await new Promise((res, rej) =>
          api.getUserInfo(uid, (err, d) => err ? rej(err) : res(d))
        );
        const user  = (info && info[uid]) || {};
        const name  = user.name || "غير معروف";

        // ── إحصائيات الكوكيز ──────────────────────────────────────────────────
        let pushCount = 0, lastPush = 0;
        try {
          const cp = require("../utils/cookiePusher");
          const st = cp.getStats ? cp.getStats() : (cp.getStatus ? cp.getStatus() : {});
          pushCount = st.pushCount || 0;
          lastPush  = st.lastPush  || 0;
        } catch (_) {}

        const now        = Date.now();
        const uptime     = process.uptime ? Math.floor(process.uptime() * 1000) : 0;
        const lastPushTx = lastPush
          ? "منذ " + fmt(now - lastPush)
          : "لم يتم بعد";

        // ── بناء الرسالة ───────────────────────────────────────────────────────
        const statusLine = `✅ الكوكيز شغّالة`;
        const body = [
          `╔══════════════════╗`,
          `  🍪  حالة الكوكيز`,
          `╚══════════════════╝`,
          ``,
          `👤  الاسم : ${name}`,
          `🆔  UID    : ${uid}`,
          ``,
          `${statusLine}`,
          ``,
          `📤  مرات الرفع لـ GitHub : ${pushCount}`,
          `🕐  آخر رفع : ${lastPushTx}`,
          `⏱️  وقت التشغيل : ${fmt(uptime)}`,
          ``,
          `╰─ BOT TAREK ✦ Lucifer`,
        ].join("\n");

        // ── تحميل صورة البروفايل ───────────────────────────────────────────────
        const picUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&type=square`;
        let   tmpPath = null;
        try { tmpPath = await downloadImage(picUrl); } catch (_) {}

        if (tmpPath && fs.existsSync(tmpPath)) {
          // أرسل الصورة + النص معاً
          await new Promise((res, rej) =>
            api.sendMessage(
              { body, attachment: fs.createReadStream(tmpPath) },
              threadID,
              (err) => {
                fs.unlink(tmpPath, () => {});
                err ? rej(err) : res();
              },
              messageID
            )
          );
        } else {
          // إذا فشل تحميل الصورة، أرسل النص فقط
          await new Promise((res, rej) =>
            api.sendMessage(body, threadID, (err) => err ? rej(err) : res(), messageID)
          );
        }

      } catch (err) {
        api.sendMessage(
          `❌ خطأ أثناء جلب حالة الكوكيز:\n${err.message || err}`,
          threadID, undefined, messageID
        );
      }
    },
  };
  