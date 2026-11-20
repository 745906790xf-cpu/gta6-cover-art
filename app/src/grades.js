// Colour grades and finishing effects for Sunset Poster Studio.
// Everything here is drawn with canvas gradients and composite modes:
// no image assets, no network, works fully offline.

export const GRADES = [
  { id: "sunset", label: "Sunset" },
  { id: "neon-night", label: "Neon Night" },
  { id: "golden-hour", label: "Golden Hour" },
];

const GRADE_STOPS = {
  sunset: {
    sky: ["#2b1838", "#7a2450", "#e85d4a", "#ffb03a"],
    wash: ["rgba(255, 140, 66, 0.28)", "rgba(200, 40, 120, 0.34)"],
    glow: "rgba(255, 120, 60, 0.5)",
    sun: "#ffd166",
    accent: "#ffd166",
  },
  "neon-night": {
    sky: ["#0b1026", "#1d2a6b", "#6b2a8a", "#0e7c86"],
    wash: ["rgba(0, 229, 255, 0.22)", "rgba(255, 0, 170, 0.3)"],
    glow: "rgba(255, 0, 170, 0.42)",
    sun: "#7df9ff",
    accent: "#7df9ff",
  },
  "golden-hour": {
    sky: ["#3a2410", "#8a5a1f", "#e8a33d", "#ffe3a3"],
    wash: ["rgba(255, 190, 80, 0.3)", "rgba(190, 110, 30, 0.26)"],
    glow: "rgba(255, 180, 70, 0.5)",
    sun: "#fff3c4",
    accent: "#ffe3a3",
  },
};

export function gradePalette(gradeId) {
  return GRADE_STOPS[gradeId] || GRADE_STOPS.sunset;
}

export function paintSkyBackdrop(ctx, width, height, gradeId) {
  const palette = gradePalette(gradeId);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(0.45, palette.sky[1]);
  sky.addColorStop(0.78, palette.sky[2]);
  sky.addColorStop(1, palette.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Low sun disc with a soft halo, visible through the panel gutters.
  const sunX = width * 0.72;
  const sunY = height * 0.3;
  const sunR = Math.min(width, height) * 0.16;
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3.2);
  halo.addColorStop(0, palette.glow);
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = palette.sun;
  ctx.globalAlpha = 0.9;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Retro horizon stripes under the sun.
  ctx.fillStyle = "rgba(20, 8, 24, 0.55)";
  const stripeBase = sunY + sunR * 0.15;
  for (let i = 0; i < 4; i += 1) {
    const y = stripeBase + i * sunR * 0.22;
    ctx.fillRect(sunX - sunR, y, sunR * 2, Math.max(2, sunR * 0.05 + i * 2));
  }
}

export function applyGradeWash(ctx, width, height, gradeId) {
  const palette = gradePalette(gradeId);
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  const wash = ctx.createLinearGradient(0, 0, width * 0.3, height);
  wash.addColorStop(0, palette.wash[0]);
  wash.addColorStop(1, palette.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Warm light pooling at the foot of the poster, behind the caption.
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  const foot = ctx.createLinearGradient(0, height * 0.45, 0, height);
  foot.addColorStop(0, "rgba(0, 0, 0, 0)");
  foot.addColorStop(1, palette.glow);
  ctx.fillStyle = foot;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function applyVignette(ctx, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.hypot(cx, cy);
  const vignette = ctx.createRadialGradient(cx, cy, radius * 0.42, cx, cy, radius);
  vignette.addColorStop(0, "rgba(10, 4, 16, 0)");
  vignette.addColorStop(1, "rgba(10, 4, 16, 0.52)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

let grainTile = null;

function buildGrainTile() {
  const size = 256;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d");
  const image = tctx.createImageData(size, size);
  let seed = 987654321;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.floor(next() * 255);
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  return tile;
}

export function applyGrain(ctx, width, height) {
  if (!grainTile) grainTile = buildGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = "overlay";
  const pattern = ctx.createPattern(grainTile, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

export function applyHalftone(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#12081c";
  const step = Math.max(10, Math.round(Math.min(width, height) / 90));
  const radius = step * 0.22;
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function applyFinish(ctx, width, height, gradeId, fx) {
  applyGradeWash(ctx, width, height, gradeId);
  if (fx.halftone) applyHalftone(ctx, width, height);
  if (fx.grain) applyGrain(ctx, width, height);
  if (fx.vignette) applyVignette(ctx, width, height);
}
