const TOTAL_ROLES = 283;
const PROVE_ROLES = 253;
const BURY_ROLES = 30;
const COMMAND = "npx --yes github:yangyangnovelist-hub/prompt-cosplay audit github:msitarzewski/agency-agents";

const root = document.documentElement;
const body = document.body;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

const colors = {
  ship: "#c8ff36",
  prove: "#59e6ff",
  merge: "#ffc458",
  bury: "#ff4b2b",
  bone: "#e9eadf",
  void: "#050706",
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function easeOutQuint(value) {
  return 1 - Math.pow(1 - value, 5);
}

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

class EvidenceField {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: true });
    this.random = mulberry32(20261011);
    this.nodes = [];
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.mode = "cloud";
    this.highlight = null;
    this.blend = 0;
    this.targetBlend = 0;
    this.pointer = { x: -1000, y: -1000, active: false };
    this.scroll = 0;
    this.running = false;
    this.obscured = false;
    this.lastFrame = 0;
    this.fpsFrames = 0;
    this.fpsStamp = performance.now();
    this.fpsOutput = document.querySelector("#frame-rate");
    this.modeOutput = document.querySelector("#field-mode");
    this.tick = this.tick.bind(this);

    this.createNodes();
    this.resize();
    this.bind();
    this.draw(performance.now(), true);
    this.syncPlayback();
  }

  createNodes() {
    const verdicts = [
      ...Array(PROVE_ROLES).fill("prove"),
      ...Array(BURY_ROLES).fill("bury"),
    ];

    for (let index = verdicts.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
      [verdicts[index], verdicts[swapIndex]] = [verdicts[swapIndex], verdicts[index]];
    }

    let proveIndex = 0;
    let buryIndex = 0;
    this.nodes = verdicts.map((verdict, index) => {
      const localIndex = verdict === "prove" ? proveIndex++ : buryIndex++;
      const localTotal = verdict === "prove" ? PROVE_ROLES : BURY_ROLES;
      const angle = localIndex * 2.3999632297;
      const radius = Math.sqrt((localIndex + 0.5) / localTotal);
      const centerX = verdict === "prove" ? 0.62 : 0.25;
      const centerY = verdict === "prove" ? 0.45 : 0.67;
      const spreadX = verdict === "prove" ? 0.29 : 0.14;
      const spreadY = verdict === "prove" ? 0.35 : 0.17;

      return {
        id: `ROLE_${String(index + 1).padStart(3, "0")}`,
        verdict,
        nx: 0.03 + this.random() * 0.94,
        ny: 0.05 + this.random() * 0.9,
        tx: centerX + Math.cos(angle) * radius * spreadX,
        ty: centerY + Math.sin(angle) * radius * spreadY,
        depth: 0.25 + this.random() * 0.75,
        phase: this.random() * Math.PI * 2,
        driftX: 5 + this.random() * 17,
        driftY: 4 + this.random() * 14,
        size: 0.7 + this.random() * 1.7,
      };
    });
  }

  bind() {
    window.addEventListener("resize", () => this.resize(), { passive: true });
    window.addEventListener("scroll", () => {
      this.scroll = window.scrollY;
    }, { passive: true });
    window.addEventListener("pointermove", (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = event.pointerType !== "touch";
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => {
      this.pointer.active = false;
    });
    document.addEventListener("visibilitychange", () => this.syncPlayback());
    reducedMotion.addEventListener("change", () => {
      this.draw(performance.now(), true);
      this.syncPlayback();
    });
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.65);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw(performance.now(), true);
  }

  setMode(mode) {
    this.mode = mode;
    this.targetBlend = mode === "verdict" ? 1 : 0;
    this.modeOutput.textContent = mode === "verdict" ? "VERDICT MAP" : "UNRESOLVED";
    if (!this.running) this.draw(performance.now(), true);
  }

  setHighlight(verdict) {
    this.highlight = verdict;
    if (!this.running) this.draw(performance.now(), true);
  }

  setObscured(obscured) {
    this.obscured = obscured;
    this.syncPlayback();
  }

  syncPlayback() {
    const shouldRun = !document.hidden && !reducedMotion.matches && !this.obscured;
    if (shouldRun && !this.running) {
      this.running = true;
      this.lastFrame = performance.now();
      requestAnimationFrame(this.tick);
    } else if (!shouldRun) {
      this.running = false;
      this.draw(performance.now(), true);
      if (reducedMotion.matches) this.fpsOutput.textContent = "STATIC / RM";
    }
  }

  tick(time) {
    if (!this.running) return;
    const elapsed = Math.min(40, time - this.lastFrame);
    this.lastFrame = time;
    this.blend += (this.targetBlend - this.blend) * Math.min(1, elapsed * 0.0065);
    this.draw(time, false);

    this.fpsFrames += 1;
    if (time - this.fpsStamp >= 1000) {
      const fps = Math.round((this.fpsFrames * 1000) / (time - this.fpsStamp));
      this.fpsOutput.textContent = `CANVAS 2D / ${fps} FPS`;
      this.fpsFrames = 0;
      this.fpsStamp = time;
    }
    requestAnimationFrame(this.tick);
  }

  position(node, time) {
    const seconds = time * 0.001;
    const cloudX = node.nx * this.width + Math.sin(seconds * (0.25 + node.depth * 0.3) + node.phase) * node.driftX;
    const cloudY = node.ny * this.height + Math.cos(seconds * (0.19 + node.depth * 0.24) + node.phase) * node.driftY;
    const targetX = node.tx * this.width;
    const targetY = node.ty * this.height;
    const scrollParallax = Math.sin(this.scroll * 0.0015 + node.phase) * 8 * node.depth;
    const blend = reducedMotion.matches ? this.targetBlend : this.blend;
    let x = cloudX + (targetX - cloudX) * blend;
    let y = cloudY + (targetY - cloudY) * blend + scrollParallax;

    if (this.pointer.active) {
      const deltaX = x - this.pointer.x;
      const deltaY = y - this.pointer.y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < 155 && distance > 0) {
        const force = (1 - distance / 155) * 18;
        x += (deltaX / distance) * force;
        y += (deltaY / distance) * force;
      }
    }
    return { x, y };
  }

  drawScanner(context, time, nearest) {
    if (!this.pointer.active || reducedMotion.matches) return;
    const pulse = 34 + Math.sin(time * 0.004) * 6;
    context.save();
    context.strokeStyle = "rgba(200,255,54,.52)";
    context.lineWidth = 0.7;
    context.beginPath();
    context.arc(this.pointer.x, this.pointer.y, pulse, -0.55, Math.PI * 1.35);
    context.stroke();
    context.beginPath();
    context.moveTo(this.pointer.x - pulse - 9, this.pointer.y);
    context.lineTo(this.pointer.x + pulse + 9, this.pointer.y);
    context.moveTo(this.pointer.x, this.pointer.y - pulse - 9);
    context.lineTo(this.pointer.x, this.pointer.y + pulse + 9);
    context.stroke();

    if (nearest && nearest.distance < 118) {
      context.strokeStyle = "rgba(200,255,54,.28)";
      context.beginPath();
      context.moveTo(this.pointer.x, this.pointer.y);
      context.lineTo(nearest.x, nearest.y);
      context.stroke();
      context.fillStyle = colors.bone;
      context.font = "9px 'Fragment Mono', monospace";
      context.fillText(`${nearest.node.id} / ${nearest.node.verdict.toUpperCase()}`, nearest.x + 10, nearest.y - 8);
    }
    context.restore();
  }

  draw(time, force) {
    if (!this.context || (!force && !this.running)) return;
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    context.save();
    context.globalCompositeOperation = "lighter";

    let nearest = null;
    const positions = this.nodes.map((node) => {
      const position = this.position(node, time);
      if (this.pointer.active) {
        const distance = Math.hypot(position.x - this.pointer.x, position.y - this.pointer.y);
        if (!nearest || distance < nearest.distance) nearest = { node, ...position, distance };
      }
      return position;
    });

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const { x, y } = positions[index];
      const matches = !this.highlight || node.verdict === this.highlight;
      const alpha = this.highlight ? (matches ? 0.96 : 0.055) : 0.48 + node.depth * 0.42;
      const size = node.size * (this.highlight && matches ? 2.15 : 1) * (0.7 + node.depth * 0.55);
      context.globalAlpha = alpha;
      context.fillStyle = colors[node.verdict];

      if (node.verdict === "bury") {
        context.save();
        context.translate(x, y);
        context.rotate(Math.PI / 4);
        context.fillRect(-size, -size, size * 2, size * 2);
        context.restore();
      } else {
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }

      if (index % 5 === 0) {
        const next = positions[(index + 1) % positions.length];
        const distance = Math.hypot(next.x - x, next.y - y);
        if (distance < 82) {
          context.globalAlpha = alpha * 0.18;
          context.strokeStyle = colors[node.verdict];
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(next.x, next.y);
          context.stroke();
        }
      }
    }

    if (this.targetBlend > 0.5 && this.blend > 0.72) {
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.86;
      context.font = "10px 'Fragment Mono', monospace";
      context.fillStyle = colors.prove;
      context.fillText("PROVE / 253", this.width * 0.62 - 36, this.height * 0.1);
      context.fillStyle = colors.bury;
      context.fillText("BURY / 30", this.width * 0.25 - 30, this.height * 0.88);
    }

    if (this.highlight && (this.highlight === "ship" || this.highlight === "merge")) {
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 0.82;
      context.textAlign = "center";
      context.font = "700 13px 'Fragment Mono', monospace";
      context.fillStyle = colors[this.highlight];
      context.fillText(`${this.highlight.toUpperCase()} / 0 NODES IN SAMPLE`, this.width / 2, this.height / 2);
      context.textAlign = "start";
    }

    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    this.drawScanner(context, time, nearest);
    context.restore();
  }
}

