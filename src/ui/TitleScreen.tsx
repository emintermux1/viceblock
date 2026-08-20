import { useEffect, useRef } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

type Props = { onPlay: () => void };

export function TitleScreen({ onPlay }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    let t = 0;
    const draw = () => {
      const p = c.parentElement;
      const w = p?.clientWidth ?? 800;
      const h = p?.clientHeight ?? 600;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
        c.width = Math.floor(w * dpr);
        c.height = Math.floor(h * dpr);
        c.style.width = w + "px";
        c.style.height = h + "px";
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      t += 0.016;
      paintCity(ctx, c.width, c.height, t);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="title-scr">
      <canvas ref={ref} className="title-bg" />
      <div className="title-fg">
        <p className="title-kicker">NOVA CITY</p>
        <h1>VICEBLOCK</h1>
        <p className="title-sub">SOUTH SIDE</p>
        <button type="button" className="title-play" onClick={onPlay}>PLAY</button>
        <div className="title-wallet">
          <WalletMultiButton />
        </div>
        <p className="title-guest">Guest first. Wallet optional. No shop.</p>
      </div>
    </div>
  );
}

function paintCity(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.imageSmoothingEnabled = false;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#061820");
  g.addColorStop(0.4, "#0a3040");
  g.addColorStop(0.7, "#1a4860");
  g.addColorStop(1, "#061018");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255, 138, 92, 0.8)";
  ctx.beginPath(); ctx.arc(w * 0.82, h * 0.22, Math.min(w, h) * 0.05, 0, Math.PI * 2); ctx.fill();
  const horizon = h * 0.58;
  for (let i = 0; i < 26; i++) {
    const x = (i / 26) * w * 1.1 - 20;
    const bh = 36 + ((i * 37) % 86) + Math.sin(i * 1.7) * 18;
    const bw = 16 + ((i * 13) % 26);
    ctx.fillStyle = i % 4 === 0 ? "#1a2a28" : i % 3 === 0 ? "#142028" : "#183038";
    ctx.fillRect(x, horizon - bh, bw, bh + 8);
    if (i % 2 === 0) {
      ctx.fillStyle = Math.sin(t * 2 + i) > 0 ? "#ffc83d" : "#2ef2d0";
      ctx.globalAlpha = 0.65; ctx.fillRect(x + 4, horizon - bh + 10, bw - 8, 4); ctx.globalAlpha = 1;
    }
  }
  ctx.fillStyle = "#081018"; ctx.fillRect(0, horizon + 6, w, h);
  ctx.fillStyle = "#0a3a44"; ctx.fillRect(0, h * 0.86, w, h * 0.14);
  for (let i = 0; i < 8; i++) {
    const x = w * 0.08 + i * (w * 0.11);
    ctx.fillStyle = "#3a2214"; ctx.fillRect(x, horizon - 18, 3, 22);
    ctx.fillStyle = "#1a5a38";
    ctx.beginPath(); ctx.ellipse(x + 1, horizon - 22, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
}
