import { gestureUnlock, radio, sharedSfx } from "./audio";
import { bakeCity, drawDuskWash, drawWaterShimmer } from "./cityart";
import {
  BODY_LIFE, BULLET_LIFE, BULLET_SPEED, BUST_HOLD, BUST_RANGE, CAM_FOLLOW,
  CAM_LOOK_CAR, CAM_LOOK_FOOT, CAR_HP, CAR_STATS, CHAR, COP_CAR_MAX, COP_FIRE_CD,
  COP_FIRE_RANGE, COP_FOOT_SPEED, ENTER_LOCK, FLEE_SPEED, FX_CAP, GARAGE_COOL,
  HIT_RADIUS, JACK_HOLD, JUMP_GRAV, JUMP_VEL, PAL, PED_SPEED, PED_TARGET,
  PUNCH_CD, PUNCH_DMG, PUNCH_RANGE, REGEN_DELAY, REGEN_RATE, STAR_COOL, STAR_MAX,
  SWIM_SPEED, TILE, TRAFFIC_TARGET, WEAPON, WORLD_H, WORLD_W, ZOOM_CAR,
  ZOOM_FOOT, copQuota,
} from "./constants";
import type { Input } from "./input";
import { CityMap, LOC } from "./map";
import {
  drawBoat, drawBoom, drawBullet, drawCar, drawDriver, drawHoop, drawLamp,
  drawMuzzle, drawNeon, drawObjectiveArrow, drawPalm, drawPerson, drawSmoke,
} from "./sprites";
import type { BulletTeam, CarKind, CharacterId, HudState, MissionId, PedState, WeaponId } from "./types";
import { emptyHud } from "./types";

type Car = {
  id: number; x: number; y: number; heading: number; speed: number; kind: CarKind;
  color: string; parked: boolean; traffic: boolean; cop: boolean; special: string;
  wp: { x: number; y: number }[]; wi: number; hp: number; wrecked: boolean;
  hasDriver: boolean; vx: number; vy: number;
};
type Ped = {
  x: number; y: number; vx: number; vy: number; facing: number; phase: number;
  state: PedState; hp: number; tx: number; ty: number; downT: number; flash: number;
};
type Cop = {
  x: number; y: number; vx: number; vy: number; facing: number; phase: number;
  hold: number; hp: number; state: "chase" | "down"; downT: number; flash: number;
  fireCd: number;
};
type Bullet = { x: number; y: number; vx: number; vy: number; life: number; dmg: number; team: BulletTeam };
type Fx = { x: number; y: number; life: number; kind: "boom" | "dust" | "blood" | "splash" | "smoke" };
type Npc = { x: number; y: number; facing: number; kind: "rico" | "maya"; name: string };
type Boat = { x: number; y: number; heading: number; t: number; lane: number };

