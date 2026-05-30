import * as THREE from 'three';
import { ARENA, getRuntimeBounds } from './arena';
import { DEFAULT_DIFFICULTY_ID, getDifficulty } from './difficulties';
import { findFloorY, getMaxSpawnCenterY } from './collision';

const SPAWN_MARGIN_MIN = 2;
const WALL_INSET_MIN = 1;
const MIN_SPAWN_DIST_MIN = 4;
const MIN_ENEMY_SEPARATION = 2.2;
const TARGET_RADIUS = 0.52;
const SPAWN_ATTEMPTS = 10;

const BALLOON_COLORS = [0xfacc15, 0x22d3ee, 0xf97316, 0xa855f7, 0x4ade80, 0xfb7185];

const _vec = new THREE.Vector3();

let enemyTemplate = null;
let currentDifficulty = getDifficulty(DEFAULT_DIFFICULTY_ID);

function getDifficultySafe() {
  return currentDifficulty;
}

export function setSpawnDifficulty(difficultyId) {
  currentDifficulty = getDifficulty(difficultyId);
}

export function getSpawnDifficulty() {
  return currentDifficulty;
}

function disposeEnemyInstance(root) {
  root.traverse((obj) => {
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

function disposeObject3D(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

function spawnMargins(bounds) {
  const span = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ, 12);
  return {
    spawnMargin: Math.max(SPAWN_MARGIN_MIN, span * 0.04),
    wallInset: Math.max(WALL_INSET_MIN, span * 0.025),
    minCenterDist: Math.max(MIN_SPAWN_DIST_MIN, span * 0.07),
  };
}

export function getEnemySpawnBounds() {
  const runtime = getRuntimeBounds();
  if (runtime) {
    return {
      minX: runtime.minX,
      maxX: runtime.maxX,
      minZ: runtime.minZ,
      maxZ: runtime.maxZ,
      floorY: runtime.floorY ?? 0,
      height: runtime.height ?? ARENA.height,
      centerX: runtime.centerX ?? 0,
      centerZ: runtime.centerZ ?? 0,
      ...spawnMargins(runtime),
    };
  }
  const halfW = ARENA.width / 2 - SPAWN_MARGIN_MIN;
  const halfD = ARENA.depth / 2 - SPAWN_MARGIN_MIN;
  const fallback = {
    minX: -halfW,
    maxX: halfW,
    minZ: -halfD,
    maxZ: halfD,
    floorY: 0,
    height: ARENA.height,
    centerX: 0,
    centerZ: 0,
  };
  return { ...fallback, ...spawnMargins(fallback) };
}

function randomSpreadXZ(bounds) {
  const margin = bounds.spawnMargin ?? SPAWN_MARGIN_MIN;
  const spanX = bounds.maxX - bounds.minX - margin * 2;
  const spanZ = bounds.maxZ - bounds.minZ - margin * 2;
  const cols = Math.max(4, Math.floor(spanX / 6));
  const rows = Math.max(4, Math.floor(spanZ / 6));
  const col = Math.floor(Math.random() * cols);
  const row = Math.floor(Math.random() * rows);
  const jitter = () => (Math.random() - 0.5) * 0.5;
  return {
    x: bounds.minX + margin + ((col + 0.5 + jitter()) * spanX) / cols,
    z: bounds.minZ + margin + ((row + 0.5 + jitter()) * spanZ) / rows,
  };
}

function randomXZ(bounds, spread = true) {
  if (spread) return randomSpreadXZ(bounds);
  const margin = bounds.spawnMargin ?? SPAWN_MARGIN_MIN;
  return {
    x: THREE.MathUtils.randFloat(bounds.minX + margin, bounds.maxX - margin),
    z: THREE.MathUtils.randFloat(bounds.minZ + margin, bounds.maxZ - margin),
  };
}

function pickSpawnMode(weights) {
  const r = Math.random();
  let acc = 0;
  if (r < (acc += weights.floor)) return 'floor';
  if (r < (acc += weights.elevated)) return 'elevated';
  return 'wall';
}

function clampSpawnY(y, bounds, diff) {
  const floor = bounds.floorY ?? 0;
  const minY = floor + TARGET_RADIUS + 0.5;
  const maxY = getMaxSpawnCenterY(bounds, diff.wallHeightMax ?? 5);
  return THREE.MathUtils.clamp(y, minY, maxY);
}

function buildSpawnCandidate(bounds, diff) {
  const mode = pickSpawnMode(diff.spawn);
  const r = TARGET_RADIUS + 0.15;
  const maxY = getMaxSpawnCenterY(bounds, diff.wallHeightMax);

  if (mode === 'wall') {
    const inset = bounds.wallInset ?? WALL_INSET_MIN;
    const margin = bounds.spawnMargin ?? SPAWN_MARGIN_MIN;
    const face = Math.floor(Math.random() * 4);
    const y = clampSpawnY(
      THREE.MathUtils.randFloat(diff.wallHeightMin, Math.min(diff.wallHeightMax, maxY)),
      bounds,
      diff
    );
    const along = () => THREE.MathUtils.randFloat(bounds.minX + margin, bounds.maxX - margin);
    const alongZ = () => THREE.MathUtils.randFloat(bounds.minZ + margin, bounds.maxZ - margin);

    switch (face) {
      case 0:
        return { x: along(), z: bounds.minZ + inset + r, y, mode };
      case 1:
        return { x: along(), z: bounds.maxZ - inset - r, y, mode };
      case 2:
        return { x: bounds.minX + inset + r, z: alongZ(), y, mode };
      default:
        return { x: bounds.maxX - inset - r, z: alongZ(), y, mode };
    }
  }

  const { x, z } = randomXZ(bounds, true);
  const floor = findFloorY(x, z, bounds.floorY ?? 0);

  if (mode === 'elevated') {
    const elev = THREE.MathUtils.randFloat(
      diff.elevationMin,
      Math.min(diff.elevationMax, maxY - floor - r)
    );
    return { x, z, y: clampSpawnY(floor + elev + r, bounds, diff), mode };
  }

  return { x, z, y: floor + r + 0.4, mode: 'floor' };
}

function tooCloseToOthers(x, y, z, enemies) {
  for (let i = 0; i < enemies.length; i += 1) {
    _vec.set(x - enemies[i].position.x, y - enemies[i].position.y, z - enemies[i].position.z);
    if (_vec.length() < MIN_ENEMY_SEPARATION) return true;
  }
  return false;
}

function isValidSpawnPos(pos, bounds, enemies) {
  if (tooCloseToOthers(pos.x, pos.y, pos.z, enemies)) return false;
  if (pos.y > getMaxSpawnCenterY(bounds, 5.5)) return false;
  return true;
}

function openFloorSpawn(bounds) {
  const { x, z } = randomSpreadXZ(bounds);
  const floor = findFloorY(x, z, bounds.floorY ?? 0);
  return {
    x,
    z,
    y: floor + TARGET_RADIUS + 1.4,
    mode: 'floor',
  };
}

function findValidSpawn(diff, enemies, bounds) {
  for (let i = 0; i < SPAWN_ATTEMPTS; i += 1) {
    const pos = buildSpawnCandidate(bounds, diff);
    if (isValidSpawnPos(pos, bounds, enemies)) return pos;
  }
  return openFloorSpawn(bounds);
}

function createBalloonTemplate() {
  const group = new THREE.Group();
  group.name = 'balloonTargetTemplate';

  const color = BALLOON_COLORS[0];
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(TARGET_RADIUS, 20, 16),
    new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.55,
      roughness: 0.25,
      metalness: 0.05,
    })
  );
  core.name = 'balloonCore';
  core.castShadow = true;

  const ring = new THREE.Mesh(
    new THREE.SphereGeometry(TARGET_RADIUS * 1.06, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    })
  );
  ring.name = 'balloonRing';

  group.add(core);
  group.add(ring);
  group.userData.isEnemy = true;
  core.userData.isEnemy = true;
  ring.userData.isEnemy = true;

  return group;
}

