import { syncHumanoid, syncBallMesh, syncPlayerIndicator } from './matchVisuals';
import { animateHumanoid } from './playerAnimation';
import { updateReferee } from './refereeAI';

/** Keep 3D meshes aligned with sim state every frame (menu, pause, play). */
export function syncMatchVisuals({
  players,
  ball,
  ballMesh,
  referee,
  playerIndicator,
  active,
  dt,
}) {
  players.forEach((p) => {
    if (p.mesh) animateHumanoid(p.mesh, p, ball, dt);
  });
  if (ballMesh && ball) syncBallMesh(ballMesh, ball, dt);
  if (referee && ball) updateReferee(referee, ball, dt);
  if (playerIndicator) syncPlayerIndicator(playerIndicator, active);
}

/** Menu preview — place meshes without run cycle. */
export function syncMatchVisualsStatic({ players, ball, ballMesh, referee, playerIndicator, active }) {
  players.forEach((p) => {
    if (p.mesh) syncHumanoid(p.mesh, p.x, p.y, p.facing, p.controlled);
  });
  if (ballMesh && ball) {
    ballMesh.position.set(ball.x, ball.z ?? 0.22, ball.y);
  }
  if (referee && ball) updateReferee(referee, ball, 0);
  if (playerIndicator) syncPlayerIndicator(playerIndicator, active);
}
