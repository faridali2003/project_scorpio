import { MAX_JOG } from './pitchConstants';
import { ballSpeed } from './ballPhysics';
import { isBallDribbling } from './ballPossession';
import { applyFormationAI } from './players';
import { clampGoalkeeper, clampOutfield } from './bounds';
import { applyPlayerMotor } from './playerKinematics';

export { clampGoalkeeper, clampOutfield };

const LOOSE_BALL_CHASE = 34;
const LOOSE_BALL_SPEED = 1.4;

export function chaseBall(p, ball, dt, urgency = 1) {
  const dx = ball.x - p.x;
  const dy = ball.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.9 || dist > LOOSE_BALL_CHASE) return false;
  const len = dist || 1;
  applyPlayerMotor(p, dx / len, dy / len, urgency > 1, dt, { keepFacing: false });
  p.facing = Math.atan2(dy, dx);
  return true;
}

function isLooseBall(ball) {
  if (isBallDribbling(ball)) return false;
  if (ball._kickCooldown > 0.04) return ballSpeed(ball) > LOOSE_BALL_SPEED;
  return ballSpeed(ball) > 0.35 && ballSpeed(ball) < 20;
}

export function tickTeamMovement(players, ball, team, dt, opts = {}) {
  const { skipControlled = true, pressFactor = 1, maxChasers = 2 } = opts;
  const teamPlayers = players.filter((p) => p.team === team);
  const loose = isLooseBall(ball);

  const outfield = teamPlayers.filter((p) => !p.isGk);
  let closest = null;
  let closestD = Infinity;
  let second = null;
  let secondD = Infinity;
  outfield.forEach((p) => {
    const d = Math.hypot(p.x - ball.x, p.y - ball.y);
    if (d < closestD) {
      second = closest;
      secondD = closestD;
      closestD = d;
      closest = p;
    } else if (d < secondD) {
      secondD = d;
      second = p;
    }
  });

  const chasers = new Set();
  if (loose && closest) chasers.add(closest.id);
  if (loose && second && maxChasers > 1 && secondD < 14) chasers.add(second.id);

  teamPlayers.forEach((p) => {
    if (skipControlled && p.controlled) return;

    if (p.isGk) {
      applyFormationAI(p, ball, dt, 0.55);
      clampGoalkeeper(p);
      return;
    }

    const distBall = Math.hypot(p.x - ball.x, p.y - ball.y);
    let moved = false;

    if (chasers.has(p.id)) {
      const urge = p.id === closest?.id ? 1.2 : 0.7;
      moved = chaseBall(p, ball, dt, urge);
    }

    if (!moved) {
      const press = distBall < 14 * pressFactor ? 0.95 : 0.6;
      applyFormationAI(p, ball, dt, press);
    }

    clampOutfield(p);
  });
}
