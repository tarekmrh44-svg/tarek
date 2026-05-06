"use strict";
/**
 * كنيات — تغيير كنيات أعضاء المجموعة
 * أوامر: /كنيات [كنية] | /كنيات حدف | /كنيات ايقاف
 */

if (!global._nicknameJobs) global._nicknameJobs = new Map();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const DELAY_MS = 4500; // 4.5 ثانية بين كل كنية

module.exports = {
  config: {
    name: "كنيات",
    aliases: [],
    description: "تغيير كنيات جميع أعضاء المجموعة | /كنيات [كنية] | /كنيات حدف | /كنيات ايقاف",
    usage: "كنيات [كنية] | كنيات حدف | كنيات ايقاف",
    adminOnly: true,
    ownerOnly: false,
    category: "admin",
  },
  async run({ api, event, args, threadID, senderID }) {
    if (!global.isAdmin(senderID))
      return api.sendMessage("❌ هذا الأمر لأدمن البوت فقط.", threadID);

    const sub = args[0];

    // ── /كنيات ايقاف
    if (sub === "ايقاف") {
      const job = global._nicknameJobs.get(threadID);
      if (!job) return api.sendMessage("⚠️ لا توجد عملية تغيير كنيات جارية.", threadID);
      job.cancelled = true;
      global._nicknameJobs.delete(threadID);
      return api.sendMessage("🛑 توقّف تغيير الكنيات.", threadID);
    }

    // ── /كنيات حدف
    if (sub === "حدف") {
      if (global._nicknameJobs.has(threadID))
        return api.sendMessage("⚠️ هناك عملية جارية — أرسل /كنيات ايقاف أولاً.", threadID);

      let info;
      try {
        info = await new Promise((res, rej) => api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d)));
      } catch (e) { return api.sendMessage(`❌ تعذّر جلب معلومات المجموعة: ${e.message}`, threadID); }

      const participants = info.participantIDs || [];
      const botID = api.getCurrentUserID();
      const members = participants.filter(id => id !== botID);

      const job = { cancelled: false };
      global._nicknameJobs.set(threadID, job);
      api.sendMessage(`🗑️ جارٍ حذف ${members.length} كنية…`, threadID);

      let done = 0, failed = 0;
      for (const uid of members) {
        if (job.cancelled) break;
        try {
          await new Promise((res, rej) => api.changeNickname("", threadID, uid, (e) => e ? rej(e) : res()));
          done++;
        } catch (_) { failed++; }
        if (done + failed < members.length) await sleep(DELAY_MS);
      }

      global._nicknameJobs.delete(threadID);
      return api.sendMessage(`✅ حُذفت ${done} كنية${failed ? ` (فشل ${failed})` : ""}.`, threadID);
    }

    // ── /كنيات [كنية]
    const nickname = args.join(" ").trim();
    if (!nickname)
      return api.sendMessage(
        "📛 أوامر الكنيات:\n" +
        "• /كنيات [كنية] — تغيير كنية كل الأعضاء\n" +
        "• /كنيات حدف — حذف كل الكنيات\n" +
        "• /كنيات ايقاف — إيقاف العملية الجارية", threadID);

    if (global._nicknameJobs.has(threadID))
      return api.sendMessage("⚠️ هناك عملية جارية — أرسل /كنيات ايقاف أولاً.", threadID);

    let info;
    try {
      info = await new Promise((res, rej) => api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d)));
    } catch (e) { return api.sendMessage(`❌ تعذّر جلب معلومات المجموعة: ${e.message}`, threadID); }

    const participants = info.participantIDs || [];
    const botID = api.getCurrentUserID();
    const members = participants.filter(id => id !== botID);

    if (!members.length) return api.sendMessage("⚠️ لا يوجد أعضاء في هذه المجموعة.", threadID);

    const job = { cancelled: false };
    global._nicknameJobs.set(threadID, job);
    api.sendMessage(`📛 جارٍ تغيير ${members.length} كنية إلى "${nickname}"…\n(تأخير 4.5 ثانية بين كل كنية)`, threadID);

    let done = 0, failed = 0;
    for (const uid of members) {
      if (job.cancelled) break;
      try {
        await new Promise((res, rej) => api.changeNickname(nickname, threadID, uid, (e) => e ? rej(e) : res()));
        done++;
      } catch (_) { failed++; }
      if (done + failed < members.length) await sleep(DELAY_MS);
    }

    global._nicknameJobs.delete(threadID);
    const cancelled = job.cancelled ? " (أُوقف يدوياً)" : "";
    return api.sendMessage(`✅ تم تغيير ${done} كنية إلى "${nickname}"${failed ? ` (فشل ${failed})` : ""}${cancelled}.`, threadID);
  },
};
