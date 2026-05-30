import { PLAYER_RADIUS, PENALTY_BOX_DEPTH, attackingSign } from './pitchConstants';
import {
  defendLineY,
  getHalfL,
  getHalfW,
  getOriginX,
  getOriginY,
  gkAnchorY,
} from './playBounds';

/** Outfield cannot enter stands (just outside touchline wall). */
const WALL_MARGIN = 7;

export function getArenaHalfExtents() {
  return {
    hw: getHalfW() + WALL_MARGIN,
    hl: getHalfL() + WALL_MARGIN,
  };
}

export function clampGoalkeeper(p) {
  const ox = getOriginX();
  const hw = getHalfW() - 1.5;
  const line = defendLineY(p.team);
  const sign = attackingSign(p.team);

  const nearLine = line + sign * 0.8;
  const deepIn = line + sign * (PENALTY_BOX_DEPTH - 1.2);
  const minY = Math.min(nearLine, deepIn);
  const maxY = Math.max(nearLine, deepIn);
  p.y = Math.max(minY, Math.min(maxY, p.y));
  p.x = Math.max(ox - hw, Math.min(ox + hw, p.x));

  const anchor = gkAnchorY(p.team);
  if (Math.abs(p.y - anchor) > 5) {
    p.y += (anchor - p.y) * 0.25;
  }
}

export function clampOutfield(p) {
  const ox = getOriginX();
  const oy = getOriginY();
  const touchHw = getHalfW() - PLAYER_RADIUS - 0.35;
  const touchHl = getHalfL() - PLAYER_RADIUS - 0.35;
  p.x = Math.max(ox - touchHw, Math.min(ox + touchHw, p.x));
  p.y = Math.max(oy - touchHl, Math.min(oy + touchHl, p.y));

  const { hw: wallHw, hl: wallHl } = getArenaHalfExtents();
  p.x = Math.max(ox - wallHw, Math.min(ox + wallHw, p.x));
  p.y = Math.max(oy - wallHl, Math.min(oy + wallHl, p.y));
}
