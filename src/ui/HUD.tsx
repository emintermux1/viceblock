import type { HudState } from "../game/types";

type Props = { hud: HudState; onTapMusic?: () => void };

export function HUD({ hud, onTapMusic }: Props) {
  const live = hud.radioLive;
  return (
    <div className="hud" aria-hidden>
      <div className="hud-tr">
        <div className="hud-money">{"$" + hud.cash.toLocaleString()}</div>
        <div className="hud-rep">{"REP " + hud.respect}</div>
        <div className="hud-weapon">{hud.weapon === "fists" ? hud.weaponName : hud.weaponName + " " + hud.ammo}</div>
        <button type="button" className={"hud-radio-chip" + (live ? " live" : " tap")} onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onTapMusic?.(); }}>
          {live ? "NOVA FM" : "TAP FOR MUSIC"}
        </button>
        <div className="hud-stars">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < hud.stars ? "star on" : "star"}>★</span>
          ))}
        </div>
      </div>
      <div className="hud-bars">
        <i className="bar health" style={{ width: (hud.health / Math.max(1, hud.maxHealth)) * 100 + "%" }} />
      </div>
      {hud.prompt ? <div className="hud-prompt">{hud.prompt}</div> : null}
      {hud.subtitle ? <div className="hud-sub">{hud.subtitle}</div> : null}
      <div className="hud-job">
        <b>{hud.missionTitle}</b>
        <span>{hud.missionHint}</span>
      </div>
    </div>
  );
}
