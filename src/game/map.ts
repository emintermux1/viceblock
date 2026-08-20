import { MAP_H, MAP_W, SOLID, T, TILE, type TileId } from "./constants";
import type { BuildingKind, PropKind } from "./types";

export type Loc = { x: number; y: number; tx: number; ty: number };
export type Neon = { x: number; y: number; text: string; color: string };
export type Palm = { x: number; y: number; h: number };
export type Lamp = { x: number; y: number };
export type Building = {
  x0: number; y0: number; x1: number; y1: number;
  variant: number; kind: BuildingKind; label?: string;
};
export type Prop = { x: number; y: number; kind: PropKind; rot?: number };

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
  club: { tx: 30, ty: 37 },
  pier: { tx: 88, ty: 90 },
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
  club: worldOf(POI.club.tx, POI.club.ty),
  pier: worldOf(POI.pier.tx, POI.pier.ty),
};

const BUILD_PAL = ["#1a3a40", "#c4b49a", "#2a4a48", "#8a5a40", "#d4c4a8", "#3a3028", "#6a4a38", "#2a5558"];
const ROOF_PAL = ["#0e2428", "#6a5a48", "#163230", "#4a3024", "#8a7a60", "#221c16", "#3a281e", "#16383a"];

export function buildingColor(v: number) {
  return BUILD_PAL[v % BUILD_PAL.length];
}

export function roofColor(v: number) {
  return ROOF_PAL[v % ROOF_PAL.length];
}

export class CityMap {
  tiles: Uint8Array;
  variant: Uint8Array;
  neons: Neon[] = [];
  palms: Palm[] = [];
  lamps: Lamp[] = [];
  buildings: Building[] = [];
  props: Prop[] = [];
  trafficLoops: { x: number; y: number }[][] = [];
  streetDecals: { x: number; y: number; text: string; ang: number }[] = [];

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
  private bld(x0: number, y0: number, x1: number, y1: number, v: number, kind: BuildingKind, label?: string) {
    this.rect(x0, y0, x1, y1, T.BUILD, v);
    this.buildings.push({ x0, y0, x1, y1, variant: v, kind, label });
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
    this.rect(78, 84, 95, 95, T.WATER, 1);
    this.rect(70, 91, 95, 95, T.WATER, 2);
    this.rect(0, 92, 20, 95, T.WATER, 3);
    this.rect(78, 86, 80, 93, T.WALK, 0);
    this.rect(86, 86, 88, 94, T.WALK, 0);
    this.rect(82, 87, 84, 92, T.WALK, 0);
    this.rect(74, 86, 90, 86, T.SAND, 1);

    this.vRoad(4, 87, 44, 3);
    this.hRoad(4, 91, 50, 3);
    this.hRoad(4, 91, 20, 2);
    this.hRoad(4, 91, 66, 2);
    this.vRoad(6, 87, 18, 2);
    this.vRoad(6, 87, 72, 2);
    this.hRoad(20, 70, 36, 2);
    this.hRoad(4, 91, 82, 2);
    this.hRoad(4, 40, 8, 2);
    this.hRoad(4, 40, 74, 2);
    this.vRoad(22, 48, 30, 2);

    this.bld(8, 70, 16, 78, 0, "apt", "WALK-UP");
    this.rect(8, 79, 16, 80, T.WALK, 0);

    this.bld(8, 58, 14, 64, 1, "shop", "RICO");
    this.rect(15, 58, 17, 64, T.WALK, 0);

    this.bld(76, 40, 86, 47, 2, "garage", "MAYA");
    this.rect(76, 48, 86, 49, T.PARK, 0);

    this.bld(36, 12, 44, 18, 3, "mart", "6IX MART");
    this.rect(36, 19, 44, 19, T.WALK, 0);

    this.bld(6, 38, 14, 44, 4, "gas", "GAS");
    this.rect(6, 45, 16, 48, T.PARK, 0);

    this.rect(50, 38, 62, 48, T.COURT, 0);

    this.bld(76, 8, 86, 16, 5, "pd", "NCPD");
    this.rect(76, 17, 86, 19, T.PARK, 0);

    this.bld(76, 70, 90, 80, 6, "warehouse", "DOCKS");
    this.rect(76, 81, 90, 81, T.PARK, 0);

    this.bld(26, 30, 34, 34, 7, "club", "NEON");

    const blocks: [number, number, number, number, number, BuildingKind][] = [
      [6, 10, 16, 18, 7, "apt"],
      [22, 10, 28, 18, 0, "shop"],
      [32, 10, 34, 18, 1, "office"],
      [48, 10, 58, 18, 2, "apt"],
      [60, 10, 70, 18, 3, "shop"],
      [6, 24, 16, 34, 4, "office"],
      [22, 24, 28, 28, 5, "shop"],
      [32, 24, 34, 28, 6, "apt"],
      [36, 24, 42, 34, 7, "office"],
      [50, 24, 58, 34, 0, "apt"],
      [60, 24, 70, 34, 1, "shop"],
      [22, 40, 28, 48, 2, "shop"],
      [32, 40, 42, 48, 3, "office"],
      [6, 54, 16, 56, 4, "shop"],
      [22, 54, 34, 64, 5, "apt"],
      [36, 54, 42, 64, 6, "shop"],
      [50, 54, 58, 64, 7, "office"],
      [60, 54, 70, 64, 0, "apt"],
      [22, 70, 28, 72, 1, "shop"],
      [32, 70, 42, 80, 2, "apt"],
      [50, 70, 58, 80, 3, "office"],
      [60, 70, 70, 80, 4, "warehouse"],
      [6, 84, 16, 86, 5, "shop"],
      [22, 84, 34, 86, 6, "apt"],
      [50, 84, 58, 86, 7, "shop"],
      [60, 84, 70, 86, 0, "office"],
    ];
    for (const [x0, y0, x1, y1, v, kind] of blocks) {
      this.bld(x0, y0, x1, y1, v, kind);
    }

    this.rect(51, 40, 61, 46, T.COURT, 0);
    this.rect(27, 32, 29, 34, T.PLAZA, 0);

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
      { x: LOC.mart.x, y: LOC.mart.y - 22, text: "6IX MART", color: "#ffc83d" },
      { x: LOC.garage.x, y: LOC.garage.y - 26, text: "MAYA", color: "#2ef2d0" },
      { x: LOC.rico.x, y: LOC.rico.y - 16, text: "RICO", color: "#ffc83d" },
      { x: LOC.gas.x, y: LOC.gas.y - 18, text: "GAS", color: "#ffc83d" },
      { x: LOC.pd.x, y: LOC.pd.y - 20, text: "NCPD", color: "#e8e0c8" },
      { x: LOC.warehouse.x, y: LOC.warehouse.y - 22, text: "DOCKS", color: "#c9b87a" },
      { x: LOC.apartment.x, y: LOC.apartment.y - 28, text: "WALK-UP", color: "#2ef2d0" },
      { x: LOC.club.x, y: LOC.club.y - 14, text: "NEON ROOM", color: "#2ef2d0" },
    );

