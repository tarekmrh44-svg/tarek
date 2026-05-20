const path = require("path");
const fs = require("fs-extra");

// ─── Lazy canvas loader — graceful fallback if native deps missing ────────────
let _cv = null;
let _tried = false;
function getCanvas() {
  if (_tried) return _cv;
  _tried = true;
  try { _cv = require("canvas"); } catch (_) { _cv = null; }
  return _cv;
}

async function generateWelcomeCard({ name, avatarURL }) {
  const cv = getCanvas();
  if (!cv) throw new Error("canvas not available");
  const { createCanvas, loadImage } = cv;

  const width = 800, height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#0f0c29");
  gradient.addColorStop(0.5, "#302b63");
  gradient.addColorStop(1, "#24243e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 90, 0, Math.PI * 2);
  ctx.strokeStyle = "#00d2ff";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.clip();
  if (avatarURL) {
    try {
      const avatar = await loadImage(avatarURL);
      ctx.drawImage(avatar, 60, 60, 180, 180);
    } catch {
      ctx.fillStyle = "#00d2ff";
      ctx.fillRect(60, 60, 180, 180);
    }
  }
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("Welcome!", 280, 120);
  ctx.fillStyle = "#00d2ff";
  ctx.font = "bold 36px sans-serif";
  const displayName = name && name.length > 20 ? name.slice(0, 20) + "…" : name || "User";
  ctx.fillText(displayName, 280, 170);
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "24px sans-serif";
  ctx.fillText("Glad to have you here! 🎉", 280, 220);

  const outDir = path.join(__dirname, "../../data");
  fs.ensureDirSync(outDir);
  const outPath = path.join(outDir, "welcome_temp.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  return outPath;
}

async function generateProfileCard({ name, exp, money, level }) {
  const cv = getCanvas();
  if (!cv) throw new Error("canvas not available");
  const { createCanvas } = cv;

  const width = 700, height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e94560";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(name || "User", 30, 70);

  ctx.fillStyle = "#e94560";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText(`Level: ${level || 1}`, 30, 130);
  ctx.fillStyle = "#00d2ff";
  ctx.fillText(`EXP: ${exp || 0}`, 30, 175);
  ctx.fillStyle = "#ffd700";
  ctx.fillText(`💰 ${money || 0} coins`, 30, 220);

  const barX = 300, barY = 120, barW = 360, barH = 24;
  const expMax = (level || 1) * 100;
  const progress = Math.min((exp || 0) % expMax, expMax);
  const pct = progress / expMax;

  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 12);
  ctx.fill();
  ctx.fillStyle = "#00d2ff";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * pct, barH, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${progress} / ${expMax} EXP`, barX + 10, barY + 18);

  const outDir = path.join(__dirname, "../../data");
  fs.ensureDirSync(outDir);
  const outPath = path.join(outDir, "profile_temp.png");
  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  return outPath;
}

module.exports = { generateWelcomeCard, generateProfileCard };
