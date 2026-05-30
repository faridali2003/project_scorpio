import * as THREE from 'three';
import { getCollisionMeshes } from './collision';
import { getEnemyRoot, removeEnemy, ensureActiveTargets } from './enemies';

const _center = new THREE.Vector2(0, 0);
const _end = new THREE.Vector3();
const FIRE_COOLDOWN_MS = 220;
const TRACER_LIFE_MS = 70;

function playTone(freqStart, freqEnd, duration, vol, type = 'square') {
  if (vol <= 0) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 40), ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {
    /* optional */
  }
}

function playGunSound(getVolume) {
  const vol = (getVolume?.() ?? 0.85) * 0.14;
  playTone(180, 90, 0.06, vol, 'sawtooth');
}

function playHitSound(getVolume) {
  const vol = (getVolume?.() ?? 0.85) * 0.12;
  playTone(520, 180, 0.1, vol);
}

function collectEnemyMeshes(enemies) {
  const meshes = [];
  enemies.forEach((enemy) => {
    enemy.traverse((child) => {
      if (child.isMesh) meshes.push(child);
    });
  });
  return meshes;
}

function spawnTracer(scene, start, end) {
  const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
  const mat = new THREE.LineBasicMaterial({
    color: 0xffee88,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const line = new THREE.Line(geo, mat);
  line.renderOrder = 999;
  line.frustumCulled = false;
  scene.add(line);

  window.setTimeout(() => {
    scene.remove(line);
    geo.dispose();
    mat.dispose();
  }, TRACER_LIFE_MS);
}

function rayEndPoint(camera, raycaster, targets) {
  const collision = getCollisionMeshes();
  const all = [...targets, ...collision];
  raycaster.setFromCamera(_center, camera);

  if (all.length > 0) {
    const hits = raycaster.intersectObjects(all, false);
    if (hits.length > 0) {
      return hits[0].point.clone();
    }
  }

  raycaster.ray.at(40, _end);
  return _end.clone();
}

export function createShooting({
  camera,
  scene,
  domElement,
  enemies,
  isLocked,
  isEnabled,
  onKill,
  getKills,
  getDifficulty,
  getVolume,
}) {
  const raycaster = new THREE.Raycaster();
  let lastShot = 0;

  const shoot = () => {
    if (!isLocked() || !isEnabled()) return;
    const now = performance.now();
    if (now - lastShot < FIRE_COOLDOWN_MS) return;
    lastShot = now;

    playGunSound(getVolume);

    const difficulty = getDifficulty?.();
    const kills = getKills?.() ?? 0;
    if (difficulty) ensureActiveTargets(scene, enemies, difficulty, kills);

    const targets = collectEnemyMeshes(enemies);
    const muzzle = new THREE.Vector3();
    camera.getWorldPosition(muzzle);
    const end = rayEndPoint(camera, raycaster, targets);
    spawnTracer(scene, muzzle, end);

    raycaster.setFromCamera(_center, camera);
    if (targets.length > 0) {
      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length > 0) {
        const enemy = getEnemyRoot(hits[0].object);
        if (enemy && enemies.indexOf(enemy) >= 0) {
          removeEnemy(scene, enemies, enemy);
          playHitSound(getVolume);
          const newKills = kills + 1;
          onKill?.(newKills);
          if (difficulty) ensureActiveTargets(scene, enemies, difficulty, newKills);
        }
      }
    }
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    shoot();
  };

  domElement.addEventListener('mousedown', onMouseDown);

  return {
    shoot,
    dispose() {
      domElement.removeEventListener('mousedown', onMouseDown);
    },
  };
}
