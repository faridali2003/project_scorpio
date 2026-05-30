import { syncHumanoid } from './matchVisuals';

/** Procedural run cycle + kick pulse for stickman humanoids. */
export function animateHumanoid(group, player, ball, dt) {
  if (!group || !player) return;

  syncHumanoid(group, player.x, player.y, player.facing, player.controlled);

  const parts = group.userData.parts;
  if (!parts || group.userData.isGk) return;

  const spd = Math.hypot(player.vx, player.vy);
  const t = performance.now() * 0.001;
  const runFreq = 6.5 + spd * 0.45;
  const swing = Math.sin(t * runFreq) * Math.min(0.65, 0.08 + spd * 0.035);
  const hasBall = ball?.possessionId === player.id;
  const kickPulse = player._kickAnim ?? 0;

  if (parts.legL) parts.legL.rotation.x = swing;
  if (parts.legR) parts.legR.rotation.x = -swing;

  const armSwing = swing * 0.85;
  if (parts.armL) {
    parts.armL.rotation.x = -armSwing + kickPulse * 0.9;
    parts.armL.rotation.z = hasBall ? -0.35 : -0.08;
  }
  if (parts.armR) {
    parts.armR.rotation.x = armSwing;
    parts.armR.rotation.z = hasBall ? 0.35 : 0.08;
  }

  if (parts.torso) {
    parts.torso.rotation.x = Math.min(0.12, spd * 0.008);
  }

  if (player._kickAnim > 0) {
    player._kickAnim = Math.max(0, player._kickAnim - dt * 4.5);
  }
}

export function triggerKickAnimation(player) {
  if (player) player._kickAnim = 1;
}
