const FORTUNES = [
  "🌟 حظك اليوم رائع! ستحقق شيئاً تفخر به",
  "💫 يوم مميز بانتظارك، ابتسم وتفاءل!",
  "🍀 الفرصة ستطرق بابك اليوم، كن مستعداً",
  "⚡ طاقتك اليوم على أعلى مستوى، استغلها!",
  "🌙 خذ الأمور بهدوء اليوم، الصبر مفتاح النجاح",
  "🔮 تفاجأ إيجابياً اليوم، شيء جميل في الطريق",
  "🌈 بعد الصعوبات يأتي الفرج، استمر!",
  "💎 قيمتك أكبر مما تتخيل، ثق بنفسك",
  "🚀 وقت الانطلاق! لا تؤجل أحلامك",
  "🌺 محبة وخير ينتظرانك اليوم",
];

const PERCENTAGES = ["طالع 🤩", "كويس 😊", "عادي 😐", "مو كويس 😕", "يوم عادي 🙂"];

module.exports = {
  config: {
    name: "حظ",
    aliases: ["fortune", "فأل", "luck"],
    description: "اعرف حظك اليوم 🔮",
    usage: "حظ",
    adminOnly: false,
  },
  async run({ api, event, threadID, senderID }) {
    const pct = Math.floor(Math.random() * 101);
    const fortune = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));

    let emoji = "😐";
    if (pct >= 80) emoji = "🤩";
    else if (pct >= 60) emoji = "😊";
    else if (pct >= 40) emoji = "🙂";
    else if (pct >= 20) emoji = "😕";
    else emoji = "😞";

    api.sendMessage(
      `🔮 حظك اليوم ${emoji}\n` +
      `━━━━━━━━━━\n` +
      `[${bar}] ${pct}%\n\n` +
      `${fortune}`,
      threadID
    );
  },
};
