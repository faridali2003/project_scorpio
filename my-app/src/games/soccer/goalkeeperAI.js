import {
  GOAL_WIDTH,
  GOAL_HEIGHT,
  BALL_RADIUS,
  attackingSign,
} from './pitchConstants';
import { clampGoalkeeper } from './bounds';
import { defendLineY, gkAnchorY, getOriginX } from './playBounds';

/** Keep GKs on the grass in front of the goal — track ball X/Y/Z and face the play. */
export function anchorGoalkeepers(players, ball, dt) {
  players.forEach((p) => {
    if (!p.isGk) return;

    const line = defendLineY(p.team);
    const sign = attackingSign(p.team);
    const anchor = gkAnchorY(p.team);
    const ox = getOriginX();

    p.homeX = ox;
    p.homeY = anchor;

    const trackX = Math.max(-8, Math.min(8, ball.x - ox));
    const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
    const inMouth = Math.abs(ball.x - ox) < GOAL_WIDTH / 2 + 1.5;
    const ballThreat = sign * (ball.y - line) > 1;
    const highThreat =
      ball.z > 1.0 &&
      inMouth &&
      sign * (ball.y - line) > -5 &&
      sign * (ball.vy ?? 0) <= 1.5;
    const ballNear = dist < 22 || highThreat;

    if ((ballThreat || highThreat) && ballNear) {
      const trackScale = highThreat ? 0.55 : 0.35;
      p.x += (ox + trackX * trackScale - p.x) * Math.min(1, dt * 6);
      const towardBallY = ball.y - sign * Math.min(2.5, 1.2 + ball.z * 0.35);
      const targetY = highThreat
        ? towardBallY
        : anchor + sign * Math.min(2, Math.max(0, sign * (ball.y - anchor) * 0.12));
      p.y += (targetY - p.y) * Math.min(1, dt * (highThreat ? 7 : 4));
    } else {
      p.x += (ox - p.x) * Math.min(1, dt * 4);
      p.y += (anchor - p.y) * Math.min(1, dt * 5);
    }

    if (highThreat && dist < 2.2 && ball.z <= GOAL_HEIGHT + BALL_RADIUS) {
      const saveStrength = Math.min(1, (GOAL_HEIGHT - ball.z) / GOAL_HEIGHT + 0.35);
      ball.vz = Math.min(ball.vz, -3 * saveStrength);
      ball.vx *= 0.45;
      ball.vy *= 0.45;
      if (ball.z < GOAL_HEIGHT * 0.85) {
        ball.vz = Math.max(ball.vz, 2.5);
      }
    }

    clampGoalkeeper(p);

    if (ballNear && (ballThreat || highThreat)) {
      p.facing = Math.atan2(ball.y - p.y, ball.x - p.x);
    } else {
      p.facing = Math.atan2(sign, 0);
    }
  });
}
