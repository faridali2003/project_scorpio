import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { ARENA, getRuntimeBounds } from './arena';
import {
  findSurfaceBelow,
  hasCeilingAbove,
  movePlayerHorizontal,
} from './collision';
import { DEFAULT_GAME_SETTINGS } from './gameSettings';

export const STANDING_EYE_HEIGHT = 1.75;
export const CROUCH_EYE_HEIGHT = 1.05;
export const STEP_HEIGHT = 0.46;

const JUMP_VELOCITY = 6.5;
const GRAVITY = 24;
const PLAYER_RADIUS = 0.28;
const WALL_INSET = 0.35;
const BASE_WALK_SPEED = 7.8;
const GROUND_ACCEL = 32;
const GROUND_FRICTION = 24;
const LOOK_BASE = 0.0025;
const _PI_2 = Math.PI / 2;
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _wishVel = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function arenaExtent() {
  const runtime = getRuntimeBounds();
  if (runtime?.floorExtent) return runtime.floorExtent;
  if (runtime) return Math.max(runtime.width ?? 0, runtime.depth ?? 0, 24);
  return Math.max(ARENA.width, ARENA.depth, 24);
}

export function getArenaMoveSpeedMultiplier() {
  const extent = arenaExtent();
  return THREE.MathUtils.clamp(1 + (extent - 50) * 0.002, 1, 1.12);
}

export function getArenaBounds() {
  const runtime = getRuntimeBounds();
  if (runtime) {
    const floorY = runtime.floorY ?? 0;
    return {
      minX: runtime.minX,
      maxX: runtime.maxX,
      minZ: runtime.minZ,
      maxZ: runtime.maxZ,
      floorY,
      maxHeadY: floorY + Math.min((runtime.height ?? 8) - 0.35, 6.5),
    };
  }
  const halfW = ARENA.width / 2 - WALL_INSET - PLAYER_RADIUS;
  const halfD = ARENA.depth / 2 - WALL_INSET - PLAYER_RADIUS;
  return {
    minX: -halfW,
    maxX: halfW,
    minZ: -halfD,
    maxZ: halfD,
    floorY: 0,
    maxHeadY: 6.5,
  };
}

function applyMouseLook(controls, event, getSettings) {
  if (!controls.isLocked) return;

  const settings = getSettings?.() ?? DEFAULT_GAME_SETTINGS;
  const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  let movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
  if (settings.invertY) movementY = -movementY;

  const camera = controls.object;
  _euler.setFromQuaternion(camera.quaternion);

  const sens = settings.lookSensitivity * LOOK_BASE;
  _euler.y -= movementX * sens;
  _euler.x -= movementY * sens;
  _euler.x = Math.max(_PI_2 - controls.maxPolarAngle, Math.min(_PI_2 - controls.minPolarAngle, _euler.x));

  camera.quaternion.setFromEuler(_euler);
  controls.dispatchEvent({ type: 'change' });
}

