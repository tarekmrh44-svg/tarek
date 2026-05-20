"use strict";

if (!global._nicknameJobs)    global._nicknameJobs    = new Map();
if (!global._nicknameMonitor) global._nicknameMonitor = new Map();
if (!global._nicknameCooldown)global._nicknameCooldown= new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));

const MONITOR_COOLDOWN = 300;
const LOOP_BASE        = 1500;
const BATCH_SIZE       = 20;   // عدد الطلبات المتوازية — سريع جداً
const BATCH_DELAY      = 80;   // تأخير بين كل دفعة

async function getMembers(api, threadID) {
  const info = await new Promise((res, rej) =>
    api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
  );
  const botID = api.getCurrentUserID();
  return (info.participantIDs || []).filter(id => id !== botID);
}

async function setNicknameBatch(api, members, nickname, threadID, job) {
  let done = 0, failed = 0;

  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    if (job.cancelled) break;

    const batch = members.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(uid =>
        new Promise((res, rej) =>
          api.changeNickname(nickname, threadID, uid, e => e ? rej(e) : res())
        )
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") done++;
      else failed++;
    }

    if (i + BATCH_SIZE < members.length) await sleep(BATCH_DELAY);
  }

  return { done, failed };
}

module.exports = {
  config: {
    name: "كنيات",
    aliases: ["nick", "كنية"],
    description: "تغيير + حذف + مراقبة الكنيات بسرعة عالية",
    usage: "كنيات [كنية] | كنيات حدف | كنيات مراقبة [كنية] | كنيات ايقاف",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },

  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    const sub = args[0];

    // ── إيقاف ──────────────────────────────────────────────────────
    if (sub === "ايقاف") {
      const job = global._nicknameJobs.get(threadID);
      if (job) job.cancelled = true;
      global._nicknameJobs.delete(threadID);
      global._nicknameMonitor.delete(threadID);
      return api.sendMessage("🛑 تم إيقاف جميع عمليات الكنيات.", threadID);
    }

    // ── مراقبة ─────────────────────────────────────────────────────
    if (sub === "مراقبة") {
      const nickname = args.slice(1).join(" ").trim();
      if (!nickname)
        return api.sendMessage("❌ اكتب الكنية بعد مراقبة.\nمثال: /كنيات مراقبة ⚡أعضاء", threadID);

      if (global._nicknameMonitor.has(threadID))
        return api.sendMessage("⚠️ المراقبة مفعلة مسبقاً، استخدم /كنيات ايقاف أولاً.", threadID);

      global._nicknameMonitor.set(threadID, nickname);

      (async () => {
        while (global._nicknameMonitor.has(threadID)) {
          const wanted = global._nicknameMonitor.get(threadID);
          try {
            const info = await new Promise((res, rej) =>
              api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
            );
            const botID = api.getCurrentUserID();
            const members = (info.participantIDs || []).filter(id => id !== botID);

            const toFix = members.filter(uid => {
              const cur = info.nicknames?.[uid] || "";
              const key = `${threadID}_${uid}`;
              const now = Date.now();
              const last = global._nicknameCooldown.get(key) || 0;
              return cur !== wanted && (now - last) >= MONITOR_COOLDOWN;
            });

            if (toFix.length) {
              await Promise.allSettled(
                toFix.map(uid => {
                  global._nicknameCooldown.set(`${threadID}_${uid}`, Date.now());
                  return new Promise((res, rej) =>
                    api.changeNickname(wanted, threadID, uid, e => e ? rej(e) : res())
                  );
                })
              );
            }
          } catch {}

          await sleep(LOOP_BASE);
        }
      })();

      return api.sendMessage(`👁️ مراقبة مفعلة على الكنية: "${nickname}"\nسيتم تصحيح أي تغيير فوراً ✅`, threadID);
    }

    // ── حذف ────────────────────────────────────────────────────────
    if (sub === "حدف" || sub === "حذف") {
      if (global._nicknameJobs.has(threadID))
        return api.sendMessage("⚠️ هناك عملية جارية بالفعل.", threadID);

      let members;
      try {
        members = await getMembers(api, threadID);
      } catch (e) {
        return api.sendMessage(`❌ خطأ: ${e.message}`, threadID);
      }

      api.sendMessage(`⚡ جاري حذف ${members.length} كنية بسرعة...`, threadID);

      const job = { cancelled: false };
      global._nicknameJobs.set(threadID, job);

      const { done, failed } = await setNicknameBatch(api, members, "", threadID, job);

      global._nicknameJobs.delete(threadID);
      return api.sendMessage(
        `✅ تم حذف الكنيات!\n` +
        `━━━━━━━━━━\n` +
        `✔️ ناجح: ${done}\n` +
        `${failed ? `❌ فشل: ${failed}` : ""}`.trim(),
        threadID
      );
    }

    // ── تغيير ──────────────────────────────────────────────────────
    const nickname = args.join(" ").trim();
    if (!nickname)
      return api.sendMessage(
        "📛 أوامر الكنيات:\n" +
        "━━━━━━━━━━\n" +
        "• /كنيات [كنية] — تغيير الكنية للكل\n" +
        "• /كنيات حذف — حذف جميع الكنيات\n" +
        "• /كنيات مراقبة [كنية] — تثبيت الكنية تلقائياً\n" +
        "• /كنيات ايقاف — إيقاف المراقبة",
        threadID
      );

    if (global._nicknameJobs.has(threadID))
      return api.sendMessage("⚠️ هناك عملية جارية بالفعل.", threadID);

    let members;
    try {
      members = await getMembers(api, threadID);
    } catch (e) {
      return api.sendMessage(`❌ خطأ: ${e.message}`, threadID);
    }

    api.sendMessage(`⚡ جاري تغيير ${members.length} كنية إلى "${nickname}"...`, threadID);

    const job = { cancelled: false };
    global._nicknameJobs.set(threadID, job);

    const { done, failed } = await setNicknameBatch(api, members, nickname, threadID, job);

    global._nicknameJobs.delete(threadID);
    return api.sendMessage(
      `✅ تم تغيير الكنيات!\n` +
      `━━━━━━━━━━\n` +
      `الكنية: "${nickname}"\n` +
      `✔️ ناجح: ${done}\n` +
      `${failed ? `❌ فشل: ${failed}` : ""}`.trim(),
      threadID
    );
  },

  // مراقبة فورية عند تغيير كنية
  async handleEvent({ api, event }) {
    const { threadID, logMessageType, logMessageData } = event;
    if (!global._nicknameMonitor.has(threadID)) return;
    if (logMessageType !== "log:thread-nickname") return;

    const targetID   = logMessageData.participant_id;
    const newNick    = logMessageData.nickname || "";
    const wanted     = global._nicknameMonitor.get(threadID);
    if (newNick === wanted) return;

    const key = `${threadID}_${targetID}`;
    const now = Date.now();
    if (now - (global._nicknameCooldown.get(key) || 0) < MONITOR_COOLDOWN) return;
    global._nicknameCooldown.set(key, now);

    try {
      await new Promise((res, rej) =>
        api.changeNickname(wanted, threadID, targetID, e => e ? rej(e) : res())
      );
    } catch {}
  },
};
