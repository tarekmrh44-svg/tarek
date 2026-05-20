require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const login    = require("@dongdev/fca-unofficial");
const fs       = require("fs-extra");
const path     = require("path");
const gradient = require("gradient-string");
const chalk    = require("chalk");
const moment   = require("moment-timezone");
const cron     = require("node-cron");

const { initDB }            = require("./utils/database");
const { loadCommands }      = require("./utils/loader");
const { startDashboard, getIO } = require("./dashboard/server");
const { parseCookieInput, cookiesToString, hasMandatory, dedup } = require("./utils/cookieParser");
const checkLiveCookie       = require("./utils/checkLiveCookie");
const getFbstateFromToken   = require("./utils/getFbstateFromToken");
const handlerEvents         = require("./handler/handlerEvents");
const { startPoller, stopPoller } = require("./utils/customPoller");
const sessionWatchdog               = require("./protection/sessionWatchdog");
const cookieRotator                 = require("./protection/cookieRotator");

const CONFIG_PATH  = path.join(__dirname, "../config.json");
const ACCOUNT_PATH = path.join(__dirname, "../account.txt");

// ─── Logger ───────────────────────────────────────────────────────────────────
const ts = () => moment().tz(global.config?.timezone || "Africa/Algiers").format("HH:mm:ss");
const log = {
  info:  (msg) => console.log(`${chalk.gray(ts())} ${chalk.cyan("•")} ${msg}`),
  ok:    (msg) => console.log(`${chalk.gray(ts())} ${chalk.green("✔")} ${chalk.green(msg)}`),
  warn:  (msg) => console.log(`${chalk.gray(ts())} ${chalk.yellow("⚠")} ${chalk.yellow(msg)}`),
  error: (msg) => console.log(`${chalk.gray(ts())} ${chalk.red("✘")} ${chalk.red(msg)}`),
};
global.log = log;

// ─── Permissions ──────────────────────────────────────────────────────────────
const isOwner = id => String(id) === String(global.ownerID);
const isAdmin = id => isOwner(id) || (global.config?.adminIDs || []).map(String).includes(String(id));
global.isOwner = isOwner;
global.isAdmin = isAdmin;

// ─── Stop Current Listener ────────────────────────────────────────────────────
function stopListening() {
  stopPoller();
  // @dongdev v4: stop via api.stopListening()
  try {
    if (global.api && typeof global.api.stopListening === "function") {
      global.api.stopListening(() => {});
    }
  } catch (_) {}
  // Legacy: call the stop function returned by api.listen()
  if (global._currentListener && typeof global._currentListener === "function") {
    try { global._currentListener(); } catch (_) {}
    global._currentListener = null;
  }
  if (global._listenTimer) {
    clearTimeout(global._listenTimer);
    global._listenTimer = null;
  }
  // Stop MQTT client if active
  try {
    if (global.api?.ctx?.mqttClient) {
      global.api.ctx.mqttClient.end(true);
    }
  } catch (_) {}
}

