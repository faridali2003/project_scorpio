/** Gameplay pitch — always FIFA size; stadium art is visual only. */

const FIFA_HALF_W = 34;
const FIFA_HALF_L = 52.5;
const TEAM_HOME = 0;

let halfW = FIFA_HALF_W;
let halfL = FIFA_HALF_L;
let originX = 0;
let originY = 0;

export const GK_LINE_INSET = 4;

function attackingSign(team) {
  return team === TEAM_HOME ? 1 : -1;
}

export function setPlayBounds(hw, hl, cx = 0, cy = 0) {
  halfW = Math.max(12, hw);
  halfL = Math.max(18, hl);
  originX = cx;
  originY = cy;
}

export function resetPlayBounds() {
  halfW = FIFA_HALF_W;
  halfL = FIFA_HALF_L;
  originX = 0;
  originY = 0;
}

/** Lock rules/ball/players to FIFA pitch (centre at origin). */
export function lockFifaPlayBounds() {
  setPlayBounds(FIFA_HALF_W, FIFA_HALF_L, 0, 0);
}

export function getHalfW() {
  return halfW;
}

export function getHalfL() {
  return halfL;
}

export function getOriginX() {
  return originX;
}

export function getOriginY() {
  return originY;
}

/** Pitch-local coords (origin = centre spot). */
export function toLocal(x, y) {
  return { x: x - originX, y: y - originY };
}

export function defendLineY(team) {
  return team === TEAM_HOME ? originY - halfL : originY + halfL;
}

export function gkAnchorY(team) {
  return defendLineY(team) + attackingSign(team) * GK_LINE_INSET;
}

export function isInsidePitch(x, y, margin = 0.5) {
  const l = toLocal(x, y);
  return Math.abs(l.x) <= halfW - margin && Math.abs(l.y) <= halfL - margin;
}

export function applyPlayBoundsToTeams(players) {
  if (!players?.length) return;
  players.forEach((p) => {
    if (!p.isGk) return;
    p.homeX = originX;
    p.homeY = gkAnchorY(p.team);
    p.x = p.homeX;
    p.y = p.homeY;
  });
}

/** Scale 105×68 formation to actual turf size. */
export function rescaleTeamsToPlayBounds(players) {
  const sx = halfW / FIFA_HALF_W;
  const sy = halfL / FIFA_HALF_L;
  players.forEach((p) => {
    if (p.isGk) {
      p.homeX = originX;
      p.homeY = gkAnchorY(p.team);
    } else {
      p.homeX = originX + p.homeX * sx;
      p.homeY = originY + p.homeY * sy;
    }
    p.x = p.homeX;
    p.y = p.homeY;
    p.vx = 0;
    p.vy = 0;
  });
}
