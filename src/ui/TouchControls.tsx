import { useEffect, useRef, useState } from "react";
import type { Input } from "../game/input";

type Props = { input: Input; hidden?: boolean; inCar?: boolean; onPause: () => void };

function hitOf(el: EventTarget | null): "stick" | "a" | "b" | "sprint" | "phone" | "brake" | "jump" | "none" {
  const node = el as HTMLElement | null;
  const kind = node?.closest?.("[data-hit]")?.getAttribute("data-hit");
  if (kind === "a" || kind === "b" || kind === "sprint" || kind === "phone" || kind === "stick" || kind === "brake" || kind === "jump") return kind;
  return "none";
}

export function TouchControls({ input, hidden, inCar, onPause }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const down = (e: PointerEvent) => {
      const hit = hitOf(e.target);
      if (hit === "phone") { e.preventDefault(); onPause(); return; }
      if (hit === "a" || hit === "b" || hit === "sprint" || hit === "brake" || hit === "jump") {
        e.preventDefault(); input.onPointerDown(e, hit); bump(); return;
      }
      if (hit === "stick" || e.clientX < window.innerWidth * 0.45) { input.onPointerDown(e, "stick"); bump(); }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== input.stickId) return;
      e.preventDefault(); input.onPointerMove(e); bump();
    };
    const up = (e: PointerEvent) => { input.onPointerUp(e); bump(); };
    root.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", up);
    return () => {
      root.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", up);
    };
  }, [input, onPause]);

  if (hidden) return null;
  return (
    <div ref={rootRef} className="touch-layer" aria-hidden>
      <div className="touch-left" data-hit="stick">
        {input.stickActive && (
          <>
            <i className="stick-base" style={{ left: input.stickBaseX, top: input.stickBaseY }} />
            <i className="stick-knob" style={{ left: input.stickKnobX, top: input.stickKnobY }} />
          </>
        )}
      </div>
      <div className="touch-right">
        <button type="button" className="pad-btn pad-phone" data-hit="phone" aria-label="Pause">II</button>
        <button type="button" className="pad-btn pad-sprint" data-hit="sprint">SPR</button>
        {!inCar && <button type="button" className="pad-btn pad-jump" data-hit="jump">JUMP</button>}
        {inCar && <button type="button" className="pad-btn pad-brake" data-hit="brake">BRAKE</button>}
        <button type="button" className="pad-btn pad-a" data-hit="a">A</button>
        <button type="button" className="pad-btn pad-b" data-hit="b">B</button>
      </div>
    </div>
  );
}
