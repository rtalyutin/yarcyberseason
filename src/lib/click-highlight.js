// The gap between the first two chairs in home-team-stage.webp.
export const HIGHLIGHT_ANCHOR = Object.freeze({ x: 0.56, y: 0.545 });

export const HIGHLIGHT_TIMELINE = Object.freeze([
  { phase: "freeze", at: 0 },
  { phase: "replay", at: 1200 },
  { phase: "impact", at: 3800 },
  { phase: "interview", at: 5300 },
  { phase: "done", at: 8200 },
]);

// Match CSS object-fit: cover, including the mobile image crop.
export function getImageAnchor(box, natural, position = { x: 0.5, y: 0.5 }) {
  if (!box.width || !box.height || !natural.width || !natural.height) return null;
  const scale = Math.max(box.width / natural.width, box.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    x: (box.width - width) * position.x + width * HIGHLIGHT_ANCHOR.x,
    y: (box.height - height) * position.y + height * HIGHLIGHT_ANCHOR.y,
  };
}

export function getClickPoint(event, rect) {
  const pointer = event.detail > 0 && Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
  return {
    x: pointer ? event.clientX : rect.left + rect.width / 2,
    y: pointer ? event.clientY : rect.top + rect.height / 2,
    touch: pointer && event.pointerType === "touch",
  };
}

// One cancellable run. Closing, replaying or leaving the route cancels every stage.
export function scheduleHighlight(onPhase, { reducedMotion = false, clock = globalThis } = {}) {
  const stages = reducedMotion
    ? [{ phase: "interview", at: 0 }, { phase: "done", at: 6200 }]
    : HIGHLIGHT_TIMELINE;
  let cancelled = false;
  onPhase(stages[0].phase);
  const timers = stages.slice(1).map(({ phase, at }) => clock.setTimeout(() => {
    if (!cancelled) onPhase(phase);
  }, at));
  return () => {
    cancelled = true;
    timers.forEach((timer) => clock.clearTimeout(timer));
  };
}
