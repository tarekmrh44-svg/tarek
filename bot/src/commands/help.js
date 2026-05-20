module.exports = {
  config: {
    name: "help",
    aliases: ["commands", "cmds", "مساعدة"],
    description: "عرض جميع الأوامر المتاحة",
    usage: "help [اسم الأمر]",
    adminOnly: false,
  },
  async run({ api, event, args, threadID }) {
    const commands = global.commands;
    const prefix = global.commandPrefix;

    if (args[0]) {
      const cmd = commands.get(args[0].toLowerCase());
      if (!cmd)
        return api.sendMessage(`❌ الأمر "${args[0]}" غير موجود.`, threadID);
      return api.sendMessage(
        `📌 الأمر: ${prefix}${cmd.config.name}\n` +
          `📝 الوصف: ${cmd.config.description || "لا يوجد وصف"}\n` +
          `🔧 الاستخدام: ${prefix}${cmd.config.usage || cmd.config.name}\n` +
          `🔒 للأدمن فقط: ${cmd.config.adminOnly ? "نعم" : "لا"}`,
        threadID
      );
    }

    const seen = new Set();
    const list = [];
    for (const [, cmd] of commands) {
      if (!seen.has(cmd.config.name)) {
        seen.add(cmd.config.name);
        list.push(`• ${prefix}${cmd.config.name} — ${cmd.config.description || "لا يوجد وصف"}`);
      }
    }

    api.sendMessage(
      `🤖 أوامر ${global.botName}\n\n${list.join("\n")}\n\nاكتب ${prefix}help <اسم الأمر> للتفاصيل.`,
      threadID
    );
  },
};
