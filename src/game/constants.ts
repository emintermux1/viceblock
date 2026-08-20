import type { CharacterId } from "./types";

export const TILE = 16;
export const MAP_W = 96;
export const MAP_H = 96;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

export const ZOOM_FOOT = 1.92;
export const ZOOM_CAR = 1.26;
export const CAM_LOOK_FOOT = 28;
export const CAM_LOOK_CAR = 64;
export const CAM_FOLLOW = 7.2;

export const STICK_RADIUS = 56;
export const STICK_DEAD = 16;

export const WALK_SPEED = 78;
export const SPRINT_SPEED = 142;
export const PED_SPEED = 38;
export const FLEE_SPEED = 96;
export const SWIM_SPEED = 42;

export const ENTER_LOCK = 0.2;
export const JACK_HOLD = 0.28;
export const PUNCH_RANGE = 18;
export const PUNCH_CD = 0.38;
export const PUNCH_DMG = 28;

export const JUMP_VEL = 168;
export const JUMP_GRAV = 520;

export const STAR_MAX = 5;
export const STAR_COOL = 7.2;
export const GARAGE_COOL = 0.85;
export const BUST_HOLD = 1.6;
export const BUST_RANGE = 12;
export const COP_FOOT_SPEED = 96;
export const COP_CAR_MAX = 218;
export const COP_FIRE_RANGE = 150;
export const COP_FIRE_CD = 1.05;
export const REGEN_DELAY = 4;
export const REGEN_RATE = 5;
export const CAR_HP = 100;

export const BODY_LIFE = 16;
export const BULLET_SPEED = 320;
export const BULLET_LIFE = 0.42;
export const HIT_RADIUS = 10;
export const TRAFFIC_TARGET = 22;
export const PED_TARGET = 40;
export const FX_CAP = 90;

export const WEAPON = {
  fists: { name: "FISTS", dmg: 28, rate: 2.6, ammo: 0 },
  pistol: { name: "PISTOL", dmg: 55, rate: 3.6, ammo: 36 },
} as const;

export const CHAR = {
  ansem: {
    id: "ansem" as CharacterId,
    name: "ANSEM",
    kit: "Fast feet. Tight aim.",
    walk: 94,
    sprint: 168,
    hp: 100,
    jump: 1,
    punch: 1,
    spread: 0.032,
    ram: 1,
    cash: 1,
    mass: 1,
  },
  orangie: {
    id: "orangie" as CharacterId,
    name: "ORANGIE",
    kit: "Tank. Rams harder.",
    walk: 68,
    sprint: 110,
    hp: 140,
    jump: 0.82,
    punch: 1.18,
    spread: 0.12,
    ram: 1.65,
    cash: 1,
    mass: 1.35,
  },
  cupsey: {
    id: "cupsey" as CharacterId,
    name: "CUPSEY",
    kit: "High hop. Lucky cash.",
    walk: 80,
    sprint: 138,
    hp: 100,
    jump: 1.48,
    punch: 1.4,
    spread: 0.1,
    ram: 1,
    cash: 1.45,
    mass: 0.92,
  },
} as const;

export const PAL = {
  skyTop: "#061820",
  skyBot: "#0a3040",
  dusk: "#ff8a5c",
  water: "#0a3a44",
  waterHi: "#156878",
  sand: "#c9a46a",
  grass: "#1a3a28",
  grassHi: "#245438",
  road: "#1a1816",
  line: "#c9b87a",
  walk: "#2a2622",
  parking: "#262220",
  fence: "#5a4638",
  neonTeal: "#2ef2d0",
  neonGold: "#ffc83d",
  lamp: "#ffd6a0",
  blood: "#c42a44",
  hud: "#e8e0c8",
  money: "#ffe566",
};

export type TileId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const T = {
  GRASS: 0 as TileId,
  WATER: 1 as TileId,
  SAND: 2 as TileId,
  ROAD: 3 as TileId,
  WALK: 4 as TileId,
  PARK: 5 as TileId,
  BUILD: 6 as TileId,
  FENCE: 7 as TileId,
  PLAZA: 8 as TileId,
  COURT: 9 as TileId,
};

export const SOLID = new Set<number>([T.BUILD, T.FENCE]);

export const CAR_STATS: Record<string, { accel: number; max: number; brake: number; rev: number; steer: number; grip: number; w: number; h: number }> = {
  sedan: { accel: 170, max: 205, brake: 280, rev: 70, steer: 3.4, grip: 3.1, w: 12, h: 22 },
  taxi: { accel: 150, max: 188, brake: 260, rev: 65, steer: 3.2, grip: 3.0, w: 12, h: 22 },
  hatch: { accel: 185, max: 198, brake: 290, rev: 75, steer: 3.6, grip: 3.3, w: 11, h: 20 },
  compact: { accel: 190, max: 196, brake: 300, rev: 76, steer: 3.55, grip: 3.25, w: 11, h: 20 },
  muscle: { accel: 210, max: 236, brake: 270, rev: 72, steer: 2.85, grip: 2.45, w: 13, h: 24 },
  cop: { accel: 195, max: 218, brake: 310, rev: 74, steer: 3.45, grip: 3.2, w: 12, h: 22 },
};

export function copQuota(stars: number): { foot: number; cars: number } {
  if (stars <= 0) return { foot: 0, cars: 0 };
  if (stars === 1) return { foot: 1, cars: 1 };
  if (stars === 2) return { foot: 2, cars: 2 };
  if (stars === 3) return { foot: 3, cars: 3 };
  if (stars === 4) return { foot: 4, cars: 3 };
  return { foot: 5, cars: 4 };
}