let nextId = 1;
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function angWrap(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function dist(ax: number, ay: number, bx: number, by: number) { return Math.hypot(ax - bx, ay - by); }

const CAR_COLORS = ["#2a6a62", "#c4a46a", "#8a4030", "#d8d0c0", "#1a3a48", "#c46a28", "#2a4a38", "#3a6860", "#ffc83d", "#6a3040"];
const JACK_SPOTS = [
  LOC.compact, LOC.gas, LOC.court, LOC.warehouse, LOC.club, LOC.pier,
];

export class Game {
  map = new CityMap();
  sfx = sharedSfx;
  input: Input;
  viewW = 800;
  viewH = 600;
  player = {
    x: LOC.spawn.x, y: LOC.spawn.y, vx: 0, vy: 0, facing: -Math.PI / 2, phase: 0,
    health: 100, maxHealth: 100, punchT: 0, punchCd: 0, fireCd: 0, muzzleT: 0,
    car: null as Car | null, radius: 6, weapon: "pistol" as WeaponId, ammo: 36,
    character: "ansem" as CharacterId, z: 0, vz: 0, swimming: false, flash: 0,
  };
  cars: Car[] = [];
  peds: Ped[] = [];
  cops: Cop[] = [];
  bullets: Bullet[] = [];
  fx: Fx[] = [];
  npcs: Npc[] = [];
  boats: Boat[] = [];
  cash = 500; stars = 0; kills = 0; respect = 0;
  lastSeen = -999; fade = 0; busting = false; bustedFlag = false;
  time = 0; camX = LOC.spawn.x; camY = LOC.spawn.y; camZoom = ZOOM_FOOT;
  mission: MissionId = "talk"; prompt = ""; subtitle = "";
  fps = 60; private fpsAcc = 0; private fpsN = 0;
  frozen = false; enterLock = 0; enterHold = 0;
  private lastCombat = -999; private storeHold = 0; private storeRobbed = false;
  private dialog: { who: string; text: string }[] = [];
  private dialogI = -1; private dialogT = 0;
  private ricoTalked = false; private mayaPaid = false; private escaped = false;
  private raceOn = false; private raceWon = false; private racePaid = false;
  private ghost: { x: number; y: number; heading: number; t: number } | null = null;
  private compactId = 0; private tileCache: HTMLCanvasElement | null = null;
  private night = 0; private spawnT = 0; private coolT = 0;
  private robKind: "mart" | "docks" = "mart";

  constructor(input: Input, character: CharacterId = "ansem") {
    this.input = input;
    this.player.character = character;
    this.player.maxHealth = CHAR[character].hp;
    this.player.health = CHAR[character].hp;
    this.resetWorld();
  }

  kit() { return CHAR[this.player.character]; }
  addCash(n: number) { this.cash += Math.round(n * this.kit().cash); }

  resetWorld() {
    const kit = this.kit();
    this.player.x = LOC.spawn.x; this.player.y = LOC.spawn.y;
    this.player.vx = 0; this.player.vy = 0; this.player.z = 0; this.player.vz = 0;
    this.player.health = kit.hp; this.player.maxHealth = kit.hp;
    this.player.car = null; this.player.facing = -Math.PI / 2;
    this.player.swimming = false; this.player.flash = 0; this.player.weapon = "pistol"; this.player.ammo = 36;
    this.stars = 0; this.fade = 0; this.busting = false; this.bustedFlag = false;
    this.enterLock = 0; this.enterHold = 0; this.cops = []; this.cars = []; this.peds = [];
    this.bullets = []; this.fx = []; this.storeHold = 0; this.lastCombat = this.time;
    this.boats = [];
    this.spawnParked(); this.spawnTraffic(); this.spawnPeds(); this.spawnNpcs(); this.spawnBoats();
    this.camX = this.player.x; this.camY = this.player.y;
    this.sfx.siren(false);
  }

  private mkCar(p: { x: number; y: number; kind: CarKind; color: string; heading?: number; parked?: boolean; traffic?: boolean; cop?: boolean; special?: string; wp?: { x: number; y: number }[] }): Car {
    const c: Car = {
      id: nextId++, x: p.x, y: p.y, heading: p.heading ?? 0, speed: 0, kind: p.kind, color: p.color,
      parked: !!p.parked, traffic: !!p.traffic, cop: !!p.cop, special: p.special ?? "",
      wp: p.wp ?? [], wi: 0, hp: CAR_HP, wrecked: false, hasDriver: !!p.traffic || !!p.cop, vx: 0, vy: 0,
    };
    this.cars.push(c);
    return c;
  }

  private spawnParked() {
    const spots: [number, number, number, CarKind][] = [
      [LOC.gas.x + 18, LOC.gas.y, 0, "sedan"],
      [LOC.gas.x - 10, LOC.gas.y + 8, Math.PI, "hatch"],
      [LOC.pd.x - 16, LOC.pd.y, Math.PI / 2, "cop"],
      [LOC.warehouse.x - 20, LOC.warehouse.y, 0, "muscle"],
      [LOC.court.x - 30, LOC.court.y + 20, Math.PI / 2, "sedan"],
      [LOC.apartment.x + 28, LOC.apartment.y, 0, "taxi"],
      [LOC.mart.x + 22, LOC.mart.y + 8, Math.PI, "hatch"],
      [LOC.club.x + 16, LOC.club.y + 10, 0, "muscle"],
      [LOC.club.x - 18, LOC.club.y, Math.PI, "taxi"],
      [LOC.pier.x - 24, LOC.pier.y - 18, Math.PI / 2, "sedan"],
      [LOC.garage.x - 22, LOC.garage.y + 6, Math.PI, "hatch"],
      [22 * TILE, 52 * TILE, 0, "sedan"],
      [60 * TILE, 52 * TILE, Math.PI, "taxi"],
      [46 * TILE, 30 * TILE, -Math.PI / 2, "muscle"],
      [73 * TILE, 40 * TILE, Math.PI / 2, "hatch"],
      [10 * TILE, 67 * TILE, 0, "sedan"],
      [34 * TILE, 83 * TILE, Math.PI, "taxi"],
    ];
    spots.forEach((s, i) => this.mkCar({
      x: s[0], y: s[1], heading: s[2], kind: s[3],
      color: s[3] === "cop" ? "#e8eef8" : CAR_COLORS[i % CAR_COLORS.length], parked: true,
    }));
    this.spawnJobCar();
  }

  private spawnJobCar() {
    const spot = JACK_SPOTS[this.night % JACK_SPOTS.length];
    const compact = this.mkCar({
      x: spot.x, y: spot.y, heading: Math.PI / 2, kind: "compact", color: "#ffc83d", parked: true, special: "rico",
    });
    this.compactId = compact.id;
  }

  private spawnTraffic() {
    const kinds: CarKind[] = ["sedan", "taxi", "hatch", "muscle"];
    this.map.trafficLoops.forEach((loop, li) => {
      if (loop.length < 2) return;
      const n = li < 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const pt = loop[i % loop.length];
        const jitter = (i / n);
        const nx = loop[(i + 1) % loop.length];
        this.mkCar({
          x: pt.x + (nx.x - pt.x) * jitter * 0.4,
          y: pt.y + (nx.y - pt.y) * jitter * 0.4,
          heading: Math.atan2(nx.y - pt.y, nx.x - pt.x),
          kind: kinds[(li + i) % kinds.length],
          color: CAR_COLORS[(li + i + 3) % CAR_COLORS.length],
          traffic: true, wp: loop,
        });
      }
    });
  }

  private spawnPeds() {
    const spots = [LOC.court, LOC.mart, LOC.gas, LOC.apartment, LOC.garage, LOC.pd, LOC.warehouse, LOC.rico, LOC.club, LOC.pier, LOC.raceStart];
    for (let i = 0; i < PED_TARGET; i++) {
      const s = spots[i % spots.length];
      const x = s.x + (Math.random() - 0.5) * 56;
      const y = s.y + (Math.random() - 0.5) * 56;
      if (this.map.isSolidWorld(x, y) || this.map.isWaterWorld(x, y)) continue;
      this.peds.push({ x, y, vx: 0, vy: 0, facing: Math.random() * Math.PI * 2, phase: Math.random(), state: "wander", hp: 40, tx: x, ty: y, downT: 0, flash: 0 });
    }
  }

  private spawnNpcs() {
    this.npcs = [
      { x: LOC.rico.x, y: LOC.rico.y, facing: 0, kind: "rico", name: "RICO" },
      { x: LOC.maya.x, y: LOC.maya.y, facing: Math.PI, kind: "maya", name: "MAYA" },
    ];
  }

  private spawnBoats() {
    this.boats = [
      { x: 40 * TILE, y: 93 * TILE, heading: 0, t: 0, lane: 93 },
      { x: 80 * TILE, y: 91 * TILE, heading: Math.PI, t: 2, lane: 91 },
    ];
  }

  update(dt: number) {
    this.time += dt;
    this.fpsAcc += dt; this.fpsN += 1;
    if (this.fpsAcc >= 0.4) { this.fps = Math.round(this.fpsN / this.fpsAcc); this.fpsAcc = 0; this.fpsN = 0; }
    this.input.beginFrame();
    if (this.frozen) { this.sfx.engine(0, false); this.sfx.siren(false); this.input.endFrame(); return; }
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt);
      if (this.fade === 0 && (this.player.health <= 0 || this.bustedFlag)) {
        if (this.bustedFlag) this.cash = Math.max(0, this.cash - 80);
        this.bustedFlag = false;
        this.resetWorld();
      }
      this.input.endFrame();
      return;
    }
    this.enterLock = Math.max(0, this.enterLock - dt);
    this.player.punchT = Math.max(0, this.player.punchT - dt);
    this.player.punchCd = Math.max(0, this.player.punchCd - dt);
    this.player.fireCd = Math.max(0, this.player.fireCd - dt);
    this.player.muzzleT = Math.max(0, this.player.muzzleT - dt);
    this.player.flash = Math.max(0, this.player.flash - dt * 4);
    if (this.input.weaponSlot === 1) this.player.weapon = "fists";
    if (this.input.weaponSlot === 2) this.player.weapon = "pistol";
    if (this.input.cycleWeapon) this.player.weapon = this.player.weapon === "fists" ? "pistol" : "fists";
    this.updateDialog(dt);
    this.updatePlayer(dt);
    this.updateCars(dt);
    this.updatePeds(dt);
    this.updateCops(dt);
    this.updateBullets(dt);
    this.updateFx(dt);
    this.updateBoats(dt);
    this.updateHeat(dt);
    this.updateMission(dt);
    this.updateRace(dt);
    this.repopulate(dt);
    this.updateCamera(dt);
    const delay = this.time - this.lastCombat;
    if (this.player.health > 0 && this.player.health < this.player.maxHealth && delay > REGEN_DELAY) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + REGEN_RATE * dt);
    }
    if (this.player.health <= 0) { this.sfx.death(); this.fade = 1.2; }
    this.sfx.engine(this.player.car?.speed ?? 0, !!this.player.car && !this.player.car.wrecked);
    this.sfx.siren(this.stars > 0);
    this.input.endFrame();
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const look = p.car ? CAM_LOOK_CAR : CAM_LOOK_FOOT;
    const tx = p.x + Math.cos(p.facing) * look;
    const ty = p.y + Math.sin(p.facing) * look;
    const k = clamp(dt * CAM_FOLLOW, 0, 1);
    this.camX += (tx - this.camX) * k;
    this.camY += (ty - this.camY) * k;
    this.camZoom += ((p.car ? ZOOM_CAR : ZOOM_FOOT) - this.camZoom) * clamp(dt * 4, 0, 1);
  }

  private aimWorld() {
    const wx = this.camX + (this.input.aimSX * this.viewW - this.viewW / 2) / this.camZoom;
    const wy = this.camY + (this.input.aimSY * this.viewH - this.viewH / 2) / this.camZoom;
    return { x: wx, y: wy };
  }

  private updateDialog(dt: number) {
    if (this.dialogI < 0) return;
    this.dialogT += dt;
    const line = this.dialog[this.dialogI];
    this.subtitle = line ? line.who + ": " + line.text : "";
    if (this.input.interactPressed || this.dialogT > 2.2) {
      this.dialogI += 1;
      this.dialogT = 0;
      if (this.dialogI >= this.dialog.length) {
        this.dialogI = -1; this.subtitle = "";
        if (this.mission === "talk") {
          this.ricoTalked = true;
          this.mission = "jack";
        } else if (this.mission === "free") {
          this.startNight();
        }
      }
    }
  }

  private startNight() {
    this.night += 1;
    this.mayaPaid = false;
    this.escaped = false;
    this.storeRobbed = false;
    this.storeHold = 0;
    this.robKind = this.night % 2 === 0 ? "mart" : "docks";
    this.cars = this.cars.filter((c) => c.special !== "rico" || this.player.car === c);
    this.spawnJobCar();
    this.mission = "jack";
    this.subtitle = this.robKind === "mart"
      ? "RICO: Yellow one. Maya first. Then the mart."
      : "RICO: Same dance. Maya, then the dock crate.";
  }

  private tryTalk() {
    if (this.dialogI >= 0) return;
    for (const n of this.npcs) {
      if (dist(this.player.x, this.player.y, n.x, n.y) > 22) continue;
      if (n.kind === "rico" && (this.mission === "talk" || this.mission === "free")) {
        this.dialog = this.mission === "talk"
          ? [
            { who: "RICO", text: "Yellow compact. Maya wants it yesterday." },
            { who: "YOU", text: "And after?" },
            { who: "RICO", text: "6ix Mart. Don't bleed on the seats." },
          ]
          : [
            { who: "RICO", text: "Night's still young. Another yellow." },
            { who: "RICO", text: this.night % 2 === 0 ? "Mart restocked." : "Crate on the docks." },
          ];
        this.dialogI = 0; this.dialogT = 0;
        return;
      }
    }
  }

  private moveSolid(x: number, y: number, nx: number, ny: number, r: number) {
    let px = nx, py = ny;
    if (this.map.isSolidWorld(px, y) || px < r || px > WORLD_W - r) px = x;
    if (this.map.isSolidWorld(x, py) || py < r || py > WORLD_H - r) py = y;
    if (this.map.isSolidWorld(px, py)) { px = x; py = y; }
    return { x: px, y: py };
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    const kit = this.kit();
    if (this.input.interactPressed) { this.tryTalk(); this.tryRace(); }
    if (p.car) { this.drive(p.car, dt, true); p.x = p.car.x; p.y = p.car.y; p.facing = p.car.heading; p.swimming = false; this.tryExit(p.car); this.tryShoot(); return; }
    p.swimming = this.map.isWaterWorld(p.x, p.y);
    if (p.swimming && p.z <= 0) {
      const sp = SWIM_SPEED;
      p.vx = this.input.moveX * sp; p.vy = this.input.moveY * sp;
      if (this.input.moveX || this.input.moveY) p.facing = Math.atan2(p.vy, p.vx);
      const n = this.moveSolid(p.x, p.y, p.x + p.vx * dt, p.y + p.vy * dt, p.radius);
      if (!this.map.isWaterWorld(p.x, p.y) && this.map.isWaterWorld(n.x, n.y)) this.sfx.splash();
      p.x = n.x; p.y = n.y; p.phase += dt * 4; p.z = 0; p.vz = 0;
    } else {
      const moving = Math.hypot(this.input.moveX, this.input.moveY) > 0.08;
      const spd = this.input.sprint ? kit.sprint : kit.walk;
      p.vx = this.input.moveX * spd; p.vy = this.input.moveY * spd;
      if (this.input.hasAim && !this.input.showTouch && (this.input.fireHeld || this.input.mouseHeld)) {
        const a = this.aimWorld();
        p.facing = Math.atan2(a.y - p.y, a.x - p.x);
      } else if (moving) p.facing = Math.atan2(p.vy, p.vx);
      if (this.input.jumpPressed && p.z <= 0.1 && !p.swimming) p.vz = JUMP_VEL * kit.jump;
      p.vz -= JUMP_GRAV * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz = 0; }
      const n = this.moveSolid(p.x, p.y, p.x + p.vx * dt, p.y + p.vy * dt, p.radius);
      if (!this.map.isWaterWorld(p.x, p.y) && this.map.isWaterWorld(n.x, n.y)) this.sfx.splash();
      p.x = n.x; p.y = n.y;
      p.phase += moving ? dt * (this.input.sprint ? 8 : 6) : dt * 1.2;
    }
    this.tryJack(dt);
    this.tryPunch();
    this.tryShoot();
    this.tryRob(dt);
  }

  private nearCar(): Car | null {
    let best: Car | null = null; let bd = 22;
    for (const c of this.cars) {
      if (c.wrecked) continue;
      const d = dist(this.player.x, this.player.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  private tryJack(dt: number) {
    const robAt = this.robPoint();
    if (!this.storeRobbed && dist(this.player.x, this.player.y, robAt.x, robAt.y) < 22) return;
    if (this.player.car || this.enterLock > 0) { this.enterHold = 0; return; }
    const c = this.nearCar();
    if (!c || !this.input.enterHeld) { this.enterHold = 0; return; }
    this.enterHold += dt;
    if (this.enterHold >= JACK_HOLD) {
      if (c.hasDriver && !c.parked) this.addWanted(1);
      c.hasDriver = false; c.parked = false; c.traffic = false;
      this.player.car = c; this.enterLock = ENTER_LOCK; this.enterHold = 0;
      this.sfx.door();
      if (c.special === "rico" && this.mission === "jack") this.mission = "maya";
    }
  }

  private tryExit(c: Car) {
    if (this.enterLock > 0 || !this.input.enterPressed) return;
    const off = 16;
    let x = c.x + Math.cos(c.heading + Math.PI / 2) * off;
    let y = c.y + Math.sin(c.heading + Math.PI / 2) * off;
    if (this.map.isSolidWorld(x, y)) { x = c.x; y = c.y; }
    this.player.car = null; this.player.x = x; this.player.y = y;
    this.enterLock = ENTER_LOCK; this.sfx.door();
  }

  private tryPunch() {
    const p = this.player;
    if (p.car || p.weapon !== "fists") return;
    if (!(this.input.punchPressed || (this.input.shootPressed && p.weapon === "fists"))) return;
    if (p.punchCd > 0) return;
    p.punchT = 0.16; p.punchCd = PUNCH_CD; this.sfx.punch();
    const reach = PUNCH_RANGE * this.kit().punch;
    for (const ped of this.peds) {
      if (ped.state === "down") continue;
      if (dist(p.x, p.y, ped.x, ped.y) < reach) this.hurtPed(ped, PUNCH_DMG * this.kit().punch);
    }
    for (const cop of this.cops) {
      if (cop.state === "down") continue;
      if (dist(p.x, p.y, cop.x, cop.y) < reach) this.hurtCop(cop, PUNCH_DMG * this.kit().punch);
    }
  }

  private tryShoot() {
    const p = this.player;
    if (p.weapon !== "pistol") return;
    if (!this.input.fireHeld && !this.input.shootPressed) return;
    if (p.fireCd > 0) return;
    if (p.ammo <= 0) { if (this.input.shootPressed) this.sfx.empty(); return; }
    const w = WEAPON.pistol;
    p.fireCd = 1 / w.rate; p.ammo -= 1; p.muzzleT = 0.08; this.sfx.gunshot();
    if (this.input.hasAim && !this.input.showTouch) {
      const a = this.aimWorld();
      p.facing = Math.atan2(a.y - p.y, a.x - p.x);
    }
    const spread = (Math.random() - 0.5) * this.kit().spread * 2;
    const ang = p.facing + spread;
    this.bullets.push({
      x: p.x + Math.cos(ang) * 10, y: p.y + Math.sin(ang) * 10,
      vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED,
      life: BULLET_LIFE, dmg: w.dmg, team: "player",
    });
    this.lastCombat = this.time;
    if (this.mission !== "talk" && this.stars === 0) this.addWanted(1);
  }

  private robPoint() {
    return this.robKind === "docks" ? LOC.warehouse : LOC.mart;
  }

  private tryRob(dt: number) {
    if (this.storeRobbed) return;
    const at = this.robPoint();
    if (dist(this.player.x, this.player.y, at.x, at.y) > 20) { this.storeHold = 0; return; }
    if (!this.input.enterHeld) { this.storeHold = 0; return; }
    this.storeHold += dt;
    if (this.storeHold >= 1.05) {
      this.storeRobbed = true; this.storeHold = 0;
      this.addCash(this.robKind === "docks" ? 520 : 420);
      this.addWanted(2);
      this.sfx.win();
      this.subtitle = this.robKind === "docks" ? "Crate's yours. NCPD heard the lock." : "Register's empty. Sirens on the strip.";
      if (this.mission === "rob") this.mission = "escape";
    }
  }

  private drive(c: Car, dt: number, player: boolean) {
    if (c.wrecked) { c.speed *= Math.max(0, 1 - dt * 2); return; }
    const st = CAR_STATS[c.kind] ?? CAR_STATS.sedan;
    if (player) {
      const th = this.input.moveY < -0.1 ? 1 : this.input.moveY > 0.15 || this.input.brakeHeld ? -1 : 0;
      const steer = this.input.moveX;
      if (th > 0) c.speed = Math.min(st.max, c.speed + st.accel * dt);
      else if (th < 0) c.speed = Math.max(-st.rev, c.speed - st.brake * dt);
      else c.speed *= Math.max(0, 1 - st.grip * dt * 0.35);
      if (Math.abs(c.speed) > 8) c.heading += steer * st.steer * (c.speed >= 0 ? 1 : -1) * dt * (Math.abs(c.speed) / st.max);
    }
    const nx = c.x + Math.cos(c.heading) * c.speed * dt;
    const ny = c.y + Math.sin(c.heading) * c.speed * dt;
    if (this.map.isSolidWorld(nx, ny) || nx < 8 || ny < 8 || nx > WORLD_W - 8 || ny > WORLD_H - 8) {
      c.speed *= -0.25;
      c.hp -= 18 * (player ? this.kit().ram : 1);
      this.sfx.crash();
      this.pushFx(c.x, c.y, 0.3, "dust");
    } else { c.x = nx; c.y = ny; }
    if (this.map.isWaterWorld(c.x, c.y)) { c.hp -= 40 * dt; if (c.hp < 20) this.explodeCar(c); }
    this.carHits(c, player);
    if (c.hp <= 0 && !c.wrecked) this.explodeCar(c);
  }

  private carHits(c: Car, player: boolean) {
    for (const ped of this.peds) {
      if (ped.state === "down") continue;
      if (dist(c.x, c.y, ped.x, ped.y) < 12 && Math.abs(c.speed) > 40) {
        this.hurtPed(ped, 50); ped.vx = Math.cos(c.heading) * 80; ped.vy = Math.sin(c.heading) * 80;
        if (player) this.addWanted(1);
      }
    }
    for (const o of this.cars) {
      if (o === c || o.wrecked) continue;
      if (dist(c.x, c.y, o.x, o.y) < 16 && Math.abs(c.speed) > 30) {
        o.hp -= 14; c.hp -= 9; c.speed *= 0.65;
        this.pushFx((c.x + o.x) / 2, (c.y + o.y) / 2, 0.25, "dust");
        if (player && Math.abs(c.speed) > 70) this.addWanted(1);
        if (o.hp <= 0) this.explodeCar(o);
      }
    }
    if (player) {
      for (const cop of this.cops) {
        if (cop.state === "down") continue;
        if (dist(c.x, c.y, cop.x, cop.y) < 12 && Math.abs(c.speed) > 40) {
          this.hurtCop(cop, 40);
        }
      }
    }
  }

  private explodeCar(c: Car) {
    if (c.wrecked) return;
    c.wrecked = true; c.hp = 0; c.speed = 0; c.hasDriver = false;
    this.sfx.explode();
    this.pushFx(c.x, c.y, 0.7, "boom");
    if (this.player.car === c) {
      this.hurtPlayer(35);
      this.player.car = null;
      this.player.x = c.x + 10; this.player.y = c.y + 8;
    }
    for (const ped of this.peds) {
      if (ped.state !== "down" && dist(c.x, c.y, ped.x, ped.y) < 28) this.hurtPed(ped, 80);
    }
    for (const o of this.cars) {
      if (o === c || o.wrecked) continue;
      if (dist(c.x, c.y, o.x, o.y) < 30) {
        o.hp -= 40;
        if (o.hp <= 0) this.explodeCar(o);
      }
    }
    if (this.player.car !== c && dist(this.player.x, this.player.y, c.x, c.y) < 26) this.hurtPlayer(22);
  }

  private updateCars(dt: number) {
    const p = this.player;
    const pSpeed = p.car ? p.car.speed : Math.hypot(p.vx, p.vy);
    for (const c of this.cars) {
      if (this.player.car === c) continue;
      if (c.wrecked) continue;
      if (c.cop && this.stars > 0) {
        const lead = (this.stars >= 2 ? 70 : 28) + Math.abs(pSpeed) * 0.35;
        const tx = p.x + Math.cos(p.facing) * lead;
        const ty = p.y + Math.sin(p.facing) * lead;
        const cut = this.stars >= 2 ? 1 : 0;
        const ax = tx + Math.cos(p.facing + Math.PI / 2) * cut * 18;
        const ay = ty + Math.sin(p.facing + Math.PI / 2) * cut * 18;
        const ang = Math.atan2(ay - c.y, ax - c.x);
        c.heading += angWrap(ang - c.heading) * (2.6 + this.stars * 0.15) * dt;
        const cap = Math.min(COP_CAR_MAX + this.stars * 8, CAR_STATS.cop.max);
        c.speed = Math.min(cap, c.speed + 130 * dt);
        this.drive(c, dt, false);
        continue;
      }
      if (c.traffic && c.wp.length) {
        const t = c.wp[c.wi % c.wp.length];
        let blocked = 1;
        for (const o of this.cars) {
          if (o === c || o.wrecked) continue;
          const d = dist(c.x, c.y, o.x, o.y);
          if (d < 22 && Math.abs(angWrap(Math.atan2(o.y - c.y, o.x - c.x) - c.heading)) < 0.7) blocked = 0.35;
        }
        const ang = Math.atan2(t.y - c.y, t.x - c.x);
        c.heading += angWrap(ang - c.heading) * 3 * dt;
        c.speed = Math.min(CAR_STATS[c.kind].max * 0.48 * blocked, c.speed + 90 * dt);
        this.drive(c, dt, false);
        if (dist(c.x, c.y, t.x, t.y) < 18) c.wi = (c.wi + 1) % c.wp.length;
      }
    }
  }

  private updatePeds(dt: number) {
    for (const ped of this.peds) {
      ped.flash = Math.max(0, ped.flash - dt * 4);
      if (ped.state === "down") { ped.downT -= dt; continue; }
      if (this.stars > 0 || ped.state === "flee") {
        ped.state = "flee";
        const ang = Math.atan2(ped.y - this.player.y, ped.x - this.player.x);
        ped.vx = Math.cos(ang) * FLEE_SPEED; ped.vy = Math.sin(ang) * FLEE_SPEED;
      } else if (dist(ped.x, ped.y, ped.tx, ped.ty) < 6) {
        ped.tx = clamp(ped.x + (Math.random() - 0.5) * 90, 16, WORLD_W - 16);
        ped.ty = clamp(ped.y + (Math.random() - 0.5) * 90, 16, WORLD_H - 16);
        if (this.map.isSolidWorld(ped.tx, ped.ty) || this.map.isWaterWorld(ped.tx, ped.ty)) { ped.tx = ped.x; ped.ty = ped.y; }
      } else {
        const ang = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
        ped.vx = Math.cos(ang) * PED_SPEED; ped.vy = Math.sin(ang) * PED_SPEED;
      }
      ped.facing = Math.atan2(ped.vy, ped.vx);
      const n = this.moveSolid(ped.x, ped.y, ped.x + ped.vx * dt, ped.y + ped.vy * dt, 5);
      ped.x = n.x; ped.y = n.y; ped.phase += dt * 4;
    }
    this.peds = this.peds.filter((p) => p.state !== "down" || p.downT > 0);
  }

  private hurtPed(ped: Ped, dmg: number) {
    ped.hp -= dmg; ped.flash = 1; this.sfx.pedHit();
    this.pushFx(ped.x, ped.y, 0.25, "blood");
    if (ped.hp <= 0) { ped.state = "down"; ped.downT = BODY_LIFE; this.kills += 1; this.addWanted(1); this.addCash(20); }
    else ped.state = "flee";
    this.lastCombat = this.time;
  }

  private hurtPlayer(dmg: number) {
    this.player.health -= dmg;
    this.player.flash = 1;
    this.lastCombat = this.time;
    this.sfx.pedHit();
  }

  private addWanted(n: number) {
    const prev = this.stars;
    this.stars = clamp(this.stars + n, 0, STAR_MAX);
    if (n === 0 && this.stars === 0) return;
    if (this.stars > prev || (n > 0 && this.stars > 0)) {
      if (this.stars > prev) this.sfx.star();
      this.lastSeen = this.time;
      this.ensureCops();
    }
  }

  private spawnCopFoot(x: number, y: number) {
    this.cops.push({
      x, y, vx: 0, vy: 0, facing: 0, phase: Math.random(), hold: 0, hp: 60,
      state: "chase", downT: 0, flash: 0, fireCd: 0.4,
    });
  }

  private spawnCopCar(x: number, y: number, heading: number) {
    this.mkCar({ x, y, heading, kind: "cop", color: "#e8eef8", cop: true });
  }

  private ensureCops() {
    const q = copQuota(this.stars);
    if (this.stars <= 0) {
      this.cops = [];
      this.cars = this.cars.filter((c) => !c.cop || this.player.car === c);
      return;
    }
    const liveFoot = this.cops.filter((c) => c.state !== "down").length;
    const liveCars = this.cars.filter((c) => c.cop && !c.wrecked).length;
    const px = this.player.x;
    const py = this.player.y;
    for (let i = liveFoot; i < q.foot; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 90 + i * 28;
      let x = clamp(px + Math.cos(ang) * d, 20, WORLD_W - 20);
      let y = clamp(py + Math.sin(ang) * d, 20, WORLD_H - 20);
      if (this.map.isSolidWorld(x, y) || this.map.isWaterWorld(x, y)) { x = LOC.pd.x; y = LOC.pd.y; }
      this.spawnCopFoot(x, y);
    }
    for (let i = liveCars; i < q.cars; i++) {
      const ang = (i / Math.max(1, q.cars)) * Math.PI * 2 + this.time;
      const d = 140 + i * 36;
      let x = clamp(px + Math.cos(ang) * d, 24, WORLD_W - 24);
      let y = clamp(py + Math.sin(ang) * d, 24, WORLD_H - 24);
      if (this.map.isSolidWorld(x, y)) { x = LOC.pd.x + 8; y = LOC.pd.y + 20 + i * 12; }
      this.spawnCopCar(x, y, Math.atan2(py - y, px - x));
    }
  }

  private hasLos(ax: number, ay: number, bx: number, by: number) {
    const d = dist(ax, ay, bx, by);
    if (d > 240) return false;
    const steps = Math.max(2, Math.floor(d / 12));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.map.isSolidWorld(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }

  private updateCops(dt: number) {
    if (this.stars <= 0) { this.cops = []; this.sfx.siren(false); return; }
    this.ensureCops();
    let seen = false;
    for (const cop of this.cops) {
      cop.flash = Math.max(0, cop.flash - dt * 4);
      cop.fireCd = Math.max(0, cop.fireCd - dt);
      if (cop.state === "down") { cop.downT -= dt; continue; }
      const see = this.hasLos(cop.x, cop.y, this.player.x, this.player.y);
      if (see) seen = true;
      const ang = Math.atan2(this.player.y - cop.y, this.player.x - cop.x);
      cop.facing = ang;
      const spd = COP_FOOT_SPEED + this.stars * 6;
      cop.vx = Math.cos(ang) * spd; cop.vy = Math.sin(ang) * spd;
      const n = this.moveSolid(cop.x, cop.y, cop.x + cop.vx * dt, cop.y + cop.vy * dt, 5);
      cop.x = n.x; cop.y = n.y; cop.phase += dt * 5;
      if (see && this.stars >= 3 && cop.fireCd <= 0 && dist(cop.x, cop.y, this.player.x, this.player.y) < COP_FIRE_RANGE) {
        cop.fireCd = COP_FIRE_CD;
        this.sfx.gunshot();
        this.bullets.push({
          x: cop.x + Math.cos(ang) * 10, y: cop.y + Math.sin(ang) * 10,
          vx: Math.cos(ang) * BULLET_SPEED * 0.85, vy: Math.sin(ang) * BULLET_SPEED * 0.85,
          life: BULLET_LIFE, dmg: 18, team: "cop",
        });
      }
      if (dist(cop.x, cop.y, this.player.x, this.player.y) < BUST_RANGE && !this.player.car) {
        cop.hold += dt;
        if (cop.hold >= BUST_HOLD) { this.bustedFlag = true; this.fade = 1.1; this.sfx.fail(); }
      } else cop.hold = 0;
    }
    for (const c of this.cars) {
      if (c.cop && !c.wrecked && this.hasLos(c.x, c.y, this.player.x, this.player.y)) seen = true;
    }
    if (seen) this.lastSeen = this.time;
    this.cops = this.cops.filter((c) => c.state !== "down" || c.downT > 0);
  }

  private hurtCop(cop: Cop, dmg: number) {
    cop.hp -= dmg; cop.flash = 1; this.sfx.pedHit(); this.addWanted(1); this.lastCombat = this.time;
    if (cop.hp <= 0) { cop.state = "down"; cop.downT = BODY_LIFE; this.kills += 1; }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (this.map.isSolidWorld(b.x, b.y)) { b.life = 0; continue; }
      if (b.team === "cop") {
        const p = this.player;
        const hit = p.car ? dist(b.x, b.y, p.x, p.y) < 14 : dist(b.x, b.y, p.x, p.y) < HIT_RADIUS;
        if (hit) {
          this.hurtPlayer(p.car ? b.dmg * 0.35 : b.dmg);
          if (p.car) p.car.hp -= b.dmg * 0.25;
          b.life = 0;
          continue;
        }
      }
      if (b.team === "player") {
        for (const ped of this.peds) {
          if (ped.state === "down") continue;
          if (dist(b.x, b.y, ped.x, ped.y) < HIT_RADIUS) { this.hurtPed(ped, b.dmg); b.life = 0; }
        }
        for (const cop of this.cops) {
          if (cop.state === "down") continue;
          if (dist(b.x, b.y, cop.x, cop.y) < HIT_RADIUS) { this.hurtCop(cop, b.dmg); b.life = 0; }
        }
      }
      for (const c of this.cars) {
        if (c.wrecked) continue;
        if (dist(b.x, b.y, c.x, c.y) < 12) { c.hp -= b.dmg * 0.55; b.life = 0; if (c.hp <= 0) this.explodeCar(c); }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private pushFx(x: number, y: number, life: number, kind: Fx["kind"]) {
    if (this.fx.length >= FX_CAP) this.fx.shift();
    this.fx.push({ x, y, life, kind });
  }

  private updateFx(dt: number) {
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter((f) => f.life > 0);
    for (const c of this.cars) {
      if (c.wrecked && Math.random() < dt * 3) this.pushFx(c.x + (Math.random() - 0.5) * 8, c.y, 0.6, "smoke");
    }
  }

  private updateBoats(dt: number) {
    for (const b of this.boats) {
      b.t += dt;
      b.x += Math.cos(b.heading) * 18 * dt;
      if (b.x > WORLD_W - 20) { b.x = WORLD_W - 20; b.heading = Math.PI; }
      if (b.x < 20) { b.x = 20; b.heading = 0; }
      b.y = b.lane * TILE + Math.sin(b.t * 1.4) * 3;
    }
  }

  private updateHeat(dt: number) {
    if (this.stars <= 0) return;
    const inGarage = dist(this.player.x, this.player.y, LOC.garage.x, LOC.garage.y) < 28;
    if (inGarage) {
      this.coolT += dt;
      if (this.coolT >= GARAGE_COOL) {
        this.coolT = 0;
        this.stars = Math.max(0, this.stars - 1);
        this.lastSeen = this.time;
        if (this.stars === 0) {
          this.cops = [];
          this.cars = this.cars.filter((c) => !c.cop || this.player.car === c);
        }
      }
      return;
    }
    this.coolT = 0;
    if (this.time - this.lastSeen >= STAR_COOL) {
      this.stars = Math.max(0, this.stars - 1);
      this.lastSeen = this.time;
      if (this.stars === 0) {
        this.cops = [];
        this.cars = this.cars.filter((c) => !c.cop || this.player.car === c);
      } else this.ensureCops();
    }
  }

  private updateMission(_dt: number) {
    if (this.mission === "maya" && this.player.car && dist(this.player.x, this.player.y, LOC.garage.x, LOC.garage.y) < 28) {
      if (!this.mayaPaid) {
        this.mayaPaid = true; this.addCash(240 + this.night * 40); this.respect += 12; this.sfx.win();
        this.subtitle = this.robKind === "docks"
          ? "MAYA: Clean. Dock crate after dark. Don't stall."
          : "MAYA: Nice wheels. Mart on the strip is fat tonight.";
        this.mission = "rob";
      }
    }
    if (this.mission === "escape" && dist(this.player.x, this.player.y, LOC.garage.x, LOC.garage.y) < 26 && this.stars === 0) {
      if (!this.escaped) {
        this.escaped = true; this.addCash(300 + this.night * 50); this.respect += 18; this.sfx.win();
        this.subtitle = "MAYA: Heat died. Rico's still in the alley if you want another night.";
        this.mission = "free";
      }
    }
  }

  private updateRace(dt: number) {
    if (!this.raceOn || !this.ghost) return;
    const start = LOC.raceStart; const end = LOC.raceEnd;
    const total = dist(start.x, start.y, end.x, end.y);
    this.ghost.t += dt;
    const gspd = 158;
    const traveled = Math.min(total, this.ghost.t * gspd);
    const u = traveled / total;
    this.ghost.x = start.x + (end.x - start.x) * u;
    this.ghost.y = start.y + (end.y - start.y) * u;
    this.ghost.heading = Math.atan2(end.y - start.y, end.x - start.x);
    const playerDone = dist(this.player.x, this.player.y, end.x, end.y) < 22;
    const ghostDone = u >= 1;
    if (playerDone && !ghostDone) {
      this.raceOn = false; this.raceWon = true;
      if (!this.racePaid) { this.racePaid = true; this.addCash(260); this.respect += 8; }
      this.sfx.win(); this.subtitle = "Ghost cooked. Street pays.";
      this.ghost = null;
    } else if (ghostDone && !playerDone) {
      this.raceOn = false; this.ghost = null; this.sfx.fail(); this.subtitle = "Ghost kept the line.";
    }
  }

  private tryRace() {
    if (this.raceOn || dist(this.player.x, this.player.y, LOC.raceStart.x, LOC.raceStart.y) > 22) return;
    this.raceOn = true;
    this.racePaid = false;
    this.ghost = { x: LOC.raceStart.x, y: LOC.raceStart.y, heading: -Math.PI / 2, t: 0 };
    this.subtitle = "Ghost is live. North on Block Ave.";
  }

  private repopulate(dt: number) {
    this.spawnT += dt;
    if (this.spawnT < 2.4) return;
    this.spawnT = 0;
    const traffic = this.cars.filter((c) => c.traffic && !c.wrecked).length;
    if (traffic < TRAFFIC_TARGET - 4) {
      const loop = this.map.trafficLoops[Math.floor(Math.random() * this.map.trafficLoops.length)];
      if (loop && loop.length > 1) {
        const pt = loop[0];
        this.mkCar({
          x: pt.x, y: pt.y, heading: 0, kind: "sedan", color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
          traffic: true, wp: loop,
        });
      }
    }
    if (this.peds.filter((p) => p.state !== "down").length < PED_TARGET - 8) {
      const s = LOC.court;
      const x = s.x + (Math.random() - 0.5) * 40;
      const y = s.y + (Math.random() - 0.5) * 40;
      if (!this.map.isSolidWorld(x, y) && !this.map.isWaterWorld(x, y)) {
        this.peds.push({ x, y, vx: 0, vy: 0, facing: 0, phase: 0, state: "wander", hp: 40, tx: x, ty: y, downT: 0, flash: 0 });
      }
    }
  }

  private blip(): { x: number; y: number } | null {
    switch (this.mission) {
      case "talk": return LOC.rico;
      case "jack": {
        const c = this.cars.find((x) => x.id === this.compactId);
        return c ? { x: c.x, y: c.y } : LOC.compact;
      }
      case "maya":
      case "escape": return LOC.garage;
      case "rob": return this.robPoint();
      case "free": return this.raceOn ? LOC.raceEnd : LOC.rico;
      default: {
        const _n: never = this.mission;
        return _n;
      }
    }
  }

  private titles(): { title: string; hint: string } {
    if (this.dialogI >= 0) return { title: "RICO", hint: "E next line" };
    if (this.raceOn) return { title: "GHOST", hint: "Beat the ghost north on Block Ave" };
    switch (this.mission) {
      case "talk": return { title: "SOUTH SIDE", hint: "Find Rico in the alley. E to talk" };
      case "jack": return { title: "JACK IT", hint: "Hold F / B on the yellow compact" };
      case "maya": return { title: "MAYA", hint: "Drive the compact to Maya garage" };
      case "rob": return {
        title: this.robKind === "docks" ? "DOCK CRATE" : "6IX MART",
        hint: this.robKind === "docks" ? "Hold F / B at the docks crate" : "Hold F / B at the mart",
      };
      case "escape": return { title: "HEAT", hint: "Lose stars or cool off in Maya's bay" };
      case "free": return { title: "SOUTH SIDE", hint: "Talk Rico for another night. Race is optional" };
      default: {
        const _n: never = this.mission;
        return _n;
      }
    }
  }

  hud(): HudState {
    const h = emptyHud();
    const t = this.titles();
    const b = this.blip();
    const near = this.nearCar();
    let prompt = "";
    if (this.dialogI < 0 && (this.mission === "talk" || this.mission === "free") && dist(this.player.x, this.player.y, LOC.rico.x, LOC.rico.y) < 22) prompt = "E talk";
    else if (!this.player.car && near) prompt = "Hold F / B jack";
    else if (this.player.car) prompt = "F / B exit";
    const robAt = this.robPoint();
    if (!this.storeRobbed && dist(this.player.x, this.player.y, robAt.x, robAt.y) < 20) prompt = "Hold F / B rob";
    if (!this.raceOn && dist(this.player.x, this.player.y, LOC.raceStart.x, LOC.raceStart.y) < 22) prompt = "E race ghost";
    h.cash = this.cash; h.stars = this.stars; h.health = this.player.health; h.maxHealth = this.player.maxHealth;
    h.prompt = prompt; h.subtitle = this.subtitle; h.inCar = !!this.player.car; h.swimming = this.player.swimming;
    h.missionTitle = t.title; h.missionHint = t.hint; h.fade = this.fade; h.busted = this.bustedFlag;
    h.playerAngle = this.player.facing; h.playerX = this.player.x; h.playerY = this.player.y;
    if (b) { h.hasBlip = true; h.blipX = b.x; h.blipY = b.y; }
    h.fps = this.fps; h.kills = this.kills; h.respect = this.respect;
    h.weapon = this.player.weapon; h.ammo = this.player.ammo; h.weaponName = WEAPON[this.player.weapon].name;
    h.character = this.player.character; h.radioLive = radio.isLive(); h.district = "South Side";
    return h;
  }

  private paintTiles(ctx: CanvasRenderingContext2D) {
    if (!this.tileCache) this.tileCache = bakeCity(this.map);
    ctx.drawImage(this.tileCache, 0, 0);
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.viewW = w; this.viewH = h;
    ctx.imageSmoothingEnabled = false;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, PAL.skyTop); g.addColorStop(1, PAL.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camZoom, this.camZoom);
    ctx.translate(-this.camX, -this.camY);
    this.paintTiles(ctx);
    drawWaterShimmer(ctx, this.map, this.time);
    for (const lamp of this.map.lamps) drawLamp(ctx, lamp.x, lamp.y);
    for (const palm of this.map.palms) drawPalm(ctx, palm.x, palm.y, palm.h);
    drawHoop(ctx, LOC.court.x - 40, LOC.court.y);
    drawHoop(ctx, LOC.court.x + 40, LOC.court.y);
    for (const n of this.map.neons) drawNeon(ctx, n.x, n.y, n.text, n.color, this.time);
    for (const boat of this.boats) drawBoat(ctx, boat.x, boat.y, boat.heading);
    const sprites: { y: number; draw: () => void }[] = [];
    for (const c of this.cars) {
      sprites.push({ y: c.y, draw: () => {
        const flash = c.cop && this.stars > 0 && ((this.time * 8) | 0) % 2 === 0;
        drawCar(ctx, c.x, c.y, c.heading, c.kind, c.color, !c.parked && !c.wrecked, c.hp < 40, c.wrecked, false);
        if (flash) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = ((this.time * 6) | 0) % 2 ? "#c42a44" : "#2a6cff";
          ctx.beginPath(); ctx.ellipse(c.x, c.y, 18, 10, c.heading, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        if (this.player.car === c) drawDriver(ctx, c.x, c.y, c.heading, this.player.character);
      }});
    }
    if (this.ghost) {
      const gh = this.ghost;
      sprites.push({ y: gh.y, draw: () => drawCar(ctx, gh.x, gh.y, gh.heading, "compact", "#2ef2d0", true, false, false, true) });
    }
    for (const ped of this.peds) {
      sprites.push({ y: ped.y, draw: () => drawPerson(ctx, ped.x, ped.y, ped.facing, ped.phase, "ped", 0, ped.state === "down", "fists", { flash: ped.flash }) });
    }
    for (const cop of this.cops) {
      sprites.push({ y: cop.y, draw: () => drawPerson(ctx, cop.x, cop.y, cop.facing, cop.phase, "cop", 0, cop.state === "down", "fists", { flash: cop.flash }) });
    }
    for (const n of this.npcs) {
      sprites.push({ y: n.y, draw: () => drawPerson(ctx, n.x, n.y, n.facing, this.time, n.kind, 0, false, "fists") });
    }
    if (!this.player.car) {
      const p = this.player;
      sprites.push({ y: p.y, draw: () => drawPerson(ctx, p.x, p.y, p.facing, p.phase, "player", p.punchT, false, p.weapon, { character: p.character, z: p.z, flash: p.flash, swimming: p.swimming, punchScale: this.kit().punch }) });
    }
    sprites.sort((a, b) => a.y - b.y);
    for (const s of sprites) s.draw();
    for (const b of this.bullets) drawBullet(ctx, b.x, b.y, b.vx, b.vy);
    if (this.player.muzzleT > 0) {
      const p = this.player;
      drawMuzzle(ctx, p.x, p.y, p.facing, p.muzzleT);
    }
    for (const f of this.fx) {
      if (f.kind === "boom") drawBoom(ctx, f.x, f.y, f.life);
      else if (f.kind === "smoke") drawSmoke(ctx, f.x, f.y, f.life);
      else {
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.fillStyle = f.kind === "blood" ? PAL.blood : "#c9b87a";
        ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    const bl = this.blip();
    if (bl) {
      const pulse = 7 + Math.sin(this.time * 6) * 2.4;
      ctx.strokeStyle = "#ffc83d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bl.x, bl.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ffc83d"; ctx.beginPath(); ctx.arc(bl.x, bl.y, 2.8, 0, Math.PI * 2); ctx.fill();
      const ang = Math.atan2(bl.y - this.player.y, bl.x - this.player.x);
      if (dist(this.player.x, this.player.y, bl.x, bl.y) > 36) {
        drawObjectiveArrow(ctx, this.player.x, this.player.y, ang, Math.sin(this.time * 7));
      }
    }
    ctx.restore();
    drawDuskWash(ctx, w, h);
    if (bl) this.drawEdgeBlip(ctx, w, h, bl.x, bl.y);
    if (this.fade > 0) {
      ctx.fillStyle = "rgba(6,16,20," + Math.min(1, this.fade * 1.2) + ")";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#e8e0c8"; ctx.font = "700 28px Oswald, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(this.bustedFlag ? "BUSTED" : "WASTED", w / 2, h / 2);
    }
    void gestureUnlock;
  }

  private drawEdgeBlip(ctx: CanvasRenderingContext2D, w: number, h: number, bx: number, by: number) {
    const sx = (bx - this.camX) * this.camZoom + w / 2;
    const sy = (by - this.camY) * this.camZoom + h / 2;
    const m = 28;
    if (sx > m && sx < w - m && sy > m && sy < h - m) return;
    const cx = clamp(sx, m, w - m);
    const cy = clamp(sy, m, h - m);
    ctx.fillStyle = "#ffc83d";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#061018";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
