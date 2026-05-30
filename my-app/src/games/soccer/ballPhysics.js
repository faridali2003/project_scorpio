import {
  GOAL_WIDTH,
  GOAL_HEIGHT,
  BALL_RADIUS,
} from './pitchConstants';
import { applyGuidedShotForces } from './guidedShot';
import { isBallDribbling, releaseBall } from './ballPossession';
import { detectBoundaryEvents } from './goalDetection';
import { dampenBallInNet } from './goalPhysics';

export const PHYSICS_HZ = 120;
const FIXED_DT = 1 / PHYSICS_HZ;
const MAX_SUBSTEPS = 8;

const GRAVITY = 9.81;
const BALL_MASS = 0.43;
const RHO_AIR = 1.225;
const DRAG_CD = 0.28;
const CROSS_AREA = Math.PI * BALL_RADIUS * BALL_RADIUS;
const MAGNUS_S = 0.00115;
const MIN_SPEED = 0.06;
const SPIN_AIR_DAMP = 0.996;

export function createBallState() {
  return {
    x: 0,
    y: 0,
    z: BALL_RADIUS,
    vx: 0,
    vy: 0,
    vz: 0,
    wx: 0,
    wy: 0,
    wz: 0,
    _accum: 0,
    _squash: 0,
    guided: null,
    possessionId: null,
    _kickCooldown: 0,
    _regrabLockId: null,
    _regrabLockTimer: 0,
  };
}

function vecSpeed(vx, vy, vz) {
  return Math.hypot(vx, vy, vz);
}

function calcDrag(vx, vy, vz) {
  const speed = vecSpeed(vx, vy, vz);
  if (speed < 1e-4) return { fx: 0, fy: 0, fz: 0 };
  const q = 0.5 * RHO_AIR * speed * speed * DRAG_CD * CROSS_AREA;
  const inv = q / (speed * BALL_MASS);
  return { fx: -vx * inv, fy: -vy * inv, fz: -vz * inv };
}

function calcMagnus(wx, wy, wz, vx, vy, vz) {
  const cx = wy * vz - wz * vy;
  const cy = wz * vx - wx * vz;
  const cz = wx * vy - wy * vx;
  const s = MAGNUS_S / BALL_MASS;
  return { fx: s * cx, fy: s * cy, fz: s * cz };
}

function integrateForces(ball, surface, dt) {
  const dribbling = isBallDribbling(ball);

  const drag = calcDrag(ball.vx, ball.vy, ball.vz);
  const magnus = calcMagnus(ball.wx, ball.wy, ball.wz, ball.vx, ball.vy, ball.vz);

  let ax = drag.fx + magnus.fx;
  let ay = drag.fy + magnus.fy;
  let az = drag.fz + magnus.fz - GRAVITY;

  if (!dribbling) {
    applyGuidedShotForces(ball, dt);
  }

  ball.vx += ax * dt;
  ball.vy += ay * dt;
  ball.vz += az * dt;

  ball.wx *= SPIN_AIR_DAMP;
  ball.wy *= SPIN_AIR_DAMP;
  ball.wz *= SPIN_AIR_DAMP;

  if (!dribbling) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.z += ball.vz * dt;
  }

  if (ball.z < BALL_RADIUS) ball.z = BALL_RADIUS;

  if (ball.z <= BALL_RADIUS + 0.02) {
    ball.z = BALL_RADIUS;
    if (ball.vz < -0.12) {
      ball.vz = -ball.vz * (dribbling ? 0.15 : surface.restitution);
      ball._squash = Math.min(1, Math.abs(ball.vz) * 0.05);
    } else if (ball.vz < 0.05) {
      ball.vz = 0;
    }

    const vh = Math.hypot(ball.vx, ball.vy);
    if (vh > 0.04) {
      const ff = surface.friction * GRAVITY * (dribbling ? 1.4 : 1);
      const reduce = Math.min(vh, (ff / BALL_MASS) * dt);
      const k = Math.max(0, (vh - reduce) / vh);
      ball.vx *= k;
      ball.vy *= k;
    }
  }

  if (ball._squash > 0) ball._squash = Math.max(0, ball._squash - dt * 5);
}

