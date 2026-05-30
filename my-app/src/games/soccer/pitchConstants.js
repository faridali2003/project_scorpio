import { getHalfL, getHalfW, getOriginX, getOriginY } from './playBounds';

/** FIFA pitch & match constants (1 unit = 1 metre). */
export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;
export const GOAL_WIDTH = 7.32;
export const GOAL_DEPTH = 2.5;
export const GOAL_HEIGHT = 2.44;
export const PENALTY_BOX_DEPTH = 16.5;
export const PENALTY_BOX_WIDTH = 40.32;
export const GOAL_AREA_DEPTH = 5.5;
export const GOAL_AREA_WIDTH = 18.32;
export const PENALTY_SPOT = 11;
export const CENTER_CIRCLE_R = 9.15;
export const BALL_RADIUS = 0.22;
export const PLAYER_RADIUS = 0.42;
export const PLAYER_HEIGHT = 1.75;
/** Stickman-style: fast feet, still below ball shot speed. */
export const MAX_SPRINT = 15;
export const MAX_JOG = 12;
export const MATCH_HALF_SEC = 180;
export const HALFTIME_SEC = 8;

export const TEAM_HOME = 0;
export const TEAM_AWAY = 1;

/** Home attacks +Y, away attacks -Y. */
/** Goal line this team defends (home GK at -Y). */
export function goalY(team) {
  const oy = getOriginY();
  return team === TEAM_HOME ? oy - getHalfL() : oy + getHalfL();
}

/** Goal line this team attacks / scores in. */
export function attackGoalY(team) {
  const oy = getOriginY();
  return team === TEAM_HOME ? oy + getHalfL() : oy - getHalfL();
}

export function attackingSign(team) {
  return team === TEAM_HOME ? 1 : -1;
}

export function inPitch(x, y, margin = 0) {
  const lx = x - getOriginX();
  const ly = y - getOriginY();
  return (
    Math.abs(lx) <= getHalfW() - margin &&
    Math.abs(ly) <= getHalfL() - margin
  );
}

export function isGoal(x, y, teamDefending) {
  const scoringTeam = teamDefending === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
  const gy = attackGoalY(scoringTeam);
  const sign = attackingSign(scoringTeam);
  const halfGw = GOAL_WIDTH / 2 + 0.05;
  const depthIntoNet = (y - gy) * sign;
  return (
    Math.abs(x) <= halfGw &&
    depthIntoNet > 0 &&
    depthIntoNet <= GOAL_DEPTH + 0.2
  );
}
