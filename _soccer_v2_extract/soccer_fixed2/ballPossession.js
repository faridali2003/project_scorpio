import { BALL_RADIUS } from './pitchConstants';
import { ballSpeed } from './ballPhysics';
import { tryPossessionTackles } from './players';

const DRIBBLE_TOUCH = 1.35;
const DRIBBLE_LEAD = 0.55;
const DRIBBLE_TURN_RATE = 9;
const CLAIM_DIST = 1.12;
const CLAIM_MAX_BALL_SPEED = 6.5;
const LOOSE_BALL_SPEED = 17;
const REGRAB_LOCK_SEC = 0.5;
const KICK_FREE_SEC = 0.48;

function lerpAngle(current, target, maxStep) {
  let df = target - current;
  while (df > Math.PI) df -= Math.PI * 2;
  while (df < -Math.PI) df += Math.PI * 2;
  if (Math.abs(df) <= maxStep) return target;
  return current + Math.sign(df) * maxStep;
}

export function clearBallPossession(ball) {
  ball.possessionId = null;
  ball._kickCooldown = 0;
  ball._regrabLockId = null;
  ball._regrabLockTimer = 0;
}

/** Ball leaves feet — no instant vacuum back onto the kicker. */
export function releaseBall(ball, kickerId = null) {
  ball.possessionId = null;
  ball.guided = null;
  ball._kickCooldown = KICK_FREE_SEC;
  ball._regrabLockId = kickerId;
  ball._regrabLockTimer = REGRAB_LOCK_SEC;
}

export function markBallKicked(ball, kickerId = null) {
  releaseBall(ball, kickerId);
}

export function isBallDribbling(ball) {
  return (
    ball.possessionId != null &&
    ball.z <= BALL_RADIUS + 0.3 &&
    ballSpeed(ball) < 12
  );
}

function tickBallTimers(ball, dt) {
  if (ball._kickCooldown > 0) ball._kickCooldown -= dt;
  if (ball._regrabLockTimer > 0) {
    ball._regrabLockTimer -= dt;
    if (ball._regrabLockTimer <= 0) ball._regrabLockId = null;
  }
}

function canClaim(p, ball) {
  if (p.isGk) return false;
  if (ball._kickCooldown > 0) return false;
  if (p.id === ball._regrabLockId && ball._regrabLockTimer > 0) return false;
  if (ballSpeed(ball) > CLAIM_MAX_BALL_SPEED) return false;
  return Math.hypot(p.x - ball.x, p.y - ball.y) <= CLAIM_DIST;
}

/** Human first, then nearest AI — never vacuum to whole squad. */
function findLooseBallClaimer(players, ball) {
  const human = players.find((p) => p.controlled && !p.isGk);
  if (human && canClaim(human, ball)) return human;

  let best = null;
  let bestD = CLAIM_DIST;
  players.forEach((p) => {
    if (p.controlled || p.isGk) return;
    if (!canClaim(p, ball)) return;
    const d = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  });
  return best;
}

function applyDribbleTouch(ball, carrier, dt) {
  const human = !!carrier.controlled;
  const leadTarget = human ? 0.42 : DRIBBLE_LEAD;
  const turnRate = human ? 14 : DRIBBLE_TURN_RATE;
  const offsetX = ball.x - carrier.x;
  const offsetY = ball.y - carrier.y;
  const offsetDist = Math.hypot(offsetX, offsetY);
  const ballAngle =
    offsetDist > 0.08 ? Math.atan2(offsetY, offsetX) : (carrier.facing ?? 0);
  const leadAngle = lerpAngle(
    ballAngle,
    carrier.facing ?? 0,
    turnRate * dt
  );

  const distBlend = Math.min(1, (human ? 22 : 16) * dt);
  const leadDist = offsetDist + (leadTarget - offsetDist) * distBlend;
  ball.x = carrier.x + Math.cos(leadAngle) * leadDist;
  ball.y = carrier.y + Math.sin(leadAngle) * leadDist;

  const cSpd = Math.hypot(carrier.vx, carrier.vy);
  const ahead = (human ? 1.35 : 1.55) + cSpd * (human ? 0.22 : 0.28);
  const velBlend = human ? 0.92 : 0.82;
  ball.vx = carrier.vx * velBlend + Math.cos(leadAngle) * ahead;
  ball.vy = carrier.vy * velBlend + Math.sin(leadAngle) * ahead;
  ball.z = BALL_RADIUS;
  ball.vz = 0;

  if (Math.hypot(ball.x - carrier.x, ball.y - carrier.y) > DRIBBLE_TOUCH + 0.5) {
    ball.possessionId = null;
  }
}

/** @returns {'foul'|'won'|null} */
export function updateBallPossession(ball, players, match, dt) {
  tickBallTimers(ball, dt);

  if (ball.guided && ballSpeed(ball) > 8) {
    ball.possessionId = null;
    return null;
  }

  if (ball.z > 1.6 || ballSpeed(ball) > LOOSE_BALL_SPEED) {
    ball.possessionId = null;
    return null;
  }

  let carrier =
    ball.possessionId != null
      ? players.find((p) => p.id === ball.possessionId)
      : null;

  if (carrier) {
    const d = Math.hypot(carrier.x - ball.x, carrier.y - ball.y);
    if (d > DRIBBLE_TOUCH + 0.4) {
      ball.possessionId = null;
      carrier = null;
    }
  }

  if (!carrier) {
    carrier = findLooseBallClaimer(players, ball);
  }

  if (carrier) {
    const tackle = tryPossessionTackles(carrier, players, ball, match);
    if (tackle) return tackle;
  }

  if (!carrier) {
    ball.possessionId = null;
    return null;
  }

  ball.possessionId = carrier.id;
  match.lastTouchTeam = carrier.team;
  applyDribbleTouch(ball, carrier, dt);
  return null;
}
