// SHADOW LEDGER — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  sneakSpeed: 95,
  dashSpeed: 320,
  dashTime: 0.18,
  dashCooldown: 0.9,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 72,
  suspiciousSpeed: 115,
  chaseSpeed: 150, // slower than your walk, so an alarm is escapable
  visionRange: 235,
  visionHalfAngle: 0.61, // ~35 degrees each side
  nearRadius: 34, // sees you up close no matter the angle
  pauseAtWaypoint: 1.6,
  lookAroundTime: 2.2,
  chaseMemory: 3.5, // seconds a guard keeps chasing after losing sight
};

export const DETECTION = {
  fillPerSecond: 64, // at point blank, scaled down with distance
  farScale: 0.35, // multiplier at max vision range
  shadowScale: 0.45, // standing in a shadow tile slows the fill
  fernRadius: 56, // inside a fern you are unseen beyond this distance
  decayPerSecond: 34, // how fast suspicion drains while hidden
  alarmAt: 100,
};

export const NOISE = {
  walkRadius: 46, // a walking step is heard only very close by
  dashRadius: 175,
  sneakRadius: 0,
  investigateTime: 4, // seconds a guard spends at a heard noise
};

export const GAME = {
  nerves: 3,
  shardsToWin: 3,
};

export const PALETTE = {
  backdrop: '#0b0e1a',
  floor: '#232838',
  floorAlt: '#202535',
  shadowFloor: '#171b2c',
  wall: '#3a4157',
  wallTop: '#4a5170',
  shelf: '#5a4632',
  shelfTop: '#7a5f43',
  fern: '#2e5d3a',
  fernTop: '#3f7d4f',
  shard: '#ffd76a',
  shardGlow: '#ffedb0',
  exit: '#59d8a5',
  exitLocked: '#5d6b7a',
  player: '#7fd4ff',
  playerSneak: '#5aa8d6',
  guard: '#ff6b5e',
  guardCalm: '#ffb454',
  coneCalm: 'rgba(255, 180, 84, 0.20)',
  coneSuspicious: 'rgba(255, 122, 48, 0.30)',
  coneAlert: 'rgba(255, 59, 48, 0.34)',
  coneEdge: 'rgba(255, 200, 110, 0.55)',
  noiseRing: 'rgba(255, 255, 255, 0.35)',
  darkness: 'rgba(4, 6, 14, 0.82)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  panel: '#171b2c',
  gold: '#ffd76a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best time is kept between visits (this browser only). */
export const BEST_KEY = 'shadow-ledger.best-ms';

// The archive floor. One character per tile, 32 columns x 18 rows:
//   # wall        . floor        , shadow floor (detection fills slower)
//   C shelf       f fern planter (walk through it, hidden inside)
//   1 2 3 shards  E exit         P player start
export const MAP = [
  '################################',
  '#..............................#',
  '#..P..........1...........E....#',
  '#..............................#',
  '#..CCCC....CCCC....CCCC....CCCC#',
  '#..CCCC....CCCC....CCCC....CCCC#',
  '#..............................#',
  '#.....,,,,,........,,,,........#',
  '#..CCCC....CCCC....CCCC....CCCC#',
  '#..CCCC....CCCC....CCCC....CCCC#',
  '#..............................#',
  '#......2.........f.........3...#',
  '#..............................#',
  '#..CCCC....CCCC....CCCC....CCCC#',
  '#..CCCC....CCCC....CCCC....CCCC#',
  '#..............................#',
  '#.....f.............,,,,,......#',
  '################################',
];

// Guard patrols: lists of tile waypoints, walked in order and back again.
// Each guard pauses at every waypoint, so a patrol can be learned.
export const PATROLS = [
  { name: 'Rook', waypoints: [[5, 3], [16, 3], [27, 3], [16, 3]] },
  { name: 'Bishop', waypoints: [[4, 10], [15, 10], [28, 10], [15, 10]] },
  { name: 'Knight', waypoints: [[9, 2], [9, 7], [9, 16], [9, 7]] },
  { name: 'Queen', waypoints: [[25, 2], [25, 7], [25, 16], [25, 7]] },
];
