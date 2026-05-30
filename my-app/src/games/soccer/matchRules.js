import {
  TEAM_HOME,
  TEAM_AWAY,
  attackingSign,
  CENTER_CIRCLE_R,
} from './pitchConstants';
import { getHalfL, getHalfW, getOriginX, getOriginY } from './playBounds';

/**
 * Offside (FIFA Law 11 simplified): at pass, receiver ahead of second-last defender
 * and past the ball, in opponents' half.
 */
export function checkOffside(passer, receiver, defenders, passLineY, phase = 'play') {
  if (
    phase === 'throw' ||
    phase === 'corner' ||
    phase === 'goal_kick' ||
    phase === 'penalty_kick'
  ) {
    return false;
  }
  if (passer.team !== receiver.team) return false;
  const sign = attackingSign(passer.team);
  const oy = getOriginY();
  const inOppHalf = sign * (receiver.y - oy) > 0.8;
  if (!inOppHalf) return false;

  const sorted = defenders
    .filter((d) => d.team !== passer.team)
    .map((d) => d.y)
    .sort((a, b) => sign * (b - a));

  const secondLast = sorted[1] ?? sorted[0] ?? oy + sign * -getHalfL();
  const aheadOfBall = sign * (receiver.y - passLineY) > 0.05;
  const aheadOfLine = sign * (receiver.y - secondLast) > 0.08;
  return aheadOfBall && aheadOfLine;
}

export function createMatchState() {
  return {
    homeScore: 0,
    awayScore: 0,
    clockSec: 0,
    half: 1,
    phase: 'kickoff',
    phaseTimer: 2,
    message: 'Kick off',
    offside: false,
    setPieceTeam: TEAM_HOME,
    setPiecePos: { x: 0, y: 0 },
    setPieceTakerId: null,
    manualOnly: false,
    lastTouchTeam: TEAM_HOME,
    passSwitchToId: null,
    callForPassId: null,
    callForPassTimer: 0,
    restartLock: 0,
    // possession / director — updated each play frame by tickMatchDirector
    possessionTeam: 0,
    homeInPossession: false,
    awayInPossession: false,
    ballLoose: false,
    buildUpZone: false,
    finalThirdHome: false,
    finalThirdAway: false,
    director: {
      homePressIntensity: 0.7,
      awayPressIntensity: 0.7,
      homeLinePush: 0,
      awayLinePush: 0,
    },
  };
}

export function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function resetKickoff(match, team) {
  match.phase = 'kickoff';
  match.phaseTimer = 2;
  match.setPieceTeam = team;
  match.message = team === TEAM_HOME ? 'Home kick off' : 'Away kick off';
  match.offside = false;
  return { ball: { x: 0, y: 0, z: 0.11, vx: 0, vy: 0, vz: 0 } };
}

export function awardSetPiece(match, type, team, x, y) {
  match.phase = type;
  match.phaseTimer = type === 'throw' && team === TEAM_HOME ? 0 : 8;
  match.manualOnly = type === 'throw' && team === TEAM_HOME;
  match.setPieceTeam = team;
  const ox = getOriginX();
  const oy = getOriginY();
  const hw = getHalfW();
  const hl = getHalfL();
  match.setPiecePos = {
    x: Math.max(ox - hw + 0.8, Math.min(ox + hw - 0.8, x)),
    y: Math.max(oy - hl + 0.8, Math.min(oy + hl - 0.8, y)),
  };
  const names = {
    throw: 'Throw-in',
    corner: 'Corner kick',
    goal_kick: 'Goal kick',
    offside: 'Offside — indirect free kick',
    foul: 'Free kick',
    penalty_kick: 'Penalty kick',
  };
  match.message = names[type] || 'Set piece';
}

export function canPlayBall(match) {
  return match.phase === 'play' || match.phase === 'kickoff';
}

export function isInCenterCircle(x, y) {
  return x * x + y * y < CENTER_CIRCLE_R * CENTER_CIRCLE_R;
}
