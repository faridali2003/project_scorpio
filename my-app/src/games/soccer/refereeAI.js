import { getHalfW, getHalfL, getOriginX, getOriginY } from './playBounds';
import { syncHumanoid } from './matchVisuals';

const FOLLOW_MIN = 10;
const FOLLOW_MAX = 15;
const FOLLOW_IDEAL = 12;

/** Referee stays on the pitch ~10–15 m from the ball, not frozen on the touchline. */
export function updateReferee(referee, ball, dt) {
  if (!referee) return;

  const ox = getOriginX();
  const oy = getOriginY();
  const innerHw = getHalfW() - 3;
  const innerHl = getHalfL() - 3;

  const rx = referee.userData.rx ?? ball.x;
  const ry = referee.userData.ry ?? ball.y;

  let dx = rx - ball.x;
  let dy = ry - ball.y;
  let dist = Math.hypot(dx, dy);
  if (dist < 0.05) {
    dx = ox > ball.x ? 1 : -1;
    dy = 0.2;
    dist = 1;
  }

  let targetDist = FOLLOW_IDEAL;
  if (dist < FOLLOW_MIN) targetDist = FOLLOW_MIN;
  else if (dist > FOLLOW_MAX) targetDist = FOLLOW_MAX;

  let tx = ball.x + (dx / dist) * targetDist;
  let ty = ball.y + (dy / dist) * targetDist;

  tx = Math.max(ox - innerHw, Math.min(ox + innerHw, tx));
  ty = Math.max(oy - innerHl, Math.min(oy + innerHl, ty));

  dist = Math.hypot(tx - ball.x, ty - ball.y);
  if (dist < FOLLOW_MIN) {
    const ang = Math.atan2(ty - ball.y, tx - ball.x);
    tx = ball.x + Math.cos(ang) * FOLLOW_MIN;
    ty = ball.y + Math.sin(ang) * FOLLOW_MIN;
    tx = Math.max(ox - innerHw, Math.min(ox + innerHw, tx));
    ty = Math.max(oy - innerHl, Math.min(oy + innerHl, ty));
  }

  const k = Math.min(1, dt * 4.5);
  const nx = rx + (tx - rx) * k;
  const ny = ry + (ty - ry) * k;
  referee.userData.rx = nx;
  referee.userData.ry = ny;

  const facing = Math.atan2(ball.y - ny, ball.x - nx);
  syncHumanoid(referee, nx, ny, facing, false);
}
