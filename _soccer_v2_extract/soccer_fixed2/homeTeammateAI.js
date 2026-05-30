import { TEAM_HOME } from './pitchConstants';
import { kickBall, ballSpeed } from './ballPhysics';
import { isBallDribbling } from './ballPossession';
import { passLaneBlockFactor, passPowerForDistance } from './passTargeting';
import { tickFormationAI } from './formationAI';
import { chaseBall } from './teamMovement';
import { triggerKickAnimation } from './playerAnimation';

export function resetHomeTeammateAI() {
  /* no-op */
}

/** Teammates hold shape; only pass to human when they request it (E / A). */
export function tickHomeTeammateAI(players, ball, match, dt) {
  tickFormationAI(players, ball, TEAM_HOME, dt, { skipControlled: true, match });

  if (match.passSwitchToId != null) {
    const recv = players.find((p) => p.id === match.passSwitchToId);
    if (recv && !recv.controlled) chaseBall(recv, ball, dt, 1.5);
    return;
  }

  if (!isBallDribbling(ball)) return;

  const ballCarrier =
    ball.possessionId != null ? players.find((p) => p.id === ball.possessionId) : null;
  const human = players.find((p) => p.team === TEAM_HOME && p.controlled);

  if (
    !ballCarrier ||
    ballCarrier.team !== TEAM_HOME ||
    ballCarrier.controlled ||
    ballCarrier.isGk ||
    !human ||
    human.id === ballCarrier.id
  ) {
    return;
  }

  if (
    match.callForPassId !== human.id ||
    match.callForPassTimer <= 0 ||
    ballSpeed(ball) > 2
  ) {
    return;
  }

  const opponents = players.filter((p) => p.team !== TEAM_HOME);
  const dist = Math.hypot(human.x - ballCarrier.x, human.y - ballCarrier.y);
  const laneBlock = passLaneBlockFactor(ballCarrier, human, opponents);

  if (dist < 4 || dist > 28 || laneBlock >= 0.75) return;

  kickBall(
    ball,
    human.x - ballCarrier.x,
    human.y - ballCarrier.y,
    passPowerForDistance(dist, false, false),
    { lift: 0.15, kickerId: ballCarrier.id }
  );
  triggerKickAnimation(ballCarrier);
  match.lastTouchTeam = TEAM_HOME;
  match.passSwitchToId = human.id;
  match.callForPassId = null;
  match.callForPassTimer = 0;
}
