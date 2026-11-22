// The heist itself: movement, patrols, vision cones, the alarm, the tools, the
// jewel and the getaway. One fixed step advances the world; the renderer only
// paints what is here, and the autopilot in shots.js only steers it.

import { ALARM, CAMERA, GUARD, PLAYER, SCORE, STEP, TOOLS, GALA_SECONDS } from './config.js';
import { buildMuseum, resolveCollisions, sightBlocked, pointInRect } from './museum.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_JEWEL = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_TIME_UP = 32;
export const EVENT_COIN = 64;
export const EVENT_SMOKE = 128;
export const EVENT_PICK_TICK = 256;

const TAU = Math.PI * 2;

function angleDifference(a, b) {
  let difference = (a - b) % TAU;
  if (difference > Math.PI) difference -= TAU;
  if (difference < -Math.PI) difference += TAU;
  return difference;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** True when the observer sees the point: in range, inside the cone, line of sight clear. */
export function canSee(observer, target, range, halfAngle, museum, smokes) {
  const dx = target.x - observer.x;
  const dy = target.y - observer.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 1 && Math.abs(angleDifference(Math.atan2(dy, dx), observer.angle)) > halfAngle) return false;
  if (sightBlocked(observer.x, observer.y, target.x, target.y, museum)) return false;
  for (const smoke of smokes) {
    if (smoke.timeLeft > 0 && distance(target.x, target.y, smoke.x, smoke.y) <= smoke.radius) return false;
  }
  return true;
}

