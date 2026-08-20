export type CarKind = "sedan" | "taxi" | "compact" | "muscle" | "cop" | "hatch";
export type PedState = "wander" | "flee" | "down";
export type WeaponId = "fists" | "pistol";
export type CharacterId = "ansem" | "orangie" | "cupsey";
export type MissionId = "talk" | "jack" | "maya" | "rob" | "escape" | "free";
export type BulletTeam = "player" | "cop";
export type PropKind = "dumpster" | "crate" | "hydrant" | "bench" | "billboard" | "cone" | "barrel" | "stall" | "pier";
export type BuildingKind = "apt" | "shop" | "warehouse" | "office" | "garage" | "pd" | "mart" | "gas" | "club";

export type HudState = {
  cash: number;
  stars: number;
  health: number;
  maxHealth: number;
  prompt: string;
  subtitle: string;
  inCar: boolean;
  swimming: boolean;
  missionTitle: string;
  missionHint: string;
  fade: number;
  busted: boolean;
  playerAngle: number;
  playerX: number;
  playerY: number;
  blipX: number;
  blipY: number;
  hasBlip: boolean;
  fps: number;
  kills: number;
  respect: number;
  weapon: WeaponId;
  ammo: number;
  weaponName: string;
  character: CharacterId;
  radioLive: boolean;
  district: string;
};

export const emptyHud = (): HudState => ({
  cash: 0,
  stars: 0,
  health: 100,
  maxHealth: 100,
  prompt: "",
  subtitle: "",
  inCar: false,
  swimming: false,
  missionTitle: "",
  missionHint: "",
  fade: 0,
  busted: false,
  playerAngle: 0,
  playerX: 0,
  playerY: 0,
  blipX: 0,
  blipY: 0,
  hasBlip: false,
  fps: 60,
  kills: 0,
  respect: 0,
  weapon: "fists",
  ammo: 0,
  weaponName: "FISTS",
  character: "ansem",
  radioLive: false,
  district: "South Side",
});
