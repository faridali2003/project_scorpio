import { TEAM_AWAY, attackingSign } from './pitchConstants';
import { kickBall, ballSpeed } from './ballPhysics';
import { isBallDribbling } from './ballPossession';
import { tickFormationAI } from './formationAI';
import { triggerKickAnimation } from './playerAnimation';
import { aiKickDecision, nearestToBall } from './players';

let kickCooldown = 0;

export function resetAwayTeamAI() {
  kickCooldown = 0;
}

function executeAwayKick(chaser, ball, outfield, opponents, match) {
  const act = aiKickDecision(chaser, ball, outfield, opponents);
  if (!act) return false;

  kickCooldown = 0.75;
  const sign = attackingSign(TEAM_AWAY);
  if (act.type === 'shoot') {
    const fx = Math.cos(chaser.facing) * 0.35;
    const fy = Math.sin(chaser.facing) * 0.35 + sign * 0.65;
    const fl = Math.hypot(fx, fy) || 1;
    kickBall(ball, fx / fl, fy / fl, act.power, {
      lift: act.lift ?? 2.8,
      kickerId: chaser.id,
    });
  } else if (act.type === 'pass' && act.target) {
    kickBall(
      ball,
      act.target.x - chaser.x,
      act.target.y - chaser.y,
      act.power,
      { lift: act.lift ?? 0.4, kickerId: chaser.id }
    );
  } else {
    return false;
  }
  match.lastTouchTeam = TEAM_AWAY;
  triggerKickAnimation(chaser);
  return true;
}

export function tickAwayTeamAI(players, ball, match, dt) {
  kickCooldown = Math.max(0, kickCooldown - dt);

  tickFormationAI(players, ball, TEAM_AWAY, dt, { skipControlled: false, match });

  const outfield = players.filter((p) => p.team === TEAM_AWAY && !p.isGk);
  const opponents = players.filter((p) => p.team !== TEAM_AWAY);
  const carrier =
    ball.possessionId != null ? players.find((p) => p.id === ball.possessionId) : null;

  if (kickCooldown > 0) return;

  if (isBallDribbling(ball)) {
    if (carrier?.team !== TEAM_AWAY) return;
    const carrierDist = Math.hypot(carrier.x - ball.x, carrier.y - ball.y);
    if (carrierDist > 1.2 || ballSpeed(ball) > 1.4) return;
    executeAwayKick(carrier, ball, outfield, opponents, match);
    return;
  }

  const chaser = nearestToBall(outfield, TEAM_AWAY, ball);
  if (!chaser) return;

  const chaserDist = Math.hypot(chaser.x - ball.x, chaser.y - ball.y);
  if (chaserDist > 1.2 || ballSpeed(ball) > 1.4) return;

  executeAwayKick(chaser, ball, outfield, opponents, match);
}
