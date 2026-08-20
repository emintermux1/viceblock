let sharedCtx: AudioContext | null = null;

export function gestureUnlock() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!sharedCtx) sharedCtx = new Ctx();
    if (sharedCtx.state === "suspended") void sharedCtx.resume();
  } catch { /* ignore */ }
}

function noiseBuf(ctx: AudioContext, sec: number, brown = false) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * sec));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    else d[i] = w;
  }
  return buf;
}

export class Radio {
  el: HTMLAudioElement | null = null;
  started = false;
  private synthOn = false;
  private synthMaster: GainNode | null = null;
  private synthOsc: OscillatorNode[] = [];

  ensure() {
    if (this.el) return this.el;
    const a = new Audio("/audio/nova-fm.mp3");
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.38;
    a.addEventListener("error", () => this.startSynth());
    this.el = a;
    return a;
  }

  play() {
    gestureUnlock();
    const a = this.ensure();
    a.currentTime = a.currentTime || 0;
    const p = a.play();
    if (p) {
      void p.then(() => { this.started = true; }).catch(() => this.startSynth());
    } else this.started = true;
  }

  private startSynth() {
    if (this.synthOn) { this.started = true; return; }
    try {
      gestureUnlock();
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!sharedCtx) sharedCtx = new Ctx();
      if (sharedCtx.state === "suspended") void sharedCtx.resume();
      const ctx = sharedCtx;
      const master = ctx.createGain();
      master.gain.value = this.el?.muted ? 0 : 0.12;
      master.connect(ctx.destination);
      this.synthMaster = master;
      const pad = [220, 261.63, 329.63];
      for (const f of pad) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.18;
        o.connect(g); g.connect(master);
        o.start();
        this.synthOsc.push(o);
      }
      const bass = ctx.createOscillator();
      bass.type = "triangle";
      bass.frequency.value = 55;
      const bg = ctx.createGain();
      bg.gain.value = 0.16;
      bass.connect(bg); bg.connect(master);
      bass.start();
      this.synthOsc.push(bass);
      this.synthOn = true;
      this.started = true;
    } catch {
      this.started = false;
    }
  }

  setMuted(m: boolean) {
    if (this.el) this.el.muted = m;
    if (this.synthMaster) this.synthMaster.gain.value = m ? 0 : 0.12;
  }

  isLive() {
    if (this.el && !this.el.paused && !this.el.muted && this.started) return true;
    return this.synthOn && this.started && !this.el?.muted;
  }
}

export const radio = new Radio();

export class Sfx {
  ctx: AudioContext | null = null;
  muted = false;
  private master: GainNode | null = null;
  private busN: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineF: BiquadFilterNode | null = null;
  private engineG: GainNode | null = null;

  private ensure() {
    if (this.ctx) return this.ctx;
    try {
      gestureUnlock();
      if (!sharedCtx) return null;
      this.ctx = sharedCtx;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.22;
      this.master.connect(this.ctx.destination);
      this.busN = this.ctx.createGain();
      this.busN.connect(this.master);
      this.noise = noiseBuf(this.ctx, 1.2, false);
      this.brown = noiseBuf(this.ctx, 1.6, true);
    } catch { this.ctx = null; }
    return this.ctx;
  }

  resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.22;
    radio.setMuted(m);
    if (m) this.stopEngine();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
    const ctx = this.ensure();
    const out = this.busN;
    if (!ctx || !out || this.muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(out);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  private burst(dur: number, vol: number, hp: number, lp: number, brown = false) {
    const ctx = this.ensure();
    const out = this.busN;
    if (!ctx || !out || this.muted || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = brown && this.brown ? this.brown : this.noise;
    const hpN = ctx.createBiquadFilter(); hpN.type = "highpass"; hpN.frequency.value = hp;
    const lpN = ctx.createBiquadFilter(); lpN.type = "lowpass"; lpN.frequency.value = lp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(hpN); hpN.connect(lpN); lpN.connect(g); g.connect(out);
    src.start(); src.stop(ctx.currentTime + dur + 0.02);
  }

  gunshot() { this.burst(0.08, 0.5, 500, 3200); this.burst(0.04, 0.22, 80, 400, true); }
  explode() { this.burst(0.28, 0.55, 40, 700, true); this.tone(70, 0.22, "sine", 0.22, 28); }
  punch() { this.tone(78, 0.1, "sine", 0.42, 38); this.burst(0.08, 0.28, 80, 400, true); }
  door() { this.burst(0.06, 0.22, 120, 700, true); }
  pickup() { this.tone(880, 0.07, "sine", 0.2); }
  pedHit() { this.tone(110, 0.07, "sine", 0.28, 50); }
  death() { this.tone(196, 0.18, "triangle", 0.22, 70); }
  empty() { this.burst(0.04, 0.12, 800, 1800); }
  win() { this.tone(220, 0.1, "triangle", 0.16); this.tone(330, 0.16, "triangle", 0.14); }
  fail() { this.tone(196, 0.18, "triangle", 0.2, 90); }
  crash() { this.burst(0.14, 0.32, 60, 500, true); }
  splash() { this.burst(0.16, 0.22, 200, 1400); }
  star() { this.tone(311, 0.07, "triangle", 0.1); }

  private sirenOsc: OscillatorNode | null = null;
  private sirenG: GainNode | null = null;
  private sirenLfo: OscillatorNode | null = null;

  siren(on: boolean) {
    const ctx = this.ensure();
    const out = this.busN;
    if (!ctx || !out) return;
    if (!on || this.muted) {
      if (this.sirenG) this.sirenG.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      return;
    }
    if (!this.sirenOsc) {
      const o = ctx.createOscillator(); o.type = "square"; o.frequency.value = 680;
      const lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 1.6;
      const lfoG = ctx.createGain(); lfoG.gain.value = 90;
      const g = ctx.createGain(); g.gain.value = 0;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      o.connect(g); g.connect(out);
      o.start(); lfo.start();
      this.sirenOsc = o; this.sirenG = g; this.sirenLfo = lfo;
    }
    this.sirenG?.gain.setTargetAtTime(0.035, ctx.currentTime, 0.12);
  }

  engine(speed: number, driving: boolean) {
    const ctx = this.ensure();
    const out = this.busN;
    if (!ctx || !out) return;
    if (!driving || this.muted) {
      if (this.engineG) this.engineG.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      return;
    }
    if (!this.engineOsc) {
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 46;
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 210;
      const g = ctx.createGain(); g.gain.value = 0;
      osc.connect(f); f.connect(g); g.connect(out);
      osc.start();
      this.engineOsc = osc; this.engineF = f; this.engineG = g;
    }
    const t = ctx.currentTime;
    const sp = Math.abs(speed);
    this.engineOsc.frequency.setTargetAtTime(40 + sp * 0.18, t, 0.08);
    this.engineF?.frequency.setTargetAtTime(150 + Math.min(380, sp * 1.4), t, 0.1);
    this.engineG?.gain.setTargetAtTime(0.012 + Math.min(0.04, sp / 1000), t, 0.1);
  }

  stopEngine() {
    if (this.engineG && this.ctx) this.engineG.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }
}

export const sharedSfx = new Sfx();
