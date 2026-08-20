import { MAP_H, MAP_W, PAL, T, TILE, WORLD_H, WORLD_W } from "./constants";
import { buildingColor, roofColor, type CityMap } from "./map";
import { drawBarrel, drawBench, drawBillboard, drawCone, drawCrate, drawDumpster, drawHydrant, drawStall } from "./sprites";

function hash(x: number, y: number, s = 0) {
  return ((x * 73 + y * 37 + s * 19) >>> 0) % 97;
}

export function bakeCity(map: CityMap): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = WORLD_W;
  c.height = WORLD_H;
  const g = c.getContext("2d");
  if (!g) return c;
  g.imageSmoothingEnabled = false;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = map.get(x, y);
      const v = map.variant[map.idx(x, y)];
      const px = x * TILE;
      const py = y * TILE;
      if (t === T.WATER) {
        g.fillStyle = v & 1 ? PAL.waterHi : PAL.water;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = "rgba(46, 242, 208, 0.08)";
        g.fillRect(px, py + ((x + y) % 4), TILE, 2);
      } else if (t === T.SAND) {
        g.fillStyle = (x + y) & 1 ? "#c9a46a" : "#b89058";
        g.fillRect(px, py, TILE, TILE);
        if (hash(x, y) % 7 === 0) {
          g.fillStyle = "rgba(40, 24, 10, 0.18)";
          g.fillRect(px + 4, py + 6, 3, 2);
        }
      } else if (t === T.ROAD) {
        g.fillStyle = (x + y) & 1 ? "#1a1816" : "#161412";
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = "rgba(201,184,122,0.38)";
        const hRoad = map.get(x - 1, y) === T.ROAD && map.get(x + 1, y) === T.ROAD;
        const vRoad = map.get(x, y - 1) === T.ROAD && map.get(x, y + 1) === T.ROAD;
        if (hRoad && !vRoad && y % 2 === 0) g.fillRect(px + 6, py + 7, 4, 2);
        if (vRoad && !hRoad && x % 2 === 0) g.fillRect(px + 7, py + 6, 2, 4);
        if (hRoad && vRoad) {
          g.fillStyle = "rgba(232, 224, 200, 0.28)";
          for (let i = 0; i < 4; i++) {
            g.fillRect(px + 1, py + 2 + i * 4, TILE - 2, 1);
            g.fillRect(px + 2 + i * 4, py + 1, 1, TILE - 2);
          }
        }
      } else if (t === T.WALK) {
        g.fillStyle = (x * 3 + y) & 1 ? "#2c2824" : "#262220";
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = "rgba(255,255,255,0.03)";
        g.fillRect(px + (hash(x, y) % 12), py + (hash(x, y, 1) % 12), 2, 2);
      } else if (t === T.PARK) {
        g.fillStyle = "#262220";
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = "rgba(201,184,122,0.18)";
        g.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      } else if (t === T.PLAZA) {
        g.fillStyle = "#2a2e2a";
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = "rgba(46, 242, 208, 0.08)";
        g.fillRect(px + 3, py + 3, 10, 10);
      } else if (t === T.COURT) {
        g.fillStyle = "#3a3428";
        g.fillRect(px, py, TILE, TILE);
        g.strokeStyle = "rgba(232,224,200,0.4)";
        g.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      } else if (t === T.BUILD) {
        g.fillStyle = roofColor(v);
        g.fillRect(px, py, TILE, TILE);
      } else if (t === T.FENCE) {
        g.fillStyle = PAL.fence;
        g.fillRect(px, py, TILE, TILE);
      } else {
        g.fillStyle = (x + y) & 1 ? PAL.grass : PAL.grassHi;
        g.fillRect(px, py, TILE, TILE);
      }
    }
  }

  for (const b of map.buildings) {
    paintBuilding(g, b.x0, b.y0, b.x1, b.y1, b.variant, b.kind, b.label);
  }

  for (const d of map.streetDecals) {
    g.save();
    g.translate(d.x, d.y);
    g.rotate(d.ang);
    g.font = "700 9px Chakra Petch, sans-serif";
    g.textAlign = "center";
    g.fillStyle = "rgba(201,184,122,0.28)";
    g.fillText(d.text, 0, 0);
    g.restore();
  }

  for (const prop of map.props) {
    switch (prop.kind) {
      case "dumpster": drawDumpster(g, prop.x, prop.y); break;
      case "crate": drawCrate(g, prop.x, prop.y); break;
      case "hydrant": drawHydrant(g, prop.x, prop.y); break;
      case "bench": drawBench(g, prop.x, prop.y); break;
      case "billboard": drawBillboard(g, prop.x, prop.y); break;
      case "cone": drawCone(g, prop.x, prop.y); break;
      case "barrel": drawBarrel(g, prop.x, prop.y); break;
      case "stall": drawStall(g, prop.x, prop.y); break;
      case "pier":
        g.fillStyle = "#5a4630";
        g.fillRect(prop.x - 6, prop.y - 4, 12, 8);
        g.fillStyle = "#3a2e20";
        g.fillRect(prop.x - 7, prop.y + 3, 3, 6);
        g.fillRect(prop.x + 4, prop.y + 3, 3, 6);
        break;
      default: {
        const _never: never = prop.kind;
        void _never;
      }
    }
  }

  return c;
}

