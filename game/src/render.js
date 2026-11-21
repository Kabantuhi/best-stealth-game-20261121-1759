// SHADOW LEDGER — the renderer: draws the archive, the guards and their
// cones of light, the courier, and the dark that hides them. One canvas,
// one logical field of 1280x720, scaled to the window.

import { COLS, FIELD, FONT, MAP, PALETTE, ROWS, TILE } from './config.js';
import { guardAlertLevel } from './guard.js';
import { GUARD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (tile === '#') continue; // walls are drawn later, on top
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x, y, TILE, TILE);
      if (tile === ',') {
        ctx.fillStyle = PALETTE.shadowFloor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(127, 212, 255, 0.05)';
        ctx.fillRect(x, y, TILE, 2);
      }
      // A faint grid line keeps the floor readable at a glance.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
    }
  }
}

function drawWallsAndCover(ctx) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = MAP[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (tile === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 5);
      } else if (tile === 'C') {
        ctx.fillStyle = PALETTE.shelf;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = PALETTE.shelfTop;
        ctx.fillRect(x + 3, y + 3, TILE - 6, 6);
        ctx.fillStyle = 'rgba(255, 215, 106, 0.16)';
        ctx.fillRect(x + 8, y + 14, TILE - 16, 3);
        ctx.fillRect(x + 8, y + 24, TILE - 16, 3);
      } else if (tile === 'f') {
        // A fern planter: a low round pot with leaves spilling over it.
        ctx.fillStyle = '#6b4a2f';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2 + 6, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.fern;
        for (let leaf = 0; leaf < 7; leaf += 1) {
          const angle = (leaf / 7) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            x + TILE / 2 + Math.cos(angle) * 9,
            y + TILE / 2 + Math.sin(angle) * 9 - 2,
            8, 4, angle, 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.fillStyle = PALETTE.fernTop;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2 - 2, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawShards(ctx, world, time) {
  for (const shard of world.shards) {
    if (shard.taken) continue;
    const bob = Math.sin(time * 2.4 + shard.x) * 3;
    const glow = ctx.createRadialGradient(shard.x, shard.y + bob, 2, shard.x, shard.y + bob, 34);
    glow.addColorStop(0, 'rgba(255, 215, 106, 0.5)');
    glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shard.x, shard.y + bob, 34, 0, Math.PI * 2);
    ctx.fill();
    // A little ledger: a gold diamond with lines, spinning slowly.
    ctx.save();
    ctx.translate(shard.x, shard.y + bob);
    ctx.rotate(Math.sin(time * 1.2 + shard.y) * 0.25);
    ctx.fillStyle = PALETTE.shard;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a6a1f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(4, -3);
    ctx.moveTo(-4, 1);
    ctx.lineTo(4, 1);
    ctx.moveTo(-4, 5);
    ctx.lineTo(2, 5);
    ctx.stroke();
    ctx.restore();
  }
}

function drawExit(ctx, world, time) {
  const { x, y } = world.exit;
  const open = world.exitOpen;
  const pulse = open ? 0.6 + Math.sin(time * 3) * 0.25 : 0.25;
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 52);
  glow.addColorStop(0, open ? `rgba(89, 216, 165, ${pulse})` : 'rgba(93, 107, 122, 0.3)');
  glow.addColorStop(1, 'rgba(89, 216, 165, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 52, 0, Math.PI * 2);
  ctx.fill();
  // A door frame with an arrow: green and open once the shards are held.
  ctx.strokeStyle = open ? PALETTE.exit : PALETTE.exitLocked;
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 18, y - 18, 36, 36);
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 8);
  ctx.lineTo(x + 8, y);
  ctx.lineTo(x - 8, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT OPEN' : `EXIT · ${world.shards.filter((s) => s.taken).length}/3`, x, y + 32);
}

