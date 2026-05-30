import {
  GOAL_WIDTH,
  GOAL_HEIGHT,
  BALL_RADIUS,
  TEAM_HOME,
  TEAM_AWAY,
} from './pitchConstants';
import { getHalfL, getHalfW, toLocal } from './playBounds';

function haltBall(ball, keepZ = false) {
  ball.vx = 0;
  ball.vy = 0;
  if (!keepZ) ball.vz = 0;
  ball.wx = ball.wy = ball.wz = 0;
  ball.possessionId = null;
  ball.guided = null;
}

/** Fraction along prev→cur where the segment hits y = lineY between the posts, else null. */
function goalLineCrossingT(prev, cur, lineY, halfPostW) {
  const dy = cur.y - prev.y;
  if (Math.abs(dy) < 1e-6) return null;

  const crossed =
    lineY > 0
      ? prev.y <= lineY && cur.y > lineY
      : prev.y >= lineY && cur.y < lineY;
  if (!crossed) return null;

  const t = (lineY - prev.y) / dy;
  if (t < 0 || t > 1) return null;

  const xAtLine = prev.x + t * (cur.x - prev.x);
  if (Math.abs(xAtLine) > halfPostW) return null;

  return t;
}

/**
 * Goals, corners, goal kicks, throw-ins — uses pitch-local coords on visible turf.
 */
export function detectBoundaryEvents(ball, prevBall, lastTouchTeam) {
  const events = { goal: null, out: null };
  const hl = getHalfL();
  const hw = getHalfW();
  const cur = toLocal(ball.x, ball.y);
  const prev = toLocal(prevBall.x, prevBall.y);
  const prevZ = prevBall.z ?? ball.z;
  const maxGoalZ = GOAL_HEIGHT + BALL_RADIUS * 1.5;

  const halfPostW = GOAL_WIDTH / 2 + 0.25;
  const pastHomeEnd = cur.y > hl + 0.02;
  const pastAwayEnd = cur.y < -hl - 0.02;

  const tHomeGoal = goalLineCrossingT(prev, cur, hl, halfPostW);
  const tAwayGoal = goalLineCrossingT(prev, cur, -hl, halfPostW);

  if (tHomeGoal != null) {
    const zAtLine = prevZ + tHomeGoal * (ball.z - prevZ);
    if (zAtLine <= maxGoalZ) events.goal = TEAM_HOME;
  } else if (tAwayGoal != null) {
    const zAtLine = prevZ + tAwayGoal * (ball.z - prevZ);
    if (zAtLine <= maxGoalZ) events.goal = TEAM_AWAY;
  }

  if (events.goal != null) {
    haltBall(ball);
    return events;
  }

  if (pastHomeEnd || pastAwayEnd || Math.abs(cur.y) > hl) {
    if (pastHomeEnd || cur.y >= hl - 0.05) {
      events.out = lastTouchTeam === TEAM_AWAY ? 'corner' : 'goal_kick';
    } else if (pastAwayEnd || cur.y <= -hl + 0.05) {
      events.out = lastTouchTeam === TEAM_HOME ? 'corner' : 'goal_kick';
    } else {
      events.out = 'goal_kick';
    }
    haltBall(ball, true);
    return events;
  }

  const crossedTouchR = prev.x <= hw && cur.x > hw;
  const crossedTouchL = prev.x >= -hw && cur.x < -hw;
  const pastTouchline = Math.abs(cur.x) > hw - 0.08;

  if (pastTouchline || crossedTouchR || crossedTouchL) {
    events.out = 'throw';
    const ox = ball.x - cur.x;
    const oy = ball.y - cur.y;
    ball.x = ox + Math.sign(cur.x || 1) * (hw - 0.12);
    ball.y = oy + Math.max(-hl + 0.2, Math.min(hl - 0.2, cur.y));
    haltBall(ball, true);
    return events;
  }

  return events;
}
