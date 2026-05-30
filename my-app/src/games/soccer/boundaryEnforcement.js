import { detectBoundaryEvents } from './goalDetection';
import { BALL_RADIUS } from './pitchConstants';
import { toLocal, getHalfW, getHalfL } from './playBounds';

/**
 * True when the whole ball has crossed the touchline / goal line.
 * Limit uses halfW + BALL_RADIUS so we test the trailing (pitch-side) edge, not the front.
 */
export function isBallOutOfPlay(ball, margin = 0.02) {
  const l = toLocal(ball.x, ball.y);
  const limitX = getHalfW() + BALL_RADIUS + margin;
  const limitY = getHalfL() + BALL_RADIUS + margin;
  return Math.abs(l.x) > limitX || Math.abs(l.y) > limitY;
}

/**
 * Run line detection even when dribbling / player carried ball past line.
 * Returns same shape as detectBoundaryEvents.
 */
export function checkPlayBoundary(ball, prevBall, match) {
  if (match.phase !== 'play') {
    return { goal: null, out: null };
  }
  return detectBoundaryEvents(ball, prevBall, match.lastTouchTeam);
}

/** Keep ball on legal turf (call after possession / physics each frame). */
export function maintainBallBounds(ball) {
  clampBallToPitch(ball);
}

export function clampBallToPitch(ball) {
  const l = toLocal(ball.x, ball.y);
  const hw = getHalfW() + BALL_RADIUS;
  const hl = getHalfL() + BALL_RADIUS;
  if (Math.abs(l.x) <= hw && Math.abs(l.y) <= hl) return;
  const ox = ball.x - l.x;
  const oy = ball.y - l.y;
  const cx = Math.max(-hw, Math.min(hw, l.x));
  const cy = Math.max(-hl, Math.min(hl, l.y));
  ball.x = ox + cx;
  ball.y = oy + cy;
}
