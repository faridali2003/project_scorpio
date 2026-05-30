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
import { lockFifaPlayBounds } from './playBounds';

const HW = PITCH_WIDTH / 2;
const HL = PITCH_LENGTH / 2;

/** Draw FIFA markings onto grass texture (always aligned with physics). */
function createPitchTexture() {
  const W = 1024;
  const H = Math.round(W * (PITCH_LENGTH / PITCH_WIDTH));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const sx = W / PITCH_WIDTH;
  const sy = H / PITCH_LENGTH;
  const mx = W / 2;
  const my = H / 2;

  const stripeW = 6 * sx;
  for (let x = 0; x < W; x += stripeW) {
    ctx.fillStyle = Math.floor(x / stripeW) % 2 === 0 ? '#3cb85c' : '#34a852';
    ctx.fillRect(x, 0, stripeW, H);
  }

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, 0.12 * sx);
  ctx.lineCap = 'square';

  const line = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(mx + x1 * sx, my - y1 * sy);
    ctx.lineTo(mx + x2 * sx, my - y2 * sy);
    ctx.stroke();
  };

  line(-HW, -HL, HW, -HL);
  line(-HW, HL, HW, HL);
  line(-HW, -HL, -HW, HL);
  line(HW, -HL, HW, HL);
  line(-HW, 0, HW, 0);

  const pbw = PENALTY_BOX_WIDTH / 2;
  const pbd = PENALTY_BOX_DEPTH;
  const gaw = GOAL_AREA_WIDTH / 2;
  const gad = GOAL_AREA_DEPTH;

  [-1, 1].forEach((side) => {
    const gy = side * HL;
    line(-pbw, gy, pbw, gy);
    line(-pbw, gy, -pbw, gy - side * pbd);
    line(pbw, gy, pbw, gy - side * pbd);
    line(-gaw, gy, gaw, gy);
    line(-gaw, gy, -gaw, gy - side * gad);
    line(gaw, gy, gaw, gy - side * gad);
  });

  ctx.beginPath();
  ctx.arc(mx, my, CENTER_CIRCLE_R * sx, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildGoal(defendTeam) {
  const g = new THREE.Group();
  g.userData.defendTeam = defendTeam;
  const hw = GOAL_WIDTH / 2;
  const h = GOAL_HEIGHT;
  const postMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const r = 0.13;

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
      color: 0xcccccc,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  net.position.set(0, h / 2 + 0.1, -sign * (GOAL_DEPTH / 2 + 0.1));

  g.add(left, right, bar, net);
  const z = defendTeam === TEAM_HOME ? -HL : HL;
  g.position.set(0, 0, z);
  g.rotation.y = sign > 0 ? 0 : Math.PI;
  return g;
}

function buildArena() {
  const arena = new THREE.Group();
  arena.name = 'Arena';

  const margin = 7;
  const ow = HW + margin;
  const ol = HL + margin;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.9 });
  const seatColors = ['#c0392b', '#f1c40f', '#3498db', '#2ecc71'];

  const wall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.5, d), wallMat);
    m.position.set(x, 1.25, z);
    arena.add(m);
  };
  wall(ow * 2 + 4, 0.7, 0, ol);
  wall(ow * 2 + 4, 0.7, 0, -ol);
  wall(0.7, ol * 2 + 4, ow, 0);
  wall(0.7, ol * 2 + 4, -ow, 0);

  for (let tier = 0; tier < 3; tier += 1) {
    const inset = margin + 1.5 + tier * 2.2;
    const col = seatColors[tier % seatColors.length];
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 });
    const h = 2 + tier * 0.4;
    const add = (w, d, x, z) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      s.position.set(x, h / 2 + 0.05, z);
      arena.add(s);
    };
    add(ow * 2 + 6, 2, 0, ol + inset);
    add(ow * 2 + 6, 2, 0, -ol - inset);
    add(2, ol * 2 + 6, ow + inset, 0);
    add(2, ol * 2 + 6, -ow - inset, 0);
  }

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry((ow + 12) * 2, (ol + 12) * 2),
    new THREE.MeshStandardMaterial({ color: 0x2a3338, roughness: 1 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.y = -0.03;
  arena.add(runway);

  return arena;
}

/**
 * Complete pitch: grass+lines texture, goals, walls, seats.
 * One coordinate system — origin at centre spot, Y-up, game uses (x, z).
 */
export function buildPitchWorld() {
  lockFifaPlayBounds();

  const root = new THREE.Group();
  root.name = 'PitchWorld';

  root.add(buildArena());

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH_WIDTH, PITCH_LENGTH),
    new THREE.MeshStandardMaterial({
      map: createPitchTexture(),
      roughness: 0.9,
    })
  );
  grass.name = 'Grass_Stripe';
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = 0.06;
  grass.receiveShadow = true;
  root.add(grass);

  const goals = new THREE.Group();
  goals.name = 'MatchGoals';
  goals.add(buildGoal(TEAM_HOME), buildGoal(TEAM_AWAY));
  root.add(goals);

  return root;
}

export function getPitchWorldBounds() {
  return {
    minX: -HW,
    maxX: HW,
    minY: -HL,
    maxY: HL,
    halfW: HW,
    halfL: HL,
    width: PITCH_WIDTH,
    length: PITCH_LENGTH,
    height: 20,
    floorY: 0,
  };
}
