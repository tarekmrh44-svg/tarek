const axios = require("axios");

  let pingTimer   = null;
  let railTimer   = null;
  let watchdogTimer = null;

  function randMs(minMin, maxMin) {
    return Math.floor(Math.random() * ((maxMin - minMin) * 60_000 + 1)) + minMin * 60_000;
  }

  // ── Facebook ping (كل 8-18 دقيقة) ────────────────────────────────────────────
  async function doPing() {
    try {
      const api = global.api;
      if (!api) return;
      const appState = api.getAppState();
      if (!appState?.length) return;

      const cookieStr = appState.map(c => `${c.key}=${c.value}`).join("; ");
      let userAgent;
      try {
        const stealth = require("./stealth");
        userAgent = stealth.isRunning() ? stealth.getCurrentUA() : null;
      } catch (_) {}
      userAgent = userAgent || global.config?.userAgent ||
        "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

      const response = await axios.head("https://mbasic.facebook.com/", {
        headers: { cookie: cookieStr, "user-agent": userAgent, "accept": "text/html,*/*;q=0.8" },
        timeout: 10000, validateStatus: null, maxRedirects: 2,
      });

      const isExpired = response.status === 302 ||
        (response.headers?.location || "").includes("login");

      if (isExpired) {
        console.log("[KEEP_ALIVE] ⚠️ Session may have expired");
        const { getIO } = require("../dashboard/server");
        const io = getIO();
        if (io) io.emit("bot-status", { status: "error", message: "الجلسة انتهت — أعد رفع الكوكيز" });
      } else {
        global._lastMqttActivity = Date.now();
      }
    } catch (_) {}
    schedulePing();
  }

  function schedulePing() {
    if (pingTimer) clearTimeout(pingTimer);
    pingTimer = setTimeout(doPing, randMs(8, 18));
  }

  // ── Railway self-ping (كل 4 دقائق) — يمنع النوم على Railway ──────────────────
  async function doRailwayPing() {
    try {
      const port = process.env.PORT || global.config?.dashboardPort || 5000;
      await axios.get(`http://localhost:${port}/health`, {
        timeout: 5000, validateStatus: null
      });
    } catch (_) {}
    railTimer = setTimeout(doRailwayPing, 4 * 60 * 1000); // كل 4 دقائق
  }

  // ── Watchdog (كل 3 دقائق) — يعيد تسجيل الدخول إذا مات الاتصال ──────────────
  async function doWatchdog() {
    try {
      const now = Date.now();
      const lastActivity = global._lastActivity || 0;
      const sinceLastActivity = now - lastActivity;

      // إذا مضت أكثر من 10 دقائق بدون أي نشاط والبوت كان شغالاً
      if (global.api && sinceLastActivity > 10 * 60 * 1000) {
        console.log(`[WATCHDOG] ⚠️ لا نشاط منذ ${Math.floor(sinceLastActivity/60000)} دقيقة — إعادة تسجيل الدخول...`);
        const { getIO } = require("../dashboard/server");
        const io = getIO();
        if (io) io.emit("bot-status", { status: "connecting", message: "Watchdog: إعادة اتصال تلقائية..." });

        if (typeof global.reLoginBot === "function") {
          await global.reLoginBot();
        }
      }
    } catch (_) {}
    watchdogTimer = setTimeout(doWatchdog, 3 * 60 * 1000); // كل 3 دقائق
  }

  function start() {
    if (pingTimer) clearTimeout(pingTimer);
    if (railTimer) clearTimeout(railTimer);
    if (watchdogTimer) clearTimeout(watchdogTimer);

    console.log("[KEEP_ALIVE] Started — FB ping: 8-18min | Railway: 4min | Watchdog: 3min");
    schedulePing();
    doRailwayPing();
    setTimeout(doWatchdog, 3 * 60 * 1000); // ابدأ الـ watchdog بعد 3 دقائق
  }

  function stop() {
    if (pingTimer) clearTimeout(pingTimer);
    if (railTimer) clearTimeout(railTimer);
    if (watchdogTimer) clearTimeout(watchdogTimer);
    pingTimer = null;
    railTimer = null;
    watchdogTimer = null;
  }

  module.exports = { start, stop };
  