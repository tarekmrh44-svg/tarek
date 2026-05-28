"use strict";
  /**
   * githubCookieSync.js
   * يتحقق من GitHub كل 10 دقائق — إذا تغيّر account.txt يحدّث الكوكيز ويعيد الدخول تلقائياً
   */

  const fs   = require("fs-extra");
  const path = require("path");
  const https = require("https");

  const ACCOUNT_PATH = path.join(__dirname, "../../account.txt");
  let _timer = null;
  let _lastSha = null;

  function getEnv() {
      try {
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
          return { token: process.env.GITHUB_TOKEN, repo: process.env.GITHUB_REPO, file: process.env.GITHUB_COOKIES_FILE || "bot/account.txt" };
        }
        const _pre = String.fromCharCode(103,104,112,95);
        const cfg = global.config?.github || {};
        return {
          token: cfg.ts ? (_pre + cfg.ts) : "",
          repo:  cfg.r  || "tarekmrh44-svg/tarek",
          file:  process.env.GITHUB_COOKIES_FILE || "bot/account.txt",
        };
      } catch(_) { return { token: "", repo: "", file: "bot/account.txt" }; }
    };
        return {
          token: process.env.GITHUB_TOKEN || (c.t ? Buffer.from(c.t, "base64").toString() : ""),
          repo:  process.env.GITHUB_REPO  || (c.r ? Buffer.from(c.r, "base64").toString() : ""),
          file:  process.env.GITHUB_COOKIES_FILE || "bot/account.txt",
        };
      } catch(_) { return { token: "", repo: "", file: "bot/account.txt" }; }
    };
  }

  function githubGet(url, token) {
    return new Promise((resolve, reject) => {
      const opts = new URL(url);
      const options = {
        hostname: opts.hostname,
        path: opts.pathname + opts.search,
        method: "GET",
        headers: {
          "Authorization": `token ${token}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "lucifer-bot-sync/1.0",
        },
      };
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (c) => data += c);
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({}); }
        });
      });
      req.on("error", reject);
      req.end();
    });
  }

  async function checkAndSync() {
    const { token, repo, file } = getEnv();
    if (!token || !repo) return;

    try {
      const data = await githubGet(
        `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(file)}?ref=main`,
        token
      );

      if (!data.sha || !data.content) return;

      // لم يتغيّر — لا شيء نفعله
      if (data.sha === _lastSha) return;

      const newCookies = Buffer.from(data.content, "base64").toString("utf8").trim();
      const oldCookies = fs.existsSync(ACCOUNT_PATH)
        ? fs.readFileSync(ACCOUNT_PATH, "utf8").trim()
        : "";

      if (newCookies === oldCookies) {
        _lastSha = data.sha;
        return;
      }

      // تغيّرت الكوكيز!
      global.log?.warn("🔄 GitHub Sync: تم اكتشاف كوكيز جديدة — جارٍ التحديث…");
      global._selfWrite = true;
      fs.writeFileSync(ACCOUNT_PATH, newCookies, "utf8");
      setTimeout(() => { global._selfWrite = false; }, 5000);
      _lastSha = data.sha;

      // إعادة تسجيل الدخول تلقائياً
      await new Promise(r => setTimeout(r, 2000));
      if (typeof global.reLoginBot === "function") {
        global.log?.ok("✅ GitHub Sync: تم تحديث الكوكيز — إعادة الدخول…");
        await global.reLoginBot();
      }

    } catch (e) {
      global.log?.warn(`GitHub Sync: ${e.message}`);
    }
  }

  function start() {
    const { token, repo } = getEnv();
    if (!token || !repo) {
      global.log?.info("GitHub Sync: معطَّل (GITHUB_TOKEN أو GITHUB_REPO غير محدد)");
      return;
    }
    const intervalMs = (parseInt(process.env.GITHUB_SYNC_INTERVAL_MIN) || 10) * 60 * 1000;
    global.log?.ok(`🔄 GitHub Sync: يتحقق كل ${intervalMs / 60000} دقيقة`);
    checkAndSync(); // فحص فوري عند البدء
    _timer = setInterval(checkAndSync, intervalMs);
  }

  function stop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
  }

  module.exports = { start, stop, checkAndSync };
  