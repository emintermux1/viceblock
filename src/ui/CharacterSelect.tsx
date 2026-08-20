import { useEffect, useRef } from "react";
import { CHAR } from "../game/constants";
import { drawPortrait } from "../game/sprites";
import type { CharacterId } from "../game/types";

type Props = { onPick: (id: CharacterId) => void };
const ORDER: CharacterId[] = ["ansem", "orangie", "cupsey"];

export function CharacterSelect({ onPick }: Props) {
  return (
    <div className="select-scr">
      <div className="select-fg">
        <p className="select-kicker">SOUTH SIDE</p>
        <h2>WHO WALKS THE BLOCK</h2>
        <div className="select-grid">
          {ORDER.map((id) => <CharCard key={id} id={id} onPick={onPick} />)}
        </div>
        <p className="select-hint">WASD walk · SPACE jump · LMB shoot · Hold F jack · E talk</p>
      </div>
    </div>
  );
}

function CharCard({ id, onPick }: { id: CharacterId; onPick: (id: CharacterId) => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const def = CHAR[id];
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 140 * dpr; c.height = 160 * dpr;
    const ctx = c.getContext("2d");
    if (ctx) { ctx.scale(dpr, dpr); ctx.imageSmoothingEnabled = false; drawPortrait(ctx, id, 140, 160); }
  }, [id]);
  return (
    <button type="button" className={"char-card char-" + id} onClick={() => onPick(id)}>
      <canvas ref={ref} className="char-port" width={140} height={160} />
      <b>{def.name}</b>
      <span>{def.kit}</span>
    </button>
  );
}
