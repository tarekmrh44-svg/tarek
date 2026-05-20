const QUESTIONS = [
  { q: "كم ناتج 5 + 7؟", a: "12" },
  { q: "ما عاصمة فرنسا؟", a: "باريس" },
  { q: "ما لون السماء؟", a: "أزرق" },
  { q: "كم ناتج 10 × 10؟", a: "100" },
  { q: "كم عدد أيام الأسبوع؟", a: "7" },
  { q: "كم ناتج 2 أس 8؟", a: "256" },
  { q: "ما أسرع حيوان بري؟", a: "الفهد" },
  { q: "ما رمز الماء الكيميائي؟", a: "h2o" },
  { q: "كم عدد أشهر السنة؟", a: "12" },
  { q: "ما عاصمة الجزائر؟", a: "الجزائر" },
  { q: "ما عاصمة مصر؟", a: "القاهرة" },
  { q: "كم كيلومتر في الميل الواحد؟", a: "1.6" },
];

const active = new Map();

module.exports = {
  config: {
    name: "quiz",
    aliases: ["trivia", "سؤال"],
    description: "ابدأ لعبة أسئلة وأجوبة",
    usage: "quiz",
    adminOnly: false,
  },
  async run({ api, event, args, threadID, senderID }) {
    if (active.has(threadID)) {
      return api.sendMessage("❓ يوجد سؤال نشط بالفعل في هذه المحادثة!", threadID);
    }

    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    active.set(threadID, { answer: q.a, senderID });

    api.sendMessage(`🎯 وقت السؤال!\n\n❓ ${q.q}\n\naكتب إجابتك الآن! (30 ثانية)`, threadID);

    const timeout = setTimeout(() => {
      if (active.has(threadID)) {
        active.delete(threadID);
        api.sendMessage(`⌛ انتهى الوقت! الإجابة كانت: ${q.a}`, threadID);
      }
    }, 30000);
  },
};