/** A guard's cone of light, clipped by walls: sample the rim, cut it short. */
function drawVisionCone(ctx, world, guard) {
  const level = guardAlertLevel(world, guard);
  const colour = level === 'alert'
    ? PALETTE.coneAlert
    : level === 'suspicious'
      ? PALETTE.coneSuspicious
      : PALETTE.coneCalm;
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  for (let i = 0; i <= rays; i += 1) {
    const angle = guard.facing - GUARD.visionHalfAngle + (2 * GUARD.visionHalfAngle * i) / rays;
    let reach = GUARD.visionRange;
    // March out along the ray until a wall or shelf stops it.
    for (let d = 12; d <= GUARD.visionRange; d += 10) {
      const px = guard.x + Math.cos(angle) * d;
      const py = guard.y + Math.sin(angle) * d;
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS || MAP[row][col] === '#' || MAP[row][col] === 'C') {
        reach = d;
        break;
      }
    }
    ctx.lineTo(guard.x + Math.cos(angle) * reach, guard.y + Math.sin(angle) * reach);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.strokeStyle = PALETTE.coneEdge;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawGuard(ctx, world, guard, time) {
  drawVisionCone(ctx, world, guard);
  const level = guardAlertLevel(world, guard);
  // A walking figure: dark coat, a cap, and a flashlight dot ahead.
  const bob = Math.sin(time * 6 + guard.wobble) * 1.5;
  ctx.fillStyle = '#20242f';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, GUARD.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = level === 'alert' ? PALETTE.guard : level === 'suspicious' ? PALETTE.guardCalm : '#e8b25e';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y + bob * 0.3, GUARD.radius - 4, 0, Math.PI * 2);
  ctx.fill();
  // The eyes look where the guard looks.
  const eyeX = Math.cos(guard.facing) * 5;
  const eyeY = Math.sin(guard.facing) * 5;
  ctx.fillStyle = '#10131c';
  ctx.beginPath();
  ctx.arc(guard.x + eyeX - 3, guard.y + eyeY + bob * 0.3, 1.8, 0, Math.PI * 2);
  ctx.arc(guard.x + eyeX + 3, guard.y + eyeY + bob * 0.3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // A "?" over a suspicious guard, a "!" over a chasing one.
  if (level !== 'calm') {
    ctx.fillStyle = level === 'alert' ? '#ff3b30' : '#ff7a30';
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(level === 'alert' ? '!' : '?', guard.x, guard.y - GUARD.radius - 6 + bob * 0.3);
  }
}

function drawPlayer(ctx, world, time) {
  const player = world.player;
  const bob = player.moving ? Math.sin(time * (player.dashing ? 18 : player.sneaking ? 6 : 11)) * 1.5 : 0;
  // A soft glow so the courier reads against the dark floor.
  const glow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 42);
  glow.addColorStop(0, 'rgba(127, 212, 255, 0.35)');
  glow.addColorStop(1, 'rgba(127, 212, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 42, 0, Math.PI * 2);
  ctx.fill();
  // A hooded figure: dark cloak, a pale face, a small satchel.
  ctx.fillStyle = '#1c2438';
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob * 0.3, player.radius - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4ede0';
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 4, player.y + Math.sin(player.facing) * 4 + bob * 0.3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  // The dash leaves a short trail.
  if (player.dashing) {
    ctx.strokeStyle = 'rgba(127, 212, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x - Math.cos(player.facing) * 26, player.y - Math.sin(player.facing) * 26);
    ctx.lineTo(player.x - Math.cos(player.facing) * 8, player.y - Math.sin(player.facing) * 8);
    ctx.stroke();
  }
  // A ring while hidden in a fern, so the player knows they are unseen.
  if (player.hiddenInFern) {
    ctx.strokeStyle = 'rgba(63, 125, 79, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawNoiseRings(ctx, world) {
  for (const ring of world.noiseRings) {
    const progress = ring.age / 0.9;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (1 - progress)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius * (0.4 + 0.6 * progress), 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** The dark that makes the archive feel like night, cut by cones and lamps.
 *  It is painted on a canvas of its own, holes punched out of it, and then
 *  laid over the scene: punching holes in the main canvas would erase the
 *  floor and the guards underneath. */
let darkCanvas = null;
let darkCtx = null;

function drawDarkness(ctx, world) {
  if (!darkCanvas) {
    darkCanvas = document.createElement('canvas');
    darkCanvas.width = FIELD.width;
    darkCanvas.height = FIELD.height;
    darkCtx = darkCanvas.getContext('2d');
  }
  darkCtx.clearRect(0, 0, FIELD.width, FIELD.height);
  darkCtx.fillStyle = PALETTE.darkness;
  darkCtx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Punch holes of light where the guards look, around the courier, and
  // over the shards and the exit.
  darkCtx.globalCompositeOperation = 'destination-out';
  for (const guard of world.guards) {
    const gradient = darkCtx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, GUARD.visionRange * 0.85);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    darkCtx.fillStyle = gradient;
    darkCtx.beginPath();
    darkCtx.moveTo(guard.x, guard.y);
    darkCtx.arc(guard.x, guard.y, GUARD.visionRange * 0.85, guard.facing - GUARD.visionHalfAngle, guard.facing + GUARD.visionHalfAngle);
    darkCtx.closePath();
    darkCtx.fill();
  }
  const player = world.player;
  const playerGlow = darkCtx.createRadialGradient(player.x, player.y, 8, player.x, player.y, 120);
  playerGlow.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  playerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  darkCtx.fillStyle = playerGlow;
  darkCtx.beginPath();
  darkCtx.arc(player.x, player.y, 120, 0, Math.PI * 2);
  darkCtx.fill();
  for (const shard of world.shards) {
    if (shard.taken) continue;
    darkCtx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    darkCtx.beginPath();
    darkCtx.arc(shard.x, shard.y, 46, 0, Math.PI * 2);
    darkCtx.fill();
  }
  const exitGlow = darkCtx.createRadialGradient(world.exit.x, world.exit.y, 8, world.exit.x, world.exit.y, 70);
  exitGlow.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  exitGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  darkCtx.fillStyle = exitGlow;
  darkCtx.beginPath();
  darkCtx.arc(world.exit.x, world.exit.y, 70, 0, Math.PI * 2);
  darkCtx.fill();
  darkCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);
}

function drawHud(ctx, world) {
  const taken = world.shards.filter((s) => s.taken).length;
  // A slim top bar: shards, alarm meter, nerves, time.
  ctx.fillStyle = 'rgba(11, 14, 26, 0.85)';
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`◆ SHARDS ${taken}/${world.shards.length}`, 16, 28);
  // The alarm meter: green to red as it fills.
  const meterX = 220;
  const meterWidth = 260;
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(meterX, 14, meterWidth, 16);
  const fill = world.detection / 100;
  ctx.fillStyle = fill < 0.5 ? '#59d8a5' : fill < 0.8 ? '#ffb454' : '#ff3b30';
  ctx.fillRect(meterX, 14, meterWidth * fill, 16);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.strokeRect(meterX + 0.5, 14.5, meterWidth, 16);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(world.alarm ? 'ALARM!' : 'SEEN', meterX + meterWidth + 10, 27);
  // Nerves as hearts.
  ctx.textAlign = 'right';
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < world.nerves ? '♥ ' : '♡ ';
  ctx.fillStyle = '#ff6b7a';
  ctx.font = '16px sans-serif';
  ctx.fillText(hearts, FIELD.width - 180, 28);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `13px ${FONT}`;
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.fillText(`${minutes}:${seconds}`, FIELD.width - 16, 27);
  // A hint line at the bottom, fading after the first seconds.
  if (world.time < 9) {
    ctx.globalAlpha = Math.max(0, 1 - (world.time - 6) / 3);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows to move · Shift to sneak · Space to dash · click to walk there · M to mute', FIELD.width / 2, FIELD.height - 12);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(7, 9, 18, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText('SHADOW LEDGER', FIELD.width / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `22px ${FONT}`;
  ctx.fillText('A quiet heist in the Meridian Archive', FIELD.width / 2, 292);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `16px ${FONT}`;
  ctx.fillText('Take the 3 glowing ledger shards. Stay out of the guards’ cones.', FIELD.width / 2, 330);
  ctx.fillText('Shelves block their sight. Ferns hide you. Shadows slow their suspicion.', FIELD.width / 2, 356);
  ctx.fillText('When all 3 shards are yours, the exit opens — reach it unseen.', FIELD.width / 2, 382);
  ctx.fillStyle = PALETTE.player;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText('Press ENTER or click to begin', FIELD.width / 2, 440);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `14px ${FONT}`;
  ctx.fillText('WASD / arrows move · Shift sneak · Space dash · click to walk · R restart · M mute', FIELD.width / 2, 478);
}

function drawEnd(ctx, world, won) {
  ctx.fillStyle = won ? 'rgba(7, 20, 14, 0.78)' : 'rgba(20, 7, 10, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  if (won) {
    const minutes = Math.floor(world.time / 60);
    const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
    ctx.fillStyle = PALETTE.exit;
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillText('CLEAN GETAWAY', FIELD.width / 2, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`All 3 shards, unseen, in ${minutes}:${seconds} — with ${world.nerves} nerve${world.nerves === 1 ? '' : 's'} to spare.`, FIELD.width / 2, 348);
    if (world.bestMs !== null) {
      const bestSeconds = Math.floor(world.bestMs / 1000);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `15px ${FONT}`;
      ctx.fillText(`Best escape: ${Math.floor(bestSeconds / 60)}:${String(bestSeconds % 60).padStart(2, '0')}`, FIELD.width / 2, 382);
    }
  } else {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillText('CAUGHT', FIELD.width / 2, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    ctx.fillText('The archive keeps its ledgers tonight. The guards know your face now.', FIELD.width / 2, 348);
  }
  ctx.fillStyle = PALETTE.player;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText('Press R or ENTER to try again', FIELD.width / 2, 440);
}

/** Draw the whole frame for the world's current screen. */
export function render(ctx, world, time) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  drawFloor(ctx);
  drawShards(ctx, world, time);
  drawExit(ctx, world, time);
  drawWallsAndCover(ctx);
  for (const guard of world.guards) drawGuard(ctx, world, guard, time);
  drawPlayer(ctx, world, time);
  drawNoiseRings(ctx, world);
  drawDarkness(ctx, world);
  // A red flash when the courier is grabbed.
  if (world.caughtFlash > 0) {
    ctx.fillStyle = `rgba(255, 59, 48, ${world.caughtFlash * 0.35})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  if (world.screen === SCREEN_PLAY) drawHud(ctx, world);
  else if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  else if (world.screen === SCREEN_WIN) drawEnd(ctx, world, true);
  else if (world.screen === SCREEN_OVER) drawEnd(ctx, world, false);
}
