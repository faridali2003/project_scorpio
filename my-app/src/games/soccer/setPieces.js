import {
  GOAL_AREA_DEPTH,
  GOAL_AREA_WIDTH,
  PENALTY_BOX_DEPTH,
  PENALTY_BOX_WIDTH,
  PENALTY_SPOT,
  TEAM_HOME,
  TEAM_AWAY,
  attackingSign,
  BALL_RADIUS,
} from './pitchConstants';
import {
  defendLineY,
  getHalfL,
  getHalfW,
  getOriginX,
  getOriginY,
  toLocal,
} from './playBounds';
import { kickBall } from './ballPhysics';
import { shotDirection } from './playerActions';

const SET_PHASES = new Set([
  'kickoff',
  'goal_kick',
  'corner',
  'throw',
  'foul',
  'penalty_kick',
  'offside',
]);

/** Foul location inside the fouling team's penalty area → penalty kick. */
export function isFoulInPenaltyBox(x, y, foulingTeam) {
  const lx = x - getOriginX();
  const ly = y - getOriginY();
  if (Math.abs(lx) > PENALTY_BOX_WIDTH / 2) return false;
  const sign = attackingSign(foulingTeam);
  const hl = getHalfL();
  const goalLineLocal = -sign * hl;
  const innerLocal = goalLineLocal + sign * PENALTY_BOX_DEPTH;
  const minY = Math.min(goalLineLocal, innerLocal);
  const maxY = Math.max(goalLineLocal, innerLocal);
  return ly >= minY && ly <= maxY;
}

function penaltySpotForFouledTeam(fouledTeam) {
  const foulingTeam = fouledTeam === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
  const sign = attackingSign(foulingTeam);
  const hl = getHalfL();
  const goalLineLocal = -sign * hl;
  const spotLocalY = goalLineLocal + sign * PENALTY_SPOT;
  return { x: getOriginX(), y: getOriginY() + spotLocalY };
}

export function isSetPiecePhase(phase) {
  return SET_PHASES.has(phase);
}

export function getMatchPhaseContext(match) {
  const setPiece = isSetPiecePhase(match.phase);
  const throwHome = match.phase === 'throw' && match.setPieceTeam === TEAM_HOME;
  return {
    canMove: match.phase === 'play' || setPiece,
    canSimulateBall: match.phase === 'play' || setPiece,
    canKickBall: match.phase === 'play' || setPiece,
    isSetPiece: setPiece,
    waitingRestart: setPiece && match.phaseTimer > 0 && !throwHome,
  };
}

export function setupSetPiece(match, ball, players) {
  const team = match.setPieceTeam;
  const sign = attackingSign(team);
  const halfGw = GOAL_AREA_WIDTH / 2 - 0.5;
  const ownLine = defendLineY(team);

  ball.vx = ball.vy = ball.vz = 0;
  ball.wx = ball.wy = ball.wz = 0;
  ball.guided = null;
  ball._accum = 0;
  ball.possessionId = null;
  match.setPieceTakerId = null;
  match.manualOnly = false;

  if (match.phase === 'goal_kick') {
    ball.x = getOriginX() + Math.max(-halfGw, Math.min(halfGw, (match.setPiecePos.x || 0) - getOriginX()));
    ball.y = ownLine + sign * (GOAL_AREA_DEPTH * 0.42);
    ball.z = BALL_RADIUS;
    placeGkOnBall(players, team, ball, match);
    match.message = 'Goal kick — move, press A / E to kick';
    match.phaseTimer = 8;
    return;
  }

  if (match.phase === 'corner') {
    const cornerLocal = toLocal(match.setPiecePos.x, match.setPiecePos.y);
    ball.x = getOriginX() + Math.sign(cornerLocal.x || 1) * (getHalfW() - 0.6);
    ball.y = getOriginY() + Math.sign(cornerLocal.y || sign) * (getHalfL() - 0.6);
    ball.z = BALL_RADIUS;
    assignFieldTaker(players, team, ball, match);
    match.message = 'Corner — move, press A / E';
    match.phaseTimer = 8;
    return;
  }

  if (match.phase === 'throw') {
    setupThrowIn(match, ball, players, team);
    return;
  }

  if (match.phase === 'foul') {
    const foulingTeam = team === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
    if (isFoulInPenaltyBox(match.setPiecePos.x, match.setPiecePos.y, foulingTeam)) {
      match.phase = 'penalty_kick';
    }
  }

  if (match.phase === 'penalty_kick') {
    const spot = penaltySpotForFouledTeam(team);
    ball.x = spot.x;
    ball.y = spot.y;
    ball.z = BALL_RADIUS;
    assignFieldTaker(players, team, ball, match);
    match.message = 'Penalty — move, press A / E to shoot';
    match.phaseTimer = 8;
    return;
  }

  if (match.phase === 'offside' || match.phase === 'foul') {
    ball.x = match.setPiecePos.x;
    ball.y = match.setPiecePos.y;
    ball.z = BALL_RADIUS;
    assignFieldTaker(players, team, ball, match);
    match.message = 'Free kick — move, press A / E';
    match.phaseTimer = 8;
    return;
  }

  if (match.phase === 'kickoff') {
    ball.x = getOriginX();
    ball.y = getOriginY();
    ball.z = BALL_RADIUS;
    assignFieldTaker(players, team, ball, match);
    match.message = match.message || 'Kick off — move, press A / E';
    match.phaseTimer = 8;
  }
}

