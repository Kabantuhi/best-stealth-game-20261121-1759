// SHADOW LEDGER — the screenshot scenes behind ?shot=start|play|alarm|win.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot (breadth-first paths to the
// next objective, sneaking whenever a guard is near, patience at the edge of
// a guard's cone), so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { STEP, TILE } from './config.js';
import { EVENT_ALARM, EVENT_CAUGHT, findPath, stepWorld } from './world.js';
import { playerTile } from './player.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';

const SAMPLE = STEP;

/** The next shard the autopilot should go for, or null when all are taken. */
function nextShardTile(world) {
  const shard = world.shards.find((s) => !s.taken);
  if (!shard) return null;
  return { col: Math.floor(shard.x / TILE), row: Math.floor(shard.y / TILE) };
}

function exitTile(world) {
  return { col: Math.floor(world.exit.x / TILE), row: Math.floor(world.exit.y / TILE) };
}

/** The nearest guard to the player, in pixels. */
function nearestGuardDistance(world) {
  let best = Infinity;
  for (const guard of world.guards) {
    const d = Math.hypot(guard.x - world.player.x, guard.y - world.player.y);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Steer the player along a breadth-first path to a tile. Returns the input
 * for one step, or null when the path is finished or unreachable.
 */
function followPath(world, path) {
  if (!path || path.length === 0) return null;
  const player = world.player;
  // Skip points already reached.
  while (path.length > 0) {
    const point = path[0];
    if (Math.hypot(point.x - player.x, point.y - player.y) < 8) path.shift();
    else break;
  }
  if (path.length === 0) return null;
  const point = path[0];
  const dx = point.x - player.x;
  const dy = point.y - player.y;
  const distance = Math.hypot(dx, dy);
  // Sneak whenever a guard is close: quiet feet, slower suspicion.
  const sneak = nearestGuardDistance(world) < 170;
  return { x: dx / distance, y: dy / distance, sneak, dash: false };
}

function pathTo(world, tile) {
  const from = playerTile(world);
  return findPath(from.col, from.row, tile.col, tile.row);
}

function idleInput() {
  return { x: 0, y: 0, sneak: false, dash: false };
}

/**
 * Walk the autopilot to a tile, at most `limitSeconds` of game time. The
 * path is recomputed regularly, so a catch (which drops the courier back at
 * the entrance) does not leave it walking into a wall.
 */
function walkTo(world, tile, limitSeconds, dash = false) {
  let path = pathTo(world, tile);
  let steps = 0;
  const limit = Math.floor(limitSeconds / SAMPLE);
  while (steps < limit) {
    if (steps % 30 === 0) path = pathTo(world, tile);
    const input = followPath(world, path);
    if (!input) return true;
    input.dash = dash;
    stepWorld(world, input, SAMPLE);
    if (world.won || world.over) return false;
    steps += 1;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, alarm or win; any other name
 * is start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  // A fresh world, then the autopilot plays it forward.
  const fresh = world;
  if (name === 'start') {
    for (let i = 0; i < 4 / SAMPLE; i += 1) stepWorld(fresh, idleInput(), SAMPLE);
    fresh.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }

  if (name === 'win') {
    // Collect every shard, then walk out the exit.
    let guard = 0;
    while (guard < 4) {
      const tile = nextShardTile(fresh);
      if (!tile) break;
      if (!walkTo(fresh, tile, 90)) break;
      guard += 1;
    }
    if (!fresh.exitOpen) {
      fresh.screen = SCREEN_PLAY;
      return { screen: SCREEN_PLAY };
    }
    walkTo(fresh, exitTile(fresh), 90);
    fresh.screen = fresh.won ? SCREEN_WIN : SCREEN_PLAY;
    return { screen: fresh.won ? SCREEN_WIN : SCREEN_PLAY };
  }

  if (name === 'alarm') {
    // Take the first shard, then step onto Rook's patrol lane ahead of him.
    const first = nextShardTile(fresh);
    if (first) walkTo(fresh, first, 90);
    walkTo(fresh, { col: 20, row: 3 }, 90);
    // Wait in the lane until Rook is nearly sure of the courier, then pull
    // away east along the lane: the alarm trips while Rook closes from
    // behind, and the courier is already moving away from him.
    let waited = 0;
    while (fresh.detection < 80 && !fresh.alarm && waited < 10 / SAMPLE) {
      const events = stepWorld(fresh, idleInput(), SAMPLE);
      if (events & EVENT_CAUGHT) break;
      waited += 1;
    }
    let pulled = 0;
    while (!fresh.alarm && pulled < 3 / SAMPLE) {
      const events = stepWorld(fresh, { x: 1, y: 0, sneak: true, dash: false }, SAMPLE);
      if (events & EVENT_CAUGHT) break;
      pulled += 1;
    }
    if (!fresh.alarm && !fresh.over) {
      // Fallback: stand still at the east end until the alarm trips.
      let still = 0;
      while (!fresh.alarm && still < 5 / SAMPLE) {
        const events = stepWorld(fresh, idleInput(), SAMPLE);
        if (events & EVENT_CAUGHT) break;
        still += 1;
      }
    }
    if (fresh.alarm && !fresh.over) {
      // Dash east, away from the chase, for most of a second.
      let dashed = 0;
      while (dashed < 0.8 / SAMPLE) {
        stepWorld(fresh, { x: 1, y: 0, sneak: false, dash: true }, SAMPLE);
        if (fresh.over) break;
        dashed += 1;
      }
    }
    fresh.screen = fresh.over ? SCREEN_OVER : SCREEN_PLAY;
    return { screen: fresh.over ? SCREEN_OVER : SCREEN_PLAY };
  }

  // 'play': take the first shard, then linger one lane above Rook's patrol
  // until the guards are half sure of you, and slip one aisle south.
  const first = nextShardTile(fresh);
  if (first) walkTo(fresh, first, 90);
  walkTo(fresh, { col: 12, row: 2 }, 90);
  let waited = 0;
  while (fresh.detection < 45 && waited < 10 / SAMPLE) {
    const events = stepWorld(fresh, idleInput(), SAMPLE);
    if (events & EVENT_CAUGHT || fresh.alarm) break;
    if (nearestGuardDistance(fresh) < 90) break;
    waited += 1;
  }
  if (!fresh.over && !fresh.alarm) {
    walkTo(fresh, { col: 10, row: 6 }, 4);
  }
  fresh.screen = SCREEN_PLAY;
  return { screen: SCREEN_PLAY };
}

export { EVENT_ALARM, EVENT_CAUGHT };
