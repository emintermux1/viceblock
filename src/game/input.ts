import { STICK_DEAD, STICK_RADIUS } from "./constants";

export class Input {
  moveX = 0;
  moveY = 0;
  sprint = false;
  punchHeld = false;
  punchPressed = false;
  enterPressed = false;
  enterHeld = false;
  interactPressed = false;
  pausePressed = false;
  mapPressed = false;
  phonePressed = false;
  shootPressed = false;
  fireHeld = false;
  spaceHeld = false;
  ctrlHeld = false;
  mouseHeld = false;
  brakeHeld = false;
  jumpPressed = false;
  jumpHeld = false;
  radioPressed = false;
  weaponSlot = 0;
  cycleWeapon = false;

  stickActive = false;
  stickBaseX = 0;
  stickBaseY = 0;
  stickKnobX = 0;
  stickKnobY = 0;
  stickId: number | null = null;
  private stickX = 0;
  private stickY = 0;

  aHeld = false;
  bHeld = false;
  sprintHeld = false;
  jumpTouch = false;
  private aId: number | null = null;
  private bId: number | null = null;
  private sprintId: number | null = null;
  private brakeId: number | null = null;
  private jumpId: number | null = null;
  private aWas = false;
  private bWas = false;
  private mouseWas = false;
  private jumpWas = false;
  private mouseLatch = false;
  private ctrlLatch = false;
  private livePointers = new Set<number>();
  private stickMiss = 0;
  private canvasEl: HTMLElement | null = null;
  private capturedEl: Element | null = null;
  private didCapture = false;

  showTouch = false;
  aimSX = 0.5;
  aimSY = 0.5;
  hasAim = false;

  private keys = new Set<string>();
  private prev = new Set<string>();
  private bound = false;

  attach() {
    if (this.bound) return;
    this.bound = true;
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("pointerup", this.onWindowPointerUp);
    window.addEventListener("pointercancel", this.onWindowPointerUp);
    window.addEventListener("lostpointercapture", this.onWindowPointerUp);
    window.addEventListener("visibilitychange", this.onVis);
    if ("ontouchstart" in window) this.showTouch = true;
    try {
      if (window.matchMedia("(pointer: coarse)").matches) this.showTouch = true;
    } catch {
      /* ignore */
    }
  }

  detach() {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("pointerup", this.onWindowPointerUp);
    window.removeEventListener("pointercancel", this.onWindowPointerUp);
    window.removeEventListener("lostpointercapture", this.onWindowPointerUp);
    window.removeEventListener("visibilitychange", this.onVis);
    this.detachCanvas();
  }

  attachCanvas(el: HTMLElement) {
    this.detachCanvas();
    this.canvasEl = el;
    el.addEventListener("mousedown", this.onMouseDown);
    el.addEventListener("mouseup", this.onMouseUp);
    el.addEventListener("pointerdown", this.onCanvasPointerDown);
    el.addEventListener("pointermove", this.onCanvasPointerMove);
    el.addEventListener("pointerup", this.onCanvasPointerUp);
    el.addEventListener("pointercancel", this.onCanvasPointerUp);
  }

  detachCanvas() {
    const el = this.canvasEl;
    if (!el) return;
    el.removeEventListener("mousedown", this.onMouseDown);
    el.removeEventListener("mouseup", this.onMouseUp);
    el.removeEventListener("pointerdown", this.onCanvasPointerDown);
    el.removeEventListener("pointermove", this.onCanvasPointerMove);
    el.removeEventListener("pointerup", this.onCanvasPointerUp);
    el.removeEventListener("pointercancel", this.onCanvasPointerUp);
    this.canvasEl = null;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key;
    if (
      k === " " ||
      k === "ArrowUp" ||
      k === "ArrowDown" ||
      k === "ArrowLeft" ||
      k === "ArrowRight" ||
      k === "Enter" ||
      k === "Tab"
    ) {
      e.preventDefault();
    }
    this.keys.add(k.toLowerCase());
    if (k === " ") this.keys.add("space");
    if (k === "Shift") this.keys.add("shift");
    if (k === "Escape") this.keys.add("escape");
    if (k === "Control" || k === "ControlLeft" || k === "ControlRight") {
      this.keys.add("control");
      this.ctrlLatch = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key;
    this.keys.delete(k.toLowerCase());
    if (k === " ") this.keys.delete("space");
    if (k === "Shift") this.keys.delete("shift");
    if (k === "Escape") this.keys.delete("escape");
    if (k === "Control" || k === "ControlLeft" || k === "ControlRight") this.keys.delete("control");
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (this.canvasEl && e.target === this.canvasEl) {
      this.mouseHeld = true;
      this.mouseLatch = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseHeld = false;
  };

  onCanvasPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    this.livePointers.add(e.pointerId);
    if (e.pointerType === "mouse" && e.button === 0) {
      this.mouseHeld = true;
      this.mouseLatch = true;
    }
  };

  onCanvasPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = this.canvasEl;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    this.aimSX = (e.clientX - r.left) / r.width;
    this.aimSY = (e.clientY - r.top) / r.height;
    this.hasAim = true;
  };

