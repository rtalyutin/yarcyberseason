import test from "node:test";
import assert from "node:assert/strict";
import { getClickPoint, getImageAnchor, HIGHLIGHT_ANCHOR, scheduleHighlight } from "../src/lib/click-highlight.js";

test("the reticle stays on the same artwork pixel through desktop and mobile crops", () => {
  const natural = { width: 1721, height: 914 };
  for (const [width, height, x] of [[1629, 652, .5], [1200, 652, .5], [861, 652, .5], [860, 330, .62], [390, 330, .62], [320, 330, .62]]) {
    const point = getImageAnchor({ width, height }, natural, { x, y: .5 });
    // Reverse the CSS cover transform: every viewport must hit the same native pixel.
    const scale = Math.max(width / natural.width, height / natural.height);
    const nativeX = (point.x - (width - natural.width * scale) * x) / scale;
    const nativeY = (point.y - (height - natural.height * scale) / 2) / scale;
    assert.ok(Math.abs(nativeX - natural.width * HIGHLIGHT_ANCHOR.x) < .001);
    assert.ok(Math.abs(nativeY - natural.height * HIGHLIGHT_ANCHOR.y) < .001);
    assert.ok(point.x >= 30 && point.x <= width - 30, `complete hit target visible at ${width}px`);
    assert.ok(point.y >= 30 && point.y <= height - 60, `space for replay label at ${width}px`);
  }
  assert.equal(getImageAnchor({ width: 375, height: 330 }, { width: 0, height: 0 }), null);
});

test("mouse and touch clicks keep their actual position; keyboard uses the target centre", () => {
  const rect = { left: 500, top: 310, width: 60, height: 60 };
  assert.deepEqual(getClickPoint({ detail: 1, clientX: 517, clientY: 337, pointerType: "mouse" }, rect), { x: 517, y: 337, touch: false });
  assert.deepEqual(getClickPoint({ detail: 1, clientX: 524, clientY: 329, pointerType: "touch" }, rect), { x: 524, y: 329, touch: true });
  assert.deepEqual(getClickPoint({ detail: 0, clientX: 0, clientY: 0 }, rect), { x: 530, y: 340, touch: false });
  assert.deepEqual(getClickPoint({ detail: 0, clientX: 0, clientY: 0, pointerType: "touch" }, rect), { x: 530, y: 340, touch: false });
});

function fakeClock() {
  const jobs = new Map();
  let id = 0;
  let now = 0;
  return {
    setTimeout(fn, delay) { jobs.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { jobs.delete(key); },
    advance(ms) {
      now += ms;
      for (const [key, job] of [...jobs].sort((a, b) => a[1].at - b[1].at)) {
        if (job.at <= now && jobs.has(key)) { jobs.delete(key); job.fn(); }
      }
    },
    get pending() { return jobs.size; },
  };
}

test("one click completes the agreed sequence and automatically returns to the page", () => {
  const clock = fakeClock();
  const phases = [];
  scheduleHighlight((phase) => phases.push(phase), { clock });
  assert.deepEqual(phases, ["freeze"]);
  clock.advance(3799);
  assert.deepEqual(phases, ["freeze", "replay"]);
  clock.advance(1);
  assert.equal(phases.at(-1), "impact");
  clock.advance(1500);
  assert.equal(phases.at(-1), "interview");
  clock.advance(2900);
  assert.deepEqual(phases, ["freeze", "replay", "impact", "interview", "done"]);
  assert.equal(clock.pending, 0);
});

test("closing at any phase cancels all callbacks; a new play starts cleanly", () => {
  for (const elapsed of [0, 1400, 4200, 6000]) {
    const clock = fakeClock();
    const old = [];
    const cancel = scheduleHighlight((phase) => old.push(phase), { clock });
    clock.advance(elapsed);
    cancel();
    const before = [...old];
    assert.equal(clock.pending, 0);
    const next = [];
    scheduleHighlight((phase) => next.push(phase), { clock });
    clock.advance(8200);
    assert.deepEqual(old, before, "closed run never updates the new dialog");
    assert.deepEqual(next, ["freeze", "replay", "impact", "interview", "done"]);
  }
});

test("reduced motion skips the moving replay and impact while preserving the payoff", () => {
  const clock = fakeClock();
  const phases = [];
  scheduleHighlight((phase) => phases.push(phase), { clock, reducedMotion: true });
  assert.deepEqual(phases, ["interview"]);
  clock.advance(6200);
  assert.deepEqual(phases, ["interview", "done"]);
  assert.equal(clock.pending, 0);
});
