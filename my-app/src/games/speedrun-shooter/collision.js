import * as THREE from 'three';

const PLAYER_RADIUS = 0.28;
const STEP_HEIGHT = 0.46;
const FEET_PROBE = [0.15, 0.55, 1.0];

const _ray = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
let collisionMeshes = [];

export function setCollisionMeshes(root) {
  collisionMeshes = [];
  if (!root) return;
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) collisionMeshes.push(obj);
  });
}

export function clearCollisionMeshes() {
  collisionMeshes = [];
}

export function getCollisionMeshes() {
  return collisionMeshes;
}

function isWallHit(hit) {
  if (!hit?.face) return true;
  return Math.abs(hit.face.normal.y) < 0.52;
}

function isFloorHit(hit) {
  return hit?.face && hit.face.normal.y > 0.52;
}

function isCeilingHit(hit) {
  return hit?.face && hit.face.normal.y < -0.52;
}

function raycastMeshes(origin, direction, maxDist) {
  _ray.set(origin, direction);
  _ray.far = maxDist;
  return _ray.intersectObjects(collisionMeshes, false);
}

function horizontalBlocked(feetX, feetY, feetZ, dirX, dirZ, dist) {
  if (!collisionMeshes.length) return false;
  const len = Math.hypot(dirX, dirZ);
  if (len < 1e-6) return false;
  _dir.set(dirX / len, 0, dirZ / len);

  for (let s = 0; s < FEET_PROBE.length; s += 1) {
    _origin.set(feetX, feetY + FEET_PROBE[s], feetZ);
    const hits = raycastMeshes(_origin, _dir, dist + PLAYER_RADIUS);
    for (let i = 0; i < hits.length; i += 1) {
      if (isWallHit(hits[i]) && hits[i].distance < PLAYER_RADIUS + 0.05) {
        return true;
      }
    }
  }
  return false;
}

/**
 * CS-style move: slide on X/Z with automatic step-up onto stairs and platforms.
 */
export function movePlayerHorizontal(position, eyeHeight, deltaX, deltaZ) {
  if (!collisionMeshes.length) {
    position.x += deltaX;
    position.z += deltaZ;
    return;
  }

  const tryAxis = (delta, axis) => {
    if (Math.abs(delta) < 1e-6) return;
    const feetY = position.y - eyeHeight;
    const feetX = position.x;
    const feetZ = position.z;

    const dirX = axis === 'x' ? Math.sign(delta) : 0;
    const dirZ = axis === 'z' ? Math.sign(delta) : 0;
    const dist = Math.abs(delta);

    for (let step = 0; step <= 1; step += 1) {
      const stepUp = step * STEP_HEIGHT;
      const testFeetY = feetY + stepUp;
      if (horizontalBlocked(feetX, testFeetY, feetZ, dirX, dirZ, dist)) continue;

      if (axis === 'x') position.x += delta;
      else position.z += delta;
      if (stepUp > 0) position.y += stepUp;
      return;
    }
  };

  tryAxis(deltaX, 'x');
  tryAxis(deltaZ, 'z');
}

/** Walkable surface under player (stairs, floor, platforms) */
export function findSurfaceBelow(x, y, z, maxDrop = 2.5) {
  if (!collisionMeshes.length) return null;
  _origin.set(x, y + 0.15, z);
  _dir.set(0, -1, 0);
  const hits = raycastMeshes(_origin, _dir, maxDrop + 1.5);
  for (let i = 0; i < hits.length; i += 1) {
    if (isFloorHit(hits[i])) return hits[i].point.y;
  }
  return null;
}

export function hasCeilingAbove(x, y, z, clearance = 1.0) {
  if (!collisionMeshes.length) return false;
  _origin.set(x, y, z);
  _dir.set(0, 1, 0);
  const hits = raycastMeshes(_origin, _dir, clearance);
  for (let i = 0; i < hits.length; i += 1) {
    if (isCeilingHit(hits[i]) && hits[i].distance < clearance) return true;
  }
  return false;
}

export function getMaxSpawnCenterY(bounds, diffMax = 5) {
  const floor = bounds.floorY ?? 0;
  const roomTop = floor + Math.min((bounds.height ?? 7) - 1.2, 5.8);
  return Math.min(roomTop, floor + diffMax);
}

export function isClearForTarget(x, y, z, radius) {
  if (!collisionMeshes.length) return true;
  if (hasCeilingAbove(x, y, z, radius + 0.9)) return false;

  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (let i = 0; i < dirs.length; i += 1) {
    const d = dirs[i];
    _dir.set(d[0], 0, d[2]);
    _origin.set(x, y, z);
    const hits = raycastMeshes(_origin, _dir, radius + 0.35);
    for (let j = 0; j < hits.length; j += 1) {
      if (isWallHit(hits[j]) && hits[j].distance < radius + 0.1) return false;
    }
  }
  return true;
}

export function findFloorY(x, z, fallback = 0) {
  const y = findSurfaceBelow(x, 80, z, 120);
  return y ?? fallback;
}
