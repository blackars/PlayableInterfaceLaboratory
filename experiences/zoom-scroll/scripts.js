const sections = document.querySelectorAll(".zoom-section");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function smoothstep(progress) {
  return progress * progress * (3 - 2 * progress);
}

function getScale(type, progress) {
  const p = smoothstep(progress);

  switch (type) {
    case "in":
      /*
        Zoom in visible:
        La imagen crece al abandonar la sección.
      */
      return lerp(1.0, 1.45, p);

    case "out":
      /*
        Zoom out visible:
        La imagen empieza grande y se encoge al abandonar.
      */
      return lerp(1.45, 1.0, p);

    case "strong-in":
      /*
        Zoom in más dramático.
      */
      return lerp(1.0, 1.85, p);

    case "strong-out":
      /*
        Zoom out más dramático.
      */
      return lerp(1.85, 1.0, p);

    default:
      return lerp(1.0, 1.35, p);
  }
}

function updateZoom() {
  const viewportHeight = window.innerHeight;

  sections.forEach((section) => {
    const scene = section.querySelector(".zoom-scene");
    const img = section.querySelector(".zoom-bg img");

    const rect = section.getBoundingClientRect();

    /*
      La sección mide 220vh.
      La escena sticky mide 100vh.

      El recorrido activo es:
      altura de sección - altura del viewport.
    */
    const scrollDistance = section.offsetHeight - viewportHeight;

    /*
      Cuando la sección llega al top:
      rect.top = 0 → progress = 0

      Mientras la abandonas:
      rect.top se vuelve negativo.

      Cuando termina:
      progress = 1
    */
    const scrolledInside = clamp(-rect.top, 0, scrollDistance);

    const progress = scrollDistance > 0
      ? scrolledInside / scrollDistance
      : 0;

    const type = section.dataset.zoom;
    const scale = getScale(type, progress);

    /*
      Aplicamos el transform directamente al img.
      Escala + pequeño desplazamiento cinematográfico.
    */
    const y = lerp(0, -40, progress);
    img.style.transform = `scale(${scale}) translateY(${y}px)`;

    /*
      Debug opcional:
      descomenta esto si quieres ver valores en consola.
    */
    // console.log(type, progress.toFixed(2), scale.toFixed(2));
  });
}

let ticking = false;

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateZoom();
      ticking = false;
    });

    ticking = true;
  }
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", updateZoom);

updateZoom();

/*
  Imágenes de fondo: dark space desde la API pública de NASA.
  (images-api.nasa.gov no requiere API key y permite CORS.)

  Un tema por sección, en el mismo orden de los data-zoom:
  01 in        → nebula
  02 out       → galaxy
  03 strong-in → black hole
  04 strong-out→ supernova
*/

const THEMES = ["nebula", "galaxy", "black hole", "supernova"];

function pickBestUrl(links) {
  const candidates = (links || [])
    .filter((link) => link.render === "image")
    .filter((link) => !link.href.includes("~thumb"))
    .sort((a, b) => (b.width || 0) - (a.width || 0));

  if (!candidates.length) return null;

  /*
    Preferimos el original solo si es razonable (1920–8000px).
    Si es gigante, usamos el medium para no cargar 30MB.
  */
  const full = candidates.find((c) => c.width >= 1920 && c.width <= 8000);
  return (full || candidates[0]).href;
}

async function fetchNASAImage(query) {
  const url =
    `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}` +
    `&media_type=image&page_size=6`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA search failed: ${res.status}`);

  const data = await res.json();

  for (const item of data.collection.items) {
    const src = pickBestUrl(item.links);
    if (src) return src;
  }

  throw new Error(`No image found for "${query}"`);
}

async function swapInNASAImages() {
  const imgs = [...sections].map((s) => s.querySelector(".zoom-bg img"));

  const results = await Promise.allSettled(
    THEMES.map((theme) => fetchNASAImage(theme))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled" && imgs[i]) {
      imgs[i].onload = updateZoom;
      imgs[i].src = result.value;
    }
  });
}

if (sections.length) {
  swapInNASAImages().catch(() => {
    console.warn(
      "NASA images unavailable; keeping local fallback images."
    );
  });
}