export function createSimulation(random) {
  const museum = buildMuseum();
  const state = {
    time: 0,
    timeLeft: GALA_SECONDS,
    score: 0,
    alarm: 0,
    jewelTaken: false,
    pickProgress: 0,
    smokeCharges: TOOLS.smokeCharges,
    coins: TOOLS.coins,
    over: false,
    outcome: null,
    player: {
      x: museum.entrance.x,
      y: museum.entrance.y,
      radius: PLAYER.radius,
      angle: -Math.PI / 2,
      moving: false,
      sneaking: false,
    },
    guards: museum.guards.map((definition) => ({
      name: definition.name,
      waypoints: definition.waypoints,
      speed: definition.speed,
      x: definition.waypoints[0].x,
      y: definition.waypoints[0].y,
      radius: GUARD.radius,
      angle: Math.PI / 2,
      waypointIndex: 1,
      pauseLeft: 0,
      suspicion: 0,
      alertLeft: 0,
      investigate: null,
      lastSeen: null,
    })),
    cameras: museum.cameras.map((definition) => ({
      name: definition.name,
      x: definition.x,
      y: definition.y,
      centre: definition.centre,
      sweep: definition.sweep,
      phase: definition.phase,
      angle: definition.centre,
    })),
    loot: museum.loot.map((item) => ({ ...item })),
    smokes: [],
    coinDrops: [],
    message: '',
    messageLeft: 0,
    sparkles: [],
  };
  for (let i = 0; i < 24; i += 1) {
    state.sparkles.push({
      angle: random.range(0, TAU),
      radius: random.range(6, 34),
      speed: random.range(0.4, 1.4),
      phase: random.range(0, TAU),
    });
  }

  function announce(text, seconds = 3) {
    state.message = text;
    state.messageLeft = seconds;
  }

  function moveGuard(guard, dt, target, speed) {
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const stepDistance = Math.min(dist, speed * dt);
    guard.x += (dx / dist) * stepDistance;
    guard.y += (dy / dist) * stepDistance;
    const wanted = Math.atan2(dy, dx);
    guard.angle += angleDifference(wanted, guard.angle) * Math.min(1, dt * 8);
    return dist - stepDistance < 2;
  }

  function stepGuards(dt) {
    for (const guard of state.guards) {
      if (guard.alertLeft > 0) {
        guard.alertLeft -= dt;
        if (guard.lastSeen) moveGuard(guard, dt, guard.lastSeen, GUARD.alertSpeed);
        continue;
      }
      if (guard.investigate) {
        const arrived = moveGuard(guard, dt, guard.investigate, GUARD.patrolSpeed * 1.25);
        if (arrived) {
          guard.investigate = null;
          guard.pauseLeft = 2.5;
          guard.angle += Math.PI;
        }
        continue;
      }
      if (guard.pauseLeft > 0) {
        guard.pauseLeft -= dt;
        continue;
      }
      const target = guard.waypoints[guard.waypointIndex];
      const arrived = moveGuard(guard, dt, target, guard.speed);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseLeft = GUARD.waypointPause;
      }
    }
  }

  function stepCameras(dt) {
    for (const camera of state.cameras) {
      camera.angle = camera.centre + camera.sweep * Math.sin(state.time * CAMERA.sweepSpeed + camera.phase);
    }
  }

  function stepVision(dt, events) {
    const player = state.player;
    let seenByGuard = false;
    let seenByCamera = false;
    for (const guard of state.guards) {
      const seen = canSee(guard, player, GUARD.sightRange, GUARD.halfAngle, museum, state.smokes);
      if (seen) {
        seenByGuard = true;
        const closeness = 1.5 - distance(guard.x, guard.y, player.x, player.y) / GUARD.sightRange;
        const rate = GUARD.suspicionRate * Math.max(0.5, closeness) * (player.sneaking ? PLAYER.sneakFactor : 1);
        guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
        guard.lastSeen = { x: player.x, y: player.y };
        if (guard.suspicion >= 1) {
          guard.suspicion = 0.5;
          guard.alertLeft = GUARD.alertSeconds;
          state.alarm = Math.min(ALARM.caughtAt, state.alarm + ALARM.spottedJump);
          announce(`${guard.name} spotted you!`, 2.5);
          events |= EVENT_SPOTTED;
        }
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDecay * dt);
      }
    }
    for (const camera of state.cameras) {
      if (canSee(camera, player, CAMERA.sightRange, CAMERA.halfAngle, museum, state.smokes)) {
        seenByCamera = true;
        break;
      }
    }
    if (seenByGuard) state.alarm += ALARM.guardRate * dt * (player.sneaking ? PLAYER.sneakFactor : 1);
    if (seenByCamera) state.alarm += ALARM.cameraRate * dt;
    if (!seenByGuard && !seenByCamera) state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    if (state.alarm >= ALARM.caughtAt) {
      state.alarm = ALARM.caughtAt;
      state.over = true;
      state.outcome = 'caught';
      events |= EVENT_CAUGHT;
    }
    return events;
  }

  function stepPlayer(dt, controls) {
    const player = state.player;
    player.sneaking = controls.sneak;
    let dx = controls.axis.x;
    let dy = controls.axis.y;
    if (dx === 0 && dy === 0 && controls.moveTarget) {
      const tx = controls.moveTarget.x - player.x;
      const ty = controls.moveTarget.y - player.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 10) {
        controls.clearMoveTarget();
      } else {
        dx = tx / dist;
        dy = ty / dist;
      }
    }
    const length = Math.hypot(dx, dy);
    player.moving = length > 0;
    if (length > 0) {
      const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.speed;
      player.x += (dx / length) * speed * dt;
      player.y += (dy / length) * speed * dt;
      player.angle = Math.atan2(dy, dx);
      resolveCollisions(player, museum);
    }
    return player;
  }

  function stepLoot(dt, events) {
    const player = state.player;
    for (const item of state.loot) {
      if (item.taken) continue;
      if (distance(player.x, player.y, item.x, item.y) < 36) {
        item.taken = true;
        state.score += SCORE.sideLoot;
        announce(`${item.name} pocketed. +${SCORE.sideLoot}`, 2.5);
        events |= EVENT_PICKUP;
      }
    }
    return events;
  }

  function stepPick(dt, controls, events) {
    const player = state.player;
    const pedestal = museum.pedestal;
    const centreX = pedestal.x + pedestal.width / 2;
    const centreY = pedestal.y + pedestal.height / 2;
    const near = distance(player.x, player.y, centreX, centreY) < 78;
    if (!state.jewelTaken && near && controls.pick) {
      state.pickProgress += dt / TOOLS.pickSeconds;
      state.alarm = Math.min(ALARM.caughtAt, state.alarm + ALARM.pickRate * dt);
      if (Math.floor(state.pickProgress * 10) !== Math.floor((state.pickProgress - dt / TOOLS.pickSeconds) * 10)) {
        events |= EVENT_PICK_TICK;
      }
      if (state.pickProgress >= 1) {
        state.jewelTaken = true;
        state.score += SCORE.jewel;
        announce(`The Aurora Star is yours. Now slip out the service door.`, 4);
        events |= EVENT_JEWEL;
      }
    } else if (state.pickProgress > 0 && state.pickProgress < 1) {
      state.pickProgress = Math.max(0, state.pickProgress - dt * 0.25);
    }
    return events;
  }

  function stepTools(dt, controls, events) {
    const player = state.player;
    if (controls.smoke && state.smokeCharges > 0) {
      state.smokeCharges -= 1;
      state.smokes.push({ x: player.x, y: player.y, radius: TOOLS.smokeRadius, timeLeft: TOOLS.smokeSeconds });
      announce('Smoke out. They cannot see through it.', 2);
      events |= EVENT_SMOKE;
    }
    if (controls.coin && state.coins > 0) {
      state.coins -= 1;
      const aim = controls.pointer;
      const dx = aim.x - player.x;
      const dy = aim.y - player.y;
      const dist = Math.hypot(dx, dy);
      const reach = Math.min(dist, TOOLS.coinRange);
      const landing = dist === 0
        ? { x: player.x, y: player.y }
        : { x: player.x + (dx / dist) * reach, y: player.y + (dy / dist) * reach };
      state.coinDrops.push({ x: landing.x, y: landing.y, timeLeft: TOOLS.coinLureSeconds });
      let nearest = null;
      let nearestDistance = Infinity;
      for (const guard of state.guards) {
        const guardDistance = distance(guard.x, guard.y, landing.x, landing.y);
        if (guardDistance < TOOLS.coinLureRadius && guardDistance < nearestDistance) {
          nearest = guard;
          nearestDistance = guardDistance;
        }
      }
      if (nearest) {
        nearest.investigate = { x: landing.x, y: landing.y };
        nearest.alertLeft = 0;
        nearest.suspicion = Math.max(0, nearest.suspicion - 0.4);
        announce(`${nearest.name} heard something.`, 2);
      }
      events |= EVENT_COIN;
    }
    for (const smoke of state.smokes) smoke.timeLeft -= dt;
    state.smokes = state.smokes.filter((smoke) => smoke.timeLeft > 0);
    for (const coin of state.coinDrops) coin.timeLeft -= dt;
    state.coinDrops = state.coinDrops.filter((coin) => coin.timeLeft > 0);
    return events;
  }

  function stepTimer(dt, events) {
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      state.outcome = 'time';
      events |= EVENT_TIME_UP;
    }
    return events;
  }

  function stepEscape(events) {
    if (!state.jewelTaken || state.over) return events;
    const player = state.player;
    if (pointInRect(player.x, player.y, museum.exit)) {
      const timeBonus = Math.round(state.timeLeft) * SCORE.timePerSecond;
      const calmBonus = Math.round(ALARM.caughtAt - state.alarm) * SCORE.calmPerPoint;
      state.score += timeBonus + calmBonus;
      state.timeBonus = timeBonus;
      state.calmBonus = calmBonus;
      state.over = true;
      state.outcome = 'escaped';
      events |= EVENT_ESCAPED;
    }
    return events;
  }

  return {
    state,
    museum,
    reset() {
      const fresh = createSimulation(random);
      Object.assign(state, fresh.state);
      state.guards = fresh.state.guards;
      state.cameras = fresh.state.cameras;
      state.loot = fresh.state.loot;
      state.smokes = [];
      state.coinDrops = [];
    },
    /**
     * Advance the world one fixed step. `controls` carries the frame's input:
     * axis {x, y}, sneak, pick, smoke, coin, pointer, moveTarget, clearMoveTarget.
     * Returns the EVENT_* flags raised by this step.
     */
    step(dt, controls) {
      if (state.over) return EVENT_NONE;
      let events = EVENT_NONE;
      state.time += dt;
      if (state.messageLeft > 0) state.messageLeft -= dt;
      stepGuards(dt);
      stepCameras(dt);
      stepPlayer(dt, controls);
      events = stepLoot(dt, events);
      events = stepPick(dt, controls, events);
      events = stepTools(dt, controls, events);
      events = stepVision(dt, events);
      events = stepTimer(dt, events);
      events = stepEscape(events);
      return events;
    },
    /**
     * The title screen's attract mode: the wardens patrol and the cameras sweep
     * and the jewel sparkles, but the gala clock, the alarm and the thief do not
     * move, so the title can wait as long as it likes.
     */
    stepAttract(dt) {
      state.time += dt;
      stepGuards(dt);
      stepCameras(dt);
    },
    /** The nearest guard's suspicion, for the HUD's warning flash. */
    maxSuspicion() {
      return Math.max(0, ...state.guards.map((guard) => guard.suspicion));
    },
    /** True when any guard or camera can currently see the thief. */
    currentlySeen() {
      const player = state.player;
      for (const guard of state.guards) {
        if (canSee(guard, player, GUARD.sightRange, GUARD.halfAngle, museum, state.smokes)) return true;
      }
      for (const camera of state.cameras) {
        if (canSee(camera, player, CAMERA.sightRange, CAMERA.halfAngle, museum, state.smokes)) return true;
      }
      return false;
    },
  };
}