function substep(ball, dt, prevBall, surface, lastTouchTeam) {
  integrateForces(ball, surface, dt);
  dampenBallInNet(ball);
  return detectBoundaryEvents(ball, prevBall, lastTouchTeam);
}

export function stepBall(ball, frameDt, prevBall, surface, lastTouchTeam = 0) {
  /** Dribble position is driven by possession — don't fight it with air drag/friction. */
  if (isBallDribbling(ball)) {
    ball._accum = 0;
    return { goal: null, out: null };
  }

  ball._accum = (ball._accum ?? 0) + frameDt;
  let merged = { goal: null, out: null };
  let steps = 0;
  let prev = { ...prevBall };

  while (ball._accum >= FIXED_DT && steps < MAX_SUBSTEPS) {
    const ev = substep(ball, FIXED_DT, prev, surface, lastTouchTeam);
    if (ev.goal != null) merged.goal = ev.goal;
    if (ev.out != null) merged.out = ev.out;
    ball._accum -= FIXED_DT;
    prev = { x: ball.x, y: ball.y, z: ball.z };
    steps += 1;
  }

  const sp = vecSpeed(ball.vx, ball.vy, ball.vz);
  if (sp < MIN_SPEED && ball.z <= BALL_RADIUS + 0.02 && !isBallDribbling(ball)) {
    ball.vx = ball.vy = ball.vz = 0;
    ball.wx = ball.wy = ball.wz = 0;
  }

  return merged;
}

export function kickBall(ball, dirX, dirY, power, opts = {}) {
  const kickOpts = typeof opts === 'number' ? { lift: opts } : opts;
  const len = Math.hypot(dirX, dirY) || 1;
  const nx = dirX / len;
  const ny = dirY / len;
  const perpX = -ny;
  const perpY = nx;

  const lift = kickOpts.lift ?? 0;
  const offsetSide = kickOpts.offsetSide ?? 0;
  const offsetUp = kickOpts.offsetUp ?? 0;
  const sideSpin = kickOpts.sideSpin ?? 0;
  const carry = kickOpts.carry ?? 0.1;

  const rx = perpX * offsetSide + nx * (kickOpts.offsetForward ?? 0);
  const ry = perpY * offsetSide + ny * (kickOpts.offsetForward ?? 0);
  const rz = offsetUp;

  const Fx = nx * power * BALL_MASS;
  const Fy = ny * power * BALL_MASS;
  const Fz = lift * BALL_MASS;

  ball.vx = nx * power + ball.vx * carry;
  ball.vy = ny * power + ball.vy * carry;
  ball.vz = Math.max(ball.vz, lift);

  const iScale = kickOpts.spinScale ?? 1;
  ball.wx += iScale * ((ry * Fz - rz * Fy) / BALL_MASS) * 0.035;
  ball.wy += iScale * ((rz * Fx - rx * Fz) / BALL_MASS) * 0.035;
  ball.wz += iScale * ((rx * Fy - ry * Fx) / BALL_MASS) * 0.035 + sideSpin;

  ball._squash = Math.min(1, power * 0.04);
  releaseBall(ball, kickOpts.kickerId ?? null);
}

export function playerBallCollision(ball, px, py, teamVelX, teamVelY, strength = 1, playerId = null) {
  if (playerId != null && ball.possessionId === playerId) return false;
  if (ball._kickCooldown > 0.06) return false;

  const dx = ball.x - px;
  const dy = ball.y - py;
  const dist = Math.hypot(dx, dy);
  const minD = BALL_RADIUS + 0.48;
  if (dist > minD || dist < 1e-4) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  ball.x = px + nx * minD;
  ball.y = py + ny * minD;

  const rel = (ball.vx - teamVelX) * nx + (ball.vy - teamVelY) * ny;
  if (rel < 0) {
    const impulse = -rel * (0.85 + 0.1 * strength);
    ball.vx += nx * impulse + teamVelX * 0.25;
    ball.vy += ny * impulse + teamVelY * 0.25;
    if (ball.z <= BALL_RADIUS + 0.05) {
      ball.vz = Math.max(ball.vz, 0.8 * strength);
    }
  }
  return true;
}

export function ballSpeed(ball) {
  return vecSpeed(ball.vx, ball.vy, ball.vz);
}

export function ballSquash(ball) {
  return ball._squash ?? 0;
}
