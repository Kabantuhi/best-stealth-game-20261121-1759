// SHADOW LEDGER — sound, made on the spot with the Web Audio API.
// No audio files: every sound is a few oscillators shaped by an envelope.

let context = null;
let master = null;

/** Create the audio graph on the first user gesture (browsers demand one). */
export function ensureAudio() {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return;
  }
  try {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.22;
    master.connect(context.destination);
  } catch {
    context = null;
  }
}

function tone({ frequency, endFrequency = null, duration, type = 'sine', volume = 1, delay = 0 }) {
  if (!context || !master) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** A soft footstep tick; quieter while sneaking, sharper while dashing. */
export function playFootstep(sneaking, dashing) {
  if (sneaking) return;
  tone({ frequency: dashing ? 190 : 140, endFrequency: 90, duration: 0.07, type: 'triangle', volume: dashing ? 0.5 : 0.28 });
}

/** The chime when a ledger shard is taken. */
export function playShard() {
  tone({ frequency: 880, duration: 0.16, volume: 0.5 });
  tone({ frequency: 1318, duration: 0.24, volume: 0.4, delay: 0.09 });
}

/** The sting when the alarm trips. */
export function playAlarm() {
  tone({ frequency: 220, endFrequency: 440, duration: 0.32, type: 'sawtooth', volume: 0.4 });
  tone({ frequency: 233, endFrequency: 466, duration: 0.32, type: 'sawtooth', volume: 0.4, delay: 0.05 });
}

/** A low thud when a guard grabs the courier. */
export function playCaught() {
  tone({ frequency: 110, endFrequency: 55, duration: 0.35, type: 'square', volume: 0.5 });
  tone({ frequency: 82, endFrequency: 41, duration: 0.4, type: 'sine', volume: 0.5, delay: 0.08 });
}

/** The exit door sliding open once all shards are held. */
export function playExitOpen() {
  tone({ frequency: 330, endFrequency: 660, duration: 0.4, type: 'sine', volume: 0.35 });
  tone({ frequency: 495, endFrequency: 990, duration: 0.4, type: 'sine', volume: 0.25, delay: 0.12 });
}

/** The little arpeggio on escaping unseen. */
export function playWin() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((frequency, index) => {
    tone({ frequency, duration: 0.3, volume: 0.45, delay: index * 0.11 });
  });
}

/** A short rising blip while a guard grows suspicious. */
export function playSuspicious() {
  tone({ frequency: 440, endFrequency: 620, duration: 0.14, type: 'triangle', volume: 0.3 });
}
