import * as THREE from 'three';
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  PENALTY_BOX_WIDTH,
  PENALTY_BOX_DEPTH,
  GOAL_AREA_WIDTH,
  GOAL_AREA_DEPTH,
  CENTER_CIRCLE_R,
} from './pitchConstants';

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

/** Hide Blender goal meshes so only ScorpioRuntimeGoals show (one pair). */
export function hideGlbGoalMeshes(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = (o.name || '').toLowerCase();
    if (!n.includes('goal')) return;
    if (n.includes('keeper') || n.includes('goalie')) return;
    if (n.includes('goal_area') || n.includes('goalarea') || n.includes('penalty')) return;
    if (n.includes('scorpio') || n.includes('pitchline')) return;
    o.visible = false;
  });
}

export function hideStaticStadiumActors(root) {
  hideGlbGoalMeshes(root);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (/^(cyl|sph)\d*$/i.test(n)) {
      o.visible = false;
    }
  });
}

/** Hide ad boards / colored slabs / columns on the playing surface. */
export function hidePitchClutterMeshes(root) {
  const turf = new THREE.Box3();
  let hasTurf = false;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (/^Grass_Stripe|^Pitch_Base|^Pitch_Runoff|^Pitch$|^Fallback/i.test(n)) {
      turf.expandByObject(o);
      hasTurf = true;
    }
  });
  if (!hasTurf) {
    _box.setFromObject(root);
    turf.copy(_box);
  }

  turf.getSize(_size);
  const cx = (turf.min.x + turf.max.x) / 2;
  const cz = (turf.min.z + turf.max.z) / 2;
  const halfX = _size.x / 2 + 0.5;
  const halfZ = _size.z / 2 + 0.5;

  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (/^Grass|^Pitch|^Fallback|^MatchGoal|^ScorpioGoal/i.test(n)) return;

    _box.setFromObject(o);
    _box.getSize(_size);
    _box.getCenter(_center);

    const onPitch =
      Math.abs(_center.x - cx) < halfX &&
      Math.abs(_center.z - cz) < halfZ &&
      _center.y < turf.max.y + 12;

    const tallSlab =
      _size.y > 0.5 &&
      _size.y < 16 &&
      Math.min(_size.x, _size.z) < 3 &&
      Math.max(_size.x, _size.z) < 5;
    const skyColumn = _size.y > 20;

    if (skyColumn || (onPitch && tallSlab)) {
      o.visible = false;
    }

    if (/^Seat|^Fan|^Crowd|^Flag|^Banner|^Board|^Plane/i.test(n) && onPitch) {
      o.visible = false;
    }
  });
}

export function fixGrassStripeSeams(root) {
  let stripe = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (/^Grass_Stripe/i.test(n)) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        m.polygonOffset = true;
        m.polygonOffsetFactor = stripe % 2 === 0 ? -1 : -2;
        m.polygonOffsetUnits = stripe % 2 === 0 ? -1 : -2;
      });
      stripe += 1;
    }
  });
}

export function fixPitchMarkingZFight(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (/^(Circle|Torus|Line_|Mark_|Penalty|Center|FallbackMark)/i.test(n)) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        m.polygonOffset = true;
        m.polygonOffsetFactor = -2;
        m.polygonOffsetUnits = -2;
      });
      o.renderOrder = 2;
    }
  });
}

function addWhiteLine(root, w, l, x, z) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, l),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  m.name = 'FallbackMark';
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.04, z);
  root.add(m);
}