// ─── HTTP Long-Poll Listener (with custom-poller fallback) ───────────────────
function startPolling(api, commands, attempt = 1) {
  const MAX = 3; // 3 attempts then switch to custom poller
  const io  = getIO();

  log.warn(`HTTP long-poll (محاولة ${attempt}/${MAX})…`);

  let started = false;
  let errored = false;

  const stop = api.listen((err, event) => {
    if (err) {
      if (errored) return;
      errored = true;
      const msg = String(err.error || err.message || err);
      log.error(`api.listen: ${msg}`);

      if (io) io.emit("bot-status", { status: "degraded", message: `listen خطأ: ${msg}` });

      // login_blocked = IP blocked from MQTT/Long-Poll → go straight to Custom Poller
      const isBlocked = msg.includes("login_blocked") || msg.includes("auth_error");
      if (isBlocked || attempt >= MAX) {
        log.warn("⚡ التحويل إلى Custom Poller (بدون GraphQL batch)…");
        startPoller(api, handlerEvents, global.config?.pollIntervalMs || 5000);
      } else {
        const delay = attempt * 8000;
        log.info(`إعادة محاولة Long-Poll بعد ${delay / 1000}s…`);
        setTimeout(() => startPolling(api, commands, attempt + 1), delay);
      }
      return;
    }

    if (!started) {
      started = true;
      log.ok(`api.listen نشط ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      if (io) io.emit("bot-status", {
        status:  "online",
        message: `متصل ✔ Long-Poll (${api.getCurrentUserID()})`,
      });
    }

    global._lastActivity = Date.now();
    if (event) handlerEvents(api, event, global.commands).catch(() => {});
  });

  global._currentListener = stop;
}

// ─── MQTT retry loop (after full fallback to Long-Poll) ──────────────────────
let _mqttRetryTimer = null;

function scheduleMqttRetry(api, commands, delayMs = 5 * 60 * 1000) {
  if (_mqttRetryTimer) clearTimeout(_mqttRetryTimer);
  _mqttRetryTimer = setTimeout(() => {
    _mqttRetryTimer = null;
    if (global.api !== api) return; // bot restarted with new api
    const hasMqtt = !!(api.ctx?.mqttClient);
    if (hasMqtt) { log.info("MQTT retry: متصل بالفعل ✔"); return; }
    log.warn("↺ إعادة محاولة MQTT (retry loop)…");
    startMqtt(api, commands, 1);
  }, delayMs);
}

// ─── MQTT Listener (يُستخدم فقط عند وجود m_sess) ────────────────────────────
function startMqtt(api, commands, attempt = 1) {
  const MAX   = 4;
  const delay = Math.min(attempt * 8000, 40000);
  const io    = getIO();

  log.info(`MQTT اتصال (محاولة ${attempt}/${MAX})…`);

  let mqttStarted = false;
  let errored     = false;

  // Timeout: إذا لم يتصل MQTT خلال 25 ثانية → HTTP polling
  const timer = setTimeout(() => {
    if (!mqttStarted) {
      log.warn("MQTT timeout — تحويل إلى Long-Poll");
      startPolling(api, commands, 1);
      scheduleMqttRetry(api, commands, 5 * 60 * 1000);
    }
  }, 25000);
  global._listenTimer = timer;

  const stop = api.listenMqtt((err, event) => {
    if (err) {
      clearTimeout(timer);
      if (errored) return;
      errored = true;

      const msg = String(err.error || err.message || err.type || err);
      log.warn(`MQTT: ${msg}`);

      if (attempt < MAX) {
        log.info(`إعادة محاولة MQTT بعد ${delay / 1000}s…`);
        setTimeout(() => startMqtt(api, commands, attempt + 1), delay);
      } else {
        log.warn("فشل MQTT — تحويل إلى Long-Poll + جدولة إعادة محاولة MQTT");
        startPolling(api, commands, 1);
        scheduleMqttRetry(api, commands, 5 * 60 * 1000);
      }
      if (io) io.emit("bot-status", { status: "degraded", message: `MQTT: ${msg}` });
      return;
    }

    if (!mqttStarted) {
      mqttStarted = true;
      clearTimeout(timer);
      global._listenTimer = null;
      if (_mqttRetryTimer) { clearTimeout(_mqttRetryTimer); _mqttRetryTimer = null; }
      log.ok(`MQTT متصل ✔ — UID: ${chalk.bold.green(api.getCurrentUserID())}`);
      if (io) io.emit("bot-status", {
        status:  "online",
        message: `متصل ✔ MQTT (${api.getCurrentUserID()})`,
      });
    }

    global._lastActivity = Date.now();
    if (event) handlerEvents(api, event, global.commands).catch(() => {});
  });

  global._currentListener = stop;
}

// Expose startMqtt globally so outgoingThrottle can trigger MQTT restart
global._startMqtt = startMqtt;

// ─── Load Cookies from account.txt OR COOKIES env var ─────────────────────────
async function loadCookies() {
  // 1) Prefer account.txt if it has content
  let raw = "";
  if (fs.existsSync(ACCOUNT_PATH)) {
    raw = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
  }

  // 2) Fall back to COOKIES environment variable (Railway / Docker)
  if (!raw && process.env.COOKIES) {
    log.info("account.txt فارغ — جارٍ تحميل الكوكيز من متغير البيئة COOKIES…");
    raw = process.env.COOKIES.trim();
    // Write to account.txt so hot-swap and backup work normally
    try { fs.writeFileSync(ACCOUNT_PATH, raw, "utf8"); } catch (_) {}
  }

  if (!raw) return null;

  const UA = global.config?.userAgent ||
    "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

  let parsed;
  try { parsed = parseCookieInput(raw); }
  catch (e) { log.error(`تحليل account.txt: ${e.message}`); return null; }

  if (parsed.isToken) {
    log.info("تحويل التوكن إلى كوكيز…");
    try { return dedup(await getFbstateFromToken(parsed.token)); }
    catch (e) { log.error(`توكن: ${e.message}`); return null; }
  }

  const cookies = parsed.cookies;
  if (!cookies.length) { log.error("account.txt فارغ من الكوكيز"); return null; }
  if (!hasMandatory(cookies)) { log.error("c_user أو xs مفقود"); return null; }

  log.info("التحقق من صلاحية الكوكيز عبر mbasic…");
  const valid = await checkLiveCookie(cookiesToString(cookies), UA);
  log.info(valid ? chalk.green("الكوكيز صالحة ✔") : chalk.yellow("تحذير: mbasic لم يتعرف — سنحاول رغم ذلك"));

  return cookies;
}

// ─── SINGLE-LOGIN LOCK (منع تسجيل الدخول المزدوج) ───────────────────────────
let _loginLock = false;

// ─── Main Bot Startup ─────────────────────────────────────────────────────────
async function startBot() {
  if (_loginLock) {
    log.warn("تسجيل دخول جارٍ بالفعل — تجاهل الطلب الجديد");
    return;
  }
  _loginLock = true;

  const io = getIO();
  stopListening();

  // Stop protection systems
  try { cookieRotator.stop(); }    catch (_) {}
  try { sessionWatchdog.stop(); }  catch (_) {}
  try { require("./protection/stealth").stop(); } catch (_) {}
  try { require("./protection/keepAlive").stop(); } catch (_) {}
  try { require("./protection/mqttHealthCheck").stopHealthCheck(); } catch (_) {}
  global.api = null;

  if (io) io.emit("bot-status", { status: "connecting", message: "جارٍ تسجيل الدخول…" });

  let cookies;
  try {
    cookies = await loadCookies();
  } catch (e) {
    log.error(`خطأ في تحميل الكوكيز: ${e.message}`);
    cookies = null;
  }

  if (!cookies) {
    log.error("لا توجد كوكيز — ارفع الكوكيز من لوحة التحكم");
    if (io) io.emit("bot-status", { status: "offline", message: "لا توجد كوكيز — ارفع من الداشبورد" });
    _loginLock = false;
    return;
  }

  // Check if m_sess is present → affects listener choice
  const hasMsess = cookies.some(c => c.key === "m_sess");
  if (!hasMsess) log.info(chalk.yellow("m_sess غير موجود — سيستخدم HTTP Long-Poll (لا MQTT)"));

  const UA = global.config?.userAgent ||
    "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36";

  const loginOptions = {
    appState:         cookies,
    forceLogin:       false,
    logLevel:         "silent",
    listenEvents:     true,
    selfListen:       false,
    autoReconnect:    false,
    autoMarkDelivery: false,
    autoMarkRead:     false,
    userAgent:        UA,
  };

  const commands = global.commands;
  let loginAttempt = 0;
  const MAX_LOGIN  = 3;

  function tryLogin() {
    loginAttempt++;
    login(loginOptions, async (err, api) => {
      if (err) {
        const msg = err.error || err.message || String(err);
        log.error(`فشل تسجيل الدخول (${loginAttempt}/${MAX_LOGIN}): ${msg}`);
        if (io) io.emit("bot-status", { status: "error", message: `فشل الدخول: ${msg}` });

        if (loginAttempt < MAX_LOGIN) {
          setTimeout(tryLogin, loginAttempt * 5000);
          return;
        }

        log.error("وصل لأقصى عدد محاولات تسجيل الدخول");
        if (io) io.emit("bot-status", { status: "offline", message: "فشل الدخول — تحقق من الكوكيز" });
        _loginLock = false;
        // أخبر الـ Watchdog أن إعادة الدخول فشلت
        try { sessionWatchdog.onReloginFail(); } catch (_) {}
        return;
      }

      // Save refreshed appState back to account.txt — merge with existing to preserve c_user/xs
      try {
        const fresh = api.getAppState() || [];
        if (fresh.length) {
          // Load existing cookies and merge: fresh takes priority, but keep keys missing from fresh
          let existing = [];
          try { existing = JSON.parse(fs.readFileSync(ACCOUNT_PATH, "utf8")); } catch (_) {}
          const freshKeys = new Set(fresh.map(c => c.key));
          const merged = dedup([...fresh, ...existing.filter(c => !freshKeys.has(c.key))]);
          global._selfWrite = true; // suppress file watcher
          fs.writeFileSync(ACCOUNT_PATH, JSON.stringify(merged, null, 2), "utf8");
          setTimeout(() => { global._selfWrite = false; }, 6000); // clear after 6s
          log.info(`AppState محدَّث: ${chalk.cyan(merged.length)} كوكي (دمج)`);
        }
      } catch (_) {}

      const uid = api.getCurrentUserID();
      log.ok(`تسجيل الدخول ناجح ✔ — UID: ${chalk.bold.green(uid)}`);
      global.api = api;
      global._listenerDead = false;
      // أخبر الـ Watchdog أن إعادة الدخول نجحت
      try { sessionWatchdog.onReloginSuccess(); } catch (_) {}

      api.setOptions({
        listenEvents:  true,
        selfListen:    false,
        autoReconnect: false,
        userAgent:     UA,
      });

      if (io) io.emit("bot-status", { status: "connecting", message: `دخول ✔ (${uid}) — جارٍ تشغيل الليستنر…` });

      // Start protection — original systems
      try { require("./protection/outgoingThrottle").wrapSendMessage(api); } catch (_) {}
      try { require("./protection/humanTyping").wrapWithTyping(api); } catch (_) {}
      try { require("./protection/stealth").start(api); } catch (_) {}
      try { require("./protection/keepAlive").start(); } catch (_) {}
      try { require("./protection/mqttHealthCheck").startHealthCheck(); } catch (_) {}
      try { require("./protection/Uprotection"); } catch (_) {}

      // Start protection — 10 new human-simulation systems
      try { require("./protection/humanReadReceipt").start(api); }   catch (_) {}
      try { require("./protection/naturalPresence").start(api); }     catch (_) {}
      try { require("./protection/scrollSimulator").start(api); }     catch (_) {}
      try { require("./protection/antiDetection").start(); }          catch (_) {}
      try { require("./protection/sessionRefresher").start(api); }    catch (_) {}
      try { require("./protection/reactionDelay").start(api); }       catch (_) {}
      try { require("./protection/connectionJitter").start(api); }    catch (_) {}
      try { require("./protection/duplicateGuard").start(api); }      catch (_) {}
      try { require("./protection/typingVariator").start(api); }      catch (_) {}
      try { require("./protection/behaviorScheduler").start(); }      catch (_) {}
      try { sessionWatchdog.start(api); }                              catch (_) {}
      try { cookieRotator.start(api); }                               catch (_) {}
      log.ok("🛡️ جميع أنظمة الحماية (18 نظام) نشطة");

      // Start auto-backup
      try { require("./utils/autoBackup").start(); } catch (_) {}

      // Setup cron jobs
      setupCronJobs(api);

      // Release login lock BEFORE starting listener
      _loginLock = false;

      // Wait 1.5s then start listener
      // m_sess → try MQTT first | no m_sess → direct Long-Poll
      await new Promise(r => setTimeout(r, 1500));
      if (hasMsess) {
        startMqtt(api, commands, 1);
      } else {
        log.info("بدء Long-Poll مباشرة (بدون MQTT)…");
        startPolling(api, commands, 1);
      }
    });
  }

  tryLogin();
}

// ─── Hot-Swap ─────────────────────────────────────────────────────────────────
global.reLoginBot = async function () {
  log.warn("🔄 Hot-Swap: إعادة تسجيل الدخول…");
  await startBot();
};

// ─── Cron Jobs ────────────────────────────────────────────────────────────────
function setupCronJobs(api) {
  for (const job of global.config?.cronJobs || []) {
    if (!job.cron || !job.threadID || !job.message) continue;
    try {
      cron.schedule(job.cron, () => api.sendMessage(job.message, job.threadID, () => {}));
      log.ok(`Cron: "${job.cron}" → ${job.threadID}`);
    } catch (e) { log.warn(`Cron: ${e.message}`); }
  }

  // ─── إرسال تلقائي (قابل للتحكم من config.json) ────────────────────────────
  const autoMsgCfg = global.config?.autoMsg || {};
  const autoMsgEnabled  = autoMsgCfg.enable === true;
  const autoMsgInterval = Math.max(30, autoMsgCfg.intervalSeconds || 40) * 1000;
  const autoMsgText     = autoMsgCfg.message || "";

  global._autoMsg        = autoMsgText;
  global._autoMsgPaused  = !autoMsgEnabled;
  if (!global._autoThreads) {
    global._autoThreads = new Set(Array.isArray(autoMsgCfg.threads) ? autoMsgCfg.threads : []);
  }

  if (autoMsgEnabled && global._autoThreads.size > 0 && autoMsgText) {
    setInterval(() => {
      const api2 = global.api;
      if (!api2 || global._autoMsgPaused || global._globalLock) return;
      const hasMqtt = !!(api2.ctx?.mqttClient);
      if (!hasMqtt) return;
      for (const tid of global._autoThreads) {
        api2.sendMessage(global._autoMsg, tid, () => {});
      }
    }, autoMsgInterval);
    log.ok(`⏱ إرسال تلقائي كل ${autoMsgInterval / 1000}s → ${global._autoThreads.size} مجموعة`);
  } else {
    log.info("⏱ إرسال تلقائي: مُعطَّل (فعِّله من config.json → autoMsg)");
  }
}

// ─── Banner ───────────────────────────────────────────────────────────────────
function printBanner() {
  const lines = [
    "  ╔══════════════════════════════════════════════════╗",
    "  ║   🤖  Lucifer Bot  v3.1.0                        ║",
    "  ║   ⚡  @dongdev/fca-unofficial  |  WHITE Engine     ║",
    "  ║   🍪  account.txt  —  No m_sess required         ║",
    "  ║   🔄  Hot-Swap  |  Auto-Backup  |  MQTT→Poll     ║",
    "  ║   👑  Owner: djamel                              ║",
    "  ╚══════════════════════════════════════════════════╝",
  ].join("\n");
  console.log(gradient.rainbow(lines));
  console.log(chalk.gray(`  ${moment().tz("Africa/Algiers").format("YYYY-MM-DD HH:mm:ss")} (Africa/Algiers)\n`));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  printBanner();
  await initDB();
  log.ok("قاعدة البيانات جاهزة");

  // Init runtime globals for new systems
  if (!global._lockedThreads) global._lockedThreads = new Set();
  if (global._globalLock === undefined) global._globalLock = false;
  if (!global._broadcasts) global._broadcasts = new Map();
  if (!global._nicknameJobs) global._nicknameJobs = new Map();
  global._listenerDead = false;
  global._lastActivity = 0;

  const defaults = {
    botName: "jarfis", prefix: "/", ownerID: "", adminIDs: [],
    dashboardPort: 5000, timezone: "Africa/Algiers",
    dashboardPassword: "djamel2025*",
    humanTyping:     { enable: true },
    stealth:         { enable: true },
    mqttHealthCheck: { enable: true },
    keepAlive:       { enable: true },
    groupEvents:     { welcomeMessage: "", leaveMessage: "" },
    backupIntervalMinutes: 60,
    cronJobs: [],
    commandRoles: {}, // أدوار الأوامر: "admin" (افتراضي) أو "member"
    autoMsg: {
      enable: false,         // true لتفعيل الإرسال التلقائي
      intervalSeconds: 120,  // الفاصل الزمني بالثواني (الحد الأدنى 30)
      threads: [],           // قائمة IDs المجموعات المستهدفة
      message: "",           // نص الرسالة التلقائية
    },
    userAgent: "Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36",
  };

  const config = fs.existsSync(CONFIG_PATH)
    ? { ...defaults, ...fs.readJsonSync(CONFIG_PATH) }
    : defaults;

  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeJsonSync(CONFIG_PATH, defaults, { spaces: 2 });
    log.warn("config.json تم إنشاؤه بالقيم الافتراضية");
  }

  global.config        = config;
  global.commandPrefix = config.prefix   || "/";
  global.ownerID       = config.ownerID  || "";
  global.botName       = config.botName  || "jarfis";

  log.info(`البوت: ${chalk.bold.cyan(global.botName)} | بادئة: ${chalk.cyan(global.commandPrefix)} | مالك: ${chalk.cyan(global.ownerID || "غير محدد")}`);

  const commands = loadCommands(path.join(__dirname, "commands"));
  global.commands = commands;
  log.ok(`تم تحميل ${chalk.bold(commands.size)} أمر`);

  if (!fs.existsSync(ACCOUNT_PATH)) fs.writeFileSync(ACCOUNT_PATH, "", "utf8");

  const port = parseInt(process.env.PORT || config.dashboardPort || 5000, 10);
  await startDashboard(port);
  log.ok(`لوحة التحكم → http://0.0.0.0:${port}`);

  // ── File Watcher: تغيير account.txt → hot-swap ────────────────────────────
  let _watchMtime  = 0;
  let _watchTimer  = null;

  fs.watch(ACCOUNT_PATH, () => {
    // Debounce: تجاهل الأحداث المتكررة خلال 5 ثوانٍ
    if (_watchTimer) return;
    _watchTimer = setTimeout(async () => {
      _watchTimer = null;

      // تجاهل إذا كانت الكتابة من البوت نفسه (AppState refresh)
      if (global._selfWrite) {
        log.info("تجاهل تغيير account.txt (كتابة داخلية)");
        return;
      }

      // تجاهل إذا كانت الكتابة من لوحة التحكم (hot-swap يُطلَق من الـ API مباشرةً)
      if (global._dashCookieWrite) {
        log.info("تجاهل تغيير account.txt (كتابة من الداشبورد — hot-swap جارٍ)");
        return;
      }

      // تجاهل إذا كان تسجيل دخول جارٍ
      if (_loginLock) {
        log.info("تجاهل تغيير account.txt (تسجيل دخول جارٍ)");
        return;
      }

      try {
        const stat = fs.statSync(ACCOUNT_PATH);
        if (stat.mtimeMs <= _watchMtime + 500) return;
        _watchMtime = stat.mtimeMs;
      } catch { return; }

      const content = fs.readFileSync(ACCOUNT_PATH, "utf8").trim();
      if (!content) return;

      log.warn("🔄 account.txt تغيَّر (مستخدم) — hot-swap بعد 3 ثوانٍ…");
      setTimeout(() => startBot(), 3000);
    }, 5000);
  });

  // Start bot
  await startBot();
}

main().catch(e => {
  console.error(chalk.red("FATAL:"), e);
  process.exit(1);
});
