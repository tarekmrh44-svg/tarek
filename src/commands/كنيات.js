"use strict";
/**
 * كنيات — تغيير + حذف + مراقبة ذكية (Ultra Stealth)
 */

if (!global._nicknameJobs) global._nicknameJobs = new Map();
if (!global._nicknameMonitor) global._nicknameMonitor = new Map();
if (!global._nicknameCooldown) global._nicknameCooldown = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── إعدادات
const DELAY_MIN = 3500;       // أقل تأخير
const DELAY_MAX = 6500;       // أعلى تأخير
const MONITOR_COOLDOWN = 3000;
const LOOP_BASE = 15000;

const randomDelay = (min, max) => min + Math.floor(Math.random() * (max - min));

module.exports = {
  config: {
    name: "كنيات",
    aliases: [],
    description: "تغيير + حذف + مراقبة الكنيات (احترافي)",
    usage: "كنيات [كنية] | كنيات حدف | كنيات مراقبة [كنية] | كنيات ايقاف",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },

  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    const sub = args[0];

    // ── إيقاف
    if (sub === "ايقاف") {
      const job = global._nicknameJobs.get(threadID);
      if (job) job.cancelled = true;

      global._nicknameJobs.delete(threadID);
      global._nicknameMonitor.delete(threadID);

      return api.sendMessage("🛑 تم إيقاف جميع عمليات الكنيات.", threadID);
    }

    // ── مراقبة
    if (sub === "مراقبة") {
      const nickname = args.slice(1).join(" ").trim();
      if (!nickname)
        return api.sendMessage("❌ اكتب الكنية بعد مراقبة.", threadID);

      if (global._nicknameMonitor.has(threadID))
        return api.sendMessage("⚠️ المراقبة مفعلة مسبقاً.", threadID);

      global._nicknameMonitor.set(threadID, nickname);

      // 🔥 LOOP SYSTEM (تمويه بشري)
      (async () => {
        while (global._nicknameMonitor.has(threadID)) {
          const wanted = global._nicknameMonitor.get(threadID);

          let info;
          try {
            info = await new Promise((res, rej) =>
              api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
            );
          } catch {
            await sleep(LOOP_BASE);
            continue;
          }

          const botID = api.getCurrentUserID();
          const members = (info.participantIDs || []).filter(id => id !== botID);

          for (const uid of members) {
            if (!global._nicknameMonitor.has(threadID)) break;

            const current = info.nicknames?.[uid] || "";

            if (current !== wanted) {
              const key = `${threadID}_${uid}`;
              const now = Date.now();
              const last = global._nicknameCooldown.get(key) || 0;

              if (now - last < MONITOR_COOLDOWN) continue;
              global._nicknameCooldown.set(key, now);

              try {
                await new Promise((res, rej) =>
                  api.changeNickname(wanted, threadID, uid, e => e ? rej(e) : res())
                );
              } catch {}

              // تمويه بشري (عشوائي)
              await sleep(randomDelay(1500, 4000));
            }
          }

          // تمويه في وقت اللوب
          await sleep(LOOP_BASE + Math.floor(Math.random() * 5000));
        }
      })();

      return api.sendMessage(`👁️ تم تفعيل المراقبة على "${nickname}"`, threadID);
    }

    // ── حذف
    if (sub === "حدف") {
      if (global._nicknameJobs.has(threadID))
        return api.sendMessage("⚠️ هناك عملية جارية.", threadID);

      let info;
      try {
        info = await new Promise((res, rej) =>
          api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
        );
      } catch (e) {
        return api.sendMessage(`❌ خطأ: ${e.message}`, threadID);
      }

      const botID = api.getCurrentUserID();
      const members = (info.participantIDs || []).filter(id => id !== botID);

      const job = { cancelled: false };
      global._nicknameJobs.set(threadID, job);

      let done = 0, failed = 0;

      for (const uid of members) {
        if (job.cancelled) break;

        try {
          await new Promise((res, rej) =>
            api.changeNickname("", threadID, uid, e => e ? rej(e) : res())
          );
          done++;
        } catch {
          failed++;
        }

        await sleep(randomDelay(DELAY_MIN, DELAY_MAX));
      }

      global._nicknameJobs.delete(threadID);
      return api.sendMessage(`✅ تم حذف ${done} كنية${failed ? ` (فشل ${failed})` : ""}`, threadID);
    }

    // ── تغيير عادي
    const nickname = args.join(" ").trim();
    if (!nickname)
      return api.sendMessage(
        "📛 الأوامر:\n" +
        "• /كنيات [كنية]\n" +
        "• /كنيات حدف\n" +
        "• /كنيات مراقبة [كنية]\n" +
        "• /كنيات ايقاف",
        threadID
      );

    if (global._nicknameJobs.has(threadID))
      return api.sendMessage("⚠️ هناك عملية جارية.", threadID);

    let info;
    try {
      info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );
    } catch (e) {
      return api.sendMessage(`❌ خطأ: ${e.message}`, threadID);
    }

    const botID = api.getCurrentUserID();
    const members = (info.participantIDs || []).filter(id => id !== botID);

    const job = { cancelled: false };
    global._nicknameJobs.set(threadID, job);

    let done = 0, failed = 0;

    for (const uid of members) {
      if (job.cancelled) break;

      try {
        await new Promise((res, rej) =>
          api.changeNickname(nickname, threadID, uid, e => e ? rej(e) : res())
        );
        done++;
      } catch {
        failed++;
      }

      await sleep(randomDelay(DELAY_MIN, DELAY_MAX));
    }

    global._nicknameJobs.delete(threadID);
    return api.sendMessage(`✅ تم تغيير ${done} كنية${failed ? ` (فشل ${failed})` : ""}`, threadID);
  },

  // 🔥 مراقبة فورية
  async handleEvent({ api, event }) {
    const { threadID, logMessageType, logMessageData } = event;

    if (!global._nicknameMonitor.has(threadID)) return;
    if (logMessageType !== "log:thread-nickname") return;

    const targetID = logMessageData.participant_id;
    const newNickname = logMessageData.nickname || "";
    const wanted = global._nicknameMonitor.get(threadID);

    if (newNickname === wanted) return;

    const key = `${threadID}_${targetID}`;
    const now = Date.now();
    const last = global._nicknameCooldown.get(key) || 0;

    if (now - last < MONITOR_COOLDOWN) return;
    global._nicknameCooldown.set(key, now);

    try {
      await new Promise((res, rej) =>
        api.changeNickname(wanted, threadID, targetID, e => e ? rej(e) : res())
      );
    } catch {}
  }
};
