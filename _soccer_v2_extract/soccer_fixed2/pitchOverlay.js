import * as THREE from 'three';
import {
  PITCH_WIDTH,
  PITCH_LENGTH,
  PENALTY_BOX_WIDTH,
  PENALTY_BOX_DEPTH,
  GOAL_AREA_WIDTH,
  GOAL_AREA_DEPTH,
  CENTER_CIRCLE_R,
  GOAL_WIDTH,
  GOAL_HEIGHT,
  GOAL_DEPTH,
  TEAM_HOME,
  TEAM_AWAY,
} from './pitchConstants';
import { defendLineY, getOriginX } from './playBounds';

const LINE_Y = 0.14;
const LINE_W = 0.24;
const LINE_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  depthTest: false,
  depthWrite: false,
});

function addLine(group, w, d, x, z) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), LINE_MAT);
  m.name = 'PitchLine';
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, LINE_Y, z);
  m.renderOrder = 40;
  group.add(m);
}

export function buildPitchLines() {
  const markings = new THREE.Group();
  markings.name = 'PitchMarkings';
  const hw = PITCH_WIDTH / 2;
  const hl = PITCH_LENGTH / 2;

  addLine(markings, PITCH_WIDTH + LINE_W, LINE_W, 0, 0);
  addLine(markings, PITCH_WIDTH + LINE_W, LINE_W, 0, hl);
  addLine(markings, PITCH_WIDTH + LINE_W, LINE_W, 0, -hl);
  addLine(markings, LINE_W, PITCH_LENGTH + LINE_W, hw, 0);
  addLine(markings, LINE_W, PITCH_LENGTH + LINE_W, -hw, 0);

  const pbw = PENALTY_BOX_WIDTH / 2;
  const pbd = PENALTY_BOX_DEPTH;
  const gaw = GOAL_AREA_WIDTH / 2;
  const gad = GOAL_AREA_DEPTH;

  [-1, 1].forEach((side) => {
    const z = side * hl;
    addLine(markings, PENALTY_BOX_WIDTH, LINE_W * 0.9, 0, z - (side * pbd) / 2);
    addLine(markings, LINE_W * 0.9, pbd, pbw, z - (side * pbd) / 2);
    addLine(markings, LINE_W * 0.9, pbd, -pbw, z - (side * pbd) / 2);
    addLine(markings, GOAL_AREA_WIDTH, LINE_W * 0.9, 0, z - (side * gad) / 2);
    addLine(markings, LINE_W * 0.9, gad, gaw, z - (side * gad) / 2);
    addLine(markings, LINE_W * 0.9, gad, -gaw, z - (side * gad) / 2);
  });

  const circle = new THREE.Mesh(
    new THREE.RingGeometry(CENTER_CIRCLE_R - 0.15, CENTER_CIRCLE_R + 0.15, 48),
    LINE_MAT
  );
  circle.name = 'PitchLine';
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = LINE_Y;
  circle.renderOrder = 40;
  markings.add(circle);
  return markings;
}

function buildGoal(defendTeam) {
  const g = new THREE.Group();
  g.name = defendTeam === TEAM_HOME ? 'ScorpioGoal_Home' : 'ScorpioGoal_Away';
  g.userData.defendTeam = defendTeam;
  const hw = GOAL_WIDTH / 2;
  const h = GOAL_HEIGHT;
  const postMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
  const r = 0.14;

  const postGeo = new THREE.CylinderGeometry(r, r, h, 12);
  const left = new THREE.Mesh(postGeo, postMat);
  left.position.set(-hw, h / 2 + 0.1, 0);
  const right = new THREE.Mesh(postGeo, postMat);
  right.position.set(hw, h / 2 + 0.1, 0);
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, GOAL_WIDTH + r * 2, 12),
    postMat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, h + 0.1, 0);

  const sign = defendTeam === TEAM_HOME ? 1 : -1;
  const net = new THREE.Mesh(
    new THREE.BoxGeometry(GOAL_WIDTH, h, GOAL_DEPTH),
    new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  net.position.set(0, h / 2 + 0.1, -sign * (GOAL_DEPTH / 2 + 0.08));
  g.add(left, right, bar, net);
  g.position.set(getOriginX(), 0, defendLineY(defendTeam));
  g.rotation.y = sign > 0 ? 0 : Math.PI;
  g.traverse((c) => {
    if (c.isMesh) c.renderOrder = 45;
  });
  return g;
}

/** Single pair of runtime goals — use this only (hide GLB goals). */
export function createRuntimeGoals() {
  const goals = new THREE.Group();
  goals.name = 'ScorpioRuntimeGoals';
  goals.add(buildGoal(TEAM_HOME), buildGoal(TEAM_AWAY));
  return goals;
}

/** White lines only (for use with Blender stadium). */
export function createLinesOverlay() {
  const root = new THREE.Group();
  root.name = 'LinesOverlay';
  root.add(buildPitchLines());
  return root;
}

/** Lines + goals (fallback pitch). */
export function createGameplayOverlay() {
  const root = new THREE.Group();
  root.name = 'GameplayOverlay';
  root.add(buildPitchLines());
  root.add(createRuntimeGoals());
  return root;
}
