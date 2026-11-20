// Sunset Poster Studio — page wiring.
// Owns the editor state, loads photos from the person's own machine,
// lets each panel be positioned by dragging, and exports PNG posters
// at 1080x1080, 1080x1350 and 1920x1080. Fully offline.

import { computePanels, layoutPanelCount, makeSlots, panelAtPoint } from "./panels.js";
import { parseSizeId, renderExportCanvas, renderPoster } from "./poster.js";
import { applyShotScene, installShotErrorHook, markShotReady, readShotParams } from "./shots.js";

installShotErrorHook();

const SAMPLE_SOURCES = {
  pier: "samples/pier.jpg",
  boulevard: "samples/boulevard.jpg",
};

const canvas = document.getElementById("posterCanvas");
const ctx = canvas.getContext("2d");
const photoInput = document.getElementById("photoInput");
const photoTray = document.getElementById("photoTray");
const layoutSelect = document.getElementById("layoutSelect");
const gradeSelect = document.getElementById("gradeSelect");
const sizeSelect = document.getElementById("sizeSelect");
const titleInput = document.getElementById("titleInput");
const subtitleInput = document.getElementById("subtitleInput");
const zoomRange = document.getElementById("zoomRange");
const panelInfo = document.getElementById("panelInfo");
const statusLine = document.getElementById("statusLine");
const fxVignette = document.getElementById("fxVignette");
const fxGrain = document.getElementById("fxGrain");
const fxHalftone = document.getElementById("fxHalftone");

const state = {
  layoutId: "hero-stack",
  gradeId: "sunset",
  sizeId: "1080x1350",
  title: titleInput.value,
  subtitle: subtitleInput.value,
  photos: [],
  slots: makeSlots(4),
  selectedPanel: 0,
  chosenPhoto: -1,
  showSelection: true,
  fx: { vignette: true, grain: true, halftone: false },
};

let currentPanels = [];

function setStatus(text) {
  statusLine.textContent = text;
}

function syncFx() {
  state.fx.vignette = fxVignette.checked;
  state.fx.grain = fxGrain.checked;
  state.fx.halftone = fxHalftone.checked;
}

function applyCanvasSize() {
  const size = parseSizeId(state.sizeId);
  canvas.width = size.width;
  canvas.height = size.height;
}

function redraw() {
  syncFx();
  currentPanels = renderPoster(ctx, canvas.width, canvas.height, state);
  updatePanelInfo();
}

