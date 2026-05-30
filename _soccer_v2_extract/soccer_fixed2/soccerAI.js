/** Single AI entry — delegates to team modules used by the game loop. */
import { resetHomeTeammateAI, tickHomeTeammateAI } from './homeTeammateAI';
import { resetAwayTeamAI, tickAwayTeamAI } from './awayTeamAI';

export function resetSoccerAI() {
  resetHomeTeammateAI();
  resetAwayTeamAI();
}

export const tickHomeSoccerAI = tickHomeTeammateAI;
export const tickAwaySoccerAI = tickAwayTeamAI;
