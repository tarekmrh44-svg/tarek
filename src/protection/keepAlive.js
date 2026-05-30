"use strict";
const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");

let pingTimer    = null;
let _expiredSent = false; // منع التكرار

function randMs(minMin, maxMin) {
  return Math.floor(Math.random() * ((maxMin - minMin) * 60_000 + 1)) + minMin * 60_000;
}

async function doPing() {
  try {
    const api = global.api;
    if (!api) { schedulePing(); return; }

    const appState = api.getAppState();
    if (!appState?.length) { schedulePing(); return; }

    const cookieStr = appState.map(c => `${c.key}=${c.value}`).join("; ");
    const userAgent = global.config?.userAgent ||
      "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

    const response = await axios.get("https://mbasic.facebook.com/", {
      headers: { cookie: cookieStr, "user-agent": userAgent, "accept": "text/html,*/*;q=0.8" },
      timeout: 12000,
      validateStatus: null,
      maxRedirects: 0, // لا نتبع redirects — نكشف 302 مباشرة
    });

    const location = response.headers?.location || "";
    const html     = typeof response.data === "string" ? response.data : "";

    const isExpired =
      (response.status === 301 || response.status === 302) && location.includes("login") ||
      html.includes("id=\"loginbutton\"") ||
      html.includes("You must log in") ||
      html.includes("login_form");

    if (isExpired) {
      console.log("[KEEP_ALIVE] ⚠️ انتهت الجلسة — جارٍ إعادة الاتصال تلقائياً…");

      try {
        const { getIO } = require("../dashboard/server");
        const io = getIO();
        if (io) io.emit("bot-status", { status: "error", message: "⚠️ انتهت الجلسة — جارٍ إعادة الاتصال…" });
      } catch (_) {}

      // إشعار المالك مرة واحدة فقط
      if (!_expiredSent) {
        _expiredSent = true;
        try {
          if (global.api && global.ownerID)
            global.api.sendMessage("⚠️ Keep Alive:\nانتهت الجلسة — جارٍ إعادة الاتصال تلقائياً", global.ownerID, () => {});
        } catch (_) {}
        setTimeout(() => { _expiredSent = false; }, 10 * 60_000); // إعادة الإشعار بعد 10 دقائق
      }

      // إعادة الاتصال تلقائياً
      try {
        if (typeof global.reLoginBot === "function") {
          global._lastMqttActivity = Date.now();
          await global.reLoginBot();
        }
      } catch (_) {}

    } else {
      // الجلسة سليمة — حفّظ AppState المحدَّث
      global._lastMqttActivity = Date.now();

      try {
        const fresh = api.getAppState();
        if (fresh?.length) {
          const { dedup } = require("../utils/cookieParser");
          const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");
          global._selfWrite = true;
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(dedup(fresh), null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000);
        }
      } catch (_) {}
    }
  } catch (_) {}

  schedulePing();
}

function schedulePing() {
  if (pingTimer) clearTimeout(pingTimer);
  pingTimer = setTimeout(doPing, randMs(5, 12)); // كل 5-12 دقيقة (أسرع)
}

function start() {
  if (pingTimer) clearTimeout(pingTimer);
  console.log("[KEEP_ALIVE] ✔ بدء — ping + حفظ AppState كل 5-12 دقيقة");
  schedulePing();
}

function stop() {
  if (pingTimer) clearTimeout(pingTimer);
  pingTimer = null;
  console.log("[KEEP_ALIVE] 🛑 Stopped.");
}

module.exports = { start, stop };