/** Full FIFA fallback: turf, lines, walls, seats — no GLB required. */
export function createFallbackStadium(scene) {
  const root = new THREE.Group();
  root.name = 'FallbackStadium';

  const hw = PITCH_WIDTH / 2;
  const hl = PITCH_LENGTH / 2;
  const stripeW = 6;
  const cols = Math.ceil(PITCH_WIDTH / stripeW);

  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry((hw + 22) * 2, (hl + 22) * 2),
    new THREE.MeshStandardMaterial({ color: 0x3d4a52, roughness: 1 })
  );
  deck.name = 'FallbackDeck';
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -0.02;
  root.add(deck);

  const track = new THREE.Mesh(
    new THREE.PlaneGeometry((hw + 5) * 2, (hl + 5) * 2),
    new THREE.MeshStandardMaterial({ color: 0x8b3a2a, roughness: 0.95 })
  );
  track.name = 'FallbackTrack';
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.005;
  root.add(track);

  for (let i = 0; i < cols; i += 1) {
    const mat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x3cb85c : 0x34a852,
      roughness: 0.88,
    });
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(stripeW, PITCH_LENGTH),
      mat
    );
    stripe.name = 'Grass_Stripe';
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-hw + stripeW * (i + 0.5), 0.03, 0);
    stripe.receiveShadow = true;
    root.add(stripe);
  }

  addWhiteLine(root, PITCH_WIDTH, 0.14, 0, 0);
  addWhiteLine(root, 0.14, PITCH_LENGTH, hw, 0);
  addWhiteLine(root, 0.14, PITCH_LENGTH, -hw, 0);
  addWhiteLine(root, PITCH_WIDTH, 0.14, 0, hl);
  addWhiteLine(root, PITCH_WIDTH, 0.14, 0, -hl);

  const pbw = PENALTY_BOX_WIDTH / 2;
  const pbd = PENALTY_BOX_DEPTH;
  const gaw = GOAL_AREA_WIDTH / 2;
  const gad = GOAL_AREA_DEPTH;

  [-1, 1].forEach((side) => {
    const z = side * hl;
    addWhiteLine(root, PENALTY_BOX_WIDTH, 0.1, 0, z - (side * pbd) / 2);
    addWhiteLine(root, 0.1, pbd, pbw, z - (side * pbd) / 2);
    addWhiteLine(root, 0.1, pbd, -pbw, z - (side * pbd) / 2);
    addWhiteLine(root, GOAL_AREA_WIDTH, 0.1, 0, z - (side * gad) / 2);
    addWhiteLine(root, 0.1, gad, gaw, z - (side * gad) / 2);
    addWhiteLine(root, 0.1, gad, -gaw, z - (side * gad) / 2);
  });

  const circle = new THREE.Mesh(
    new THREE.RingGeometry(CENTER_CIRCLE_R - 0.12, CENTER_CIRCLE_R + 0.12, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  circle.name = 'FallbackMark';
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = 0.045;
  root.add(circle);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a6578, roughness: 0.85 });
  const margin = 6;
  const wallH = 2.2;
  const outerW = hw + margin;
  const outerL = hl + margin;

  const addWall = (w, d, x, z) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    wall.position.set(x, wallH / 2 + 0.03, z);
    wall.receiveShadow = true;
    root.add(wall);
  };

  addWall(outerW * 2 + 2, 0.6, 0, outerL);
  addWall(outerW * 2 + 2, 0.6, 0, -outerL);
  addWall(0.6, outerL * 2, outerW, 0);
  addWall(0.6, outerL * 2, -outerW, 0);

  const seatColors = [0x1e3a5f, 0x243d66, 0x2a4570, 0x1a334f];
  for (let tier = 0; tier < 4; tier += 1) {
    const inset = margin + 2 + tier * 2.8;
    const seatMat = new THREE.MeshStandardMaterial({
      color: seatColors[tier % seatColors.length],
      roughness: 0.92,
    });
    const h = 1.8 + tier * 0.15;
    const addStand = (w, d, x, z) => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), seatMat);
      stand.position.set(x, h / 2 + 0.04 + tier * 0.12, z);
      stand.receiveShadow = true;
      root.add(stand);
    };
    addStand(outerW * 2 + 8, 2.2, 0, outerL + inset);
    addStand(outerW * 2 + 8, 2.2, 0, -outerL - inset);
    addStand(2.2, outerL * 2 + 8, outerW + inset, 0);
    addStand(2.2, outerL * 2 + 8, -outerW - inset, 0);
  }

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4, roughness: 0.5 });
  [[outerW, outerL], [-outerW, outerL], [outerW, -outerL], [-outerW, -outerL]].forEach(([px, pz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 14, 8), poleMat);
    pole.position.set(px, 7, pz);
    root.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.4, 0.6),
      new THREE.MeshStandardMaterial({
        color: 0xffffee,
        emissive: 0xffeedd,
        emissiveIntensity: 0.3,
      })
    );
    lamp.position.set(px, 13.5, pz);
    root.add(lamp);
  });

  scene.add(root);
  return root;
}

export function findStadiumBallTemplate(root) {
  let ball = null;
  root.traverse((o) => {
    if (!o.isMesh || !/^sph/i.test(o.name || '')) return;
    _box.setFromObject(o);
    _box.getSize(_size);
    _box.getCenter(_center);
    if (_size.x < 0.4 && _center.y < 0.5) {
      ball = o;
    }
  });
  return ball;
}
