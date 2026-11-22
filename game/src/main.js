// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the patrols and sparkles. ?shot=start|play|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_COIN,
  ACTION_CONFIRM,
  ACTION_PAUSE,
  ACTION_SMOKE,
  createInput,
} from './input.js';
import {
  EVENT_CAUGHT,
  EVENT_COIN,
  EVENT_ESCAPED,
  EVENT_JEWEL,
  EVENT_PICKUP,
  EVENT_PICK_TICK,
  EVENT_SMOKE,
  EVENT_SPOTTED,
  EVENT_TIME_UP,
  createSimulation,
} from './simulation.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sim = createSimulation(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

// A handle for play-testing and screenshots: the live state, read-only enough
// for a test to steer keys and watch the alarm, the jewel and the outcome.
window.__gilded = { sim, get state() { return sim.state; } };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, sim);
  let painted = 0;
  function paint() {
    renderer.draw(sim.state, scene.screen, scene.best, { seen: sim.currentlySeen(), maxSuspicion: sim.maxSuspicion() }, sim.museum);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let alarmTickAt = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    sim.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Steal the Aurora Star, then slip out the service exit.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (sim.state.score > best) {
      best = sim.state.score;
      saveBest(best);
    }
    if (sim.state.outcome === 'escaped') {
      audio.fanfare();
      announce(`Clean getaway. Score ${sim.state.score}. Best ${best}.`);
    } else if (sim.state.outcome === 'time') {
      audio.caught();
      announce(`The gala ended. Score ${sim.state.score}. Best ${best}.`);
    } else {
      audio.caught();
      announce(`Caught. Score ${sim.state.score}. Best ${best}.`);
    }
  }

  function controlsForStep(actions) {
    return {
      axis: input.axis(),
      sneak: input.sneaking(),
      pick: input.picking(),
      smoke: Boolean(actions & ACTION_SMOKE),
      coin: Boolean(actions & ACTION_COIN),
      pointer: input.pointer(),
      moveTarget: input.moveTarget(),
      clearMoveTarget: () => input.clearMoveTarget(),
    };
  }

  function handleEvents(events) {
    if (events & EVENT_PICKUP) audio.chime();
    if (events & EVENT_PICK_TICK) audio.pickTick();
    if (events & EVENT_JEWEL) audio.chime();
    if (events & EVENT_COIN) audio.clink();
    if (events & EVENT_SMOKE) audio.puff();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & (EVENT_CAUGHT | EVENT_ESCAPED | EVENT_TIME_UP)) endGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // One-shot presses (smoke, coin) ride into the first fixed step of this frame.
    return actions;
  }

  function step(actions) {
    const events = sim.step(STEP, controlsForStep(actions));
    handleEvents(events);
    if (sim.state.alarm >= 70 && performance.now() - alarmTickAt > 500) {
      alarmTickAt = performance.now();
      audio.alarmTick();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    let frameActions = actions;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        if (screen === SCREEN_TITLE) {
          // The title screen is an attract mode: the wardens patrol and the
          // cameras sweep, but the gala clock and the alarm do not run.
          sim.stepAttract(STEP);
        } else {
          step(frameActions);
          frameActions = 0;
        }
        accumulator -= STEP;
        if (screen === SCREEN_OVER) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(
      sim.state,
      screen,
      best,
      { seen: sim.currentlySeen(), maxSuspicion: sim.maxSuspicion() },
      sim.museum,
    );
  }

  // Leaving the tab pauses a running game rather than letting the gala run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Gilded Hour. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
