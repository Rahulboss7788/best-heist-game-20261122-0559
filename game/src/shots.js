// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot that reads the cones
// before it moves — it waits for a clear window, slips through on smoke when it
// has waited too long, and picks the lock when it reaches the pedestal — so the
// frame is what a real game looks like, and the same seed always gives the same
// frame.

import { CAMERA, GUARD, STEP } from './config.js';
import { canSee } from './simulation.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const MAX_PLAY_SECONDS = 240;
const SAMPLE_EVERY = 24;

/** True when no guard or camera cone covers the point right now. */
function pointClear(sim, x, y) {
  const museum = sim.museum;
  const state = sim.state;
  const target = { x, y };
  for (const guard of state.guards) {
    if (canSee(guard, target, GUARD.sightRange, GUARD.halfAngle, museum, state.smokes)) return false;
  }
  for (const camera of state.cameras) {
    if (canSee(camera, target, CAMERA.sightRange, CAMERA.halfAngle, museum, state.smokes)) return false;
  }
  return true;
}

/** True when every sampled point on the segment is clear of cones right now. */
function segmentClear(sim, from, to) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const samples = Math.max(1, Math.ceil(length / SAMPLE_EVERY));
  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    if (!pointClear(sim, from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return false;
  }
  return true;
}

/**
 * Drive the thief along `waypoints`, waiting for clear windows and using smoke
 * when a wait drags on. `stopWhen` may end the drive early; it receives the sim
 * and returns true when the scene is ready. Returns what happened.
 */
function drive(sim, waypoints, stopWhen) {
  let waypointIndex = 0;
  let waitTime = 0;
  let smokeWindow = 0;
  let steps = 0;
  const maxSteps = Math.floor(MAX_PLAY_SECONDS / STEP);
  while (steps < maxSteps) {
    const state = sim.state;
    if (state.over) break;
    if (stopWhen && stopWhen(sim)) break;
    if (waypointIndex >= waypoints.length) break;
    const player = state.player;
    let target = waypoints[waypointIndex];
    let distance = Math.hypot(target.x - player.x, target.y - player.y);
    if (distance < 18) {
      waypointIndex += 1;
      waitTime = 0;
      if (waypointIndex >= waypoints.length) break;
      target = waypoints[waypointIndex];
      distance = Math.hypot(target.x - player.x, target.y - player.y);
    }
    const clear = segmentClear(sim, player, target);
    const controls = {
      axis: { x: 0, y: 0 },
      sneak: true,
      pick: false,
      smoke: false,
      coin: false,
      pointer: { x: player.x, y: player.y },
      moveTarget: null,
      clearMoveTarget() {},
    };
    if (smokeWindow > 0) smokeWindow -= STEP;
    if (!clear && smokeWindow <= 0) {
      waitTime += STEP;
      if (waitTime > 5 && state.smokeCharges > 0) {
        controls.smoke = true;
        smokeWindow = 4;
        waitTime = 0;
      }
    } else {
      waitTime = 0;
      controls.axis = {
        x: (target.x - player.x) / distance,
        y: (target.y - player.y) / distance,
      };
    }
    if (sim.maxSuspicion() > 0.7 && state.smokeCharges > 0 && smokeWindow <= 0) {
      controls.smoke = true;
      smokeWindow = 4;
    }
    sim.step(STEP, controls);
    steps += 1;
  }
  return { steps, waypointIndex, over: sim.state.over, outcome: sim.state.outcome };
}

/** The way in: down the red carpet to the pedestal's open side. */
const APPROACH = [
  { x: 640, y: 560 },
  { x: 640, y: 470 },
  { x: 640, y: 400 },
  { x: 620, y: 345 },
];

/** The way out: east along the hall, then down to the service door. */
const ESCAPE = [
  { x: 700, y: 330 },
  { x: 920, y: 330 },
  { x: 920, y: 620 },
  { x: 1180, y: 640 },
];

/**
 * Set `sim` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it and the best score to show.
 */
export function stageShot(name, sim) {
  sim.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) sim.stepAttract(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  drive(sim, APPROACH, (candidate) => candidate.state.pickProgress >= 0.55 || candidate.state.jewelTaken);
  if (name === 'play') {
    // Crack the lock most of the way — the jewel still glows — and freeze there:
    // the thief mid-crack, a cone sweeping in and the alarm already climbing.
    const player = sim.state.player;
    const pickControls = {
      axis: { x: 0, y: 0 },
      sneak: false,
      pick: true,
      smoke: false,
      coin: false,
      pointer: { x: player.x, y: player.y },
      moveTarget: null,
      clearMoveTarget() {},
    };
    for (let index = 0; index < 240 && sim.state.pickProgress < 0.85 && !sim.state.over; index += 1) {
      sim.step(STEP, pickControls);
    }
    return { screen: SCREEN_PLAY, best: sim.state.score };
  }
  // The end scene: finish the pick, then run the getaway.
  const player = sim.state.player;
  const pickControls = {
    axis: { x: 0, y: 0 },
    sneak: false,
    pick: true,
    smoke: false,
    coin: false,
    pointer: { x: player.x, y: player.y },
    moveTarget: null,
    clearMoveTarget() {},
  };
  for (let index = 0; index < Math.floor(30 / STEP) && !sim.state.jewelTaken && !sim.state.over; index += 1) {
    if (sim.state.alarm > 55 && sim.state.smokeCharges > 0) pickControls.smoke = true;
    sim.step(STEP, pickControls);
    pickControls.smoke = false;
  }
  if (!sim.state.over) drive(sim, ESCAPE, null);
  const over = sim.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: sim.state.score };
}
