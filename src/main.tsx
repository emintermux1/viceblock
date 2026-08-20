import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@solana/wallet-adapter-react-ui/styles.css";

window.Buffer = window.Buffer || Buffer;

const blockZoom = (e: Event) => { e.preventDefault(); };
window.addEventListener("gesturestart", blockZoom, { passive: false });
window.addEventListener("gesturechange", blockZoom, { passive: false });
document.addEventListener("dblclick", blockZoom, { passive: false });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
