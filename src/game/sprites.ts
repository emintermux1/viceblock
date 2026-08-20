import type { CharacterId, WeaponId } from "./types";

export type DrawPersonOpts = {
  character?: CharacterId;
  z?: number;
  flash?: number;
  swimming?: boolean;
  punchScale?: number;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  phase: number,
  kind: "player" | "ped" | "cop" | "rico" | "maya",
  punch = 0,
  down = false,
  weapon: WeaponId = "fists",
  opts: DrawPersonOpts = {},
) {
  const dir = ((Math.round(facing / (Math.PI / 4)) % 8) + 8) % 8;
  const ch = opts.character ?? "ansem";
  const z = opts.z ?? 0;
  const flash = opts.flash ?? 0;
  const swimming = !!opts.swimming;
  const punchScale = opts.punchScale ?? 1;

  let skin = kind === "cop" ? "#e0c4a0" : kind === "player" ? "#e8b898" : "#d8b090";
  let shirt =
    kind === "player" ? "#f2efe6" : kind === "cop" ? "#2a4a8c" : kind === "rico" ? "#1a4a44" : kind === "maya" ? "#c46a28" : ["#c4a070", "#4a6a58", "#8a5040", "#3a5a68", "#b09070"][Math.abs(Math.floor(x + y)) % 5];
  let pants = kind === "player" ? "#1a8a7a" : kind === "cop" ? "#1a2a4a" : "#2a2420";
  let hair = kind === "player" ? "#2a1a10" : kind === "cop" ? "#3a2810" : "#1a1410";
  let tall = 1;
  let wide = 1;
  let square = false;
  let chain = false;
  let shades = false;
  let holes = false;

  if (kind === "player") {
    if (ch === "ansem") { skin = "#5a3220"; shirt = "#121212"; pants = "#1a1a18"; hair = "#0e0a08"; tall = 1.18; chain = true; }
    else if (ch === "orangie") { skin = "#e0b090"; shirt = "#e07020"; pants = "#3a2818"; hair = "#2a1a10"; wide = 1.35; tall = 0.92; shades = true; }
    else { skin = "#f4e04a"; shirt = "#f4e04a"; pants = "#8a4a18"; hair = "#f4e04a"; square = true; holes = true; wide = 1.15; }
  }
  if (kind === "rico") { skin = "#c49068"; hair = "#1a1010"; shades = true; }
  if (kind === "maya") { skin = "#d4a070"; hair = "#3a2010"; }

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y - z * 0.55));

  if (down) {
    ctx.fillStyle = "rgba(160, 30, 40, 0.35)";
    ctx.beginPath(); ctx.ellipse(0, 2, 8 * wide, 3.2, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(1.25);
    ctx.fillStyle = pants; ctx.fillRect(-2, 1, 7 * wide, 3);
    ctx.fillStyle = shirt; ctx.fillRect(-6 * wide, -3, 9 * wide, 6);
    ctx.fillStyle = skin; ctx.fillRect(3, -3, 5, 5);
    ctx.fillStyle = hair; ctx.fillRect(3, -4, 5, 2);
    ctx.restore();
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(1, 6 + z * 0.15, 5 * wide, 2.2, 0, 0, Math.PI * 2); ctx.fill();

  if (swimming) {
    ctx.rotate(facing);
    const paddle = Math.sin(phase * 8) * 4;
    ctx.fillStyle = shirt;
    ctx.beginPath(); ctx.ellipse(0, 0, 6 * wide, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -2 + paddle * 0.3, 3, 2);
    ctx.fillRect(5, -2 - paddle * 0.3, 3, 2);
    ctx.fillRect(-3, -6, 6, 5);
    ctx.restore();
    return;
  }

  const bob = Math.abs(Math.sin(phase * 10)) * 1.15;
  const swing = Math.sin(phase * 10) * (kind === "player" ? 2.6 : 1.6);
  const punchOff = punch > 0 ? 9 * punchScale : 0;
  const air = z > 2;
  ctx.translate(0, -bob);
  ctx.fillStyle = pants;
  const legH = air ? 3 : 5;
  ctx.fillRect(-3 * wide, 2, 2 * wide, (air ? 3 : 4) + swing);
  ctx.fillRect(1 * wide, 2 + swing * 0.35, 2 * wide, (air ? 3 : 4) - swing * 0.2);
  ctx.fillStyle = shirt;
  ctx.fillRect(-4 * wide, -5 * tall, 8 * wide, 7 * tall);
  if (holes && kind === "player") {
    ctx.fillStyle = "rgba(90, 70, 10, 0.35)";
    ctx.fillRect(-2, -3, 2, 2); ctx.fillRect(1, -1, 1, 1);
  }
  if (chain && kind === "player") {
    ctx.fillStyle = "#ffc83d"; ctx.fillRect(-2, -1, 4, 1); ctx.fillRect(-1, 0, 2, 2);
  }
  if (kind === "cop") { ctx.fillStyle = "#dce6ff"; ctx.fillRect(-3, -3, 6, 2); }
  ctx.fillStyle = skin;
  const left = dir === 4 || dir === 3 || dir === 5;
  ctx.fillRect(left ? -6 * wide - punchOff : -6 * wide, -3, 2, 4);
  ctx.fillRect(left ? 4 * wide : 4 * wide + punchOff, -3, 2, 4);
  if (weapon !== "fists" && kind === "player") {
    const gx = Math.cos(facing) * 7, gy = Math.sin(facing) * 7 - 2;
    ctx.fillStyle = "#1a1816"; ctx.fillRect(gx - 1, gy - 1, 4, 2);
    ctx.fillStyle = "#ffc83d"; ctx.fillRect(gx + 2, gy - 1, 1, 2);
  }
  if (punch > 0 && weapon === "fists") {
    const reach = 11 * punchScale;
    ctx.strokeStyle = ch === "cupsey" ? "rgba(255, 230, 80, 0.95)" : "rgba(255, 220, 70, 0.95)";
    ctx.lineWidth = ch === "cupsey" ? 3.2 : 2.4;
    ctx.beginPath(); ctx.arc(0, -2, 12 * punchScale, facing - 1.25, facing + 0.35); ctx.stroke();
    ctx.fillStyle = "#ffe56a";
    ctx.beginPath(); ctx.arc(Math.cos(facing) * reach, Math.sin(facing) * reach - 2, 3.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = skin;
  ctx.fillRect(-3 * wide, -11 * tall, 6 * wide, square ? 7 : 6);
  ctx.fillStyle = hair;
  if (!square) ctx.fillRect(-3 * wide, -12 * tall, 6 * wide, 3);
  if (kind === "cop") {
    ctx.fillStyle = "#1a2744"; ctx.fillRect(-4, -13, 8, 3);
    ctx.fillStyle = "#d4dce8"; ctx.fillRect(-1, -13, 2, 2);
  }
  if (shades) { ctx.fillStyle = "#111"; ctx.fillRect(-3 * wide, -9 * tall, 6 * wide, 2); }
  else {
    ctx.fillStyle = "#1a1410";
    ctx.fillRect(-2 * wide, -9 * tall, 1, 1); ctx.fillRect(1 * wide, -9 * tall, 1, 1);
  }
  if (flash > 0) {
    ctx.globalAlpha = Math.min(0.7, flash);
    ctx.fillStyle = "#fff8e8"; ctx.fillRect(-7 * wide, -13 * tall, 14 * wide, 20 * tall);
    ctx.globalAlpha = 1;
  }
  void legH;
  ctx.restore();
}

export function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, heading: number, kind: string, color: string,
  lights: boolean, crashed = false, wrecked = false, ghost = false,
) {
  const w = kind === "muscle" ? 13 : kind === "hatch" || kind === "compact" ? 11 : 12;
  const h = kind === "muscle" ? 24 : kind === "hatch" || kind === "compact" ? 20 : 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  if (ghost) ctx.globalAlpha = 0.45;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(0, 2, w * 0.55, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  if (wrecked) { lights = false; crashed = true; }
  roundRect(ctx, -w / 2, -h / 2, w, h, 3);
  ctx.fillStyle = wrecked ? "#2a1814" : crashed ? "#3a2020" : ghost ? "#2ef2d0" : color;
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(ctx, -w / 2 + 1, -h / 2 + 5, w - 2, h * 0.36, 2); ctx.fill();
  ctx.fillStyle = "rgba(180, 220, 230, 0.4)";
  roundRect(ctx, -w / 2 + 2, -h / 2 + 6, w - 4, 5, 1); ctx.fill();
  if (kind === "taxi") {
    ctx.fillStyle = "#111"; ctx.fillRect(-3, -2, 6, 3);
    ctx.fillStyle = "#ffc83d"; ctx.fillRect(-2, -1, 4, 1);
  }
  if (kind === "cop") {
    ctx.fillStyle = "#e8eef8"; ctx.fillRect(-w / 2, -3, w, 5);
    ctx.fillStyle = "#c42a44"; ctx.fillRect(-3, -h / 2 + 2, 3, 2);
    ctx.fillStyle = "#2a6cff"; ctx.fillRect(0, -h / 2 + 2, 3, 2);
  }
  ctx.fillStyle = lights ? "#fff6c8" : "#d8c878";
  ctx.fillRect(-w / 2 + 1, -h / 2, 3, 2); ctx.fillRect(w / 2 - 4, -h / 2, 3, 2);
  ctx.fillStyle = lights ? "#ff2d4a" : "#8a2030";
  ctx.fillRect(-w / 2 + 1, h / 2 - 2, 3, 2); ctx.fillRect(w / 2 - 4, h / 2 - 2, 3, 2);
  if (wrecked) {
    ctx.fillStyle = "rgba(20, 10, 8, 0.7)"; ctx.fillRect(-w / 2 + 2, -4, w - 4, 5);
  }
  ctx.restore();
}

export function drawDriver(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, ch: CharacterId) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.fillStyle = ch === "cupsey" ? "#f4e04a" : ch === "orangie" ? "#e07020" : "#121212";
  ctx.fillRect(-3, -2, 6, 4);
  ctx.restore();
}

export function drawBullet(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number) {
  const ang = Math.atan2(vy, vx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = "rgba(255, 230, 120, 0.95)";
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.strokeStyle = "rgba(46, 242, 208, 0.7)";
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(10, 0); ctx.stroke();
  ctx.restore();
}

export function drawMuzzle(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalAlpha = Math.min(1, t * 8);
  ctx.fillStyle = "#fff6c8";
  ctx.beginPath(); ctx.ellipse(8, 0, 6, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffc83d";
  ctx.beginPath(); ctx.ellipse(12, 0, 4, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawBoom(ctx: CanvasRenderingContext2D, x: number, y: number, life: number) {
  const p = 1 - life;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.max(0, life);
  ctx.fillStyle = "#ffc83d";
  ctx.beginPath(); ctx.arc(0, 0, 8 + p * 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ff8a5c";
  ctx.beginPath(); ctx.arc(0, 0, 5 + p * 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1a1010";
  ctx.beginPath(); ctx.arc(-2, -1, 4 + p * 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, life: number) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, life * 0.45);
  ctx.fillStyle = "#6a6058";
  ctx.beginPath(); ctx.ellipse(x, y - (1 - life) * 10, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawNeon(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, t: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.font = "700 7px Chakra Petch, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(6,16,20,0.7)";
  ctx.fillRect(-22, -8, 44, 10);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75 + Math.sin(t * 3) * 0.2;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "#3a2214"; ctx.fillRect(-1, -h + 6, 3, h);
  ctx.fillStyle = "#1a5a38";
  ctx.beginPath(); ctx.ellipse(0, -h + 4, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "#2a2420"; ctx.fillRect(-1, -16, 2, 16);
  ctx.fillStyle = "rgba(255, 214, 160, 0.85)"; ctx.fillRect(-3, -18, 6, 3);
  ctx.fillStyle = "rgba(255, 214, 160, 0.12)";
  ctx.beginPath(); ctx.ellipse(0, 2, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawHoop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = "#2a2420"; ctx.fillRect(-1, -14, 2, 14);
  ctx.strokeStyle = "#ffc83d"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, -14, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawPortrait(ctx: CanvasRenderingContext2D, character: CharacterId, w: number, h: number) {
  ctx.fillStyle = "#0c1618";
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w, h) / 28;
  ctx.save();
  ctx.translate(w / 2, h * 0.62);
  ctx.scale(scale, scale);
  drawPerson(ctx, 0, 0, -Math.PI / 2, 0.2, "player", 0, false, "fists", { character });
  ctx.restore();
}