function runLoader() {
  const count = document.querySelector("#loader-count");
  const rail = document.querySelector("#loader-progress");
  const revealSite = () => body.classList.add("is-ready");
  const failsafe = window.setTimeout(revealSite, 1800);
  if (reducedMotion.matches) {
    count.textContent = String(TOTAL_ROLES);
    rail.style.width = "100%";
    window.clearTimeout(failsafe);
    revealSite();
    return;
  }

  const started = performance.now();
  const duration = 1050;
  const frame = (time) => {
    const progress = clamp((time - started) / duration, 0, 1);
    const eased = easeOutQuint(progress);
    count.textContent = String(Math.round(TOTAL_ROLES * eased)).padStart(3, "0");
    rail.style.width = `${progress * 100}%`;
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      window.clearTimeout(failsafe);
      window.setTimeout(revealSite, 140);
    }
  };
  requestAnimationFrame(frame);
}

function setupReveals() {
  const elements = [...document.querySelectorAll(".reveal")];
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-in"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7%" });
  elements.forEach((element) => observer.observe(element));
}

function setupCursor() {
  const cursor = document.querySelector("#cursor");
  const label = document.querySelector("#cursor-label");
  if (!finePointer.matches || reducedMotion.matches) return;
  root.classList.add("cursor-ready");

  let currentX = -120;
  let currentY = -120;
  let targetX = -120;
  let targetY = -120;
  let animationFrame = 0;
  let settleUntil = 0;
  const render = () => {
    animationFrame = 0;
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;
    cursor.style.transform = `translate3d(${currentX - cursor.offsetWidth / 2}px, ${currentY - cursor.offsetHeight / 2}px, 0)`;
    const distance = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
    if (distance > 0.12 || performance.now() < settleUntil) animationFrame = requestAnimationFrame(render);
  };
  const requestRender = (settleFor = 0) => {
    settleUntil = Math.max(settleUntil, performance.now() + settleFor);
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  };

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursor.classList.add("is-visible");
    root.style.setProperty("--mx", ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
    root.style.setProperty("--my", ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    requestRender();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));

  document.addEventListener("pointerover", (event) => {
    const target = event.target.closest("[data-cursor]");
    if (!target) return;
    label.textContent = target.dataset.cursor;
    cursor.classList.add("is-active");
    requestRender(220);
  });
  document.addEventListener("pointerout", (event) => {
    if (!event.target.closest("[data-cursor]")) return;
    const next = event.relatedTarget?.closest?.("[data-cursor]");
    if (next) return;
    label.textContent = "SCAN";
    cursor.classList.remove("is-active");
    requestRender(220);
  });
}

