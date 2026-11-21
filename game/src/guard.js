// SHADOW LEDGER — the guards. Each one walks a patrol loop, pauses at its
// waypoints, and watches a cone of light ahead of it. What it sees feeds the
// shared alarm meter; what it hears sends it to investigate.

import { DETECTION, GUARD, NOISE, TILE } from './config.js';
import { hasLineOfSight, moveCircle, tileAtPoint } from './world.js';
import { isFern } from './world.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';

export function createGuard(patrol, random) {
  const start = patrol.waypoints[0];
  const next = patrol.waypoints[1] ?? patrol.waypoints[0];
  return {
    name: patrol.name,
    waypoints: patrol.waypoints.map(([col, row]) => ({
      x: col * TILE + TILE / 2,
      y: row * TILE + TILE / 2,
    })),
    waypointIndex: 1,
    x: start[0] * TILE + TILE / 2,
    y: start[1] * TILE + TILE / 2,
    facing: Math.atan2(next[1] - start[1], next[0] - start[0]),
    state: GUARD_PATROL,
    pauseTimer: 0,
    lookTimer: 0,
    lookFrom: 0,
    lookTo: 0,
    // Where the guard is headed when suspicious or returning.
    target: null,
    targetTimer: 0,
    // The last place the guard saw (or heard) the player.
    lastSeen: null,
    memoryTimer: 0,
    // How sure this guard is, 0..1: colours its cone.
    suspicion: 0,
    // A little wobble so patrols do not look robotic.
    wobble: random() * Math.PI * 2,
    stepTimer: 0,
    // Seconds until this guard will follow another noise.
    hearingCooldown: 0,
  };
}

/** Angle difference wrapped to -PI..PI. */
function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Can this guard see the player right now? The player must be inside the
 * cone (or very close), in line of sight, and not hidden in a fern.
 */
export function guardSeesPlayer(world, guard) {
  const player = world.player;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.visionRange) return 0;
  if (distance > GUARD.nearRadius) {
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(angle, guard.facing)) > GUARD.visionHalfAngle) return 0;
  }
  if (!hasLineOfSight(guard.x, guard.y, player.x, player.y)) return 0;
  if (player.hiddenInFern && distance > DETECTION.fernRadius) return 0;
  // Closer is clearer: 1 at point blank, farScale at the edge of the cone.
  const closeness = 1 - distance / GUARD.visionRange;
  let strength = DETECTION.farScale + (1 - DETECTION.farScale) * closeness;
  if (player.inShadow) strength *= DETECTION.shadowScale;
  if (player.sneaking) strength *= 0.7;
  // Dashing is fast and loud — and easier to spot.
  if (player.dashing) strength *= 1.4;
  return strength;
}

/** Move toward a point at a speed, facing the way it walks. */
function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return true;
  const step = Math.min(distance, speed * dt);
  const moved = moveCircle(guard.x, guard.y, GUARD.radius, (dx / distance) * step, (dy / distance) * step);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.facing = Math.atan2(dy, dx);
  return distance <= step + 1;
}

