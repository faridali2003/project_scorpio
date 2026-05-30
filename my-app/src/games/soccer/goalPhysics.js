import { GOAL_WIDTH, GOAL_HEIGHT, BALL_RADIUS } from './pitchConstants';
import { getHalfL, toLocal } from './playBounds';

/** Soft net — kill bounce when ball is in the mouth behind the goal line. */
export function dampenBallInNet(ball) {
  const cur = toLocal(ball.x, ball.y);
  const hl = getHalfL();
  const halfGw = GOAL_WIDTH / 2 + 0.35;
  const inMouth = Math.abs(cur.x) <= halfGw;
  const behindLine = cur.y > hl + 0.05 || cur.y < -hl - 0.05;
  const underBar = ball.z < GOAL_HEIGHT + BALL_RADIUS * 2;

  if (!inMouth || !behindLine || !underBar) return;

  ball.vx *= 0.78;
  ball.vy *= 0.78;
  ball.vz *= 0.72;
  ball.wx *= 0.85;
  ball.wy *= 0.85;
  ball.wz *= 0.85;

  if (ball.z > GOAL_HEIGHT - 0.2) {
    ball.vz = Math.min(ball.vz, -0.5);
  }
  if (ball.z < BALL_RADIUS) ball.z = BALL_RADIUS;
}
