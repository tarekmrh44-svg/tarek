"use strict";

/**
 * Human Typing Simulation — WHITE Engine
 * ==========================================
 * يعمل على مستوى api.sendMessage مباشرةً.
 * أي أمر (حالي أو مستقبلي) يستدعي api.sendMessage
 * سيحصل تلقائياً على مؤشر الكتابة + تأخير واقعي
 * بدون أي تعديل في كود الأمر.
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── حساب مدة الكتابة بناءً على طول النص ──────────────────────────────────
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * يستخرج النص من أي صيغة رسالة
 * @param {string|object} msg
 * @returns {string}
 */
function extractText(msg) {
  if (!msg) return "";
  if (typeof msg === "string") return msg;
  if (typeof msg === "object") {
    return msg.body || msg.message || msg.text || "";
  }
  return "";
}

/**
 * يحسب مدة الكتابة الواقعية بناءً على طول النص
 * متوسط إنسان: ~40 كلمة/دقيقة = ~200 حرف/دقيقة
 * البوت "يفكر" أسرع — نستخدم 25-50ms لكل حرف مع تشويش
 * @param {string} text
 * @returns {number} milliseconds
 */
function calcTypingDelay(text) {
  const len = (text || "").length;
  if (len === 0) return randInt(600, 1200);

  // 35ms لكل حرف، حد أدنى 700ms، حد أقصى 7000ms
  const base = Math.min(Math.max(len * 35, 700), 7000);

  // تشويش ±25% لمحاكاة الطباعة غير المنتظمة
  const jitter = base * (0.75 + Math.random() * 0.50);

  return Math.round(jitter);
}

// ─── إرسال مؤشر الكتابة ─────────────────────────────────────────────────────
async function sendTypingIndicator(api, threadID) {
  try {
    await new Promise((resolve) => {
      // بعض إصدارات fca ترجع promise وبعضها callback
      const result = api.sendTypingIndicator(threadID, () => resolve());
      if (result && typeof result.then === "function") {
        result.then(resolve).catch(resolve);
      }
      // ضمان الحل في كل الأحوال
      setTimeout(resolve, 500);
    });
  } catch (_) {}
}

// ─── المحاكاة الكاملة: مؤشر + انتظار ─────────────────────────────────────
/**
 * @param {object} api
 * @param {string} threadID
 * @param {string|object} msg  - الرسالة التي ستُرسل (لحساب الطول)
 */
async function simulateTyping(api, threadID, msg) {
  const cfg = global.config?.humanTyping || {};
  if (cfg.enable === false) return;

  const text = extractText(msg);
  const delay = calcTypingDelay(text);

  // أرسل مؤشر الكتابة
  await sendTypingIndicator(api, threadID);

  // انتظر المدة الواقعية
  await sleep(delay);

  // وقفة صغيرة قبل الإرسال (كأن الإنسان يراجع الرسالة)
  await sleep(randInt(150, 450));
}

// ─── تغليف api.sendMessage ─────────────────────────────────────────────────
/**
 * يُغلّف api.sendMessage بحيث يُظهر الكتابة تلقائياً قبل كل رسالة.
 * يُستدعى مرة واحدة بعد تسجيل الدخول (وبعد كل hot-swap).
 * @param {object} api
 */
function wrapWithTyping(api) {
  // منع التغليف المزدوج
  if (api.__typingWrapped) {
    console.log("[HUMAN_TYPING] ⚡ Already wrapped — skipping");
    return;
  }
  api.__typingWrapped = true;

  // احتفظ بالدالة الأصلية
  const _originalSend = api.sendMessage.bind(api);

  /**
   * النسخة المُغلَّفة من sendMessage
   * تدعم جميع أشكال الاستدعاء:
   *   sendMessage(msg, threadID)
   *   sendMessage(msg, threadID, callback)
   *   sendMessage(msg, threadID, callback, messageID)   ← reply
   */
  api.sendMessage = async function wrappedSendMessage(msg, threadID, callback, messageID) {
    // محاكاة الكتابة (ستُتخطى إذا كانت معطّلة في الإعدادات)
    try {
      await simulateTyping(api, threadID, msg);
    } catch (_) {}

    // أرسل الرسالة الفعلية
    return _originalSend(msg, threadID, callback, messageID);
  };

  console.log("[HUMAN_TYPING] ✅ api.sendMessage wrapped — typing simulation active for ALL commands");
}

// ─── إلغاء التغليف (للاستخدام الداخلي عند hot-swap) ───────────────────────
function unwrapTyping(api) {
  if (!api.__typingWrapped) return;
  // ليس ضرورياً إلغاء التغليف — hot-swap يُنشئ api جديد دائماً
  delete api.__typingWrapped;
}

module.exports = { wrapWithTyping, unwrapTyping, simulateTyping, calcTypingDelay };
