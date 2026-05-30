import { TEAM_HOME, TEAM_AWAY } from './pitchConstants';
import { getOriginY } from './playBounds';
import { ballSpeed } from './ballPhysics';

/** Match context for AI — who is attacking, pressing intensity, build-up zone. */
export function tickMatchDirector(ball, players, match) {
  const carrier =
    ball.possessionId != null ? players.find((p) => p.id === ball.possessionId) : null;
  const oy = getOriginY();
  const ballY = ball.y - oy;
  const sp = ballSpeed(ball);

  match.possessionTeam =
    carrier?.team ?? (match.lastTouchTeam === TEAM_HOME ? TEAM_HOME : TEAM_AWAY);
  match.homeInPossession = match.possessionTeam === TEAM_HOME;
  match.awayInPossession = match.possessionTeam === TEAM_AWAY;
  match.ballLoose = !carrier && sp > 0.4 && sp < 14;
  match.buildUpZone = Math.abs(ballY) < 22;
  match.finalThirdHome = ballY > 18;
  match.finalThirdAway = ballY < -18;

  const homePress = match.awayInPossession || (match.ballLoose && ballY < 8);
  const awayPress = match.homeInPossession || (match.ballLoose && ballY > -8);

  match.director = {
    homePressIntensity: homePress ? 1 : 0.45,
    awayPressIntensity: awayPress ? 1 : 0.45,
    homeLinePush: match.homeInPossession ? 0.35 : 0,
    awayLinePush: match.awayInPossession ? 0.35 : 0,
  };
}
