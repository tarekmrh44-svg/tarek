/**
 * DAVID V1 — Unified Event Handler
 * Copyright © 2025
 */
"use strict";

const rateLimit = require("../protection/rateLimit");

// ─── Message deduplication cache ─────────────────────────────────────────────
// Prevents duplicate processing when multiple listeners fire for the same event
const _seen = new Map(); // messageID → timestamp
const DEDUP_TTL = 60000; // 60 seconds
function isDuplicate(mid) {
  if (!mid) return false;
  const now = Date.now();
  // Clean expired entries
  if (_seen.size > 200) {
    for (const [k, ts] of _seen) { if (now - ts > DEDUP_TTL) _seen.delete(k); }
  }
  if (_seen.has(mid)) return true;
  _seen.set(mid, now);
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRole(senderID) {
  const cfg    = global.GoatBot?.config || {};
  const sid    = String(senderID);
  const supers = [...(cfg.superAdminBot || []), cfg.ownerID].filter(Boolean).map(String);
  const admins = (cfg.adminBot || []).map(String);
  if (supers.includes(sid)) return 3;
  if (admins.includes(sid)) return 2;
  return 0;
}

function buildMessage(api, event) {
  return {
    reply: (msg, cb) => {
      try { api.sendMessage(msg, event.threadID, cb); } catch (_) {}
    },
    unsend: (mid, cb) => { try { api.unsendMessage(mid || event.messageID, cb || (() => {})); } catch (_) {} },
    react:  (emoji, mid, cb) => { try { api.setMessageReaction(emoji, mid || event.messageID, () => {}, true); } catch (_) {} },
    send:   (msg, tid, cb)   => { try { api.sendMessage(msg, tid || event.threadID, cb); } catch (_) {} },
  };
}

// ─── Anti-Flood ───────────────────────────────────────────────────────────────
function checkFlood(tid, sid) {
  const cfg = global.GoatBot?.config?.rateLimit || {};
  return rateLimit.check(`flood:${tid}:${sid}`, cfg.maxMessagesPerWindow || 8, cfg.windowMs || 6000).exceeded;
}
function checkSpam(sid) {
  return rateLimit.check(`spam:${sid}`, 20, 30000).exceeded;
}

// ─── onReply callbacks ────────────────────────────────────────────────────────
async function handleReply(api, event) {
  const replyMap   = global.GoatBot?.onReply;
  if (!replyMap?.size) return false;
  const replyMsgID = event.messageReply?.messageID;
  if (!replyMsgID) return false;

  for (const [key, handler] of replyMap) {
    if (handler.messageID === replyMsgID &&
        (!handler.author || String(handler.author) === String(event.senderID))) {
      replyMap.delete(key);
      try {
        await handler.callback({
          api, event, message: buildMessage(api, event),
          args: (event.body || "").trim().split(/\s+/).filter(Boolean),
        });
      } catch (e) { global.log?.error?.("REPLY_CB", e.message); }
      return true;
    }
  }
  return false;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
async function onEventCmds(api, event, commands) {
  if (!event || !api) return;
  global.lastMqttActivity = Date.now();

  const { type, senderID, threadID, body = "", messageID } = event;
  if (!senderID || !threadID) return;

  // FIX: skip if this exact message was already processed (duplicate listener bug)
  if (isDuplicate(messageID)) return;

  // Dashboard stats
  try {
    if (typeof global._bufferMsg === "function") global._bufferMsg({ ...event, ts: Date.now() });
    if (typeof global._trackMsg  === "function") global._trackMsg(threadID, senderID, body);
  } catch (_) {}

  // onEvent commands (join/leave/image etc)
  if (type !== "message" && type !== "message_reply") {
    const allCmds = commands || global.GoatBot?.commands;
    if (allCmds) {
      for (const [, cmd] of allCmds) {
        if (typeof cmd.onEvent === "function") {
          try { await cmd.onEvent({ api, event, message: buildMessage(api, event) }); } catch (_) {}
        }
      }
    }
    return;
  }

  // onReply callbacks
  if (type === "message_reply" || event.messageReply) {
    if (await handleReply(api, event)) return;
  }

  if (type !== "message") return;
  if (!body.trim()) return;

  // DM lock
  if (global.GoatBot?.dmLocked && !event.isGroup) return;

  // Flood / Spam
  if (checkFlood(threadID, senderID)) return;
  if (checkSpam(senderID)) return;

  // Admin-only mode
  const adminOnly = global.GoatBot?.config?.adminOnly?.enable;
  const role      = getRole(senderID);
  if (adminOnly && role < 2) return;

  // Prefix check
  const prefix = global.GoatBot?.config?.prefix || "/";
  if (!body.trimStart().startsWith(prefix)) return;

  const parts   = body.trimStart().slice(prefix.length).trim().split(/\s+/);
  const cmdName = (parts[0] || "").toLowerCase();
  const args    = parts.slice(1);
  if (!cmdName) return;

  const allCmds = commands || global.GoatBot?.commands;
  const cmd     = allCmds?.get(cmdName);
  if (!cmd) return;

  // Thread-level command control
  try {
    const ctrl = require("../utils/cmdControl");
    if (!ctrl.isEnabled(threadID, cmd.config?.name || cmdName)) return;
  } catch (_) {}

  // Permission check
  const required = cmd.config?.role ?? 2;
  if (role < required) {
    try { api.sendMessage("⛔ هذا الأمر للأدمن فقط.", threadID); } catch (_) {}
    return;
  }

  // Execute command
  const ctx = { api, event, args, commandName: cmdName, message: buildMessage(api, event), prefix, role, senderID, threadID };
  try {
    if (typeof cmd.onStart === "function") await cmd.onStart(ctx);
    else if (typeof cmd.run === "function") await cmd.run(ctx);
  } catch (e) {
    global.log?.error?.("CMD", `خطأ في /${cmdName}: ${e.message}`);
    try { api.sendMessage(`❌ خطأ في الأمر: ${e.message}`, threadID); } catch (_) {}
  }
}

module.exports = onEventCmds;