function updatePanelInfo() {
  const slot = state.slots[state.selectedPanel];
  const photo = slot && slot.photoIndex >= 0 ? state.photos[slot.photoIndex] : null;
  const photoLabel = photo ? photo.name : "no photo yet";
  panelInfo.textContent = `Panel ${state.selectedPanel + 1} selected — ${photoLabel}`;
  if (slot) zoomRange.value = String(slot.zoom || 1);
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${url}`));
    image.src = url;
  });
}

function addPhoto(image, name, thumbUrl) {
  const entry = { image, name, thumbUrl: thumbUrl || image.src };
  state.photos.push(entry);
  const index = state.photos.length - 1;
  const thumb = document.createElement("img");
  thumb.src = entry.thumbUrl;
  thumb.alt = name;
  thumb.title = name;
  thumb.dataset.photoIndex = String(index);
  thumb.addEventListener("click", () => {
    choosePhoto(index);
    assignPhotoToPanel(index, state.selectedPanel);
  });
  photoTray.appendChild(thumb);
  return index;
}

function choosePhoto(index) {
  state.chosenPhoto = index;
  for (const node of photoTray.querySelectorAll("img")) {
    node.classList.toggle("is-chosen", Number(node.dataset.photoIndex) === index);
  }
}

function assignPhotoToPanel(photoIndex, panelIndex) {
  const slot = state.slots[panelIndex];
  if (!slot) return;
  slot.photoIndex = photoIndex;
  slot.offsetX = 0;
  slot.offsetY = 0;
  slot.zoom = 1;
  choosePhoto(photoIndex);
  redraw();
  setStatus(`Photo placed in panel ${panelIndex + 1}. Drag on the poster to reposition it.`);
}

function distributePhotos() {
  if (state.photos.length === 0) return;
  const count = layoutPanelCount(state.layoutId);
  for (let i = 0; i < count; i += 1) {
    state.slots[i].photoIndex = i % state.photos.length;
    state.slots[i].offsetX = 0;
    state.slots[i].offsetY = 0;
    state.slots[i].zoom = 1;
  }
  choosePhoto(state.slots[state.selectedPanel].photoIndex);
}

async function loadSample(key, distribute) {
  const url = SAMPLE_SOURCES[key];
  if (!url) return -1;
  const existing = state.photos.findIndex((photo) => photo.name === key);
  if (existing >= 0) {
    if (distribute) distributePhotos();
    redraw();
    return existing;
  }
  const image = await loadImageFromUrl(url);
  const index = addPhoto(image, key, url);
  if (distribute) distributePhotos();
  redraw();
  return index;
}

async function loadStarterSamples() {
  await loadSample("pier", false);
  await loadSample("boulevard", false);
  distributePhotos();
  redraw();
}

const studio = {
  setLayout(layoutId) {
    state.layoutId = layoutId;
    layoutSelect.value = layoutId;
    if (state.selectedPanel >= layoutPanelCount(layoutId)) state.selectedPanel = 0;
  },
  setGrade(gradeId) {
    state.gradeId = gradeId;
    gradeSelect.value = gradeId;
  },
  setSize(sizeId) {
    state.sizeId = sizeId;
    sizeSelect.value = sizeId;
    applyCanvasSize();
  },
  setTitle(text) {
    state.title = text;
    titleInput.value = text;
  },
  setSubtitle(text) {
    state.subtitle = text;
    subtitleInput.value = text;
  },
  async loadShotPhotos(photoKey) {
    if (photoKey === "both") {
      await loadStarterSamples();
    } else if (photoKey === "boulevard") {
      await loadSample("boulevard", false);
      await loadSample("pier", false);
      distributePhotos();
    } else {
      await loadSample("pier", false);
      await loadSample("boulevard", false);
      distributePhotos();
    }
    state.showSelection = !document.body.classList.contains("shot-cover");
    redraw();
  },
};

photoInput.addEventListener("change", async () => {
  const files = Array.from(photoInput.files || []);
  if (files.length === 0) return;
  let firstIndex = -1;
  for (const file of files) {
    const objectUrl = URL.createObjectURL(file);
    const image = await loadImageFromUrl(objectUrl);
    const index = addPhoto(image, file.name, objectUrl);
    if (firstIndex < 0) firstIndex = index;
  }
  if (firstIndex >= 0) {
    if (state.slots.every((slot) => slot.photoIndex < 0)) {
      distributePhotos();
    } else {
      assignPhotoToPanel(firstIndex, state.selectedPanel);
    }
  }
  redraw();
  setStatus(`${files.length} photo${files.length === 1 ? "" : "s"} added. Click a panel, then a photo, to place it.`);
});

document.getElementById("samplePier").addEventListener("click", async () => {
  const index = await loadSample("pier", false);
  if (index >= 0) assignPhotoToPanel(index, state.selectedPanel);
});

document.getElementById("sampleBoulevard").addEventListener("click", async () => {
  const index = await loadSample("boulevard", false);
  if (index >= 0) assignPhotoToPanel(index, state.selectedPanel);
});

document.getElementById("fillAll").addEventListener("click", () => {
  const index = state.chosenPhoto >= 0 ? state.chosenPhoto : state.slots[state.selectedPanel].photoIndex;
  if (index < 0 || !state.photos[index]) {
    setStatus("Pick a photo first, then fill every panel with it.");
    return;
  }
  const count = layoutPanelCount(state.layoutId);
  for (let i = 0; i < count; i += 1) {
    state.slots[i].photoIndex = index;
    state.slots[i].offsetX = 0;
    state.slots[i].offsetY = 0;
    state.slots[i].zoom = 1;
  }
  redraw();
  setStatus("Every panel now uses the selected photo. Drag each panel to frame it differently.");
});

layoutSelect.addEventListener("change", () => {
  studio.setLayout(layoutSelect.value);
  redraw();
});

gradeSelect.addEventListener("change", () => {
  studio.setGrade(gradeSelect.value);
  redraw();
});

sizeSelect.addEventListener("change", () => {
  studio.setSize(sizeSelect.value);
  redraw();
});

titleInput.addEventListener("input", () => {
  state.title = titleInput.value;
  redraw();
});

subtitleInput.addEventListener("input", () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

for (const toggle of [fxVignette, fxGrain, fxHalftone]) {
  toggle.addEventListener("change", redraw);
}

zoomRange.addEventListener("input", () => {
  const slot = state.slots[state.selectedPanel];
  if (!slot) return;
  slot.zoom = Number(zoomRange.value) || 1;
  redraw();
});

document.getElementById("centerPanel").addEventListener("click", () => {
  const slot = state.slots[state.selectedPanel];
  if (!slot) return;
  slot.offsetX = 0;
  slot.offsetY = 0;
  redraw();
});

document.getElementById("clearPanel").addEventListener("click", () => {
  const slot = state.slots[state.selectedPanel];
  if (!slot) return;
  slot.photoIndex = -1;
  slot.offsetX = 0;
  slot.offsetY = 0;
  slot.zoom = 1;
  redraw();
});

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  };
}

let dragState = null;

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  const panels = currentPanels.length ? currentPanels : computePanels(state.layoutId, canvas.width, canvas.height);
  const hit = panelAtPoint(panels, point.x, point.y);
  if (hit < 0) return;
  state.selectedPanel = hit;
  const slot = state.slots[hit];
  if (slot && slot.photoIndex >= 0) choosePhoto(slot.photoIndex);
  dragState = {
    panel: hit,
    startX: point.x,
    startY: point.y,
    offsetX: slot ? slot.offsetX : 0,
    offsetY: slot ? slot.offsetY : 0,
  };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});

canvas.addEventListener("pointermove", (event) => {
  if (!dragState) return;
  const slot = state.slots[dragState.panel];
  if (!slot || slot.photoIndex < 0) return;
  const point = canvasPoint(event);
  const rect = currentPanels[dragState.panel];
  if (!rect) return;
  const nextX = dragState.offsetX + ((point.x - dragState.startX) / rect.w) * 2;
  const nextY = dragState.offsetY + ((point.y - dragState.startY) / rect.h) * 2;
  slot.offsetX = Math.max(-1, Math.min(1, nextX));
  slot.offsetY = Math.max(-1, Math.min(1, nextY));
  redraw();
});

canvas.addEventListener("pointerup", () => {
  dragState = null;
});

canvas.addEventListener("pointercancel", () => {
  dragState = null;
});

function exportPoster(sizeId) {
  const size = parseSizeId(sizeId);
  const exportCanvas = renderExportCanvas(state, sizeId);
  exportCanvas.toBlob((blob) => {
    if (!blob) {
      setStatus("Export failed in this browser. Try again.");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sunset-poster-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    setStatus(`Saved sunset-poster-${size.width}x${size.height}.png`);
  }, "image/png");
}

for (const button of document.querySelectorAll(".export-btn")) {
  button.addEventListener("click", () => {
    studio.setSize(button.dataset.size);
    redraw();
    exportPoster(button.dataset.size);
  });
}

async function start() {
  applyCanvasSize();
  const params = readShotParams(location.search);
  if (params.shot) {
    await applyShotScene(params, studio);
  } else {
    await loadStarterSamples();
    setStatus("Samples loaded so you can start right away. Add your own photos any time.");
  }
  redraw();
  markShotReady();
}

start().catch((error) => {
  window.__shotError = String((error && error.message) || error);
  setStatus("Something went wrong while loading. Reload the page to try again.");
});