function paintBuilding(
  g: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  v: number, kind: string, label?: string,
) {
  const px = x0 * TILE;
  const py = y0 * TILE;
  const w = (x1 - x0 + 1) * TILE;
  const h = (y1 - y0 + 1) * TILE;
  const wall = buildingColor(v);
  const roof = roofColor(v);

  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(px + 3, py + 4, w, h);

  g.fillStyle = roof;
  g.fillRect(px, py, w, h);

  g.fillStyle = "rgba(255, 160, 80, 0.12)";
  g.fillRect(px, py + h - 6, w, 6);
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.fillRect(px, py, w, 3);
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(px + w - 3, py, 3, h);

  g.fillStyle = wall;
  g.fillRect(px, py + h - 7, w, 7);
  if (kind === "mart") g.fillStyle = "#8a3a18";
  else if (kind === "garage") g.fillStyle = "#2a4a44";
  else if (kind === "pd") g.fillStyle = "#2a3040";
  else if (kind === "club") g.fillStyle = "#1a2a38";
  else if (kind === "gas") g.fillStyle = "#4a3a20";
  else g.fillStyle = wall;
  g.fillRect(px + 1, py + h - 6, w - 2, 5);

  const cols = Math.max(2, Math.floor(w / 10));
  const rows = Math.max(1, Math.floor((h - 10) / 9));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = hash(x0 + c, y0 + r, v) % 5 !== 0;
      const wx = px + 3 + c * (w / cols);
      const wy = py + 4 + r * 8;
      g.fillStyle = lit ? (hash(c, r, v) % 3 === 0 ? "rgba(255, 200, 80, 0.7)" : "rgba(46, 242, 208, 0.35)") : "rgba(8, 14, 18, 0.55)";
      g.fillRect(wx, wy, 4, 4);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(wx, wy, 4, 1);
    }
  }

  const doorX = px + w / 2 - 3;
  g.fillStyle = kind === "pd" ? "#1a2030" : "#1a1410";
  g.fillRect(doorX, py + h - 6, 6, 6);
  if (kind === "garage") {
    g.fillStyle = "#3a5a52";
    g.fillRect(px + 6, py + h - 6, w - 12, 5);
    g.fillStyle = "rgba(46, 242, 208, 0.25)";
    g.fillRect(px + 8, py + h - 5, w - 16, 2);
  }
  if (kind === "mart") {
    g.fillStyle = "#ffc83d";
    g.fillRect(px + 4, py + h - 8, w - 8, 2);
  }
  if (kind === "club") {
    g.fillStyle = "#2ef2d0";
    g.fillRect(px + 2, py + h - 8, w - 4, 2);
  }

  g.fillStyle = "rgba(20, 16, 12, 0.55)";
  if (w > 40) g.fillRect(px + 8, py + 6, 8, 6);
  if (w > 56) g.fillRect(px + w - 18, py + 8, 10, 8);
  if (h > 40 && hash(x0, y0, 3) % 2 === 0) {
    g.fillStyle = "#4a4038";
    g.fillRect(px + w / 2 - 3, py + 4, 6, 8);
  }

  if (label && (kind === "apt" || kind === "office" || kind === "warehouse")) {
    g.font = "700 6px Chakra Petch, sans-serif";
    g.textAlign = "center";
    g.fillStyle = "rgba(232, 224, 200, 0.45)";
    g.fillText(label, px + w / 2, py + 10);
  }
}

export function drawWaterShimmer(ctx: CanvasRenderingContext2D, map: CityMap, time: number) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  for (let y = 88; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x += 2) {
      if (map.get(x, y) !== T.WATER) continue;
      const wave = Math.sin(time * 2.2 + x * 0.45 + y * 0.3);
      if (wave < 0.2) continue;
      ctx.fillStyle = wave > 0.7 ? "#2ef2d0" : "#7ad4d0";
      ctx.fillRect(x * TILE + 2, y * TILE + (1 + wave) * 3, 10, 1);
    }
  }
  ctx.restore();
}

export function drawDuskWash(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255, 138, 92, 0.08)");
  g.addColorStop(0.45, "rgba(10, 48, 64, 0)");
  g.addColorStop(1, "rgba(6, 16, 20, 0.18)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
