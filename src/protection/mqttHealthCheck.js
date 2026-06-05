/**
 * DAVID V1 — MQTT Health Check (Layer 6)
 * Copyright © 2025
 */
"use strict";
let _t = null, _count = 0;
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const getCfg = () => {
  const c = global.GoatBot?.config?.mqttHealthCheck || {};
  return { enable: c.enable !== false, silentMs: (c.silentTimeoutMinutes||10)*60000,
           minMs: (c.checkIntervalMinMinutes||2)*60000, maxMs: (c.checkIntervalMaxMinutes||5)*60000,
           maxR: c.maxRestarts||5, notify: c.notifyAdmins !== false };
};
function markActivity() { global.lastMqttActivity = Date.now(); }
async function doCheck() {
  const cfg = getCfg();
  if (!cfg.enable || !global.GoatBot?.fcaApi) return;
  const last   = global.lastMqttActivity || global.GoatBot?.startTime || Date.now();
  const silent = Date.now() - last;
  if (silent < cfg.silentMs) { _count = 0; return; }
  if (_count >= cfg.maxR) return;
  _count++;
  global.log?.warn?.("MQTT_HEALTH", `صمت ${Math.round(silent/60000)}دق — إعادة (#${_count})`);
  // FIX: use callback style, NOT .catch() — sendMessage is NOT a Promise
  if (cfg.notify) {
    try {
      const api = global.GoatBot?.fcaApi;
      const ids = [...(global.GoatBot?.config?.adminBot||[]),...(global.GoatBot?.config?.superAdminBot||[])];
      const msg = `⚠️ [𝐀𝐢𝐳𝐞𝐧] إعادة الاتصال التلقائية (#${_count})`;
      if (api) for (const id of ids) { try { api.sendMessage(msg, String(id), () => {}); } catch(_) {} }
    } catch (_) {}
  }
  try {
    await global.GoatBot?.reLoginBot?.();
    _count = 0; // FIX: reset count after successful relogin attempt
  } catch (_) {}
}
function schedule() {
  const cfg = getCfg();
  _t = setTimeout(async () => { try { await doCheck(); } catch(_) {} schedule(); }, rand(cfg.minMs, cfg.maxMs));
}
function startHealthCheck() { if (!_t) schedule(); }
function stopHealthCheck()  { if (_t) { clearTimeout(_t); _t = null; } }
module.exports = { startHealthCheck, stopHealthCheck, markActivity };