export function stepGuard(world, guard, dt) {
  const player = world.player;
  let events = 0;
  const seen = guardSeesPlayer(world, guard);

  // What the guard sees feeds the shared alarm meter.
  if (seen > 0) {
    world.detection = Math.min(100, world.detection + DETECTION.fillPerSecond * seen * dt);
    guard.suspicion = Math.min(1, guard.suspicion + dt * 1.4);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.memoryTimer = GUARD.chaseMemory;
    if (world.detection >= DETECTION.alarmAt && !world.alarm) {
      events |= 8; // EVENT_ALARM
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - dt * 0.5);
    if (guard.memoryTimer > 0) guard.memoryTimer -= dt;
  }

  // A fresh noise pulls a patrolling guard over to listen, but not twice
  // in a row: it follows one trail, looks, and walks back first.
  if (guard.hearingCooldown > 0) guard.hearingCooldown -= dt;
  const noise = world.noise;
  if (
    noise &&
    noise.age < 0.4 &&
    guard.state === GUARD_PATROL &&
    guard.hearingCooldown <= 0 &&
    Math.hypot(noise.x - guard.x, noise.y - guard.y) < noise.radius + 40
  ) {
    guard.state = GUARD_SUSPICIOUS;
    guard.target = { x: noise.x, y: noise.y };
    guard.targetTimer = NOISE.investigateTime;
    guard.hearingCooldown = NOISE.investigateTime + 2;
  }
  // (world.js ages the noise once per step; here we only read it.)

  switch (guard.state) {
    case GUARD_PATROL: {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        // Look around a little while waiting at a waypoint.
        guard.facing += Math.sin(world.time * 1.3 + guard.wobble) * 0.35 * dt;
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, target, GUARD.patrolSpeed, dt)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = GUARD.pauseAtWaypoint;
      }
      break;
    }
    case GUARD_SUSPICIOUS: {
      if (guard.target) {
        if (moveToward(guard, guard.target, GUARD.suspiciousSpeed, dt)) {
          // Arrived: look around, then give up and walk back.
          guard.lookTimer += dt;
          guard.facing += Math.sin(world.time * 2.1 + guard.wobble) * 0.9 * dt;
          if (guard.lookTimer > GUARD.lookAroundTime) {
            guard.state = GUARD_RETURN;
            guard.lookTimer = 0;
            guard.target = null;
          }
        } else {
          guard.targetTimer -= dt;
          if (guard.targetTimer <= 0) {
            guard.state = GUARD_RETURN;
            guard.target = null;
          }
        }
      } else {
        guard.state = GUARD_RETURN;
      }
      break;
    }
    case GUARD_CHASE: {
      const target = guard.lastSeen ?? { x: player.x, y: player.y };
      moveToward(guard, target, GUARD.chaseSpeed, dt);
      if (guard.memoryTimer <= 0 && seen <= 0) {
        guard.state = GUARD_RETURN;
      }
      break;
    }
    case GUARD_RETURN: {
      // Walk back to the nearest waypoint, then resume the patrol.
      let nearest = guard.waypoints[0];
      let nearestDistance = Infinity;
      for (const waypoint of guard.waypoints) {
        const d = Math.hypot(waypoint.x - guard.x, waypoint.y - guard.y);
        if (d < nearestDistance) {
          nearestDistance = d;
          nearest = waypoint;
        }
      }
      if (moveToward(guard, nearest, GUARD.patrolSpeed, dt)) {
        guard.waypointIndex = guard.waypoints.indexOf(nearest);
        guard.state = GUARD_PATROL;
        guard.pauseTimer = 0.5;
      }
      break;
    }
    default:
      break;
  }

  // The alarm sends every guard after the player.
  if (world.alarm && guard.state !== GUARD_CHASE) {
    guard.state = GUARD_CHASE;
  }
  if (!world.alarm && guard.state === GUARD_CHASE) {
    guard.state = GUARD_RETURN;
  }

  // Caught: a guard (or the alarm's chase) touches the player.
  const touchDistance = GUARD.radius + player.radius - 2;
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  if (dx * dx + dy * dy < touchDistance * touchDistance && !world.won && !world.over) {
    world.nerves -= 1;
    world.caughtFlash = 0.7;
    world.detection = 0;
    world.alarm = false;
    events |= 2; // EVENT_CAUGHT
    if (world.nerves <= 0) {
      world.over = true;
      world.screen = 'over';
    } else {
      // Startled, the courier scrambles back to the entrance; the guards
      // lose the trail and walk back to their patrols.
      const start = { x: TILE * 3.5, y: TILE * 2.5 };
      player.x = start.x;
      player.y = start.y;
      player.clickTarget = null;
      for (const other of world.guards) {
        other.state = GUARD_RETURN;
        other.lastSeen = null;
        other.memoryTimer = 0;
        other.suspicion = 0;
      }
    }
  }

  // Footstep timing for the guard's own soft steps.
  guard.stepTimer -= dt;
  if (guard.stepTimer <= 0) guard.stepTimer = 0.42;

  return events;
}

/** The cone's colour state: calm, suspicious, or chasing. */
export function guardAlertLevel(world, guard) {
  if (world.alarm || guard.state === GUARD_CHASE) return 'alert';
  if (guard.suspicion > 0.25 || guard.state === GUARD_SUSPICIOUS) return 'suspicious';
  return 'calm';
}

export { tileAtPoint, isFern };
