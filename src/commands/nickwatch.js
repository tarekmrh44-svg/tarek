/**
 * /nickwatch — نظام مراقبة الكنيات (Nickname Watcher)
 * يرصد أي تغيير للكنية ويعيدها تلقائياً في الثانية نفسها
 * Copyright © 2025
 */
"use strict";

const fs   = require("fs-extra");
const path = require("path");
const DATA = path.join(process.cwd(), "database/data/nickwatch.json");

function load() {
  try { if (fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA, "utf8")); } catch (_) {}
  return {};
}
function save(d) {
  try { fs.ensureDirSync(path.dirname(DATA)); fs.writeFileSync(DATA, JSON.stringify(d, null, 2)); } catch (_) {}
}

if (!global._nickWatch) global._nickWatch = load();

function getState(tid) {
  return global._nickWatch[String(tid)] || { active: false, mode: "fixed", defaultName: "", memberNames: {}, log: [] };
}
function setState(tid, s) {
  global._nickWatch[String(tid)] = s;
  save(global._nickWatch);
}

function isAdmin(id) {
  return (global.GoatBot?.config?.adminBot || []).map(String).includes(String(id));
}

function setNick(api, name, tid, uid) {
  return new Promise(res => {
    try { api.changeNickname(name, tid, uid, e => res(!e)); }
    catch (_) { res(false); }
  });
}

async function getMemberName(api, uid) {
  try {
    const info = await new Promise((res, rej) => api.getUserInfo(uid, (e, d) => e ? rej(e) : res(d)));
    return info?.[uid]?.name || String(uid);
  } catch (_) { return String(uid); }
}

function getTargetName(state, uid) {
  if (state.mode === "custom" && state.memberNames?.[uid]) return state.memberNames[uid];
  if (state.mode === "fixed" && state.defaultName)        return state.defaultName;
  return "";
}

async function handleNickChange(api, event) {
  const tid   = String(event.threadID);
  const state = getState(tid);
  if (!state.active) return;

  const changedUID = event.logMessageData?.participant_id
                  || event.logMessageData?.userId
                  || null;
  const newNick    = event.logMessageData?.nickname || "";
  const byUID      = event.logMessageData?.changed_by || event.senderID;

  if (!changedUID) return;

  const targetName = getTargetName(state, String(changedUID));
  if (newNick === targetName) return;

  if (!state.log) state.log = [];
  state.log.unshift({ ts: Date.now(), uid: String(changedUID), by: String(byUID), from: newNick, to: targetName });
  if (state.log.length > 50) state.log = state.log.slice(0, 50);

  await new Promise(r => setTimeout(r, 600));

  const ok = await setNick(api, targetName, tid, String(changedUID));

  if (ok && String(byUID) !== String(global.GoatBot?.botID)) {
    const changer = await getMemberName(api, byUID);
    try {
      api.sendMessage(
        "🔒 رُصد تغيير كنية\n" +
        "👤 المُغيِّر: " + changer + "\n" +
        "📝 الكنية المُعادة: \"" + (targetName || "(فارغ)") + "\"",
        tid
      );
    } catch (_) {}
  }

  setState(tid, state);
}