    this.streetDecals.push(
      { x: 45.5 * TILE, y: 40 * TILE, text: "BLOCK AVE", ang: -Math.PI / 2 },
      { x: 32 * TILE, y: 51.5 * TILE, text: "VICE", ang: 0 },
      { x: 60 * TILE, y: 21 * TILE, text: "6IX", ang: 0 },
      { x: 40 * TILE, y: 83 * TILE, text: "HARBOR", ang: 0 },
    );

    for (let i = 0; i < 36; i++) {
      const x = 6 + rng() * 84;
      const y = 8 + rng() * 78;
      const t = this.get(Math.floor(x), Math.floor(y));
      if (t === T.GRASS || t === T.WALK || t === T.SAND) this.palms.push({ x: x * TILE, y: y * TILE, h: 16 + rng() * 10 });
    }
    for (let x = 8; x < 90; x += 6) {
      for (const y of [9, 21, 37, 51, 67, 75, 83]) {
        if (this.get(x, y) === T.ROAD || this.get(x, y) === T.WALK) {
          this.lamps.push({ x: x * TILE + 4, y: y * TILE + 4 });
        }
      }
    }
    for (let y = 10; y < 86; y += 8) {
      for (const x of [19, 45, 73]) {
        if (this.get(x, y) === T.ROAD || this.get(x, y) === T.WALK) {
          this.lamps.push({ x: x * TILE + 2, y: y * TILE + 6 });
        }
      }
    }

    const drop = (tx: number, ty: number, kind: PropKind) => {
      const t = this.get(tx, ty);
      if (t === T.WALK || t === T.PARK || t === T.PLAZA || t === T.SAND || t === T.COURT) {
        this.props.push({ x: tx * TILE + 8, y: ty * TILE + 8, kind });
      }
    };
    const alleys: [number, number, PropKind][] = [
      [16, 60, "dumpster"], [17, 63, "dumpster"], [15, 61, "barrel"],
      [37, 20, "crate"], [43, 20, "crate"], [39, 20, "cone"],
      [76, 49, "cone"], [85, 49, "barrel"], [80, 49, "crate"],
      [10, 47, "cone"], [14, 47, "barrel"],
      [52, 40, "bench"], [60, 40, "bench"],
      [28, 33, "stall"], [29, 32, "stall"],
      [77, 82, "crate"], [88, 82, "crate"], [80, 82, "barrel"], [84, 82, "dumpster"],
      [12, 81, "dumpster"], [8, 80, "hydrant"],
      [40, 67, "hydrant"], [20, 51, "hydrant"], [72, 36, "hydrant"],
      [24, 19, "billboard"], [64, 35, "billboard"], [54, 65, "billboard"],
      [88, 90, "pier"], [80, 91, "pier"], [86, 92, "crate"],
      [7, 75, "bench"], [48, 83, "cone"], [70, 83, "barrel"],
    ];
    for (const [tx, ty, kind] of alleys) drop(tx, ty, kind);

    const loop = (pts: { x: number; y: number }[]) => this.trafficLoops.push(pts);
    const p = (tx: number, ty: number) => ({ x: tx * TILE, y: ty * TILE });
    loop([p(10, 51.5), p(86, 51.5), p(86, 21), p(10, 21)]);
    loop([p(19, 9), p(73, 9), p(73, 83), p(19, 83)]);
    loop([p(19, 37), p(73, 37), p(73, 67), p(19, 67)]);
    loop([p(10, 83), p(86, 83), p(86, 75), p(10, 75)]);
    loop([p(45.5, 10), p(45.5, 84), p(73, 84), p(73, 10)]);
    loop([p(10, 9), p(40, 9), p(40, 21), p(10, 21)]);
  }
}
