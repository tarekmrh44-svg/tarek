"use strict";
  /**
   * cookiePusher.js — رفع الكوكيز لـ GitHub تلقائياً عند كل تجديد
   * ════════════════════════════════════════════════════════════════
   * يراقب api.getAppState() كل 15 دقيقة
   * إذا تغيّرت الكوكيز → يرفعها لـ GitHub خلال دقيقتين
   * يضمن أن Railway يبدأ دائماً بأحدث كوكيز عند كل restart
   *
   * متغيرات البيئة المطلوبة:
   *   GITHUB_TOKEN  — Personal Access Token (repo scope)
   *   GITHUB_REPO   — owner/repo-name (مثال: tarekmrh44-svg/tarek)
   *   GITHUB_COOKIES_FILE — المسار داخل الريبو (افتراضي: bot/account.txt)
   */

  const fs    = require("fs-extra");
  const path  = require("path");
  const https = require("https");
  const chalk = require("chalk");
  const moment = require("moment-timezone");

  const ACCOUNT_PATH   = path.join(__dirname, "../../account.txt");
  const CHECK_INTERVAL = 15 * 60 * 1000;  // فحص كل 15 دقيقة
  const PUSH_DELAY     =  2 * 60 * 1000;  // انتظر دقيقتين قبل الرفع (تجميع التغييرات)

  const ts  = () => moment().tz(global.config?.timezone || "Africa/Algiers").format("HH:mm:ss");
  const log = {
    info:  m => console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} [COOKIE-PUSH] ${m}`),
    ok:    m => console.log(`${chalk.gray(ts())} ${chalk.green("✔")} ${chalk.green("[COOKIE-PUSH] " + m)}`),
    warn:  m => console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} ${chalk.yellow("[COOKIE-PUSH] " + m)}`),
    error: m => console.log(`${chalk.gray(ts())} ${chalk.red("✘")} ${chalk.red("[COOKIE-PUSH] " + m)}`),
  };

  let _running      = false;
  let _api          = null;
  let _lastHash     = "";
  let _pushTimer    = null;
  let _checkTimer   = null;
  let _pushCount    = 0;
  let _lastPush     = 0;

  // ─── مساعد: hash بسيط للكوكيز ─────────────────────────────────────────────────
  function hashCookies(arr) {
    if (!Array.isArray(arr) || !arr.length) return "";
    return arr.map(c => `${c.key}=${c.value}`).sort().join("|");
  }

  // ─── مساعد: طلب GitHub API ────────────────────────────────────────────────────
  function githubRequest(method, apiPath, body, ghToken) {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : null;
      const opts = {
        hostname: "api.github.com",
        path: apiPath,
        method,
        headers: {
          "Authorization": `token ${ghToken}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "lucifer-cookie-pusher/1.0",
          ...(bodyStr ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(bodyStr) } : {}),
        },
      };
      const req = https.request(opts, (res) => {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: {} }); }
        });
      });
      req.on("error", reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  // ─── جلب SHA الحالي لـ account.txt من GitHub ─────────────────────────────────
  async function getGithubSha(ghToken, ghRepo, ghFile) {
    try {
      const res = await githubRequest(
        "GET",
        `/repos/${ghRepo}/contents/${encodeURIComponent(ghFile)}?ref=main`,
        null,
        ghToken
      );
      return res.body?.sha || null;
    } catch (_) { return null; }
  }

  // ─── رفع الكوكيز لـ GitHub ────────────────────────────────────────────────────
  async function pushToGithub() {
    const ghToken = process.env.GITHUB_TOKEN || "";
    const ghRepo  = process.env.GITHUB_REPO  || "";
    const ghFile  = process.env.GITHUB_COOKIES_FILE || "bot/account.txt";

    if (!ghToken || !ghRepo) {
      log.warn("GITHUB_TOKEN أو GITHUB_REPO غير موجودَين — تخطي الرفع");
      return false;
    }

    try {
      // اقرأ الكوكيز من الملف المحلي
      let localCookies = "";
      try { localCookies = fs.readFileSync(ACCOUNT_PATH, "utf8").trim(); }
      catch (_) { log.error("تعذّر قراءة account.txt"); return false; }
      if (!localCookies) { log.warn("account.txt فارغ — تخطي الرفع"); return false; }

      // اجلب الـ SHA الحالي
      const sha = await getGithubSha(ghToken, ghRepo, ghFile);

      const body = {
        message: `🍪 auto: تجديد كوكيز تلقائي [${new Date().toLocaleString("ar-SA", { timeZone: global.config?.timezone || "Africa/Algiers" })}]`,
        content: Buffer.from(localCookies).toString("base64"),
        ...(sha ? { sha } : {}),
      };

      const res = await githubRequest("PUT", `/repos/${ghRepo}/contents/${encodeURIComponent(ghFile)}`, body, ghToken);

      if (res.status === 200 || res.status === 201) {
        _pushCount++;
        _lastPush = Date.now();
        log.ok(`✅ كوكيز مرفوعة لـ GitHub ✔ (رفع #${_pushCount})`);
        // إشعار الداشبورد
        try {
          const { getIO } = require("../dashboard/server");
          const io = getIO();
          if (io) io.emit("cookie-pushed", { at: _lastPush, count: _pushCount });
        } catch (_) {}
        return true;
      } else {
        log.error(`فشل رفع GitHub: ${res.status} — ${res.body?.message || ""}`);
        return false;
      }
    } catch (e) {
      log.error(`خطأ أثناء الرفع: ${e.message}`);
      return false;
    }
  }

  // ─── جدولة رفع مع تأخير (تجميع تغييرات سريعة) ───────────────────────────────
  function schedulePush() {
    if (_pushTimer) clearTimeout(_pushTimer);
    log.info(`🕐 جدولة رفع الكوكيز خلال ${PUSH_DELAY / 60000} دقيقة...`);
    _pushTimer = setTimeout(async () => {
      _pushTimer = null;
      await pushToGithub();
    }, PUSH_DELAY);
  }

  // ─── فحص دوري: هل تغيّرت الكوكيز؟ ──────────────────────────────────────────
  async function doCheck() {
    if (!_running || !_api) return;

    try {
      const fresh = _api.getAppState?.() || [];
      if (!fresh.length) return;

      const h = hashCookies(fresh);
      if (h !== _lastHash) {
        _lastHash = h;
        log.info("🔄 تغيير في الكوكيز — جدولة رفع لـ GitHub...");
        schedulePush();
      }
    } catch (_) {}
  }

  // ─── Start / Stop ─────────────────────────────────────────────────────────────
  function start(api) {
    if (_running) return;
    _api     = api;
    _running = true;
    _lastHash = hashCookies(api.getAppState?.() || []);

    log.ok(`🚀 Cookie Pusher نشط — فحص كل ${CHECK_INTERVAL / 60000} دقيقة | رفع GitHub عند كل تغيير`);

    // رفع أوّلي بعد 10 دقائق من تسجيل الدخول (للتأكد أن الكوكيز محفوظة)
    setTimeout(async () => {
      if (_running) {
        log.info("📤 رفع أوّلي للكوكيز بعد تسجيل الدخول...");
        await pushToGithub();
      }
    }, 10 * 60 * 1000);

    // فحص دوري
    _checkTimer = setInterval(() => { if (_running) doCheck(); }, CHECK_INTERVAL);
  }

  function stop() {
    _running = false;
    if (_checkTimer) { clearInterval(_checkTimer); _checkTimer = null; }
    if (_pushTimer)  { clearTimeout(_pushTimer);  _pushTimer  = null; }
    _api = null;
  }

  // ─── رفع فوري (يُستدعى من خارج) ─────────────────────────────────────────────
  async function pushNow() {
    log.info("📤 رفع فوري مطلوب...");
    if (_pushTimer) { clearTimeout(_pushTimer); _pushTimer = null; }
    return await pushToGithub();
  }

  function getStatus() {
    return {
      running:   _running,
      pushCount: _pushCount,
      lastPush:  _lastPush,
      intervalMin: CHECK_INTERVAL / 60000,
    };
  }

  module.exports = { start, stop, pushNow, getStatus, isRunning: () => _running };
  