  onCanvasPointerUp = (e: PointerEvent) => {
    this.livePointers.delete(e.pointerId);
    if (e.button === 0 || e.pointerType !== "mouse") this.mouseHeld = false;
    if (e.pointerId === this.stickId) this.clearStick();
  };

  private onWindowPointerUp = (e: PointerEvent) => {
    this.livePointers.delete(e.pointerId);
    if (e.pointerId === this.stickId) this.clearStick();
    this.onPointerUp(e);
    if (e.pointerType === "mouse" && e.button === 0) this.mouseHeld = false;
  };

  private onVis = () => {
    if (document.hidden) this.onBlur();
  };

  private onBlur = () => {
    this.keys.clear();
    this.clearStick();
    this.aHeld = false;
    this.bHeld = false;
    this.sprintHeld = false;
    this.brakeHeld = false;
    this.jumpTouch = false;
    this.mouseHeld = false;
    this.mouseLatch = false;
    this.ctrlLatch = false;
    this.livePointers.clear();
    this.aId = this.bId = this.sprintId = this.brakeId = this.jumpId = null;
  };

  beginFrame() {
    if (this.stickId !== null) {
      const captured = this.didCapture && this.capturedEl && this.capturedEl.hasPointerCapture(this.stickId);
      if (this.didCapture && !captured) this.clearStick();
      else if (!this.livePointers.has(this.stickId)) {
        this.stickMiss += 1;
        if (this.stickMiss >= 1) this.clearStick();
      } else this.stickMiss = 0;
    }

    const kx =
      (this.down("a") || this.down("arrowleft") ? -1 : 0) +
      (this.down("d") || this.down("arrowright") ? 1 : 0);
    const ky =
      (this.down("w") || this.down("arrowup") ? -1 : 0) +
      (this.down("s") || this.down("arrowdown") ? 1 : 0);

    let mx = kx + this.stickX;
    let my = ky + this.stickY;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    this.moveX = mx;
    this.moveY = my;

    this.sprint = this.down("shift") || this.sprintHeld;
    this.spaceHeld = this.down("space");
    this.ctrlHeld = this.down("control") || this.ctrlLatch;
    this.enterHeld = this.bHeld || this.down("f") || this.down("enter");
    this.jumpHeld = this.spaceHeld || this.jumpTouch;
    this.punchHeld = this.aHeld;
    this.fireHeld = this.aHeld || this.ctrlHeld || this.mouseHeld || this.mouseLatch;

    this.punchPressed = !this.aWas && this.aHeld;
    this.shootPressed =
      (!this.aWas && this.aHeld) ||
      this.edge("control") ||
      this.ctrlLatch ||
      (!this.mouseWas && this.mouseHeld) ||
      this.mouseLatch;
    this.jumpPressed = (!this.jumpWas && this.jumpTouch) || this.edge("space");
    this.enterPressed = (!this.bWas && this.bHeld) || this.edge("f") || this.edge("enter");
    this.interactPressed = this.edge("e");
    this.pausePressed = this.edge("escape") || this.edge("p");
    this.mapPressed = this.edge("m");
    this.phonePressed = this.edge("tab");
    this.radioPressed = this.edge("r");
    this.cycleWeapon = this.edge("q");
    this.weaponSlot = this.edge("1")
      ? 1
      : this.edge("2")
        ? 2
        : this.edge("3")
          ? 3
          : this.edge("4")
            ? 4
            : this.edge("5")
              ? 5
              : 0;

    this.aWas = this.aHeld;
    this.bWas = this.bHeld;
    this.mouseWas = this.mouseHeld;
    this.jumpWas = this.jumpTouch;
    this.prev = new Set(this.keys);
  }

