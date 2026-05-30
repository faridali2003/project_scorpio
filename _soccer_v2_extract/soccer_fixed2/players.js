import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  PLAYER_RADIUS,
  MAX_SPRINT,
  MAX_JOG,
  BALL_RADIUS,
  PENALTY_BOX_DEPTH,
  PENALTY_BOX_WIDTH,
  TEAM_HOME,
  TEAM_AWAY,
  attackingSign,
  inPitch,
} from './pitchConstants';
import { playerBallCollision } from './ballPhysics';
import { clampGoalkeeper, clampOutfield } from './bounds';
import { gkAnchorY, getOriginX, getOriginY, getHalfL } from './playBounds';
import { manualPlayerSwitch } from './switchPlayer';
import {
  findPassTarget,
  getPassAimDirection,
  passPowerForDistance,
} from './passTargeting';
import { applyPlayerMotor, integratePlayerVelocity, lerpFacing } from './playerKinematics';
import { awardSetPiece } from './matchRules';
import { clearGuidedShot } from './guidedShot';

const TACKLE_PRESS_SPEED = 2.8;
const TACKLE_BALL_RANGE = PLAYER_RADIUS + BALL_RADIUS + 1.05;

const HOME_FORMATION = [
  { role: 'gk', x: 0, y: -50 },
  { role: 'def', x: -14, y: -28 },
  { role: 'def', x: 14, y: -28 },
  { role: 'mid', x: -10, y: -12 },
  { role: 'mid', x: 10, y: -12 },
  { role: 'mid', x: 0, y: -4 },
  { role: 'fwd', x: -8, y: 12 },
  { role: 'fwd', x: 8, y: 12 },
];

const AWAY_FORMATION = HOME_FORMATION.map((p) => ({
  ...p,
  x: -p.x,
  y: -p.y,
}));

export function createTeams() {
  const players = [];
  HOME_FORMATION.forEach((slot, i) => {
    players.push(makePlayer(TEAM_HOME, i, slot));
  });
  AWAY_FORMATION.forEach((slot, i) => {
    players.push(makePlayer(TEAM_AWAY, i + 10, slot));
  });
  return players;
}

function makePlayer(team, id, slot) {
  const isGk = slot.role === 'gk';
  const homeY = isGk ? gkAnchorY(team) : slot.y;
  const homeX = isGk ? getOriginX() : slot.x;
  return {
    id,
    team,
    role: slot.role,
    isGk,
    homeX,
    homeY,
    x: slot.x,
    y: homeY,
    vx: 0,
    vy: 0,
    facing: team === TEAM_HOME ? Math.PI / 2 : -Math.PI / 2,
    controlled: team === TEAM_HOME && id === 6,
    mesh: null,
  };
}

export function getControlled(players, team = TEAM_HOME) {
  return players.find((p) => p.team === team && p.controlled) || players.find((p) => p.team === team);
}

/** Manual switch — delegates to ball-distance / stick logic (no array-index cycling). */
export function switchControlled(players, team, ball, stickDir = null) {
  return manualPlayerSwitch(players, team, ball, stickDir);
}