module.exports = {
  config: {
    name: "nickwatch",
    aliases: ["nw","watchnick","مراقبة","مراقبه","مراقبة_كنيات","حماية_كنيات"],
    version: "1.0",
    author: "𝐀𝐢𝐳𝐞𝐧",
    countDown: 3,
    role: 2,
    category: "management",
    description: "مراقبة الكنيات وإعادتها تلقائياً عند أي تغيير",
    guide: {
      en: "{pn} on [اسم] — تفعيل مع اسم موحد\n{pn} block — حظر أي تغيير\n{pn} set [uid] [اسم] — اسم مخصص لعضو\n{pn} off — إيقاف\n{pn} status — الحالة\n{pn} log — سجل التغييرات"
    }
  },

  onEvent: async function({ api, event }) {
    const nick_types = ["log:user-nickname", "log:thread-nickname"];
    if (!nick_types.includes(event.logMessageType)) return;
    try { await handleNickChange(api, event); } catch (_) {}
  },

  onStart: async function({ api, event, args, message }) {
    const tid = String(event.threadID);
    if (!isAdmin(event.senderID)) return message.reply("⛔ للأدمن فقط.");

    const sub = (args[0] || "").toLowerCase();
    let state = getState(tid);

    if (!sub || sub === "status" || sub === "حالة") {
      const modeLabel = state.mode === "block"  ? "🚫 حظر كامل"
                      : state.mode === "custom" ? "🎨 مخصص لكل عضو"
                      : "📌 اسم موحد";
      return message.reply(
        "╔══════════════════════════════════╗\n" +
        "║   🔍 NickWatch — حالة المراقبة   ║\n" +
        "╠══════════════════════════════════╣\n" +
        "║  📡 الحالة : " + (state.active ? "🟢 مفعل" : "🔴 معطل") + "\n" +
        "║  ⚙️  الوضع  : " + modeLabel + "\n" +
        "║  📝 الاسم  : " + (state.defaultName || "—") + "\n" +
        "║  📊 سجل    : " + (state.log || []).length + " تغيير مرصود\n" +
        "╚══════════════════════════════════╝"
      );
    }

    if (sub === "off" || sub === "إيقاف") {
      state.active = false;
      setState(tid, state);
      return message.reply("✅ تم إيقاف مراقبة الكنيات.\n🔓 يمكن الآن تغيير الكنيات بحرية.");
    }

    if (sub === "block" || sub === "حظر") {
      state.active = true;
      state.mode   = "block";
      setState(tid, state);
      return message.reply(
        "🚫 وضع الحظر الكامل مفعّل\n" +
        "🔒 أي تغيير للكنية سيُعاد إلى الاسم الأصلي فوراً."
      );
    }

    if (sub === "on" || sub === "تفعيل") {
      const name = args.slice(1).join(" ").trim();
      if (!name) return message.reply(
        "❌ اكتب الاسم المراد تثبيته.\n" +
        "مثال: /nickwatch on 𝐀𝐢𝐳𝐞𝐧\n\n" +
        "أو /nickwatch block لحظر أي تغيير."
      );
      state.active      = true;
      state.mode        = "fixed";
      state.defaultName = name;
      setState(tid, state);

      message.reply("✅ مراقبة الكنيات مفعلة\n📝 الاسم المثبَّت: \"" + name + "\"\n⏳ جاري تطبيق الكنية على الأعضاء…");
      try {
        const info = await new Promise((res, rej) => api.getThreadInfo(tid, (e, d) => e ? rej(e) : res(d)));
        const members = (info?.participantIDs || []).filter(uid => String(uid) !== String(global.GoatBot?.botID));
        let count = 0;
        for (const uid of members) {
          await setNick(api, name, tid, String(uid));
          count++;
          await new Promise(r => setTimeout(r, 800));
        }
        message.reply("✅ تم تطبيق الكنية على " + count + " عضو.\n🔒 أي تغيير سيُعاد تلقائياً.");
      } catch (e) {
        message.reply("⚠️ المراقبة مفعلة لكن فشل التطبيق: " + e.message);
      }
      return;
    }

    if (sub === "set" || sub === "تخصيص") {
      const uid  = args[1];
      const name = args.slice(2).join(" ").trim();
      if (!uid || !name) return message.reply(
        "❌ صيغة خاطئة.\nمثال: /nickwatch set 100012345678 𝐀𝐢𝐳𝐞𝐧"
      );
      const targetUID = uid === "me" ? String(event.senderID) : String(uid);
      if (!state.memberNames) state.memberNames = {};
      state.memberNames[targetUID] = name;
      state.active = true;
      state.mode   = "custom";
      setState(tid, state);
      await setNick(api, name, tid, targetUID);
      return message.reply("✅ تم تخصيص كنية \"" + name + "\" للعضو " + targetUID + "\n🔒 ستُراقب تلقائياً.");
    }

    if (sub === "log" || sub === "سجل") {
      const entries = (state.log || []).slice(0, 10);
      if (!entries.length) return message.reply("📋 لا يوجد سجل تغييرات بعد.");
      let body = "📋 سجل تغييرات الكنيات (آخر 10):\n━━━━━━━━━━━━━━━━\n";
      for (const e of entries) {
        const d = new Date(e.ts).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
        body += "⏱ " + d + " | 👤 " + e.uid + "\n  من: \"" + (e.from || "—") + "\" ← \"" + (e.to || "(فارغ)") + "\"\n\n";
      }
      return message.reply(body.trim());
    }

    message.reply(
      "📌 أوامر NickWatch:\n━━━━━━━━━━━━━━━━━\n" +
      "/nickwatch on [اسم] — مراقبة مع اسم موحد\n" +
      "/nickwatch block     — حظر أي تغيير\n" +
      "/nickwatch set [uid] [اسم] — اسم لعضو محدد\n" +
      "/nickwatch off       — إيقاف\n" +
      "/nickwatch status    — الحالة\n" +
      "/nickwatch log       — سجل التغييرات"
    );
  }
};
