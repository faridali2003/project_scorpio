import { MAX_JOG, MAX_SPRINT } from './pitchConstants';

/** Velocity-based motor: acceleration, deceleration, turn-radius limit. */
export function applyPlayerMotor(p, wishDx, wishDy, sprint, dt, opts = {}) {
  const len = Math.hypot(wishDx, wishDy);
  const maxSpeed = sprint ? MAX_SPRINT : opts.jockey ? MAX_JOG * 0.78 : MAX_JOG;

  let targetVx = 0;
  let targetVy = 0;
  if (len > 0.04) {
    targetVx = (wishDx / len) * maxSpeed;
    targetVy = (wishDy / len) * maxSpeed;
  }

  const curSpd = Math.hypot(p.vx, p.vy);
  const responsive = opts.responsive ? 1.2 : 1;
  const accelRate = (sprint ? 48 : opts.jockey ? 26 : 36) * responsive;
  const decelRate = (opts.jockey ? 44 : 40) * responsive;
  const rate = len > 0.04 ? accelRate : decelRate;
  const t = Math.min(1, rate * dt);

  p.vx += (targetVx - p.vx) * t;
  p.vy += (targetVy - p.vy) * t;

  if (len > 0.06 && !opts.keepFacing) {
    const wishFacing = Math.atan2(wishDy, wishDx);
    let df = wishFacing - (p.facing ?? 0);
    while (df > Math.PI) df -= Math.PI * 2;
    while (df < -Math.PI) df += Math.PI * 2;
    const turnBase = sprint ? 5.6 : 8.5;
    const turnPenalty = 1 + (curSpd / Math.max(maxSpeed, 0.1)) * 0.65;
    const maxTurn = (turnBase / turnPenalty) * dt;
    p.facing = (p.facing ?? 0) + Math.sign(df) * Math.min(Math.abs(df), maxTurn);
  }
}

export function integratePlayerVelocity(p, dt, opts = {}) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (opts.skipDrag) return;
  const drag = Math.exp(-3.2 * dt);
  p.vx *= drag;
  p.vy *= drag;
}

export function lerpFacing(p, targetFacing, dt, rate = 12) {
  let df = targetFacing - (p.facing ?? 0);
  while (df > Math.PI) df -= Math.PI * 2;
  while (df < -Math.PI) df += Math.PI * 2;
  p.facing = (p.facing ?? 0) + df * Math.min(1, rate * dt);
}
