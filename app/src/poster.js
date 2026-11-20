// Poster renderer for Sunset Poster Studio.
// Draws the multi-panel collage, the colour grade and the bold caption
// lettering onto any canvas context at any size. System fonts only.

import { computePanels } from "./panels.js";
import { applyFinish, gradePalette, paintSkyBackdrop } from "./grades.js";

export const EXPORT_SIZES = [
  { id: "1080x1080", width: 1080, height: 1080, label: "Square 1080 × 1080" },
  { id: "1080x1350", width: 1080, height: 1350, label: "Portrait 1080 × 1350" },
  { id: "1920x1080", width: 1920, height: 1080, label: "Landscape 1920 × 1080" },
];

export function parseSizeId(sizeId) {
  const found = EXPORT_SIZES.find((item) => item.id === sizeId);
  return found || EXPORT_SIZES[1];
}

const TITLE_FONT_STACK = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const SUBTITLE_FONT_STACK = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

function drawPhotoCover(ctx, image, rect, slot) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;
  const baseScale = Math.max(rect.w / iw, rect.h / ih);
  const scale = baseScale * Math.max(1, slot.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const slackX = Math.max(0, dw - rect.w);
  const slackY = Math.max(0, dh - rect.h);
  const dx = rect.x - slackX * (0.5 + (slot.offsetX || 0) * 0.5);
  const dy = rect.y - slackY * (0.5 + (slot.offsetY || 0) * 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  try {
    ctx.filter = "saturate(1.28) contrast(1.1) brightness(1.03)";
  } catch (err) {
    ctx.filter = "none";
  }
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.filter = "none";
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, index, gradeId) {
  const palette = gradePalette(gradeId);
  ctx.save();
  const fill = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  fill.addColorStop(0, palette.sky[1]);
  fill.addColorStop(1, palette.sky[2]);
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = `700 ${Math.max(14, rect.h * 0.07)}px ${SUBTITLE_FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`PANEL ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
}

function strokePanelFrame(ctx, rect, isSelected, width, height) {
  const unit = Math.min(width, height);
  ctx.save();
  ctx.lineWidth = Math.max(3, unit * 0.006);
  ctx.strokeStyle = "#140a1e";
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = Math.max(1.5, unit * 0.0022);
  ctx.strokeStyle = isSelected ? "#ffd166" : "rgba(255, 250, 240, 0.9)";
  const inset = Math.max(3, unit * 0.005);
  ctx.strokeRect(rect.x + inset, rect.y + inset, rect.w - inset * 2, rect.h - inset * 2);
  ctx.restore();
}

function fitFontSize(ctx, text, maxWidth, startSize, weight, stack) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${stack}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${stack}`;
  }
  return size;
}

function drawSpacedText(ctx, text, centerX, baselineY, spacing) {
  const widths = [];
  let total = 0;
  for (const ch of text) {
    const w = ctx.measureText(ch).width;
    widths.push(w);
    total += w + spacing;
  }
  total -= spacing;
  let x = centerX - total / 2;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < text.length; i += 1) {
    ctx.fillText(text[i], x, baselineY);
    x += widths[i] + spacing;
  }
  ctx.textAlign = previousAlign;
}

function drawCaption(ctx, width, height, state) {
  const title = (state.title || "").trim().toUpperCase();
  const subtitle = (state.subtitle || "").trim().toUpperCase();
  if (!title && !subtitle) return;
  const palette = gradePalette(state.gradeId);
  const unit = Math.min(width, height);

  // Dark band rising from the foot so the lettering always reads.
  const band = ctx.createLinearGradient(0, height * 0.6, 0, height);
  band.addColorStop(0, "rgba(12, 5, 20, 0)");
  band.addColorStop(0.55, "rgba(12, 5, 20, 0.55)");
  band.addColorStop(1, "rgba(12, 5, 20, 0.88)");
  ctx.fillStyle = band;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  let cursorY = height - unit * 0.045;

  if (subtitle) {
    // Accent rule under the subtitle, a printed-poster detail.
    const ruleWidth = width * 0.16;
    const ruleY = cursorY + unit * 0.02;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(width / 2 - ruleWidth / 2, ruleY, ruleWidth, Math.max(3, unit * 0.006));
    const subSize = fitFontSize(ctx, subtitle, width * 0.82, unit * 0.038, "700", SUBTITLE_FONT_STACK);
    ctx.font = `700 ${subSize}px ${SUBTITLE_FONT_STACK}`;
    ctx.fillStyle = palette.accent;
    ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
    ctx.shadowBlur = subSize * 0.35;
    ctx.shadowOffsetY = Math.max(1, subSize * 0.08);
    drawSpacedText(ctx, subtitle, width / 2, cursorY, subSize * 0.34);
    cursorY -= subSize * 1.55;
  }

  if (title) {
    const titleSize = fitFontSize(ctx, title, width * 0.92, unit * 0.135, "900", TITLE_FONT_STACK);
    ctx.font = `900 ${titleSize}px ${TITLE_FONT_STACK}`;
    const gradient = ctx.createLinearGradient(0, cursorY - titleSize, 0, cursorY);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.55, "#ffe9c9");
    gradient.addColorStop(1, palette.accent);
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
    ctx.shadowBlur = titleSize * 0.22;
    ctx.shadowOffsetY = titleSize * 0.07;
    ctx.strokeStyle = "#140a1e";
    ctx.lineWidth = Math.max(4, titleSize * 0.14);
    ctx.strokeText(title, width / 2, cursorY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = gradient;
    ctx.fillText(title, width / 2, cursorY);
    // Thin top highlight for a printed-poster feel.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, width / 2, cursorY - Math.max(1, titleSize * 0.02));
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function renderPoster(ctx, width, height, state) {
  paintSkyBackdrop(ctx, width, height, state.gradeId);

  const panels = computePanels(state.layoutId, width, height);
  for (let i = 0; i < panels.length; i += 1) {
    const rect = panels[i];
    const slot = state.slots[i] || { photoIndex: -1, offsetX: 0, offsetY: 0, zoom: 1 };
    const photo = slot.photoIndex >= 0 ? state.photos[slot.photoIndex] : null;
    if (photo && photo.image) {
      drawPhotoCover(ctx, photo.image, rect, slot);
    } else {
      drawEmptyPanel(ctx, rect, i, state.gradeId);
    }
    strokePanelFrame(ctx, rect, state.showSelection && i === state.selectedPanel, width, height);
  }

  applyFinish(ctx, width, height, state.gradeId, state.fx);
  drawCaption(ctx, width, height, state);
  return panels;
}

export function renderExportCanvas(state, sizeId) {
  const size = parseSizeId(sizeId);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  const exportState = Object.assign({}, state, { showSelection: false });
  renderPoster(ctx, size.width, size.height, exportState);
  return canvas;
}
