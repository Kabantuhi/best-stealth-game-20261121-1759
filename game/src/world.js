// SHADOW LEDGER — the world: the archive floor, its state, and the rules
// that move it forward one fixed step at a time. No drawing here, no input.

import { COLS, FIELD, MAP, PATROLS, ROWS, STEP, TILE } from './config.js';
import { makeRandom } from './random.js';
import { createPlayer, stepPlayer } from './player.js';
import { createGuard, stepGuard } from './guard.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** A tile blocks movement and sight when it is a wall or a shelf. */
export function isSolid(tile) {
  return tile === '#' || tile === 'C';
}

/** A fern tile hides whoever stands in it. */
export function isFern(tile) {
  return tile === 'f';
}

/** A shadow tile slows detection while you stand on it. */
export function isShadow(tile) {
  return tile === ',';
}

export function tileAt(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return MAP[row][col];
}

export function tileAtPoint(x, y) {
  return tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
}

/** True when the straight line between two points crosses no solid tile. */
export function hasLineOfSight(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (isSolid(tileAtPoint(x0 + dx * t, y0 + dy * t))) return false;
  }
  return true;
}

/** Circle-vs-solid-tiles collision: slide along walls, never sink into one. */
export function moveCircle(x, y, radius, dx, dy) {
  let nextX = x + dx;
  if (circleHitsSolid(nextX, y, radius)) nextX = x;
  let nextY = y + dy;
  if (circleHitsSolid(nextX, nextY, radius)) nextY = y;
  return { x: nextX, y: nextY };
}

function circleHitsSolid(x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);
  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (!isSolid(tileAt(col, row))) continue;
      const closestX = Math.max(col * TILE, Math.min(x, col * TILE + TILE));
      const closestY = Math.max(row * TILE, Math.min(y, row * TILE + TILE));
      if ((x - closestX) ** 2 + (y - closestY) ** 2 < radius * radius) return true;
    }
  }
  return false;
}

/** The nearest walkable tile centre to a point (breadth-first, for the autopilot). */
export function nearestWalkableTile(x, y) {
  const startCol = Math.floor(x / TILE);
  const startRow = Math.floor(y / TILE);
  const seen = new Set([`${startCol},${startRow}`]);
  const queue = [[startCol, startRow]];
  while (queue.length > 0) {
    const [col, row] = queue.shift();
    if (!isSolid(tileAt(col, row))) return { col, row };
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${col + dc},${row + dr}`;
      if (!seen.has(key)) {
        seen.add(key);
        queue.push([col + dc, row + dr]);
      }
    }
  }
  return { col: startCol, row: startRow };
}

/** A path of tile centres from one tile to another, avoiding solid tiles. */
export function findPath(fromCol, fromRow, toCol, toRow) {
  const startKey = `${fromCol},${fromRow}`;
  const goalKey = `${toCol},${toRow}`;
  const cameFrom = new Map([[startKey, null]]);
  const queue = [[fromCol, fromRow]];
  while (queue.length > 0) {
    const [col, row] = queue.shift();
    const key = `${col},${row}`;
    if (key === goalKey) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nextCol = col + dc;
      const nextRow = row + dr;
      const nextKey = `${nextCol},${nextRow}`;
      if (cameFrom.has(nextKey) || isSolid(tileAt(nextCol, nextRow))) continue;
      cameFrom.set(nextKey, key);
      queue.push([nextCol, nextRow]);
    }
  }
  if (!cameFrom.has(goalKey)) return null;
  const path = [];
  let key = goalKey;
  while (key !== null) {
    const [col, row] = key.split(',').map(Number);
    path.unshift({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
    key = cameFrom.get(key);
  }
  return path;
}

export function createWorld(seed = 1) {
  const random = makeRandom(seed);
  const shards = [];
  let playerStart = { x: TILE * 2.5, y: TILE * 2.5 };
  let exit = { x: TILE * 26.5, y: TILE * 2.5 };
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = MAP[row][col];
      const centre = { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
      if (tile === 'P') playerStart = centre;
      if (tile === 'E') exit = centre;
      if (tile === '1' || tile === '2' || tile === '3') {
        shards.push({ x: centre.x, y: centre.y, taken: false, id: tile });
      }
    }
  }
  const guards = PATROLS.map((patrol) => createGuard(patrol, random));
  return {
    random,
    time: 0,
    screen: SCREEN_TITLE,
    player: createPlayer(playerStart),
    guards,
    shards,
    exit,
    exitOpen: false,
    detection: 0, // 0..100, the shared alarm meter
    alarm: false,
    alarmTimer: 0,
    nerves: 3,
    caughtFlash: 0,
    won: false,
    over: false,
    bestMs: null,
    // The last noise the player made, for guards to investigate.
    noise: null,
    // A short trail of recent noise rings, for the renderer.
    noiseRings: [],
  };
}

export function resetWorld(world) {
  const fresh = createWorld(1);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}

/**
 * Advance the world one fixed step. `input` carries the player's move vector
 * (x, y, each -1..1), whether they sneak, and whether they dash.
 * Returns a bitmask of events: see the EVENT_ constants below.
 */
export const EVENT_NONE = 0;
export const EVENT_SHARD = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_WIN = 4;
export const EVENT_ALARM = 8;
export const EVENT_NOISE = 16;

export function stepWorld(world, input, dt = STEP) {
  if (world.won || world.over) return EVENT_NONE;
  world.time += dt;
  let events = EVENT_NONE;

  const playerEvents = stepPlayer(world, input, dt);
  events |= playerEvents;

  for (const guard of world.guards) {
    events |= stepGuard(world, guard, dt);
  }

  // The alarm meter drains while nobody sees you; at full it trips the alarm.
  if (!world.alarm) {
    if (events & EVENT_ALARM) {
      world.alarm = true;
      world.alarmTimer = 0;
    }
  } else {
    world.alarmTimer += dt;
    if (world.alarmTimer > 6) {
      world.alarm = false;
      world.detection = 40;
    }
  }

  if (world.caughtFlash > 0) world.caughtFlash = Math.max(0, world.caughtFlash - dt);

  // Shards: walk over one to take it; the exit opens when all three are held.
  for (const shard of world.shards) {
    if (shard.taken) continue;
    const dx = shard.x - world.player.x;
    const dy = shard.y - world.player.y;
    if (dx * dx + dy * dy < (TILE * 0.7) ** 2) {
      shard.taken = true;
      events |= EVENT_SHARD;
      if (world.shards.every((s) => s.taken)) world.exitOpen = true;
    }
  }

  if (world.exitOpen && !world.won) {
    const dx = world.exit.x - world.player.x;
    const dy = world.exit.y - world.player.y;
    if (dx * dx + dy * dy < (TILE * 0.8) ** 2) {
      world.won = true;
      world.screen = SCREEN_WIN;
      events |= EVENT_WIN;
    }
  }

  // Noise rings fade out, and the last noise ages once per step.
  world.noiseRings = world.noiseRings.filter((ring) => {
    ring.age += dt;
    return ring.age < 0.9;
  });
  if (world.noise) {
    world.noise.age += dt;
    if (world.noise.age > 1) world.noise = null;
  }

  return events;
}

/** The world as a plain summary for the HUD and the title screen. */
export function worldSummary(world) {
  return {
    shards: world.shards.filter((s) => s.taken).length,
    totalShards: world.shards.length,
    detection: Math.round(world.detection),
    alarm: world.alarm,
    nerves: world.nerves,
    exitOpen: world.exitOpen,
    time: world.time,
  };
}

export { FIELD, TILE };
