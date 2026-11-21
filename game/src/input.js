// SHADOW LEDGER — input: keyboard and mouse, turned into one move vector.
// WASD or arrows to walk, Shift to sneak, Space to dash, click to walk there.

import { FIELD } from './config.js';

const KEY_DIRECTIONS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    x: 0,
    y: 0,
    sneak: false,
    dash: false,
    // Set for one frame when the player presses Space.
    dashPressed: false,
    // Set for one frame when the player clicks the field.
    click: null,
    // Set for one frame on Enter (start / restart) and KeyR (restart).
    confirm: false,
    restart: false,
    // Set for one frame on KeyM (mute toggle).
    mutePressed: false,
  };

  function recompute() {
    let x = 0;
    let y = 0;
    for (const key of keys) {
      const direction = KEY_DIRECTIONS[key];
      if (direction) {
        x += direction[0];
        y += direction[1];
      }
    }
    state.x = x;
    state.y = y;
    state.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space') {
      state.dashPressed = true;
      event.preventDefault();
    }
    if (event.code === 'Enter') state.confirm = true;
    if (event.code === 'KeyR') state.restart = true;
    if (event.code === 'KeyM') state.mutePressed = true;
    if (KEY_DIRECTIONS[event.code] || event.code.startsWith('Shift')) {
      keys.add(event.code);
      recompute();
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    recompute();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    recompute();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    state.click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });

  return state;
}

/** Read the frame's input and clear the one-frame flags. */
export function readInput(state) {
  const frame = {
    x: state.x,
    y: state.y,
    sneak: state.sneak,
    dash: state.dashPressed,
    click: state.click,
    confirm: state.confirm,
    restart: state.restart,
    mutePressed: state.mutePressed,
  };
  state.dashPressed = false;
  state.click = null;
  state.confirm = false;
  state.restart = false;
  state.mutePressed = false;
  return frame;
}