function setupThrowIn(match, ball, players, team) {
  const throwLocal = toLocal(match.setPiecePos.x, match.setPiecePos.y);
  const side = Math.sign(throwLocal.x || 1);
  const ox = getOriginX();
  const oy = getOriginY();
  const hw = getHalfW();
  const hl = getHalfL();

  ball.x = ox + side * (hw - 0.25);
  ball.y = Math.max(oy - hl + 2, Math.min(oy + hl - 2, match.setPiecePos.y));
  ball.z = BALL_RADIUS;

  assignFieldTaker(players, team, ball, match, { throwSide: side });

  if (team === TEAM_HOME) {
    match.manualOnly = true;
    match.phaseTimer = 0;
    match.message = 'Throw-in — you have the ball. Move (LS), press A to throw';
  } else {
    match.manualOnly = false;
    match.phaseTimer = 5;
    match.message = 'Away throw-in…';
  }
}

function placeGkOnBall(players, team, ball, match) {
  players.forEach((p) => {
    p.controlled = false;
    p.vx = p.vy = 0;
  });
  const gk = players.find((p) => p.team === team && p.isGk);
  if (gk) {
    gk.x = ball.x;
    gk.y = ball.y - attackingSign(team) * 0.5;
    gk.facing = Math.atan2(attackingSign(team), 0);
    if (team === TEAM_HOME) {
      gk.controlled = true;
      match.setPieceTakerId = gk.id;
    }
  }
  if (team !== TEAM_HOME) {
    giveHomeDefaultControl(players, match);
  }
}

function giveHomeDefaultControl(players, match) {
  const home = players.find((p) => p.team === TEAM_HOME && !p.isGk && p.id === 6);
  if (home) {
    home.controlled = true;
    match.setPieceTakerId = home.id;
  }
}

function assignFieldTaker(players, team, ball, match, opts = {}) {
  players.forEach((p) => {
    p.controlled = false;
    p.vx = p.vy = 0;
  });

  const sign = attackingSign(team);
  const inwardX = opts.throwSide != null ? -opts.throwSide : 0;

  let taker = null;
  let best = Infinity;
  players
    .filter((p) => p.team === team && !p.isGk)
    .forEach((p) => {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < best) {
        best = d;
        taker = p;
      }
    });
  if (!taker) taker = players.find((p) => p.team === team && !p.isGk);

  if (taker) {
    taker.x = ball.x + inwardX * 0.55;
    taker.y = ball.y;
    taker.facing = Math.atan2(sign, inwardX !== 0 ? inwardX * 0.3 : 0);
    match.setPieceTakerId = taker.id;

    if (team === TEAM_HOME) {
      taker.controlled = true;
    } else {
      giveHomeDefaultControl(players, match);
    }
  }
}

