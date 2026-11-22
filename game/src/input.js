// Keyboard and pointer input. Held keys steer; one-shot presses (start, pause,
// smoke, coin) are queued as bit flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice. A mouse click sets a
// move target in field coordinates; the keys always override it.

import { FIELD, fitScale } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_COIN = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SNEAK = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SMOKE = new Set(['KeyQ']);
const COIN = new Set(['KeyE']);
const PICK = new Set(['KeyF']);

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, sneak: false, pick: false };
  let actions = 0;
  /** The last click's field coordinates, or null when the player has arrived. */
  let moveTarget = null;
  /** The pointer's current field coordinates, for the coin toss aim. */
  let pointer = { x: FIELD.width / 2, y: FIELD.height / 2 };

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const fit = fitScale(rect.width, rect.height);
    return {
      x: (clientX - rect.left - fit.offsetX) / fit.scale,
      y: (clientY - rect.top - fit.offsetY) / fit.scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (SNEAK.has(event.code)) keys.sneak = true;
    else if (PICK.has(event.code)) keys.pick = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SMOKE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SMOKE;
    } else if (COIN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_COIN;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
    else if (SNEAK.has(event.code)) keys.sneak = false;
    else if (PICK.has(event.code)) keys.pick = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
    keys.sneak = false;
    keys.pick = false;
    moveTarget = null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toField(event.clientX, event.clientY);
    pointer = point;
    moveTarget = point;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    pointer = toField(event.clientX, event.clientY);
  });

  return {
    /** -1, 0 or 1 on each axis, from the held keys. */
    axis() {
      return {
        x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
        y: (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
      };
    },
    sneaking() {
      return keys.sneak;
    },
    picking() {
      return keys.pick;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The click-to-move target, or null. */
    moveTarget() {
      return moveTarget;
    },
    clearMoveTarget() {
      moveTarget = null;
    },
    pointer() {
      return pointer;
    },
  };
}