export function createPlayerControls(camera, domElement, onLockChange, getSettings) {
  const controls = new PointerLockControls(camera, domElement);
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    crouch: false,
    jump: false,
  };

  let verticalVel = 0;
  let eyeHeight = STANDING_EYE_HEIGHT;
  let onGround = true;

  const keyMap = {
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',
  };

  const onMouseMove = (event) => applyMouseLook(controls, event, getSettings);

  const onKeyDown = (e) => {
    const k = keyMap[e.code];
    if (k) keys[k] = true;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') keys.crouch = true;
    if (e.code === 'Space') {
      keys.jump = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e) => {
    const k = keyMap[e.code];
    if (k) keys[k] = false;
    if (e.code === 'ControlLeft' || e.code === 'ControlRight') keys.crouch = false;
    if (e.code === 'Space') keys.jump = false;
  };

  const onLock = () => onLockChange?.(true);
  const onUnlock = () => {
    keys.forward = keys.backward = keys.left = keys.right = false;
    keys.crouch = false;
    keys.jump = false;
    _velocity.set(0, 0, 0);
    verticalVel = 0;
    onGround = true;
    onLockChange?.(false);
  };

  controls.connect();
  const doc = domElement.ownerDocument;
  doc.removeEventListener('mousemove', controls._onMouseMove);
  doc.addEventListener('mousemove', onMouseMove);

  controls.addEventListener('lock', onLock);
  controls.addEventListener('unlock', onUnlock);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  const update = (delta) => {
    if (!controls.isLocked) return;

    const settings = getSettings?.() ?? DEFAULT_GAME_SETTINGS;
    const maxSpeed = BASE_WALK_SPEED * (settings.moveSpeed ?? 1) * getArenaMoveSpeedMultiplier();
    const bounds = getArenaBounds();
    const mainFloor = bounds.floorY ?? 0;

    const targetEye = keys.crouch ? CROUCH_EYE_HEIGHT : STANDING_EYE_HEIGHT;
    eyeHeight = THREE.MathUtils.lerp(eyeHeight, targetEye, 1 - Math.exp(-14 * delta));

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() < 1e-6) _forward.set(0, 0, -1);
    else _forward.normalize();
    _right.crossVectors(_forward, UP).normalize();

    _move.set(0, 0, 0);
    if (keys.forward) _move.add(_forward);
    if (keys.backward) _move.sub(_forward);
    if (keys.right) _move.add(_right);
    if (keys.left) _move.sub(_right);

    const crouchMul = keys.crouch ? 0.55 : 1;
    const moving = _move.lengthSq() > 0;
    if (moving) {
      _move.normalize();
      _wishVel.copy(_move).multiplyScalar(maxSpeed * crouchMul);
    } else {
      _wishVel.set(0, 0, 0);
    }

    const rate = moving ? GROUND_ACCEL : GROUND_FRICTION;
    const blend = 1 - Math.exp(-rate * delta);
    _velocity.x = THREE.MathUtils.lerp(_velocity.x, _wishVel.x, blend);
    _velocity.z = THREE.MathUtils.lerp(_velocity.z, _wishVel.z, blend);

    movePlayerHorizontal(camera.position, eyeHeight, _velocity.x * delta, _velocity.z * delta);

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.minX, bounds.maxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.minZ, bounds.maxZ);

    const surfaceY = findSurfaceBelow(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      3
    );
    const groundEyeY = (surfaceY ?? mainFloor) + eyeHeight;

    if (onGround && keys.jump && Math.abs(camera.position.y - groundEyeY) < 0.2) {
      verticalVel = JUMP_VELOCITY;
      onGround = false;
    }

    if (!onGround) {
      verticalVel -= GRAVITY * delta;
      camera.position.y += verticalVel * delta;

      if (verticalVel > 0 && hasCeilingAbove(camera.position.x, camera.position.y, camera.position.z, 0.5)) {
        verticalVel = 0;
      }
    }

    const headMax = bounds.maxHeadY ?? mainFloor + 6.5;
    if (camera.position.y > headMax) {
      camera.position.y = headMax;
      verticalVel = 0;
    }

    const surfaceNow = findSurfaceBelow(camera.position.x, camera.position.y + 0.2, camera.position.z, 2.8);
    const snapEye = (surfaceNow ?? mainFloor) + eyeHeight;
    const feetY = camera.position.y - eyeHeight;
    const surfaceFeet = surfaceNow ?? mainFloor;

    if (camera.position.y <= snapEye + 0.05 || (verticalVel <= 0 && feetY <= surfaceFeet + STEP_HEIGHT + 0.1)) {
      if (surfaceFeet - feetY <= STEP_HEIGHT + 0.08 || verticalVel <= 0) {
        camera.position.y = snapEye;
        verticalVel = 0;
        onGround = true;
      }
    } else {
      onGround = false;
    }
  };

  const dispose = () => {
    controls.removeEventListener('lock', onLock);
    controls.removeEventListener('unlock', onUnlock);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    doc.removeEventListener('mousemove', onMouseMove);
    controls.disconnect();
  };

  return { controls, update, dispose, lock: () => controls.lock() };
}
