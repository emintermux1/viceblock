import { MAP_H, MAP_W, SOLID, T, TILE, type TileId } from "./constants";

export type Loc = { x: number; y: number; tx: number; ty: number };
export type Neon = { x: number; y: number; text: string; color: string };
export type Palm = { x: number; y: number; h: number };
export type Lamp = { x: number; y: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const POI = {
  apartment: { tx: 12, ty: 80 },
  spawn: { tx: 12, ty: 80 },
  rico: { tx: 16, ty: 62 },
  compact: { tx: 19, ty: 64 },
  maya: { tx: 78, ty: 48 },
  garage: { tx: 78, ty: 49 },
  mart: { tx: 40, ty: 19 },
  gas: { tx: 10, ty: 46 },
  court: { tx: 56, ty: 43 },
  pd: { tx: 80, ty: 18 },
  warehouse: { tx: 82, ty: 81 },
  raceStart: { tx: 45, ty: 82 },
  raceEnd: { tx: 45, ty: 22 },
};

export function worldOf(tx: number, ty: number): Loc {
  return { tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

export const LOC = {
  apartment: worldOf(POI.apartment.tx, POI.apartment.ty),
  spawn: worldOf(POI.spawn.tx, POI.spawn.ty),
  rico: worldOf(POI.rico.tx, POI.rico.ty),
  compact: worldOf(POI.compact.tx, POI.compact.ty),
  maya: worldOf(POI.maya.tx, POI.maya.ty),
  garage: worldOf(POI.garage.tx, POI.garage.ty),
  mart: worldOf(POI.mart.tx, POI.mart.ty),
  gas: worldOf(POI.gas.tx, POI.gas.ty),
  court: worldOf(POI.court.tx, POI.court.ty),
  pd: worldOf(POI.pd.tx, POI.pd.ty),
  warehouse: worldOf(POI.warehouse.tx, POI.warehouse.ty),
  raceStart: worldOf(POI.raceStart.tx, POI.raceStart.ty),
  raceEnd: worldOf(POI.raceEnd.tx, POI.raceEnd.ty),
};

const BUILD_PAL = ["#1a3a40", "#c4b49a", "#2a4a48", "#8a5a40", "#d4c4a8", "#3a3028", "#6a4a38", "#2a5558"];

export function buildingColor(v: number) {
  return BUILD_PAL[v % BUILD_PAL.length];
}

export class CityMap {
  tiles: Uint8Array;
  variant: Uint8Array;
  neons: Neon[] = [];
  palms: Palm[] = [];
  lamps: Lamp[] = [];
  trafficLoops: { x: number; y: number }[][] = [];

  constructor() {
    this.tiles = new Uint8Array(MAP_W * MAP_H);
    this.variant = new Uint8Array(MAP_W * MAP_H);
    this.build();
  }

  idx(x: number, y: number) { return y * MAP_W + x; }
  in(x: number, y: number) { return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H; }
  get(x: number, y: number): TileId {
    if (!this.in(x, y)) return T.WATER;
    return this.tiles[this.idx(x, y)] as TileId;
  }
  isSolidTile(x: number, y: number) { return SOLID.has(this.get(x, y)); }
  isSolidWorld(wx: number, wy: number) { return this.isSolidTile(Math.floor(wx / TILE), Math.floor(wy / TILE)); }
  isRoadWorld(wx: number, wy: number) {
    const t = this.get(Math.floor(wx / TILE), Math.floor(wy / TILE));
    return t === T.ROAD || t === T.PARK;
  }
  isWaterWorld(wx: number, wy: number) { return this.get(Math.floor(wx / TILE), Math.floor(wy / TILE)) === T.WATER; }
  set(x: number, y: number, t: TileId, v = 0) {
    if (!this.in(x, y)) return;
    this.tiles[this.idx(x, y)] = t;
    this.variant[this.idx(x, y)] = v;
  }
  private fill(t: TileId) { this.tiles.fill(t); }
  private hRoad(x0: number, x1: number, y: number, w = 3) {
    const a = Math.min(x0, x1), b = Math.max(x0, x1);
    for (let x = a; x <= b; x++) for (let k = 0; k < w; k++) this.set(x, y + k, T.ROAD);
  }
  private vRoad(y0: number, y1: number, x: number, w = 3) {
    const a = Math.min(y0, y1), b = Math.max(y0, y1);
    for (let y = a; y <= b; y++) for (let k = 0; k < w; k++) this.set(x + k, y, T.ROAD);
  }
  private rect(x0: number, y0: number, x1: number, y1: number, t: TileId, v = 0) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, t, v);
  }
  private stampIfGrass(x0: number, y0: number, x1: number, y1: number, t: TileId, v = 0) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (this.in(x, y) && this.get(x, y) === T.GRASS) this.set(x, y, t, v);
    }
  }

  private build() {
    const rng = mulberry32(0x51c1ce);
    this.fill(T.GRASS);

    for (let y = 90; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) this.set(x, y, T.WATER, (x + y) & 3);
    }
    for (let y = 88; y <= 89; y++) {
      for (let x = 0; x < MAP_W; x++) this.set(x, y, T.SAND, (x + y) & 3);
    }
    this.rect(84, 84, 95, 89, T.WATER, 1);
    this.rect(82, 86, 95, 89, T.WATER, 2);

    this.vRoad(4, 87, 44, 3);
    this.hRoad(4, 91, 50, 3);
    this.hRoad(4, 91, 20, 2);
    this.hRoad(4, 91, 66, 2);
    this.vRoad(6, 87, 18, 2);
    this.vRoad(6, 87, 72, 2);
    this.hRoad(20, 70, 36, 2);
    this.hRoad(4, 91, 82, 2);
    this.hRoad(4, 40, 8, 2);

    this.rect(8, 70, 16, 78, T.BUILD, 0);
    this.rect(8, 79, 16, 80, T.WALK, 0);

    this.rect(8, 58, 14, 64, T.BUILD, 1);
    this.rect(15, 58, 17, 64, T.WALK, 0);

    this.rect(76, 40, 86, 47, T.BUILD, 2);
    this.rect(76, 48, 86, 49, T.PARK, 0);

    this.rect(36, 12, 44, 18, T.BUILD, 3);
    this.rect(36, 19, 44, 19, T.WALK, 0);

    this.rect(6, 38, 14, 44, T.BUILD, 4);
    this.rect(6, 45, 16, 48, T.PARK, 0);

    this.rect(50, 38, 62, 48, T.COURT, 0);

    this.rect(76, 8, 86, 16, T.BUILD, 5);
    this.rect(76, 17, 86, 19, T.PARK, 0);

    this.rect(76, 70, 90, 80, T.BUILD, 6);
    this.rect(76, 81, 90, 81, T.PARK, 0);

    const blocks: [number, number, number, number, number][] = [
      [6, 10, 16, 18, 7],
      [22, 10, 34, 18, 0],
      [48, 10, 58, 18, 1],
      [60, 10, 70, 18, 2],
      [6, 24, 16, 34, 3],
      [22, 24, 34, 34, 4],
      [36, 24, 42, 34, 5],
      [50, 24, 58, 34, 6],
      [60, 24, 70, 34, 7],
      [22, 40, 34, 48, 0],
      [36, 40, 42, 48, 1],
      [6, 54, 16, 56, 2],
      [22, 54, 34, 64, 3],
      [36, 54, 42, 64, 4],
      [50, 54, 58, 64, 5],
      [60, 54, 70, 64, 6],
      [22, 70, 34, 80, 7],
      [36, 70, 42, 80, 0],
      [50, 70, 58, 80, 1],
      [60, 70, 70, 80, 2],
    ];
    for (const [x0, y0, x1, y1, v] of blocks) {
      this.stampIfGrass(x0, y0, x1, y1, T.BUILD, v);
      if (x1 - x0 > 4 && y1 - y0 > 4) {
        this.stampIfGrass(x0 + 2, y0 + 2, x1 - 2, y1 - 2, T.WALK, 0);
      }
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = this.get(x, y);
        if (t !== T.GRASS) continue;
        const n =
          this.get(x - 1, y) === T.ROAD ||
          this.get(x + 1, y) === T.ROAD ||
          this.get(x, y - 1) === T.ROAD ||
          this.get(x, y + 1) === T.ROAD;
        if (n) this.set(x, y, T.WALK);
      }
    }

    this.neons.push(
      { x: LOC.mart.x, y: LOC.mart.y - 18, text: "6IX MART", color: "#ffc83d" },
      { x: LOC.garage.x, y: LOC.garage.y - 22, text: "MAYA", color: "#2ef2d0" },
      { x: LOC.rico.x, y: LOC.rico.y - 16, text: "RICO", color: "#ffc83d" },
      { x: LOC.gas.x, y: LOC.gas.y - 14, text: "GAS", color: "#ffc83d" },
      { x: LOC.pd.x, y: LOC.pd.y - 16, text: "NCPD", color: "#e8e0c8" },
      { x: LOC.warehouse.x, y: LOC.warehouse.y - 18, text: "DOCKS", color: "#c9b87a" },
      { x: LOC.apartment.x, y: LOC.apartment.y - 28, text: "WALK-UP", color: "#2ef2d0" },
    );

    for (let i = 0; i < 28; i++) {
      const x = 8 + rng() * 80;
      const y = 8 + rng() * 78;
      const t = this.get(Math.floor(x), Math.floor(y));
      if (t === T.GRASS || t === T.WALK || t === T.SAND) this.palms.push({ x: x * TILE, y: y * TILE, h: 16 + rng() * 10 });
    }
    for (let i = 0; i < 40; i++) {
      const x = 6 + rng() * 84;
      const y = 6 + rng() * 80;
      const t = this.get(Math.floor(x), Math.floor(y));
      if (t === T.WALK || t === T.ROAD || t === T.PARK) this.lamps.push({ x: x * TILE, y: y * TILE });
    }

    const mid = (a: number, b: number, axis: "x" | "y") =>
      axis === "x" ? { x: (a + 0.5) * TILE, y: (b + 0.5) * TILE } : { x: (b + 0.5) * TILE, y: (a + 0.5) * TILE };
    const loop = (pts: { x: number; y: number }[]) => this.trafficLoops.push(pts);
    loop([
      { x: 10 * TILE, y: 51.5 * TILE },
      { x: 86 * TILE, y: 51.5 * TILE },
      { x: 86 * TILE, y: 51.5 * TILE },
      { x: 10 * TILE, y: 51.5 * TILE },
    ]);
    loop([
      { x: 45.5 * TILE, y: 10 * TILE },
      { x: 45.5 * TILE, y: 84 * TILE },
      { x: 45.5 * TILE, y: 10 * TILE },
    ]);
    loop([
      { x: 19 * TILE, y: 21 * TILE },
      { x: 73 * TILE, y: 21 * TILE },
      { x: 73 * TILE, y: 67 * TILE },
      { x: 19 * TILE, y: 67 * TILE },
    ]);
    void mid;
  }
}
