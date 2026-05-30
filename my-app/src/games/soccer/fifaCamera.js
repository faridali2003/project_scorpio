import * as THREE from 'three';
import { attackingSign, TEAM_HOME } from './pitchConstants';

/**
 * FIFA gameplay camera — stable bearing, carrier follow, no midfield snap.
 */
export function createFifaCameraState() {
  return { camYaw: Math.PI / 2 };
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function clampTurn(current, target, maxStep) {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export function getCameraYaw(state) {
  return state.camYaw ?? Math.PI / 2;
}

export function readGamepadSticks(pad) {
  const move = readPair(pad, 0, 1);
  const cam = readPair(pad, 2, 3);
  return {
    move,
    cam,
    moveMag: Math.hypot(move.x, move.y),
    camMag: Math.hypot(cam.x, cam.y),
  };
}

function readPair(pad, ax, ay) {
  const DEAD = 0.14;
  let x = pad.axes[ax] ?? 0;
  let y = -(pad.axes[ay] ?? 0);

  const len = Math.hypot(x, y);
  if (len < DEAD) return { x: 0, y: 0 };

  const scaled = (len - DEAD) / (1 - DEAD);
  x = (x / len) * scaled;
  y = (y / len) * scaled;

  const outLen = Math.hypot(x, y);
  if (outLen > 1) {
    x /= outLen;
    y /= outLen;
  }
  return { x, y };
}

export function movementFromCameraYaw(camYaw, stickX, stickY) {
  const len = Math.hypot(stickX, stickY);
  if (len < 0.02) return { x: 0, y: 0 };

  const nx = stickX / len;
  const ny = stickY / len;
  const cos = Math.cos(camYaw);
  const sin = Math.sin(camYaw);
  const fwdX = cos;
  const fwdY = sin;
  const rightX = -sin;
  const rightY = cos;

  return {
    x: rightX * nx + fwdX * ny,
    y: rightY * nx + fwdY * ny,
  };
}

const BEHIND_BASE = 15.5;
const HEIGHT_BASE = 10.5;
const LOOK_AHEAD_BASE = 11;
const MAX_YAW_RATE = 3.1;
const POS_SMOOTH = 7.2;

export function updateFifaCamera(camera, state, player, ball, dt, team = TEAM_HOME) {
  if (!player) {
    const sign = attackingSign(team);
    const broadcastYaw = Math.atan2(sign, 0);
    const ballSpeed = Math.hypot(ball.vx ?? 0, ball.vy ?? 0);
    let targetYaw = broadcastYaw;
    if (ballSpeed > 2.5) {
      targetYaw = Math.atan2(ball.vy, ball.vx);
    }
    const yaw0 = state.camYaw ?? broadcastYaw;
    state.camYaw = clampTurn(yaw0, targetYaw, MAX_YAW_RATE * dt * 0.7);
    applyCameraPose(camera, ball.x, ball.y, state.camYaw, dt, 0.65, {
      behind: 22,
      height: 14,
      lookAhead: 8,
    });
    return;
  }

  const sign = attackingSign(team);
  const attackYaw = Math.atan2(sign, 0);
  const ballDist = Math.hypot(ball.x - player.x, ball.y - player.y);
  const toBall = Math.atan2(ball.y - player.y, ball.x - player.x);
  const hasBall = ball.possessionId === player.id;
  const playerSpd = Math.hypot(player.vx, player.vy);

  let targetYaw = attackYaw;
  if (hasBall) {
    targetYaw = lerpAngle(attackYaw, toBall, 0.35);
  } else if (ballDist < 28) {
    const blend = Math.min(0.55, (28 - ballDist) / 28);
    targetYaw = lerpAngle(attackYaw, toBall, blend);
  }

  const yaw0 = state.camYaw ?? targetYaw;
  state.camYaw = clampTurn(yaw0, targetYaw, MAX_YAW_RATE * dt);

  const focusT = hasBall ? 0.22 : ballDist < 24 ? 0.32 : 0.14;
  const fx = player.x * (1 - focusT) + ball.x * focusT;
  const fz = player.y * (1 - focusT) + ball.y * focusT;

  const behind = hasBall
    ? 11.5 + playerSpd * 0.1
    : BEHIND_BASE + Math.min(5, ballDist * 0.06);
  const height = (hasBall ? 9.5 : HEIGHT_BASE) + Math.min(3, playerSpd * 0.12);
  const lookAhead = hasBall ? 9 + playerSpd * 0.25 : LOOK_AHEAD_BASE;

  applyCameraPose(camera, fx, fz, state.camYaw, dt, 1, {
    behind,
    height,
    lookAhead,
    lookHeight: hasBall ? 1.05 : 1.35,
  });
}

function applyCameraPose(camera, fx, fz, yaw, dt, smoothMul, opts = {}) {
  const behind = opts.behind ?? BEHIND_BASE;
  const height = opts.height ?? HEIGHT_BASE;
  const lookAhead = opts.lookAhead ?? LOOK_AHEAD_BASE;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const desired = new THREE.Vector3(fx - cos * behind, height, fz - sin * behind);
  const k = (1 - Math.exp(-POS_SMOOTH * dt)) * smoothMul;
  camera.position.lerp(desired, k);
  const lookHeight = opts.lookHeight ?? 1.35;
  camera.lookAt(fx + cos * lookAhead, lookHeight, fz + sin * lookAhead);
}

export function menuBroadcastCamera(camera, dt, lookAt = { x: 0, y: 0.5, z: 0 }) {
  const desired = new THREE.Vector3(lookAt.x, 52, lookAt.z + 78);
  camera.position.lerp(desired, 1 - Math.exp(-3 * dt));
  camera.lookAt(lookAt.x, lookAt.y ?? 0.5, lookAt.z);
}