  endFrame() {
    this.punchPressed = false;
    this.enterPressed = false;
    this.interactPressed = false;
    this.pausePressed = false;
    this.mapPressed = false;
    this.phonePressed = false;
    this.shootPressed = false;
    this.jumpPressed = false;
    this.radioPressed = false;
    this.cycleWeapon = false;
    this.weaponSlot = 0;
    this.mouseLatch = false;
    this.ctrlLatch = false;
  }

  private down(k: string) {
    return this.keys.has(k);
  }

  private edge(k: string) {
    return this.keys.has(k) && !this.prev.has(k);
  }

  onPointerDown(e: PointerEvent, hit: "stick" | "a" | "b" | "sprint" | "phone" | "brake" | "jump" | "none") {
    this.showTouch = true;
    this.livePointers.add(e.pointerId);
    if (hit === "a") {
      this.aHeld = true;
      this.aId = e.pointerId;
      this.safeCapture(e);
      return;
    }
    if (hit === "b") {
      this.bHeld = true;
      this.bId = e.pointerId;
      this.safeCapture(e);
      return;
    }
    if (hit === "sprint") {
      this.sprintHeld = true;
      this.sprintId = e.pointerId;
      this.safeCapture(e);
      return;
    }
    if (hit === "brake") {
      this.brakeHeld = true;
      this.brakeId = e.pointerId;
      this.safeCapture(e);
      return;
    }
    if (hit === "jump") {
      this.jumpTouch = true;
      this.jumpId = e.pointerId;
      this.safeCapture(e);
      return;
    }
    if (hit === "phone") {
      this.phonePressed = true;
      return;
    }
    if (hit === "stick" && this.stickId === null) {
      this.stickId = e.pointerId;
      this.stickActive = true;
      this.stickBaseX = e.clientX;
      this.stickBaseY = e.clientY;
      this.stickKnobX = e.clientX;
      this.stickKnobY = e.clientY;
      this.stickX = 0;
      this.stickY = 0;
      this.stickMiss = 0;
      this.safeCapture(e);
    }
  }

  onPointerMove(e: PointerEvent) {
    if (e.pointerId !== this.stickId) return;
    this.livePointers.add(e.pointerId);
    this.stickMiss = 0;
    e.preventDefault();
    const dx = e.clientX - this.stickBaseX;
    const dy = e.clientY - this.stickBaseY;
    const len = Math.hypot(dx, dy);
    const cl = Math.min(len, STICK_RADIUS);
    const nx = len > 0.0001 ? dx / len : 0;
    const ny = len > 0.0001 ? dy / len : 0;
    this.stickKnobX = this.stickBaseX + nx * cl;
    this.stickKnobY = this.stickBaseY + ny * cl;
    if (len < STICK_DEAD) {
      this.stickX = 0;
      this.stickY = 0;
    } else {
      this.stickX = (nx * cl) / STICK_RADIUS;
      this.stickY = (ny * cl) / STICK_RADIUS;
    }
  }

  onPointerUp(e: PointerEvent) {
    this.livePointers.delete(e.pointerId);
    if (e.pointerId === this.stickId) this.clearStick();
    if (e.pointerId === this.aId) {
      this.aHeld = false;
      this.aId = null;
    }
    if (e.pointerId === this.bId) {
      this.bHeld = false;
      this.bId = null;
    }
    if (e.pointerId === this.sprintId) {
      this.sprintHeld = false;
      this.sprintId = null;
    }
    if (e.pointerId === this.brakeId) {
      this.brakeHeld = false;
      this.brakeId = null;
    }
    if (e.pointerId === this.jumpId) {
      this.jumpTouch = false;
      this.jumpId = null;
    }
  }

  clearStick() {
    this.stickId = null;
    this.stickActive = false;
    this.stickX = 0;
    this.stickY = 0;
    this.moveX = 0;
    this.moveY = 0;
    this.stickMiss = 0;
    this.capturedEl = null;
    this.didCapture = false;
    this.stickKnobX = this.stickBaseX;
    this.stickKnobY = this.stickBaseY;
  }

  private safeCapture(e: PointerEvent) {
    try {
      (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
      this.capturedEl = e.target as Element;
      this.didCapture = true;
    } catch {
      this.didCapture = false;
    }
  }
}