function tintBalloon(enemy) {
  const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
  const core = enemy.getObjectByName('balloonCore');
  if (!core?.material) return;
  core.material = core.material.clone();
  core.material.color.setHex(color);
  core.material.emissive = new THREE.Color(color);
  core.material.emissiveIntensity = 0.55;
}

function initEnemyMotion(enemy, bounds) {
  const speed = THREE.MathUtils.randFloat(0.7, 1.6);
  const angle = Math.random() * Math.PI * 2;
  enemy.userData.moveVel = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  enemy.userData.baseY = enemy.position.y;
  enemy.userData.bounds = bounds;
}

export function loadEnemyTemplate() {
  if (!enemyTemplate) enemyTemplate = createBalloonTemplate();
  return Promise.resolve(enemyTemplate);
}

export function spawnEnemy(scene, difficulty = getDifficultySafe(), existing = []) {
  if (!enemyTemplate) {
    throw new Error('spawnEnemy: call loadEnemyTemplate() before spawning');
  }

  const bounds = getEnemySpawnBounds();
  const pos = findValidSpawn(difficulty, existing, bounds);

  const enemy = enemyTemplate.clone(true);
  enemy.position.set(pos.x, pos.y, pos.z);
  enemy.userData.isEnemy = true;
  enemy.userData.spawnMode = pos.mode;
  enemy.traverse((child) => {
    child.userData.isEnemy = true;
  });
  tintBalloon(enemy);
  initEnemyMotion(enemy, bounds);
  scene.add(enemy);
  return enemy;
}

