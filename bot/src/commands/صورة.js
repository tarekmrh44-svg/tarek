"use strict";

const axios = require("axios");
const fs    = require("fs-extra");
const path  = require("path");
const os    = require("os");

module.exports = {
  config: {
    name: "صورة",
    aliases: ["pp", "avatar", "فاتو"],
    description: "جلب صورة الپروفايل لأي شخص",
    usage: "/صورة  |  ردَّ على رسالة شخص",
    adminOnly: false,
    ownerOnly: false,
  },

  async run({ api, event, threadID, messageID }) {
    const targetID = event.type === "message_reply"
      ? event.messageReply?.senderID
      : event.senderID;

    try {
      // جلب الاسم
      const info = await new Promise((res, rej) =>
        api.getUserInfo(targetID, (e, d) => e ? rej(e) : res(d || {}))
      );
      const name = info[targetID]?.name || targetID;

      // رابط الصورة من فيسبوك
      const imgUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512`;
      const tmpPath = path.join(os.tmpdir(), `fb_${targetID}.jpg`);

      const res2 = await axios.get(imgUrl, { responseType: "arraybuffer", timeout: 10000 });
      fs.writeFileSync(tmpPath, Buffer.from(res2.data));

      await new Promise((res, rej) =>
        api.sendMessage(
          { body: `🖼 صورة ${name}`, attachment: fs.createReadStream(tmpPath) },
          threadID,
          (e) => {
            fs.remove(tmpPath).catch(() => {});
            e ? rej(e) : res();
          },
          messageID
        )
      );
    } catch (e) {
      api.sendMessage(`❌ فشل جلب الصورة: ${e.message}`, threadID, null, messageID);
    }
  },
};