export function nearestToBall(players, team, ball) {
  let best = null;
  let bestD = Infinity;
  players.filter((p) => p.team === team && !p.isGk).forEach((p) => {
    const d = (p.x - ball.x) ** 2 + (p.y - ball.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  });
  return best;
}

export function movePlayer(p, dx, dy, sprint, dt, canMove, opts = {}) {
  if (!canMove) return;
  applyPlayerMotor(p, dx, dy, sprint, dt, opts);
}

/** Wide target for cross (X). */
export function findCrossTarget(players, team, fromPlayer) {
  const sign = attackingSign(team);
  const mates = players.filter((p) => p.team === team && p.id !== fromPlayer.id && !p.isGk);
  let best = null;
  let bestScore = -Infinity;
  mates.forEach((m) => {
    const wide = Math.abs(m.x) > 8;
    const forward = sign * (m.y - fromPlayer.y) > 3;
    const score = (wide ? 3 : 0) + (forward ? 2 : 0) - Math.hypot(m.x - fromPlayer.x, m.y - fromPlayer.y) * 0.04;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  });
  return best;
}

export function integratePlayers(players, dt) {
  players.forEach((p) => {
    integratePlayerVelocity(p, dt, { skipDrag: Boolean(p.controlled) });
    if (p.isGk) clampGoalkeeper(p);
    else clampOutfield(p);
    if (p.mesh) {
      p.mesh.rotation.y = -p.facing;
    }
  });
}

function angleDelta(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Tackle resolution — bounding reach, approach angle, behind-carrier fouls. */
export function tackleAttempt(tackler, carrier, ball) {
  const reach = PLAYER_RADIUS * 2 + 0.3;
  if (Math.hypot(tackler.x - carrier.x, tackler.y - carrier.y) > reach) return null;
  if (Math.hypot(tackler.x - ball.x, tackler.y - ball.y) > TACKLE_BALL_RANGE) return null;

  const tSpd = Math.hypot(tackler.vx, tackler.vy);
  if (tSpd < TACKLE_PRESS_SPEED) return null;

  const toCarrier = Math.atan2(carrier.y - tackler.y, carrier.x - tackler.x);
  if (Math.abs(angleDelta(toCarrier, tackler.facing ?? toCarrier)) > 1.25) return null;

  const fromBehind = Math.abs(angleDelta(toCarrier, carrier.facing ?? 0)) > 2.2;
  const hard = tSpd > 5;
  if (fromBehind && hard) return 'foul';

  ball.vx = tackler.vx * 0.6;
  ball.vy = tackler.vy * 0.6;
  return 'won';
}

/** Run one possession tackle per tick via tackleAttempt (no proximity auto-steal). */
export function tryPossessionTackles(carrier, players, ball, match) {
  if (!carrier || match.phase !== 'play') return null;

  const opps = players.filter((o) => o.team !== carrier.team && !o.isGk);
  let tackler = null;
  let bestScore = Infinity;

  opps.forEach((o) => {
    const dCarrier = Math.hypot(o.x - carrier.x, o.y - carrier.y);
    const dBall = Math.hypot(o.x - ball.x, o.y - ball.y);
    const score = dCarrier + dBall * 0.45;
    if (score < bestScore) {
      bestScore = score;
      tackler = o;
    }
  });

  if (!tackler) return null;

  const result = tackleAttempt(tackler, carrier, ball);
  if (!result) return null;

  ball.possessionId = null;
  clearGuidedShot(ball);

  if (result === 'foul') {
    awardSetPiece(match, 'foul', carrier.team, ball.x, ball.y);
    return 'foul';
  }

  match.lastTouchTeam = tackler.team;
  return 'won';
}

export function applyFormationAI(p, ball, dt, aggressiveness = 1) {
  const sign = attackingSign(p.team);
  let tx = p.homeX;
  let ty = p.homeY;
  const ballDist = Math.hypot(p.x - ball.x, p.y - ball.y);

  if (p.isGk) {
    tx = Math.max(-10, Math.min(10, ball.x * 0.22));
    ty = p.homeY;
    if (ballDist < 6 && sign * (ball.y - p.y) > 0) {
      ty = p.homeY + sign * Math.min(2.5, ballDist * 0.35);
    }
  } else if (ballDist < 14 * aggressiveness) {
    tx = ball.x + (p.homeX - ball.x) * 0.12;
    ty = ball.y + (p.homeY - ball.y) * 0.12;
  }

  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const speed = p.isGk ? MAX_JOG * 0.65 : MAX_JOG * 0.85;
  p.vx += (dx / len) * speed * 2.2 * dt;
  p.vy += (dy / len) * speed * 2.2 * dt;
}

export function aiKickDecision(p, ball, teammates, opponents) {
  const sign = attackingSign(p.team);
  const toGoalY = getOriginY() + sign * (getHalfL() - 8);
  const distGoal = Math.abs(toGoalY - p.y);
  const dBall = Math.hypot(p.x - ball.x, p.y - ball.y);
  if (dBall > 1.2) return null;

  if (distGoal < 28 && Math.abs(p.x) < 22) {
    return { type: 'shoot', power: 16 + Math.random() * 4, lift: 2.5 + Math.random() * 1.5 };
  }

  const aim = getPassAimDirection(p, Math.cos(p.facing), Math.sin(p.facing));
  const mates = teammates.filter((tm) => tm.id !== p.id && !tm.isGk);
  const best = findPassTarget(mates, p, opponents, aim, { driven: false });

  if (best) {
    const dist = Math.hypot(best.x - p.x, best.y - p.y);
    return {
      type: 'pass',
      target: best,
      power: passPowerForDistance(dist, false, false),
      lift: 0,
    };
  }
  return { type: 'pass', target: { x: p.x * 0.3, y: p.y + sign * 14 }, power: 12, lift: 0 };
}

export function tryTouchBall(players, ball) {
  players.forEach((p) => {
    playerBallCollision(ball, p.x, p.y, p.vx, p.vy, p.controlled ? 1.15 : 0.95, p.id);
  });
}

export function placePlayersForKickoff(players, team, ball, match) {
  if (match) match.passSwitchToId = null;
  players.forEach((p) => {
    if (p.isGk) {
      p.homeX = getOriginX();
      p.homeY = gkAnchorY(p.team);
      p.x = p.homeX;
      p.y = p.homeY;
    } else {
      p.x = p.homeX;
      p.y = p.homeY;
    }
    p.vx = p.vy = 0;
  });
  ball.x = getOriginX();
  ball.y = getOriginY();
  ball.z = BALL_RADIUS;
  ball.vx = ball.vy = ball.vz = 0;
  ball.wx = ball.wy = ball.wz = 0;
  ball._accum = 0;
  ball._squash = 0;
  ball.guided = null;
  ball.possessionId = null;
  ball._kickCooldown = 0;
  ball._regrabLockId = null;
  ball._regrabLockTimer = 0;
}

