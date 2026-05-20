const timers = new Map();

module.exports = {
  config: {
    name: "عد",
    aliases: ["timer", "countdown"],
    description: "عد تنازلي بالثواني ثم يُعلمك",
    usage: "عد <ثواني> [رسالة]",
    adminOnly: false,
  },
  async run({ api, event, args, threadID, senderID }) {
    const seconds = parseInt(args[0]);
    if (!seconds || seconds <= 0 || seconds > 3600)
      return api.sendMessage("❌ اكتب عدد ثوانٍ صحيح (1 - 3600)\nمثال: /عد 60 صلاة", threadID);

    const label = args.slice(1).join(" ") || "المؤقت";

    if (timers.has(`${threadID}_${senderID}`))
      return api.sendMessage("⏳ عندك مؤقت يعمل بالفعل، انتظر حتى ينتهي.", threadID);

    timers.set(`${threadID}_${senderID}`, true);
    api.sendMessage(`✅ تم ضبط مؤقت "${label}" لمدة ${seconds} ثانية ⏱️`, threadID);

    setTimeout(() => {
      timers.delete(`${threadID}_${senderID}`);
      api.sendMessage(`⏰ انتهى مؤقت "${label}"! 🔔`, threadID);
    }, seconds * 1000);
  },
};
