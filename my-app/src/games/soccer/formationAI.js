import { attackingSign, TEAM_HOME, TEAM_AWAY } from './pitchConstants';
import { defendLineY } from './playBounds';
import { ballSpeed } from './ballPhysics';
import { isBallDribbling } from './ballPossession';
import { applyPlayerMotor } from './playerKinematics';
import { clampOutfield } from './bounds';

export const AI_STATE = {
  HOLD: 'hold',
  CHASE: 'chase',
  PRESS: 'press',
};

function outfield(players, team) {
  return players.filter((p) => p.team === team && !p.isGk);
}

/** Formation slot with ball shift + attack/defend line push from match director. */
export function getFormationAnchor(p, ball, match) {
  const sign = attackingSign(p.team);
  const pull = p.role === 'fwd' ? 0.16 : p.role === 'mid' ? 0.1 : 0.05;
  let ax = p.homeX + (ball.x - p.homeX) * pull;
  let ay = p.homeY + (ball.y - p.homeY) * pull;

  const dir = match?.director;
  const inPoss =
    (p.team === TEAM_HOME && match?.homeInPossession) ||
    (p.team === TEAM_AWAY && match?.awayInPossession);
  if (inPoss && dir) {
    const linePush = p.team === TEAM_HOME ? dir.homeLinePush : dir.awayLinePush;
    const push = (p.role === 'fwd' ? 8 : p.role === 'mid' ? 5 : 2) * (linePush || 0);
    ay += sign * push;
  }
  if (!inPoss && p.role === 'fwd' && match?.ballLoose) {
    ay += sign * 3;
  }
  return { x: ax, y: ay };
}

function moveToward(p, tx, ty, sprint, dt) {
  const dx = tx - p.x;
  const dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.4) {
    p.vx *= 0.85;
    p.vy *= 0.85;
    return;
  }
  applyPlayerMotor(p, dx / d, dy / d, sprint, dt, { keepFacing: false });
  if (d > 0.6) p.facing = Math.atan2(dy, dx);
}

function applySeparation(p, players, team, dt) {
  players.forEach((o) => {
    if (o.id === p.id || o.isGk) return;
    const dx = p.x - o.x;
    const dy = p.y - o.y;
    const d = Math.hypot(dx, dy);
    const minD = o.team === team ? 2.0 : 1.3;
    if (d >= minD || d < 1e-4) return;
    const push = ((minD - d) / d) * 4.5 * dt;
    p.vx += dx * push;
    p.vy += dy * push;
  });
}

/**
 * Strict roles: ONE chaser on loose ball, ONE presser vs dribbler, everyone else holds shape.
 */
export function tickFormationAI(players, ball, team, dt, opts = {}) {
  const { skipControlled = true, match = null } = opts;
  const pressIntensity =
    team === TEAM_HOME
      ? match?.director?.homePressIntensity ?? 0.7
      : match?.director?.awayPressIntensity ?? 0.7;
  const sign = attackingSign(team);
  const mates = outfield(players, team);

  const carrier = ball.possessionId != null
    ? players.find((pl) => pl.id === ball.possessionId)
    : null;
  const loose =
    !isBallDribbling(ball) &&
    ballSpeed(ball) > 0.5 &&
    ballSpeed(ball) < 16 &&
    (ball._kickCooldown ?? 0) <= 0;
  const enemyDribble =
    isBallDribbling(ball) && carrier && carrier.team !== team;

  const sorted = [...mates].sort(
    (a, b) =>
      Math.hypot(a.x - ball.x, a.y - ball.y) - Math.hypot(b.x - ball.x, b.y - ball.y)
  );

  const chaserId = loose && sorted[0] ? sorted[0].id : null;
  let presserId = null;
  if (enemyDribble && sorted[0]) {
    presserId = sorted.find((p) => p.role === 'def' || p.role === 'mid')?.id ?? sorted[0].id;
  }

  const defendLine = defendLineY(team);

  mates.forEach((p) => {
    if (skipControlled && p.controlled) return;

    const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
    let state = AI_STATE.HOLD;

    if (p.id === chaserId && dist < 28) {
      state = AI_STATE.CHASE;
    } else if (p.id === presserId && dist < 14 + pressIntensity * 6) {
      state = AI_STATE.PRESS;
    }

    p.aiState = state;

    if (state === AI_STATE.CHASE) {
      moveToward(p, ball.x, ball.y, false, dt);
    } else if (state === AI_STATE.PRESS && carrier) {
      const leadT = 0.4;
      const tx = carrier.x + (carrier.vx ?? 0) * leadT;
      const ty = carrier.y + (carrier.vy ?? 0) * leadT;
      moveToward(p, tx, ty, true, dt);
    } else {
      const anchor = getFormationAnchor(p, ball, match);
      if (p.role === 'def') {
        const lineDepth = 5 + (1 - pressIntensity) * 4;
        anchor.y = anchor.y * 0.4 + (defendLine + sign * lineDepth) * 0.6;
      } else if (p.role === 'fwd' && match?.finalThirdHome && team === TEAM_HOME && match.homeInPossession) {
        anchor.y += sign * 4;
      } else if (p.role === 'fwd' && match?.finalThirdAway && team === TEAM_AWAY && match.awayInPossession) {
        anchor.y += sign * 4;
      }
      moveToward(p, anchor.x, anchor.y, false, dt);
    }

    applySeparation(p, players, team, dt);
    clampOutfield(p);
  });
}
