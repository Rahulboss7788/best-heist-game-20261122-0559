// Every sound in the game, synthesised live with WebAudio: no audio files, no
// network, nothing to load. The context is created on the first user gesture, so
// a quiet first paint never tries to play before the browser allows it.

export function createAudio() {
  let context = null;
  let master = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  /** A short tone: frequency, seconds, shape and an optional slide to another pitch. */
  function tone(frequency, seconds, shape = 'sine', slideTo = null, delay = 0) {
    if (!ensure()) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  /** A burst of filtered noise, for smoke and footsteps. */
  function noise(seconds, cutoff = 1200, delay = 0) {
    if (!ensure()) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.5, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    /** Call from any user gesture so later sounds are allowed to play. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    step() {
      noise(0.05, 500);
    },
    chime() {
      tone(880, 0.14, 'sine');
      tone(1318, 0.22, 'sine', null, 0.09);
    },
    clink() {
      tone(2093, 0.08, 'triangle');
      tone(1568, 0.12, 'triangle', null, 0.05);
    },
    puff() {
      noise(0.5, 900);
    },
    pickTick() {
      tone(1400, 0.05, 'square');
    },
    spotted() {
      tone(220, 0.35, 'sawtooth', 440);
      tone(330, 0.3, 'square', null, 0.08);
    },
    alarmTick() {
      tone(980, 0.09, 'square');
    },
    caught() {
      tone(392, 0.25, 'sawtooth', 196);
      tone(311, 0.4, 'sawtooth', 155, 0.22);
      tone(233, 0.7, 'sawtooth', 110, 0.45);
    },
    fanfare() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((frequency, index) => tone(frequency, 0.35, 'triangle', null, index * 0.13));
    },
    tick() {
      tone(1200, 0.04, 'square');
    },
  };
}