export function spawnInitialEnemies(scene, difficulty = getDifficultySafe()) {
  const enemies = [];
  const want = difficulty.activeTargets ?? 3;
  for (let i = 0; i < want; i += 1) {
    enemies.push(spawnEnemy(scene, difficulty, enemies));
  }
  return enemies;
}

/** Keep the screen full of targets */
export function ensureActiveTargets(scene, enemies, difficulty, kills) {
  if (!difficulty) return;
  if (!difficulty.noWinLimit && kills >= difficulty.targetKills) return;

  const want = difficulty.activeTargets ?? 10;
  let guard = 0;
  while (enemies.length < want && guard < want + 5) {
    try {
      enemies.push(spawnEnemy(scene, difficulty, enemies));
    } catch (err) {
      console.warn('spawnEnemy failed:', err);
      break;
    }
    guard += 1;
  }
}

/** Gentle horizontal drift only (no vertical bob into ceiling) */
export function updateEnemies(enemies, delta) {
  enemies.forEach((enemy) => {
    const bounds = enemy.userData.bounds ?? getEnemySpawnBounds();
    const vel = enemy.userData.moveVel;
    if (!vel) return;

    const r = TARGET_RADIUS;
    const tryX = enemy.position.x + vel.x * delta;
    const tryZ = enemy.position.z + vel.z * delta;
    const y = enemy.userData.baseY ?? enemy.position.y;

    if (tryX < bounds.minX + r || tryX > bounds.maxX - r) vel.x *= -1;
    if (tryZ < bounds.minZ + r || tryZ > bounds.maxZ - r) vel.z *= -1;

    enemy.position.x = THREE.MathUtils.clamp(tryX, bounds.minX + r, bounds.maxX - r);
    enemy.position.z = THREE.MathUtils.clamp(tryZ, bounds.minZ + r, bounds.maxZ - r);
    enemy.position.y = y;
  });
}

export function getEnemyRoot(object) {
  let root = null;
  let o = object;
  while (o) {
    if (o.userData.isEnemy) root = o;
    o = o.parent;
  }
  return root;
}

export function removeEnemy(scene, enemies, enemy) {
  const index = enemies.indexOf(enemy);
  if (index >= 0) enemies.splice(index, 1);
  scene.remove(enemy);
  disposeEnemyInstance(enemy);
}

export function disposeEnemies(enemies) {
  enemies.forEach((enemy) => {
    enemy.parent?.remove(enemy);
    disposeEnemyInstance(enemy);
  });
  enemies.length = 0;
}

export function disposeEnemyTemplate() {
  if (enemyTemplate) {
    disposeObject3D(enemyTemplate);
    enemyTemplate = null;
  }
}
