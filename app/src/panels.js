// Panel geometry for Sunset Poster Studio.
// Each layout splits the poster rectangle into comic-style panels separated
// by a gutter. Rectangles are returned in poster pixel coordinates so the
// same layout works at preview size and at every export size.

export const LAYOUTS = [
  { id: "hero-stack", label: "Hero + stacked pair", panelCount: 3 },
  { id: "grid-four", label: "Four-panel grid", panelCount: 4 },
  { id: "wide-strip", label: "Wide hero + bottom strip", panelCount: 3 },
];

export function layoutPanelCount(layoutId) {
  const found = LAYOUTS.find((item) => item.id === layoutId);
  return found ? found.panelCount : 3;
}

function insetRect(x, y, w, h, gap) {
  return { x: x + gap, y: y + gap, w: Math.max(8, w - gap * 2), h: Math.max(8, h - gap * 2) };
}

export function computePanels(layoutId, width, height) {
  const gutter = Math.round(Math.min(width, height) * 0.016);
  const half = gutter / 2;

  if (layoutId === "grid-four") {
    const cellW = width / 2;
    const cellH = height / 2;
    return [
      insetRect(0, 0, cellW, cellH, half),
      insetRect(cellW, 0, cellW, cellH, half),
      insetRect(0, cellH, cellW, cellH, half),
      insetRect(cellW, cellH, cellW, cellH, half),
    ];
  }

  if (layoutId === "wide-strip") {
    const heroH = height * 0.66;
    const stripH = height - heroH;
    const stripW = width / 2;
    return [
      insetRect(0, 0, width, heroH, half),
      insetRect(0, heroH, stripW, stripH, half),
      insetRect(stripW, heroH, stripW, stripH, half),
    ];
  }

  // hero-stack: a tall hero on the left, two stacked panels on the right.
  const heroW = width * 0.6;
  const sideW = width - heroW;
  const sideH = height / 2;
  return [
    insetRect(0, 0, heroW, height, half),
    insetRect(heroW, 0, sideW, sideH, half),
    insetRect(heroW, sideH, sideW, sideH, half),
  ];
}

export function panelAtPoint(panels, px, py) {
  for (let i = 0; i < panels.length; i += 1) {
    const r = panels[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

export function emptySlot() {
  return { photoIndex: -1, offsetX: 0, offsetY: 0, zoom: 1 };
}

export function makeSlots(count) {
  const slots = [];
  for (let i = 0; i < count; i += 1) slots.push(emptySlot());
  return slots;
}