/** Keep ball on touchline with the controlled taker during home throw-in. */
export function syncThrowInBall(match, ball, active) {
  if (match.phase !== 'throw' || match.setPieceTeam !== TEAM_HOME || !active) return;
  const local = toLocal(ball.x, ball.y);
  const side = Math.sign(local.x || 1);
  const ox = getOriginX();
  const oy = getOriginY();
  const hw = getHalfW();
  const hl = getHalfL();
  ball.y = Math.max(oy - hl + 2, Math.min(oy + hl - 2, active.y));
  ball.x = ox + side * (hw - 0.25);
  active.x = ball.x - side * 0.55;
  active.y = ball.y;
  ball.vx = ball.vy = ball.vz = 0;
}

export function resumeOpenPlay(match) {
  match.phase = 'play';
  match.phaseTimer = 0;
  match.message = '';
  match.offside = false;
  match.manualOnly = false;
  match.setPieceTakerId = null;
  match.restartLock = 0;
}

function autoTakeSetPiece(match, ball, players) {
  const team = match.setPieceTeam;
  const sign = attackingSign(team);
  const gk = players.find((p) => p.team === team && p.isGk);
  const taker =
    match.setPieceTakerId != null
      ? players.find((p) => p.id === match.setPieceTakerId)
      : players.find((p) => p.team === team && !p.isGk);

  const kicker = match.phase === 'goal_kick' && gk ? gk : taker;
  if (kicker) {
    if (match.phase === 'throw') {
      kickBall(ball, -Math.sign(toLocal(ball.x, ball.y).x || 1), sign * 0.3, 12, { lift: 1.2 });
    } else if (match.phase === 'penalty_kick') {
      kickBall(ball, 0, sign, 19, { lift: 2.8 });
    } else {
      kickBall(ball, 0, sign, match.phase === 'goal_kick' ? 14 : 12, {
        lift: match.phase === 'goal_kick' ? 2.2 : 1,
      });
    }
    match.lastTouchTeam = team;
  }
  resumeOpenPlay(match);
}

function executeHomeThrow(match, ball, active, passAim, actions) {
  let dx = passAim.x;
  let dy = passAim.y;
  const aimLen = Math.hypot(dx, dy);
  if (aimLen < 0.12) {
    dx = Math.cos(active.facing);
    dy = Math.sin(active.facing);
  } else {
    dx /= aimLen;
    dy /= aimLen;
  }

  const local = toLocal(ball.x, ball.y);
  const inward = -Math.sign(local.x || 1);
  if (dx * inward < 0.15) {
    dx = inward * 0.85 + dx * 0.2;
    dy *= 0.9;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
  }

  const power = actions.lob ? 13 : actions.through ? 14 : 11;
  const lift = actions.lob ? 2.5 : 0.6;
  kickBall(ball, dx, dy, power, { lift });
  match.lastTouchTeam = TEAM_HOME;
  resumeOpenPlay(match);
  return true;
}

export function tickMatchPhase(match, ball, players, dt, actions, active, passAim = { x: 0, y: 1 }) {
  if (match.phase === 'play') return false;

  if (!isSetPiecePhase(match.phase)) return false;

  if (match.phase === 'throw' && match.setPieceTeam === TEAM_HOME) {
    if (
      active &&
      active.team === TEAM_HOME &&
      (actions.pass || actions.lob || actions.through || actions.cross || actions.shoot)
    ) {
      return executeHomeThrow(match, ball, active, passAim, actions);
    }
    return false;
  }

  if (match.phaseTimer > 0) match.phaseTimer -= dt;

  const homeTook =
    active &&
    active.team === TEAM_HOME &&
    (actions.pass || actions.shoot || actions.lob || actions.cross || actions.through);

  if (homeTook) {
    const sign = attackingSign(active.team);
    const dir = shotDirection(active, passAim, sign);
    if (actions.shoot) kickBall(ball, dir.x, dir.y, 16, { lift: 3 });
    else kickBall(ball, dir.x, dir.y, 13, { lift: 1.5 });
    match.lastTouchTeam = active.team;
    resumeOpenPlay(match);
    return true;
  }

  if (!match.manualOnly && match.phaseTimer <= 0) {
    autoTakeSetPiece(match, ball, players);
    return true;
  }

  return false;
}
