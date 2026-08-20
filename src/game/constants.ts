import type { CharacterId } from "./types";

export const TILE = 16;
export const MAP_W = 96;
export const MAP_H = 96;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

export const ZOOM_FOOT = 2.25;
export const ZOOM_CAR = 1.42;

export const STICK_RADIUS = 56;
export const STICK_DEAD = 16;

export const WALK_SPEED = 78;
export const SPRINT_SPEED = 142;
export const PED_SPEED = 34;
export const FLEE_SPEED = 86;
export const SWIM_SPEED = 42;

export const ENTER_LOCK = 0.2;
export const JACK_HOLD = 0.28;
export const PUNCH_RANGE = 18;
export const PUNCH_CD = 0.38;
export const PUNCH_DMG = 28;

export const JUMP_VEL = 168;
export const JUMP_GRAV = 520;

export const STAR_MAX = 5;
export const LOS_FORGET = 4;
export const BUST_HOLD = 1.8;
export const BUST_RANGE = 12;
export const COP_FOOT_SPEED = 40;
export const COP_CAR_MAX = 88;
export const REGEN_DELAY = 4;
export const REGEN_RATE = 5;
export const CAR_HP = 100;

export const BODY_LIFE = 16;
export const BULLET_SPEED = 300;
export const BULLET_LIFE = 0.42;
export const HIT_RADIUS = 10;

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
  cop: { accel: 160, max: 88, brake: 300, rev: 70, steer: 3.2, grip: 3.1, w: 12, h: 22 },
};
