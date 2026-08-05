const steps = document.querySelectorAll(".story-step");
const progressNumber = document.querySelector(".progress-number");
const progressFill = document.querySelector(".progress-fill");

let activeIndex = 0;

function setActiveStep(index) {
  if (index === activeIndex) return;

  activeIndex = index;

  steps.forEach((step) => {
    const stepIndex = Number(step.dataset.step);
    step.classList.toggle("active", stepIndex === index);
  });

  const current = String(index + 1).padStart(2, "0");
  progressNumber.textContent = current;

  const progress = ((index + 1) / steps.length) * 100;
  progressFill.style.width = `${progress}%`;
}

/*
  IntersectionObserver detecta cuál step está en la zona activa.
  rootMargin ajusta esa zona.

  "-45% 0px -45% 0px" significa:
  solo una franja central del viewport dispara el cambio.
*/

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const index = Number(entry.target.dataset.step);
        setActiveStep(index);
      }
    });
  },
  {
    threshold: 0.2,
    rootMargin: "-45% 0px -45% 0px"
  }
);

steps.forEach((step) => observer.observe(step));

setActiveStep(0);

/* ------------------------- */
/* CAMPO DE PARTÍCULAS       */
/* ------------------------- */

const canvas = document.querySelector(".particle-field");
const ctx = canvas ? canvas.getContext("2d") : null;

/*
  Cada escena cambia la dirección y velocidad de la deriva.
  Las partículas son puntos blancos sobre fondo negro:
  el texto siempre resalta por encima.
*/

const SCENES = [
  { speed: 16, angle: -Math.PI / 2 }, // 01 / rise
  { speed: 26, angle: 0 },            // 02 / drift right
  { speed: 38, angle: -Math.PI / 3 }, // 03 / diagonal, faster
  { speed: 11, angle: Math.PI / 2 }   // 04 / fall, slow
];

const COUNT = 170;

const particles = Array.from({ length: COUNT }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 0.6 + Math.random() * 1.8,
  a: 0.18 + Math.random() * 0.5,
  phase: Math.random() * Math.PI * 2,
  jitter: 0.4 + Math.random() * 1.4
}));

let W = 0;
let H = 0;

let curSpeed = SCENES[0].speed;
let curAngle = SCENES[0].angle;

function resize() {
  if (!canvas) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawStatic() {
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  for (const p of particles) {
    ctx.globalAlpha = p.a * 0.85;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

let last = performance.now();

function draw(time) {
  if (!ctx) return;

  const dt = Math.min((time - last) / 1000, 0.05);
  last = time;

  const scene = SCENES[activeIndex] || SCENES[0];

  /*
    Transición suave entre escenas:
    velocidad y ángulo derivan hacia los valores activos.
  */
  curSpeed += (scene.speed - curSpeed) * Math.min(dt * 2, 0.15);
  curAngle += (scene.angle - curAngle) * Math.min(dt * 2, 0.15);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  for (const p of particles) {
    const wiggleX = Math.cos(time * 0.0007 + p.phase) * p.jitter;
    const wiggleY = Math.sin(time * 0.0009 + p.phase * 2) * p.jitter;

    p.x += (Math.cos(curAngle) * curSpeed + wiggleX) * dt / W;
    p.y += (Math.sin(curAngle) * curSpeed + wiggleY) * dt / H;

    if (p.x < 0) p.x += 1;
    if (p.x > 1) p.x -= 1;
    if (p.y < 0) p.y += 1;
    if (p.y > 1) p.y -= 1;

    const twinkle = 0.55 + 0.45 * Math.sin(time * 0.0015 + p.phase);

    ctx.globalAlpha = p.a * twinkle;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}

window.addEventListener("resize", resize);
resize();

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  drawStatic();
} else {
  requestAnimationFrame(draw);
}
