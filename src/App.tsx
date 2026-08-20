import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { GameCanvas } from "./game/GameCanvas";
import { gestureUnlock, radio, sharedSfx } from "./game/audio";
import { Game } from "./game/engine";
import { Input } from "./game/input";
import { emptyHud, type CharacterId, type HudState } from "./game/types";
import { HUD } from "./ui/HUD";
import { PauseMenu } from "./ui/PauseMenu";
import { TitleScreen } from "./ui/TitleScreen";
import { CharacterSelect } from "./ui/CharacterSelect";
import { TouchControls } from "./ui/TouchControls";
import { WalletProviders } from "./wallet/WalletProviders";
import "./App.css";

function Shell() {
  const { connected } = useWallet();
  const [playing, setPlaying] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [character, setCharacter] = useState<CharacterId>("ansem");
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudState>(emptyHud);
  const [touch, setTouch] = useState(false);
  const inputRef = useRef(new Input());
  const engineRef = useRef<Game | null>(null);
  const hudKey = useRef("");

  useEffect(() => {
    const input = inputRef.current;
    input.attach();
    const sync = () => setTouch(input.showTouch);
    sync();
    const id = window.setInterval(sync, 800);
    return () => { window.clearInterval(id); input.detach(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!playing) return;
      if (e.key === "Escape") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const onHud = useCallback((h: HudState) => {
    const k = [h.cash, h.stars, h.health, h.prompt, h.subtitle, h.missionHint, h.fade, h.weapon, h.ammo, h.respect, h.inCar, h.radioLive].join("|");
    if (k !== hudKey.current) { hudKey.current = k; setHud(h); }
  }, []);

  const kickMusic = () => {
    gestureUnlock();
    sharedSfx.resume();
    radio.play();
  };

  const start = () => {
    gestureUnlock();
    sharedSfx.resume();
    radio.play();
    setSelecting(true);
  };

  const pick = (id: CharacterId) => {
    gestureUnlock();
    sharedSfx.resume();
    radio.play();
    inputRef.current.attach();
    setCharacter(id);
    setPaused(false);
    setSelecting(false);
    setPlaying(true);
  };

  const exitTitle = () => {
    setPlaying(false);
    setSelecting(false);
    setPaused(false);
    engineRef.current?.sfx.stopEngine();
  };

  const frozen = paused;

  return (
    <div className="app">
      {!playing && !selecting && <TitleScreen onPlay={start} />}
      {selecting && !playing && <CharacterSelect onPick={pick} />}
      {playing && (
        <>
          <div className="stage">
            <GameCanvas input={inputRef.current} frozen={frozen} muted={muted} character={character} onHud={onHud} engineRef={engineRef} />
          </div>
          <HUD hud={hud} onTapMusic={kickMusic} />
          <TouchControls input={inputRef.current} hidden={!touch || paused} inCar={hud.inCar} onPause={() => setPaused(true)} />
          {paused && (
            <PauseMenu muted={muted} onResume={() => setPaused(false)} onMute={() => setMuted((m) => !m)} onExit={exitTitle} />
          )}
        </>
      )}
      {connected && !playing && <span className="sr-only">wallet connected</span>}
    </div>
  );
}

export default function App() {
  return (
    <WalletProviders>
      <Shell />
    </WalletProviders>
  );
}
