// Screenshot scenes for Sunset Poster Studio.
// A query such as ?shot=cover&photo=pier&caption=Sunset%20Heist&layout=hero-stack&grade=sunset&size=1920x1080
// sets up a fixed scene for headless screenshots. window.__shotReady is set
// after paint; window.__shotError records any failure for headless checks.

export function installShotErrorHook() {
  window.addEventListener("error", (event) => {
    window.__shotError = String(event.message || event.error || "unknown error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.__shotError = String((event.reason && event.reason.message) || event.reason || "unhandled rejection");
  });
}

export function markShotReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}

export function readShotParams(search) {
  const query = new URLSearchParams(search);
  return {
    shot: query.get("shot") || "",
    photo: query.get("photo") || "",
    caption: query.get("caption") || "",
    subtitle: query.get("subtitle") || "",
    layout: query.get("layout") || "",
    grade: query.get("grade") || "",
    size: query.get("size") || "",
  };
}

export function applyShotScene(params, studio) {
  if (params.shot === "cover") {
    document.body.classList.add("shot-cover");
  }
  if (params.layout) studio.setLayout(params.layout);
  if (params.grade) studio.setGrade(params.grade);
  if (params.size) studio.setSize(params.size);
  if (params.caption) studio.setTitle(params.caption);
  if (params.subtitle) studio.setSubtitle(params.subtitle);
  return studio.loadShotPhotos(params.photo || "pier");
}
