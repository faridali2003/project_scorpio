import * as THREE from 'three';
import { BALL_RADIUS } from './pitchConstants';

/** Upright humanoid on XZ pitch (Three Y = up) with animatable limbs. */
export function createHumanoid({ kit = 0x1a5fcc, shorts = 0x0a2a6a, isGk = false, team = 0 }) {
  const group = new THREE.Group();
  const gkColor = team === 1 ? 0xffdd22 : 0x44ff77;
  const kitMat = new THREE.MeshStandardMaterial({
    color: isGk ? gkColor : kit,
    roughness: 0.62,
    metalness: 0.04,
    emissive: isGk ? (team === 1 ? 0x554400 : 0x115522) : 0x000000,
    emissiveIntensity: isGk ? 0.65 : 0,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: isGk ? (team === 1 ? 0xddaa11 : 0x1a8838) : shorts,
    roughness: 0.72,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe8b896, roughness: 0.82 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55 });

  const parts = {};

  const add = (mesh, x, y, z, key) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    if (key) parts[key] = mesh;
    return mesh;
  };

  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 10), bootMat), -0.1, 0.21, 0, 'legL');
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 10), bootMat), 0.1, 0.21, 0, 'legR');
  parts.torso = add(
    new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.48, 12), kitMat),
    0,
    0.92,
    0
  );
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.38, 10), shortsMat), 0, 0.52, 0);
  parts.head = add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), skinMat), 0, 1.32, 0);

  parts.armL = add(
    new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.09), kitMat),
    -0.24,
    0.95,
    0,
    'armL'
  );
  parts.armR = add(
    new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.09), kitMat),
    0.24,
    0.95,
    0,
    'armR'
  );

  if (isGk) {
    const gloves = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xffee00, roughness: 0.45 })
    );
    gloves.position.set(0, 0.92, 0.2);
    gloves.castShadow = true;
    group.add(gloves);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 24),
      new THREE.MeshBasicMaterial({
        color: team === 1 ? 0xffdd00 : 0x44ff88,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthTest: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.renderOrder = 1000;
    group.add(ring);

    group.scale.setScalar(1.65);
  }

  group.userData.humanoid = true;
  group.userData.isGk = isGk;
  group.userData.parts = parts;
  group.renderOrder = 20;
  return group;
}

export function syncBallMesh(mesh, ball, dt) {
  mesh.position.set(ball.x, ball.z, ball.y);
  const spin = Math.hypot(ball.wx ?? 0, ball.wy ?? 0, ball.wz ?? 0);
  if (spin > 0.25) {
    mesh.rotation.x += (ball.wx ?? 0) * dt;
    mesh.rotation.z += (ball.wz ?? 0) * dt;
    mesh.rotation.y += (ball.wy ?? 0) * dt * 0.4;
  }
  const sq = ball._squash ?? 0;
  const sx = 1 + sq * 0.14;
  const sy = 1 - sq * 0.2;
  mesh.scale.set(sx, sy, sx);
}

export function createMatchBall(templateMesh) {
  const geo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.08,
  });
  if (templateMesh?.material?.color) {
    mat.color.copy(templateMesh.material.color);
  }
  const ball = new THREE.Mesh(geo, mat);
  ball.castShadow = false;
  ball.receiveShadow = false;
  return ball;
}

export function createReferee() {
  const g = createHumanoid({ kit: 0x111111, shorts: 0x111111 });
  g.traverse((c) => {
    if (c.isMesh && c.material?.color) {
      if (c.position.y > 1.1) return;
      c.material = c.material.clone();
      c.material.color.setHex(0x111111);
    }
  });
  const badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xffdd00, side: THREE.DoubleSide })
  );
  badge.position.set(0, 0.95, 0.11);
  g.add(badge);
  return g;
}

export function syncHumanoid(group, x, y, facing, selected) {
  group.position.set(x, 0, y);
  group.rotation.y = -facing;
  const base = group.userData.isGk ? 1.45 : 1;
  const sy = selected ? base * 1.06 : base;
  group.scale.set(sy, sy, sy);
}

export function createPlayerIndicator() {
  const root = new THREE.Group();
  root.name = 'PlayerIndicator';

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffcc00,
    emissiveIntensity: 1.4,
    roughness: 0.35,
    metalness: 0.15,
  });

  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 12), mat);
  arrow.rotation.x = Math.PI;
  arrow.position.y = 2.05;
  root.add(arrow);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.52, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthTest: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 1.72;
  ring.renderOrder = 999;
  root.add(ring);

  root.traverse((c) => {
    if (c.isMesh) c.renderOrder = 998;
  });

  return root;
}

export function syncPlayerIndicator(indicator, player) {
  if (!indicator || !player) {
    if (indicator) indicator.visible = false;
    return;
  }
  indicator.visible = true;
  indicator.position.set(player.x, 0, player.y);
  indicator.rotation.y = -player.facing;
  const bob = Math.sin(performance.now() * 0.006) * 0.08;
  indicator.children[0].position.y = 2.05 + bob;
}
