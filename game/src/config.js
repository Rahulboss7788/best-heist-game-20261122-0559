// Every tuning number and colour for The Gilded Hour, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The gala lasts this long; when it ends the hall locks down. */
export const GALA_SECONDS = 240;

export const PLAYER = {
  radius: 15,
  speed: 205,
  sneakSpeed: 118,
  /** Detection rises half as fast while sneaking. */
  sneakFactor: 0.5,
};

export const GUARD = {
  radius: 16,
  patrolSpeed: 68,
  alertSpeed: 118,
  /** How far a guard can see, in pixels. */
  sightRange: 235,
  /** Half of a guard's vision cone, in radians. */
  halfAngle: 0.62,
  /** Suspicion per second while the thief is in the cone and in sight. */
  suspicionRate: 1.15,
  suspicionDecay: 0.45,
  /** Seconds a guard waits at each patrol waypoint. */
  waypointPause: 1.4,
  /** Seconds an alerted guard hunts the last seen spot. */
  alertSeconds: 5,
};

export const CAMERA = {
  sightRange: 275,
  halfAngle: 0.5,
  sweepSpeed: 0.55,
};

export const ALARM = {
  /** Per second while a guard has the thief in sight. */
  guardRate: 26,
  /** Per second while a camera has the thief in sight. */
  cameraRate: 14,
  /** Per second while picking the jewel's lock (outweighs the decay, so the crack is a risk even unseen). */
  pickRate: 10,
  /** Per second while nothing sees the thief. */
  decay: 7,
  /** Instant jump when a guard's suspicion fills. */
  spottedJump: 18,
  /** Alarm at which the wardens close in. */
  caughtAt: 100,
};

export const TOOLS = {
  smokeCharges: 3,
  smokeRadius: 95,
  smokeSeconds: 4,
  coins: 3,
  coinRange: 280,
  coinLureSeconds: 5,
  coinLureRadius: 380,
  /** Seconds of holding F beside the pedestal to crack the case. */
  pickSeconds: 2.5,
};

export const SCORE = {
  jewel: 1000,
  sideLoot: 250,
  timePerSecond: 5,
  calmPerPoint: 3,
};

export const PALETTE = {
  backdrop: '#0d0f14',
  floorA: '#1d2733',
  floorB: '#182230',
  floorLine: '#263445',
  wall: '#3a2f26',
  wallTrim: '#c9a227',
  carpet: '#7a1f2b',
  carpetEdge: '#c9a227',
  column: '#e8dcc0',
  columnShade: '#b8a67e',
  caseGlass: '#9fc4d8',
  caseFrame: '#8a6d2f',
  plinth: '#4a3f30',
  rope: '#a31621',
  ropePost: '#c9a227',
  paintingFrame: '#c9a227',
  guard: '#2c3550',
  guardTrim: '#d8c98a',
  cone: '#f5b942',
  coneHot: '#ef4444',
  camera: '#3d4b63',
  cameraCone: '#ef4444',
  player: '#1c1c22',
  playerTrim: '#e8c15a',
  jewel: '#7fe7ff',
  jewelGlow: '#bfefff',
  loot: '#ffd34d',
  smoke: '#9aa3ad',
  exit: '#34d399',
  exitDark: '#065f46',
  panel: '#141a24',
  panelEdge: '#c9a227',
  text: '#f2ead8',
  muted: '#9aa3ad',
  danger: '#ef4444',
  warning: '#f5b942',
  good: '#34d399',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gilded-hour.best';

/**
 * Letterbox fit of the 1280x720 field into a view of the given size, so the
 * renderer and the pointer mapping always agree about where the field sits.
 */
export function fitScale(viewWidth, viewHeight) {
  const scale = Math.min(viewWidth / FIELD.width, viewHeight / FIELD.height);
  return {
    scale,
    offsetX: (viewWidth - FIELD.width * scale) / 2,
    offsetY: (viewHeight - FIELD.height * scale) / 2,
  };
}