function setupMagneticElements() {
  if (!finePointer.matches || reducedMotion.matches) return;
  document.querySelectorAll(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left - bounds.width / 2;
      const y = event.clientY - bounds.top - bounds.height / 2;
      element.style.transform = `translate(${x * 0.12}px, ${y * 0.16}px)`;
    });
    element.addEventListener("pointerleave", () => {
      element.style.transform = "translate(0, 0)";
    });
  });
}

function setupCopyButton() {
  const button = document.querySelector("#copy-command");
  const resetLabel = () => {
    button.textContent = "Copy command";
    button.dataset.cursor = "COPY";
    button.setAttribute("aria-label", "Copy install command");
  };
  button.addEventListener("click", async () => {
    let copied = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(COMMAND);
      copied = true;
    } catch {
      const input = document.createElement("textarea");
      input.value = COMMAND;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
      input.remove();
    }
    button.textContent = copied ? "Copied" : "Copy failed";
    button.dataset.cursor = copied ? "DONE" : "SELECT";
    button.setAttribute("aria-label", copied ? "Install command copied" : "Copy failed; select the command manually");
    window.setTimeout(resetLabel, 1800);
  });
}

function animateCounter(element, target, duration, runIsCurrent) {
  return new Promise((resolve) => {
    const started = performance.now();
    const frame = (time) => {
      if (!runIsCurrent()) return resolve();
      const progress = clamp((time - started) / duration, 0, 1);
      element.textContent = String(Math.round(target * easeOutQuint(progress)));
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function setupSample(field) {
  const runButton = document.querySelector("#run-sample");
  const resetButton = document.querySelector("#reset-sample");
  const status = document.querySelector("#lab-status");
  const lines = [...document.querySelectorAll(".terminal-line")];
  const counters = [...document.querySelectorAll("[data-target]")];
  let runToken = 0;
  let timers = [];

  const clearTimers = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  };

  const reset = () => {
    runToken += 1;
    clearTimers();
    body.classList.remove("is-scanning", "has-verdicts");
    runButton.disabled = false;
    runButton.textContent = "Visualize verdicts";
    field.setMode("cloud");
    field.setHighlight(null);
    counters.forEach((counter) => { counter.textContent = "0"; });
    lines.forEach((line, index) => line.classList.toggle("is-live", index === 0));
    status.textContent = "Pinned result ready / 283 unresolved";
  };

  const run = async () => {
    runToken += 1;
    const token = runToken;
    clearTimers();
    body.classList.remove("has-verdicts");
    body.classList.add("is-scanning");
    runButton.disabled = true;
    runButton.textContent = "Mapping…";
    status.textContent = "Mapping 283 saved verdicts…";
    counters.forEach((counter) => { counter.textContent = "0"; });
    lines.forEach((line) => line.classList.remove("is-live"));
    field.setHighlight(null);
    field.setMode("verdict");

    if (reducedMotion.matches) {
      counters.forEach((counter) => { counter.textContent = counter.dataset.target; });
      lines.forEach((line) => line.classList.add("is-live"));
      body.classList.remove("is-scanning");
      body.classList.add("has-verdicts");
      runButton.disabled = false;
      runButton.textContent = "Show verdicts again";
      status.textContent = "Pinned result displayed / 0 SHIP / evidence gap mapped";
      return;
    }

    lines.forEach((line, index) => {
      timers.push(window.setTimeout(() => {
        if (token === runToken) line.classList.add("is-live");
      }, 160 + index * 210));
    });

    const logComplete = new Promise((resolve) => {
      window.setTimeout(resolve, 220 + (lines.length - 1) * 210);
    });
    await Promise.all([
      ...counters.map((counter) => animateCounter(
        counter,
        Number(counter.dataset.target),
        1280,
        () => token === runToken,
      )),
      logComplete,
    ]);
    if (token !== runToken) return;
    body.classList.remove("is-scanning");
    body.classList.add("has-verdicts");
    runButton.disabled = false;
    runButton.textContent = "Show verdicts again";
    status.textContent = "Pinned result displayed / 0 SHIP / evidence gap mapped";
  };

  runButton.addEventListener("click", run);
  resetButton.addEventListener("click", reset);
  reset();
}

function setupVerdictHover(field) {
  document.querySelectorAll(".verdict-row").forEach((row) => {
    const activate = () => field.setHighlight(row.dataset.verdict);
    const deactivate = () => field.setHighlight(null);
    row.addEventListener("pointerenter", activate);
    row.addEventListener("pointerleave", deactivate);
    row.addEventListener("focus", activate);
    row.addEventListener("blur", deactivate);
  });
}

function setupCanvasPause(field) {
  if (!("IntersectionObserver" in window)) return;
  const opaqueSections = [...document.querySelectorAll(".lab, .cta")];
  const ratios = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
    field.setObscured([...ratios.values()].some((ratio) => ratio > 0.72));
  }, { threshold: [0, 0.72, 1] });
  opaqueSections.forEach((section) => observer.observe(section));
}

const inertField = {
  setMode() {},
  setHighlight() {},
  setObscured() {},
};

let field = inertField;
try {
  field = new EvidenceField(document.querySelector("#evidence-field"));
} catch {
  document.querySelector("#evidence-field").hidden = true;
}

try {
  runLoader();
  setupReveals();
  setupCursor();
  setupMagneticElements();
  setupCopyButton();
  setupSample(field);
  setupVerdictHover(field);
  setupCanvasPause(field);
  root.classList.replace("js-loading", "js");
} catch (error) {
  root.classList.remove("cursor-ready");
  field.setObscured(true);
  console.error("PromptCosplay enhancement failed", error);
}
