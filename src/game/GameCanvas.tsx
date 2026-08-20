import { useEffect, useRef, type MutableRefObject } from "react";
import { Game } from "./engine";
import type { Input } from "./input";
import type { CharacterId, HudState } from "./types";

type Props = {
  input: Input;
  frozen: boolean;
  muted: boolean;
  character: CharacterId;
  onHud: (h: HudState) => void;
  engineRef: MutableRefObject<Game | null>;
};

export function GameCanvas({ input, frozen, muted, character, onHud, engineRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frozenRef = useRef(frozen);
  const hudRef = useRef(onHud);
  frozenRef.current = frozen;
  hudRef.current = onHud;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new Game(input, character);
    engineRef.current = game;
    game.sfx.setMuted(muted);
    game.sfx.resume();
    input.attach();
    input.attachCanvas(canvas);

    const fit = () => {
      const parent = canvas.parentElement;
      const cssW = parent?.clientWidth ?? window.innerWidth;
      const cssH = parent?.clientHeight ?? window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      game.frozen = frozenRef.current;
      game.update(dt);
      const ctx = canvas.getContext("2d");
      if (ctx) game.render(ctx, canvas.width, canvas.height);
      hudRef.current(game.hud());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      input.detachCanvas();
      game.sfx.stopEngine();
      if (engineRef.current === game) engineRef.current = null;
    };
  }, [character]);

  useEffect(() => {
    engineRef.current?.sfx.setMuted(muted);
  }, [muted, engineRef]);

  return <canvas ref={canvasRef} className="pixel-canvas" tabIndex={0} />;
}
