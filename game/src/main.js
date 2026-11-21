// SHADOW LEDGER — the entry point: opens the canvas, runs the loop, and
// wires input, sound and screens together. With ?shot=<name> it stages one
// deterministic scene and holds it still, so a screenshot is a real render
// of the game's own code.

import { BEST_KEY, FIELD, STEP } from './config.js';
import {
  SCREEN_OVER,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createWorld,
  resetWorld,
  stepWorld,
} from './world.js';
import { render } from './render.js';
import { createInput, readInput } from './input.js';
import {
  ensureAudio,
  playAlarm,
  playCaught,
  playExitOpen,
  playFootstep,
  playShard,
  playSuspicious,
  playWin,
} from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

const world = createWorld(seed);
const input = createInput(canvas);
let muted = false;
let frozen = false; // in shot mode the staged frame never advances
let lastSuspicionBlip = 0;

try {
  const stored = Number(window.localStorage.getItem(BEST_KEY));
  if (Number.isFinite(stored) && stored > 0) world.bestMs = stored;
} catch {
  // Private mode or no storage: the best time simply does not persist.
}

if (shotName) {
  stageShot(shotName, world);
  frozen = true;
  document.title = `SHADOW LEDGER — ${shotName}`;
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function startGame() {
  ensureAudio();
  resetWorld(world);
  world.screen = SCREEN_PLAY;
  announce('The heist begins. Take the 3 ledger shards, then reach the exit unseen.');
}

let accumulator = 0;
let lastTime = performance.now();

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  const frameInput = readInput(input);

  if (frameInput.mutePressed) muted = !muted;

  if (frameInput.click && world.screen === SCREEN_TITLE) {
    startGame();
  } else if (frameInput.click && world.screen === SCREEN_PLAY) {
    // A click on the field walks the courier there.
    world.player.clickTarget = { x: frameInput.click.x, y: frameInput.click.y };
  }
  if (frameInput.confirm) {
    if (world.screen === SCREEN_TITLE) startGame();
    else if (world.screen === SCREEN_WIN || world.screen === SCREEN_OVER) startGame();
  }
  if (frameInput.restart && world.screen !== SCREEN_TITLE) startGame();

  if (!frozen && world.screen === SCREEN_PLAY) {
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 5) {
      accumulator -= STEP;
      guard += 1;
      const wasAlarm = world.alarm;
      const wasExitOpen = world.exitOpen;
      const events = stepWorld(world, frameInput, STEP);
      if (!muted) {
        if (events & 1) playShard(); // EVENT_SHARD
        if (events & 8 && !wasAlarm) playAlarm(); // EVENT_ALARM
        if (events & 2) playCaught(); // EVENT_CAUGHT
        if (events & 4) playWin(); // EVENT_WIN
        if (!wasExitOpen && world.exitOpen) playExitOpen();
        if (world.player.justStepped) {
          world.player.justStepped = false;
          playFootstep(world.player.sneaking, world.player.dashing);
        }
        const mostSuspicious = Math.max(0, ...world.guards.map((g) => g.suspicion));
        if (mostSuspicious > 0.6 && now - lastSuspicionBlip > 1200) {
          lastSuspicionBlip = now;
          playSuspicious();
        }
      }
      if (world.won) {
        const ms = Math.round(world.time * 1000);
        if (world.bestMs === null || ms < world.bestMs) {
          world.bestMs = ms;
          try {
            window.localStorage.setItem(BEST_KEY, String(ms));
          } catch {
            // No storage: the best time is forgotten, the win still counts.
          }
        }
        announce(`Clean getaway in ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}.`);
      }
      if (world.over) announce('Caught. The archive keeps its ledgers tonight.');
    }
    if (guard === 5) accumulator = 0;
  }

  render(ctx, world, world.time);
  requestAnimationFrame(frame);
}

announce('Shadow Ledger: a quiet heist in the Meridian Archive. Press Enter to begin.');
requestAnimationFrame(frame);
