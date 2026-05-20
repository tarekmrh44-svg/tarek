const CONGRATS = [
  "🎉 ألف مبروك {name}! تستاهل كل خير 🌟",
  "🏆 مبروك {name}! أنت نجم لامع ⭐",
  "🎊 تهانينا {name}! ربنا يبارك لك ويتمم عليك بالخير 🌹",
  "🥳 مبروك {name}! هذا من توفيق الله ثم من اجتهادك 💪",
  "🎈 ألف ألف مبروك {name}! الله يكمل فرحتك دايم 🌸",
];

module.exports = {
  config: {
    name: "تهنئة",
    aliases: ["مبروك", "congrats", "greet"],
    description: "إرسال تهنئة لشخص مُذكَر",
    usage: "تهنئة @شخص",
    adminOnly: false,
  },
  async run({ api, event, threadID }) {
    const mentions = event.mentions || {};
    const ids = Object.keys(mentions);

    let name;
    if (ids.length > 0) {
      name = mentions[ids[0]];
    } else {
      return api.sendMessage("❌ تاغ الشخص الذي تريد تهنئته.\nمثال: /تهنئة @اسم", threadID);
    }

    const msg = CONGRATS[Math.floor(Math.random() * CONGRATS.length)].replace("{name}", name);
    api.sendMessage(msg, threadID);
  },
};
