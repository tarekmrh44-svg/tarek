const RELATIONS = [
  { msg: "💍 إيه يا حظي! {sender} جوزها في الغروب هو {target} 😂💍" },
  { msg: "💍 مبروك {sender}! جوزها في الغروب هي {target} 😂💍" },
  { msg: "👦 {target} هو أخو {sender} في الغروب ❤️" },
  { msg: "👧 {target} هي أخت {sender} في الغروب ❤️" },
  { msg: "👨 {target} هو أبو {sender} في الغروب 😂" },
  { msg: "👩 {target} هي أم {sender} في الغروب ❤️" },
  { msg: "🤝 {target} هو الصديق المفضّل لـ {sender} في الغروب 💙" },
  { msg: "😈 انتبه! {target} هو عدو {sender} في الغروب 🔥" },
  { msg: "💒 مبروك! عريس {sender} في الغروب هو {target} 🎉" },
  { msg: "👰 مبروك! عروسة {sender} في الغروب هي {target} 🎉" },
  { msg: "👯 {sender} و{target} توأمين في الغروب ✨" },
  { msg: "🥊 {target} خصم {sender} في الغروب 😂" },
  { msg: "💕 واو! حبيب {sender} في الغروب هو {target} 😳" },
  { msg: "🏆 {target} هو أفضل رفيق لـ {sender} في الغروب 👑" },
  { msg: "👦 {target} هو ابن {sender} في الغروب 😂" },
  { msg: "👧 {target} هي بنت {sender} في الغروب 😂" },
  { msg: "🏘️ {target} هو جار {sender} في الغروب 😅" },
  { msg: "📚 {target} هو معلّم {sender} في الغروب 👏" },
  { msg: "🎒 {target} هو تلميذ {sender} في الغروب 😂" },
  { msg: "👔 {target} هو رئيس {sender} في الغروب 😂" },
  { msg: "😎 {target} هو الأكول في الغروب وأكيد يطلب من {sender} 😂" },
  { msg: "🌹 {sender} عاشق/ة {target} من أول نظرة في الغروب 😳💘" },
  { msg: "🤡 {target} هو مهرّج {sender} في الغروب 🤡😂" },
  { msg: "🛡️ {target} هو حارس {sender} الشخصي في الغروب 💪" },
];

module.exports = {
  config: {
    name: "علاقة",
    aliases: ["relation", "زوجة", "زواج", "علاقات"],
    description: "اعرف علاقتك بشخص عشوائي في الغروب 💍",
    usage: "علاقة",
    adminOnly: false,
  },
  async run({ api, event, threadID, senderID, senderName }) {
    let myName = senderName;
    if (!myName) {
      try {
        const info = await api.getUserInfo(senderID);
        if (info && info[senderID]) myName = info[senderID].name;
        else myName = "أنت";
      } catch { myName = "أنت"; }
    }

    let members = [];
    try {
      const threadInfo = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => e ? rej(e) : res(d))
      );
      members = (threadInfo.participantIDs || []).filter(id => id !== senderID);
    } catch {}

    if (!members.length)
      return api.sendMessage("😅 ما في أحد ثاني في الغروب أختاره!", threadID);

    const targetID = members[Math.floor(Math.random() * members.length)];

    let targetName = "شخص مجهول";
    try {
      const info = await api.getUserInfo(targetID);
      if (info && info[targetID]) targetName = info[targetID].name;
    } catch {}

    const rel = RELATIONS[Math.floor(Math.random() * RELATIONS.length)];
    const msg = rel.msg
      .replace(/{sender}/g, myName)
      .replace(/{target}/g, targetName);

    api.sendMessage(
      `💫 العلاقة العشوائية:\n━━━━━━━━━━\n${msg}\n\n🔄 اكتب الأمر مرة ثانية للحصول على علاقة جديدة!`,
      threadID
    );
  },
};
