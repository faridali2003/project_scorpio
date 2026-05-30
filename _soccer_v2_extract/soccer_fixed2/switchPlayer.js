/** Switch controlled home player — RB = nearest to ball (FIFA). */

export function switchControlTo(players, player) {
  if (!player || player.isGk) return null;
  players
    .filter((p) => p.team === player.team)
    .forEach((p) => {
      p.controlled = false;
    });
  player.controlled = true;
  return player;
}

function fieldPlayersByBallDistance(players, team, ball) {
  return players
    .filter((p) => p.team === team && !p.isGk)
    .map((p) => ({ p, d: Math.hypot(p.x - ball.x, p.y - ball.y) }))
    .sort((a, b) => a.d - b.d);
}

export function switchToNearestToBall(players, team, ball) {
  const ranked = fieldPlayersByBallDistance(players, team, ball);
  if (!ranked.length) return null;
  return switchControlTo(players, ranked[0].p);
}

/**
 * Manual switch (Tab / RB) — nearest to ball, RS direction, or next-closest; never array-index loop.
 */
export function manualPlayerSwitch(players, team, ball, stickDir = null) {
  const stickLen = stickDir ? Math.hypot(stickDir.x, stickDir.y) : 0;
  if (stickLen > 0.35) {
    return switchByStickDirection(players, team, ball, stickDir);
  }

  const ranked = fieldPlayersByBallDistance(players, team, ball);
  if (!ranked.length) return null;

  const cur = players.find((p) => p.team === team && p.controlled);
  if (!cur) return switchControlTo(players, ranked[0].p);

  const dCur = Math.hypot(cur.x - ball.x, cur.y - ball.y);
  const dNear = ranked[0].d;

  if (dCur > dNear + 2.5 || dCur > 14) {
    return switchControlTo(players, ranked[0].p);
  }

  const curIdx = ranked.findIndex((r) => r.p.id === cur.id);
  const nextIdx = curIdx < 0 ? 0 : (curIdx + 1) % ranked.length;
  return switchControlTo(players, ranked[nextIdx].p);
}

export function switchByStickDirection(players, team, ball, dir) {
  const pool = players.filter((p) => p.team === team && !p.isGk);
  if (!pool.length || !dir) return switchToNearestToBall(players, team, ball);

  let best = null;
  let bestScore = -Infinity;
  const len = Math.hypot(dir.x, dir.y) || 1;
  const nx = dir.x / len;
  const ny = dir.y / len;

  pool.forEach((p) => {
    const px = p.x - ball.x;
    const py = p.y - ball.y;
    const align = px * nx + py * ny;
    const dist = Math.hypot(px, py);
    const score = align * 2 - dist * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  });

  if (best) return switchControlTo(players, best);
  return null;
}

/**
 * Prefer pass target; otherwise nearest when far from ball.
 */
export function autoSwitchIfNeeded(players, team, ball, passSwitchToId = null) {
  const cur = players.find((p) => p.team === team && p.controlled);

  if (passSwitchToId != null) {
    const recv = players.find((p) => p.id === passSwitchToId && !p.isGk);
    if (recv) {
      const dRecv = Math.hypot(recv.x - ball.x, recv.y - ball.y);
      if (cur?.id === recv.id) return cur;
      if (dRecv < 24) return switchControlTo(players, recv) || cur;
    }
  }

  const d = cur ? Math.hypot(cur.x - ball.x, cur.y - ball.y) : 999;
  if (d < 9) return cur;
  return switchToNearestToBall(players, team, ball) || cur;
}
