// The Halcyon Museum's grand hall: its walls, cover, cameras, wardens, loot and
// the three ways through it. Geometry helpers live here too, so the simulation
// asks one place whether a sight line is blocked or a body fits somewhere.

/** The hall's inner walls: the thief stays inside this rectangle. */
export const HALL = { x: 48, y: 48, width: 1184, height: 624 };

/** The jewel's pedestal, at the centre of the hall. */
export const PEDESTAL = { x: 610, y: 270, width: 60, height: 60, sight: false };

/** Where the thief slips in, and the service door they must slip out of. */
export const ENTRANCE = { x: 640, y: 622 };
export const EXIT = { x: 1136, y: 624, width: 88, height: 40 };

/**
 * Build the museum. Rectangles block movement; those with sight: true also block
 * a warden's or camera's view. Circles are the marble columns: tall, so they
 * block both. Ropes are low velvet barriers: movement only, never sight.
 */
export function buildMuseum() {
  const tallCases = [
    { x: 430, y: 112, width: 110, height: 50, sight: true },
    { x: 740, y: 112, width: 110, height: 50, sight: true },
    { x: 430, y: 558, width: 110, height: 50, sight: true },
    { x: 740, y: 558, width: 110, height: 50, sight: true },
  ];
  const plinths = [
    { x: 176, y: 176, width: 76, height: 54, sight: false },
    { x: 1028, y: 176, width: 76, height: 54, sight: false },
    { x: 176, y: 490, width: 76, height: 54, sight: false },
    { x: 1028, y: 490, width: 76, height: 54, sight: false },
  ];
  const ropes = [
    { x: 592, y: 150, width: 8, height: 118 },
    { x: 592, y: 362, width: 8, height: 118 },
    { x: 680, y: 150, width: 8, height: 118 },
    { x: 680, y: 362, width: 8, height: 118 },
  ];
  const columns = [
    { x: 300, y: 200, radius: 24 },
    { x: 980, y: 200, radius: 24 },
    { x: 300, y: 460, radius: 24 },
    { x: 980, y: 460, radius: 24 },
    { x: 180, y: 330, radius: 24 },
    { x: 1100, y: 330, radius: 24 },
  ];
  const paintings = [
    { x: 150, y: 56, width: 92, height: 54, hue: '#7a4a6b' },
    { x: 340, y: 56, width: 92, height: 54, hue: '#4a6b7a' },
    { x: 850, y: 56, width: 92, height: 54, hue: '#6b7a4a' },
    { x: 1030, y: 56, width: 92, height: 54, hue: '#7a6b4a' },
    { x: 56, y: 150, width: 54, height: 92, hue: '#5d4a7a' },
    { x: 56, y: 480, width: 54, height: 92, hue: '#7a4a4a' },
    { x: 1170, y: 150, width: 54, height: 92, hue: '#4a7a5d' },
    { x: 1170, y: 480, width: 54, height: 92, hue: '#6b5d7a' },
  ];

  return {
    hall: HALL,
    pedestal: PEDESTAL,
    entrance: ENTRANCE,
    exit: EXIT,
    /** Every rectangle that blocks movement; sight: true also blocks vision. */
    blockers: [...tallCases, ...plinths, ...ropes, PEDESTAL],
    columns,
    paintings,
    /** The three ways through the hall: left gallery, red carpet, right gallery. */
    routes: [
      { name: 'West Gallery', points: [{ x: 240, y: 620 }, { x: 240, y: 330 }, { x: 400, y: 330 }, { x: 560, y: 330 }] },
      { name: 'Red Carpet', points: [{ x: 640, y: 620 }, { x: 640, y: 480 }, { x: 640, y: 360 }] },
      { name: 'East Gallery', points: [{ x: 1040, y: 620 }, { x: 1040, y: 330 }, { x: 880, y: 330 }, { x: 720, y: 330 }] },
    ],
    /** Side loot on the four plinths. */
    loot: [
      { id: 'bust', name: 'Gilded Bust', x: 214, y: 203, taken: false },
      { id: 'canvas', name: 'Moonlit Canvas', x: 1066, y: 203, taken: false },
      { id: 'vase', name: 'Ivory Vase', x: 214, y: 517, taken: false },
      { id: 'tiara', name: 'Emerald Tiara', x: 1066, y: 517, taken: false },
    ],
    /** The wardens and their patrol loops. */
    guards: [
      {
        name: 'Marlowe',
        waypoints: [{ x: 520, y: 200 }, { x: 760, y: 200 }, { x: 760, y: 400 }, { x: 520, y: 400 }],
        speed: 68,
      },
      {
        name: 'Okafor',
        waypoints: [{ x: 160, y: 160 }, { x: 262, y: 160 }, { x: 262, y: 510 }, { x: 160, y: 510 }],
        speed: 64,
      },
      {
        name: 'Ivers',
        waypoints: [{ x: 1120, y: 160 }, { x: 1018, y: 160 }, { x: 1018, y: 510 }, { x: 1120, y: 510 }],
        speed: 64,
      },
      {
        name: 'Petrov',
        waypoints: [{ x: 420, y: 92 }, { x: 860, y: 92 }],
        speed: 76,
      },
    ],
    /** The Argus cameras on the walls, sweeping their cones. */
    cameras: [
      { name: 'Argus North', x: 640, y: 64, centre: Math.PI / 2, sweep: 1.05, phase: 0 },
      { name: 'Argus West', x: 52, y: 330, centre: 0, sweep: 0.9, phase: 2.1 },
      { name: 'Argus East', x: 1228, y: 330, centre: Math.PI, sweep: 0.9, phase: 4.2 },
    ],
  };
}

