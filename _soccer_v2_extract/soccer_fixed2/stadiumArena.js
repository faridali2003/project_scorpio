import * as THREE from 'three';
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  GOAL_WIDTH,
  GOAL_HEIGHT,
  GOAL_DEPTH,
  PENALTY_BOX_DEPTH,
  PENALTY_BOX_WIDTH,
  GOAL_AREA_DEPTH,
  GOAL_AREA_WIDTH,
  CENTER_CIRCLE_R,
} from './pitchConstants';

function lineMat() {
  return new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
}

function grassMat(dark) {
  return new THREE.MeshStandardMaterial({
    color: dark ? 0x1a6b22 : 0x2a9a32,
    roughness: 0.92,
  });
}

function addLine(parent, w, h, x, y, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, 0.022);
  parent.add(m);
}

export function buildStadiumScene() {
  const root = new THREE.Group();
  root.name = 'StadiumRoot';

  const pitch = new THREE.Group();
  pitch.name = 'Pitch';

  const stripeN = 14;
  const stripeW = PITCH_LENGTH / stripeN;
  for (let i = 0; i < stripeN; i += 1) {
    const y = -PITCH_LENGTH / 2 + stripeW / 2 + i * stripeW;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH_WIDTH, stripeW),
      grassMat(i % 2 === 0)
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, y, 0.01);
    plane.receiveShadow = true;
    pitch.add(plane);
  }

  const runoff = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_WIDTH + 24, PITCH_LENGTH + 24),
    grassMat(true)
  );
  runoff.rotation.x = -Math.PI / 2;
  runoff.position.z = -0.005;
  pitch.add(runoff);

  const white = lineMat();
  const hw = PITCH_WIDTH / 2;
  const hl = PITCH_LENGTH / 2;
  const lw = 0.12;

  addLine(pitch, PITCH_WIDTH + lw, lw, 0, hl, white);
  addLine(pitch, PITCH_WIDTH + lw, lw, 0, -hl, white);
  addLine(pitch, lw, PITCH_LENGTH + lw, hw, 0, white);
  addLine(pitch, lw, PITCH_LENGTH + lw, -hw, 0, white);
  addLine(pitch, lw, PITCH_LENGTH + lw, 0, 0, white);

  const circle = new THREE.Mesh(
    new THREE.RingGeometry(CENTER_CIRCLE_R - lw / 2, CENTER_CIRCLE_R + lw / 2, 64),
    white
  );
  circle.rotation.x = -Math.PI / 2;
  circle.position.z = 0.023;
  pitch.add(circle);

  for (const sign of [-1, 1]) {
    const gy = sign * hl;
    addLine(pitch, PENALTY_BOX_WIDTH, lw, 0, gy - sign * PENALTY_BOX_DEPTH / 2, white);
    addLine(pitch, lw, PENALTY_BOX_DEPTH, -PENALTY_BOX_WIDTH / 2, gy - sign * PENALTY_BOX_DEPTH / 2, white);
    addLine(pitch, lw, PENALTY_BOX_DEPTH, PENALTY_BOX_WIDTH / 2, gy - sign * PENALTY_BOX_DEPTH / 2, white);
    addLine(pitch, GOAL_AREA_WIDTH, lw, 0, gy - sign * GOAL_AREA_DEPTH / 2, white);
    addLine(pitch, lw, GOAL_AREA_DEPTH, -GOAL_AREA_WIDTH / 2, gy - sign * GOAL_AREA_DEPTH / 2, white);
    addLine(pitch, lw, GOAL_AREA_DEPTH, GOAL_AREA_WIDTH / 2, gy - sign * GOAL_AREA_DEPTH / 2, white);
  }

  root.add(pitch);

  const goalMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.85, roughness: 0.25 });
  for (const sign of [-1, 1]) {
    const gy = sign * hl;
    const goal = new THREE.Group();
    goal.position.set(0, gy, 0);
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, GOAL_HEIGHT, 8);
    for (const gx of [-GOAL_WIDTH / 2, GOAL_WIDTH / 2]) {
      const post = new THREE.Mesh(postGeo, goalMat);
      post.position.set(gx, 0, GOAL_HEIGHT / 2);
      goal.add(post);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GOAL_WIDTH + 0.12, 8), goalMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0, GOAL_HEIGHT);
    goal.add(bar);
    const net = new THREE.Mesh(
      new THREE.BoxGeometry(GOAL_WIDTH, GOAL_DEPTH, GOAL_HEIGHT),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, transparent: true, opacity: 0.35 })
    );
    net.position.set(0, -sign * GOAL_DEPTH / 2, GOAL_HEIGHT / 2);
    goal.add(net);
    root.add(goal);
  }

  const standMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.95 });
  const tiers = 2;
  const tierH = 4;
  const tierD = 3.5;
  const pad = 8;
  for (let t = 0; t < tiers; t += 1) {
    const z = t * tierH + tierH / 2;
    const depth = tierD;
    const yN = hl + pad + t * tierD + depth / 2;
    const yS = -yN;
    const xE = hw + pad + t * tierD + depth / 2;
    const xW = -xE;
    const nsW = PITCH_WIDTH + pad * 2 + t * tierD * 2;
    const ewL = PITCH_LENGTH + pad * 2 + (t + 1) * tierD * 2;
    for (const [x, y, sx, sy] of [
      [0, yN, nsW, depth],
      [0, yS, nsW, depth],
      [xE, 0, depth, ewL],
      [xW, 0, depth, ewL],
    ]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, tierH), standMat);
      box.position.set(x, y, z);
      box.castShadow = true;
      box.receiveShadow = true;
      root.add(box);
    }
  }

  return root;
}

export function createStadiumLights(scene) {
  scene.fog = new THREE.Fog(0x6a8faa, 80, 280);

  const ambient = new THREE.AmbientLight(0xb8d4ff, 0.55);
  ambient.name = 'Stadium_Ambient';
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x1a3d12, 0.45);
  hemi.name = 'Stadium_Hemi';
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff5e8, 2.8);
  sun.name = 'Stadium_Sun';
  sun.position.set(40, -60, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  scene.add(sun);

  const floods = new THREE.Group();
  floods.name = 'Floodlights';
  const corners = [
    [-70, 55, 45],
    [70, 55, 45],
    [70, -55, 45],
    [-70, -55, 45],
  ];
  corners.forEach(([x, y, z], i) => {
    const spot = new THREE.SpotLight(0xfff8e8, 0, 120, Math.PI / 5, 0.35, 1);
    spot.position.set(x, y, z);
    spot.target.position.set(0, 0, 0);
    spot.castShadow = i === 0;
    spot.userData.nightEnergy = 5.5;
    floods.add(spot);
    floods.add(spot.target);
  });
  scene.add(floods);
}
