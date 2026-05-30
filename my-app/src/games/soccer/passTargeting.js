import { attackingSign } from './pitchConstants';

const LANE_BLOCK_WIDTH = 1.35;

/** Shortest distance from point (px,py) to segment (ax,ay)→(bx,by). */
function perpDistToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq < 1e-6) return Math.hypot(apx, apy);
  let t = (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

/** 0 = clear lane, 1 = fully blocked by a defender on the pass line. */
export function passLaneBlockFactor(passer, target, opponents) {
  const ax = passer.x;
  const ay = passer.y;
  const bx = target.x;
  const by = target.y;
  const abx = bx - ax;
  const aby = by - ay;
  const abLenSq = abx * abx + aby * aby;
  if (abLenSq < 0.25) return 0;

  let worst = 0;
  opponents.forEach((o) => {
    const aox = o.x - ax;
    const aoy = o.y - ay;
    let t = (aox * abx + aoy * aby) / abLenSq;
    if (t < 0.08 || t > 0.92) return;

    const perp = perpDistToSegment(o.x, o.y, ax, ay, bx, by);
    if (perp < LANE_BLOCK_WIDTH) {
      worst = Math.max(worst, (LANE_BLOCK_WIDTH - perp) / LANE_BLOCK_WIDTH);
    }
  });
  return worst;
}

/** Aim vector for pass: LS / stick if held, else player facing. */
export function getPassAimDirection(active, aimX = 0, aimY = 0) {
  const len = Math.hypot(aimX, aimY);
  if (len > 0.22) {
    return { x: aimX / len, y: aimY / len };
  }
  return { x: Math.cos(active.facing), y: Math.sin(active.facing) };
}

/**
 * Pick pass receiver by aim cone + distance — not nearest to the ball.
 * Hold LB (driven) or Y (through) to bias longer / more forward targets.
 */
export function findPassTarget(mates, active, opponents, aim, opts = {}) {
  const { driven = false, through = false, minDist = 2.8 } = opts;
  const sign = attackingSign(active.team);
  const idealDist = through ? 22 : driven ? 16 : 11;

  let best = null;
  let bestScore = -Infinity;

  mates.forEach((m) => {
    const dx = m.x - active.x;
    const dy = m.y - active.y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) return;

    const dirX = dx / dist;
    const dirY = dy / dist;
    const align = dirX * aim.x + dirY * aim.y;
    const minAlign = through ? 0.35 : driven ? 0.2 : 0.12;
    if (align < minAlign) return;

    const forward = sign * (m.y - active.y);
    if (through && forward < 6) return;

    let openMin = 99;
    opponents.forEach((o) => {
      openMin = Math.min(openMin, Math.hypot(o.x - m.x, o.y - m.y));
    });
    const openScore = Math.min(openMin, 14) * 0.28;

    const forwardScore = through
      ? forward * 0.14
      : driven
        ? forward * 0.09
        : Math.min(Math.max(forward, 0), 28) * 0.07;

    const distScore = -Math.abs(dist - idealDist) * (through ? 0.06 : 0.1);
    const alignScore = align * (through ? 6 : driven ? 5 : 4.5);
    const laneBlock = passLaneBlockFactor(active, m, opponents);
    if (laneBlock >= 0.9) return;

    const laneScore = -laneBlock * 24;
    const score = alignScore + forwardScore + openScore + distScore + laneScore;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  });

  if (best) return best;

  let fallback = null;
  let fbScore = -Infinity;
  mates.forEach((m) => {
    const dx = m.x - active.x;
    const dy = m.y - active.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) return;
    const align = (dx / dist) * aim.x + (dy / dist) * aim.y;
    const forward = sign * (m.y - active.y);
    const laneBlock = passLaneBlockFactor(active, m, opponents);
    const score = align * 3 + forward * 0.08 - dist * 0.02 - laneBlock * 20;
    if (score > fbScore) {
      fbScore = score;
      fallback = m;
    }
  });

  return fallback || mates[0] || null;
}

export function passPowerForDistance(dist, driven, through) {
  if (through) return 12.5 + dist * 0.24;
  if (driven) return 11.5 + dist * 0.2;
  return 9.5 + dist * 0.16;
}