/** True when the point sits inside the rectangle. */
export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** True when the segment from a to b touches the circle. */
export function segmentHitsCircle(ax, ay, bx, by, circle) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const ox = ax - circle.x;
    const oy = ay - circle.y;
    return ox * ox + oy * oy <= circle.radius * circle.radius;
  }
  let t = ((circle.x - ax) * dx + (circle.y - ay) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx - circle.x;
  const cy = ay + t * dy - circle.y;
  return cx * cx + cy * cy <= circle.radius * circle.radius;
}

/** True when the segment from a to b crosses the rectangle (edges count). */
export function segmentHitsRect(ax, ay, bx, by, rect) {
  if (pointInRect(ax, ay, rect) || pointInRect(bx, by, rect)) return true;
  // Slab test: the segment enters the rectangle when its t-intervals on both
  // axes overlap inside [0, 1].
  let tMin = 0;
  let tMax = 1;
  const slabs = [
    { d: bx - ax, lo: rect.x - ax, hi: rect.x + rect.width - ax, value: ax, low: rect.x, high: rect.x + rect.width },
    { d: by - ay, lo: rect.y - ay, hi: rect.y + rect.height - ay, value: ay, low: rect.y, high: rect.y + rect.height },
  ];
  for (const slab of slabs) {
    if (slab.d === 0) {
      if (slab.value < slab.low || slab.value > slab.high) return false;
      continue;
    }
    let t1 = slab.lo / slab.d;
    let t2 = slab.hi / slab.d;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= 1;
}

/**
 * True when nothing tall stands between the two points: a sight line that
 * crosses a sight-blocking rectangle or a column is broken.
 */
export function sightBlocked(ax, ay, bx, by, museum) {
  for (const blocker of museum.blockers) {
    if (blocker.sight && segmentHitsRect(ax, ay, bx, by, blocker)) return true;
  }
  for (const column of museum.columns) {
    if (segmentHitsCircle(ax, ay, bx, by, column)) return true;
  }
  return false;
}

/**
 * Push a circle out of every rectangle and column it overlaps, and clamp it
 * inside the hall. Returns true when anything was pushed.
 */
export function resolveCollisions(body, museum) {
  let pushed = false;
  const hall = museum.hall;
  if (body.x - body.radius < hall.x) {
    body.x = hall.x + body.radius;
    pushed = true;
  }
  if (body.x + body.radius > hall.x + hall.width) {
    body.x = hall.x + hall.width - body.radius;
    pushed = true;
  }
  if (body.y - body.radius < hall.y) {
    body.y = hall.y + body.radius;
    pushed = true;
  }
  if (body.y + body.radius > hall.y + hall.height) {
    body.y = hall.y + hall.height - body.radius;
    pushed = true;
  }
  for (const blocker of museum.blockers) {
    const nearestX = Math.max(blocker.x, Math.min(body.x, blocker.x + blocker.width));
    const nearestY = Math.max(blocker.y, Math.min(body.y, blocker.y + blocker.height));
    const dx = body.x - nearestX;
    const dy = body.y - nearestY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= body.radius * body.radius) continue;
    pushed = true;
    if (distanceSquared === 0) {
      // Dead centre of the rectangle: push out along the shallowest side.
      const left = body.x - blocker.x;
      const right = blocker.x + blocker.width - body.x;
      const top = body.y - blocker.y;
      const bottom = blocker.y + blocker.height - body.y;
      const shallow = Math.min(left, right, top, bottom);
      if (shallow === left) body.x = blocker.x - body.radius;
      else if (shallow === right) body.x = blocker.x + blocker.width + body.radius;
      else if (shallow === top) body.y = blocker.y - body.radius;
      else body.y = blocker.y + blocker.height + body.radius;
    } else {
      const distance = Math.sqrt(distanceSquared);
      body.x += (dx / distance) * (body.radius - distance);
      body.y += (dy / distance) * (body.radius - distance);
    }
  }
  for (const column of museum.columns) {
    const dx = body.x - column.x;
    const dy = body.y - column.y;
    const minDistance = body.radius + column.radius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minDistance * minDistance || distanceSquared === 0) continue;
    pushed = true;
    const distance = Math.sqrt(distanceSquared);
    body.x += (dx / distance) * (minDistance - distance);
    body.y += (dy / distance) * (minDistance - distance);
  }
  return pushed;
}
