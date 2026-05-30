import { clampOutfield } from './bounds';
import { clampGoalkeeper } from './bounds';

/** Stop players stacking in one line. */
export function separatePlayers(players, minDist = 1.7) {
  const n = players.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const a = players[i];
      const b = players[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= minDist || d < 1e-4) continue;
      const push = ((minDist - d) / d) * 0.55;
      const px = dx * push;
      const py = dy * push;
      if (!a.isGk) {
        a.x -= px;
        a.y -= py;
      }
      if (!b.isGk) {
        b.x += px;
        b.y += py;
      }
    }
  }
  players.forEach((p) => {
    if (p.isGk) clampGoalkeeper(p);
    else clampOutfield(p);
  });
}
