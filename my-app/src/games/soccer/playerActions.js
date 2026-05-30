import { kickBall } from './ballPhysics';
import { triggerKickAnimation } from './playerAnimation';
import { checkOffside, awardSetPiece } from './matchRules';
import { attackingSign, TEAM_HOME, TEAM_AWAY } from './pitchConstants';
import { findCrossTarget } from './players';
import {
  getPassAimDirection,
  findPassTarget,
  passPowerForDistance,
} from './passTargeting';

const KICK_RANGE = 1.85;

function playerKick(ball, active, dirX, dirY, power, opts = {}) {
  kickBall(ball, dirX, dirY, power, { ...opts, kickerId: active.id });
  triggerKickAnimation(active);
}

/** LS aim + slight bias toward the opponent goal (FIFA shot assist). */
export function shotDirection(active, aim, sign) {
  const passAim = getPassAimDirection(active, aim.x ?? 0, aim.y ?? 0);
  let sx = passAim.x;
  let sy = passAim.y;
  const goalX = 0;
  const goalY = sign;
  const bias = 0.28;
  sx = sx * (1 - bias) + goalX * bias;
  sy = sy * (1 - bias) + goalY * bias;
  const len = Math.hypot(sx, sy) || 1;
  return { x: sx / len, y: sy / len };
}

export function tryPlayerActions(active, ball, players, match, actions, aim = {}) {
  if (!active) return false;
  const d = Math.hypot(active.x - ball.x, active.y - ball.y);
  const inPossession = ball.possessionId === active.id;
  if (d > KICK_RANGE && !(inPossession && d < KICK_RANGE + 0.55)) return false;

  const mates = players.filter((p) => p.team === active.team && p.id !== active.id);
  const opponents = players.filter((p) => p.team !== active.team);
  const sign = attackingSign(active.team);
  const powerMul = actions.finesse ? 0.78 : 1;
  const driven = actions.driven;
  const passAim = getPassAimDirection(active, aim.x ?? 0, aim.y ?? 0);

  if (actions.shoot) {
    const dir = shotDirection(active, aim, sign);
    playerKick(ball, active, dir.x, dir.y, (driven ? 20 : 18) * powerMul, {
      lift: actions.finesse ? 1.8 : 3.2,
      offsetSide: actions.finesse ? 0.05 : 0,
      sideSpin: actions.finesse ? sign * 14 : sign * 4,
      spinScale: 1.2,
    });
    match.lastTouchTeam = active.team;
    match.passSwitchToId = null;
    return 'shoot';
  }

  if (actions.through) {
    const target = findPassTarget(mates, active, opponents, passAim, {
      through: true,
    });
    if (target) {
      const dist = Math.hypot(target.x - active.x, target.y - active.y);
      playerKick(ball, active, target.x - active.x, target.y - active.y, passPowerForDistance(dist, false, true) * powerMul, {
        lift: 1.2,
        offsetForward: 0.03,
      });
      match.lastTouchTeam = active.team;
      if (active.team === TEAM_HOME) match.passSwitchToId = target.id;
      return 'through';
    }
  }

  if (actions.cross) {
    const target = findCrossTarget(players, active.team, active) || mates[0];
    if (target) {
      playerKick(ball, active, target.x - active.x, target.y - active.y, 13 * powerMul, {
        lift: 6,
        offsetSide: 0.04,
        sideSpin: sign * 8,
      });
      match.lastTouchTeam = active.team;
      return 'cross';
    }
  }

  if (actions.lob) {
    const tx = active.x + passAim.x * 5;
    const ty = active.y + passAim.y * 5;
    playerKick(ball, active, tx - ball.x, ty - ball.y, 10 * powerMul, {
      lift: 7,
      offsetUp: 0.05,
      sideSpin: -sign * 3,
    });
    match.lastTouchTeam = active.team;
    return 'lob';
  }

  if (actions.pass) {
    const target =
      findPassTarget(mates, active, opponents, passAim, { driven }) || mates[0];
    if (target && checkOffside(active, target, opponents, active.y, match.phase)) {
      awardSetPiece(
        match,
        'offside',
        active.team === TEAM_HOME ? TEAM_AWAY : TEAM_HOME,
        target.x,
        target.y
      );
      ball.vx = ball.vy = ball.vz = 0;
      ball.wx = ball.wy = ball.wz = 0;
      return 'offside';
    }
    if (target) {
      const dist = Math.hypot(target.x - active.x, target.y - active.y);
      const pwr = passPowerForDistance(dist, driven, false) * powerMul;
      playerKick(ball, active, target.x - active.x, target.y - active.y, pwr, {
        lift: driven ? 0.8 : 0,
        offsetForward: driven ? 0.02 : 0,
        carry: 0,
      });
      match.lastTouchTeam = active.team;
      if (active.team === TEAM_HOME) {
        match.passSwitchToId = target.id;
      }
      return 'pass';
    }
  }

  return false;
}
