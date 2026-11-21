// SHADOW LEDGER — the player: Wren, the courier. Moves, sneaks, dashes,
// and makes noise the guards can hear.

import { DETECTION, GAME, NOISE, PLAYER, STEP, TILE } from './config.js';
import { isFern, isShadow, moveCircle, tileAtPoint } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER.radius,
    // Facing angle, for the little torch dot and the dash trail.
    facing: 0,
    sneaking: false,
    dashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    moving: false,
    // A click-to-move target, set by a mouse click; null when walking by keys.
    clickTarget: null,
    noiseTimer: 0,
    // Footstep timing, for the sound and the dust puffs.
    stepTimer: 0,
    // Set for one step when a footstep lands; main.js plays the sound.
    justStepped: false,
    // True while standing inside a fern planter.
    hiddenInFern: false,
    // True while standing on a shadow tile.
    inShadow: false,
  };
}

/**
 * Move the player one step. `input` is { x, y, sneak, dash } where x and y
 * are -1..1 and sneak/dash are booleans. Returns an event bitmask.
 */
export function stepPlayer(world, input, dt = STEP) {
  const player = world.player;
  if (world.won || world.over) return 0;
  let events = 0;

  // A click target steers the player until it is reached or a key is pressed.
  let moveX = input.x;
  let moveY = input.y;
  if ((moveX !== 0 || moveY !== 0) && player.clickTarget) player.clickTarget = null;
  if (player.clickTarget && moveX === 0 && moveY === 0) {
    const dx = player.clickTarget.x - player.x;
    const dy = player.clickTarget.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) {
      player.clickTarget = null;
    } else {
      moveX = dx / distance;
      moveY = dy / distance;
    }
  }

  const length = Math.hypot(moveX, moveY);
  if (length > 1) {
    moveX /= length;
    moveY /= length;
  }
  player.moving = length > 0.05;

  // Sneaking is slow and silent; dashing is fast and loud.
  player.sneaking = Boolean(input.sneak) && !player.dashing;
  if (input.dash && player.dashCooldown <= 0 && player.moving && !player.dashing) {
    player.dashing = true;
    player.dashTimer = PLAYER.dashTime;
    player.dashCooldown = PLAYER.dashCooldown;
    emitNoise(world, NOISE.dashRadius);
    events |= 16; // EVENT_NOISE
  }
  if (player.dashTimer > 0) player.dashTimer -= dt;
  else player.dashing = false;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;

  const speed = player.dashing
    ? PLAYER.dashSpeed
    : player.sneaking
      ? PLAYER.sneakSpeed
      : PLAYER.walkSpeed;
  const moved = moveCircle(player.x, player.y, player.radius, moveX * speed * dt, moveY * speed * dt);
  player.x = moved.x;
  player.y = moved.y;
  if (player.moving) player.facing = Math.atan2(moveY, moveX);

  // Footsteps: walking and dashing make noise on a steady beat.
  player.stepTimer -= dt;
  if (player.moving && player.stepTimer <= 0) {
    player.stepTimer = player.dashing ? 0.16 : player.sneaking ? 0 : 0.42;
    player.justStepped = true;
    if (!player.sneaking) {
      emitNoise(world, NOISE.walkRadius);
      events |= 16; // EVENT_NOISE
    }
  }

  const tile = tileAtPoint(player.x, player.y);
  player.hiddenInFern = isFern(tile);
  player.inShadow = isShadow(tile);

  return events;
}

/** Drop a noise ring at the player's feet for guards (and the eye) to notice. */
function emitNoise(world, radius) {
  if (radius <= 0) return;
  world.noise = { x: world.player.x, y: world.player.y, radius, age: 0 };
  world.noiseRings.push({ x: world.player.x, y: world.player.y, radius, age: 0 });
}

/** How hidden the player is right now: 1 means fully hidden from sight. */
export function playerConcealment(world) {
  const player = world.player;
  if (player.hiddenInFern) return 1;
  if (player.inShadow) return DETECTION.shadowScale;
  return 0;
}

/** The player's tile, for the autopilot and the guard's memory. */
export function playerTile(world) {
  return {
    col: Math.floor(world.player.x / TILE),
    row: Math.floor(world.player.y / TILE),
  };
}

export { GAME };
