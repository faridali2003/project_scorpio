/**
 * Bezier-guided shots for AI — small corrective forces each tick, not teleporting the ball.
 */
export function startGuidedShot(ball, targetX, targetY, durationSec, skill = 0.75) {
  ball.guided = {
    fromX: ball.x,
    fromY: ball.y,
    toX: targetX,
    toY: targetY,
    elapsed: 0,
    duration: Math.max(0.35, durationSec),
    skill: Math.min(1, Math.max(0.2, skill)),
  };
}

export function clearGuidedShot(ball) {
  ball.guided = null;
}

function bezier2(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** Apply corrective horizontal acceleration toward ideal path. */
export function applyGuidedShotForces(ball, dt) {
  const g = ball.guided;
  if (!g) return;

  g.elapsed += dt;
  const t = Math.min(1, g.elapsed / g.duration);
  if (t >= 1) {
    ball.guided = null;
    return;
  }

  const shotDist = Math.hypot(g.toX - g.fromX, g.toY - g.fromY);
  const curve = shotDist * 0.15;
  const midX = (g.fromX + g.toX) * 0.5;
  const midY = (g.fromY + g.toY) * 0.5 + Math.sign(g.toY - g.fromY) * curve;
  const ideal = bezier2(
    { x: g.fromX, y: g.fromY },
    { x: midX, y: midY },
    { x: g.toX, y: g.toY },
    t
  );

  const dx = ideal.x - ball.x;
  const dy = ideal.y - ball.y;
  const strength = 8 * g.skill;
  ball.vx += dx * strength * dt;
  ball.vy += dy * strength * dt;
}
