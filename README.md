# SHADOW LEDGER — a quiet heist

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Kabantuhi/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Kabantuhi/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down stealth game for the [make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).
You are Wren, a courier slipping through the Meridian Archive at night: take
the 3 glowing ledger shards, stay out of the guards' vision cones, hide
behind shelves and inside fern planters, and reach the exit unseen.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slow, silent, harder to spot)
- **Space** — dash (fast, loud: guards hear it)
- **Click** — walk to that spot
- **R** — restart, **M** — mute, **Enter** — start

Guards patrol loops you can learn. Their cones turn from gold to orange to
red as they grow sure of you; the alarm meter drains while you stay hidden,
so a near miss is a chance to recover, not a sentence. Walking and dashing
make noise rings the guards come to investigate. Three nerves: get caught
three times and the archive keeps its ledgers.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files.

## Layout

- `game/index.html` — the page and its canvas
- `game/src/config.js` — tuning numbers, colours, and the archive floor
- `game/src/world.js` — the world state and its fixed-step rules
- `game/src/player.js` — the courier: move, sneak, dash, noise
- `game/src/guard.js` — the guards: patrol, suspicion, chase
- `game/src/render.js` — drawing: floor, cones, darkness, HUD, screens
- `game/src/audio.js` — procedural Web Audio sounds (no audio files)
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — the deterministic screenshot scenes
- `game/src/main.js` — the entry point and game loop
- `main.ts` — the hand-in program (copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json`)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
