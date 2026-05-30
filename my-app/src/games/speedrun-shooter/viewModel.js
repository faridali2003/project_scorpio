import * as THREE from 'three';

/** Minecraft-style palette */
const COLORS = {
  skin: 0xc69c6d,
  shirt: 0x3c44aa,
  shirtDark: 0x2a3080,
  pants: 0x2e2e3a,
  gunMetal: 0x3a3f47,
  gunDark: 0x1a1d22,
  wood: 0x6b4423,
  accent: 0x22d3ee,
  glove: 0x252530,
};

const VIEW_ORDER = 10;
const VOX = 0.065;

function disposeObject3D(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function block(w, h, d, material, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.renderOrder = VIEW_ORDER;
  return mesh;
}

/**
 * Cohesive Minecraft-style FPS rig: chest, both arms, blocky rifle.
 * No GLTF — avoids broken white fragments from fps-arms export.
 */
function createMinecraftFpsRig() {
  const rig = new THREE.Group();
  rig.name = 'minecraftFpsRig';

  const mSkin = mat(COLORS.skin);
  const mShirt = mat(COLORS.shirt);
  const mShirtD = mat(COLORS.shirtDark);
  const mMetal = mat(COLORS.gunMetal);
  const mDark = mat(COLORS.gunDark);
  const mWood = mat(COLORS.wood);
  const mAccent = mat(COLORS.accent);
  const mGlove = mat(COLORS.glove);

  const v = VOX;

  // --- chest / shoulders (center-bottom of view) ---
  const chest = block(v * 5, v * 3.2, v * 2.2, mShirt, 'chest');
  chest.position.set(0.06, -v * 5.5, -v * 5);
  rig.add(chest);

  const chestTrim = block(v * 5.2, v * 0.6, v * 2.3, mShirtD, 'chestTrim');
  chestTrim.position.set(0.06, -v * 3.6, -v * 5);
  rig.add(chestTrim);

  // --- left arm (support hand toward gun) ---
  const lUpper = block(v * 1.4, v * 3.2, v * 1.4, mShirt, 'lUpper');
  lUpper.position.set(-v * 2.2, -v * 5.8, -v * 7.5);
  rig.add(lUpper);

  const lFore = block(v * 1.3, v * 2.8, v * 1.3, mSkin, 'lFore');
  lFore.position.set(-v * 1.5, -v * 7.8, -v * 9.2);
  lFore.rotation.z = 0.35;
  rig.add(lFore);

  const lHand = block(v * 1.5, v * 1.4, v * 1.6, mGlove, 'lHand');
  lHand.position.set(v * 0.8, -v * 8.6, -v * 10.5);
  rig.add(lHand);

  // --- right arm (weapon side) ---
  const rUpper = block(v * 1.5, v * 3.4, v * 1.5, mShirt, 'rUpper');
  rUpper.position.set(v * 4.8, -v * 5.2, -v * 6.8);
  rig.add(rUpper);

  const rFore = block(v * 1.4, v * 3, v * 1.4, mSkin, 'rFore');
  rFore.position.set(v * 5.2, -v * 7.5, -v * 8.5);
  rig.add(rFore);

  // --- crisp blocky rifle (finer voxels) ---
  const gun = new THREE.Group();
  gun.name = 'gun';
  const g = 0.042;

  const receiver = block(g * 3.2, g * 2.4, g * 9, mMetal, 'receiver');
  receiver.position.set(0, 0, -g * 2.5);
  gun.add(receiver);

  const topRail = block(g * 1.4, g * 0.5, g * 7.5, mDark, 'topRail');
  topRail.position.set(0, g * 1.5, -g * 2);
  gun.add(topRail);

  const barrel = block(g * 1.1, g * 1.1, g * 6.5, mDark, 'barrel');
  barrel.position.set(0, g * 0.35, -g * 8.8);
  gun.add(barrel);

  const muzzle = block(g * 1.4, g * 1.4, g * 1.2, mMetal, 'muzzle');
  muzzle.position.set(0, g * 0.35, -g * 12.2);
  gun.add(muzzle);

  const handguardL = block(g * 0.5, g * 1.2, g * 5, mDark, 'hgL');
  handguardL.position.set(-g * 1.1, g * 0.1, -g * 5.5);
  gun.add(handguardL);

  const handguardR = block(g * 0.5, g * 1.2, g * 5, mDark, 'hgR');
  handguardR.position.set(g * 1.1, g * 0.1, -g * 5.5);
  gun.add(handguardR);

  const stock = block(g * 2.2, g * 2.8, g * 4.5, mWood, 'stock');
  stock.position.set(0, g * 0.15, g * 4.8);
  gun.add(stock);

  const buttpad = block(g * 2.4, g * 2.2, g * 0.8, mGlove, 'buttpad');
  buttpad.position.set(0, g * 0.1, g * 6.8);
  gun.add(buttpad);

  const mag = block(g * 1.4, g * 4, g * 1.6, mDark, 'mag');
  mag.position.set(0, -g * 2.8, -g * 1.8);
  gun.add(mag);

  const grip = block(g * 1.5, g * 3, g * 1.5, mGlove, 'grip');
  grip.position.set(0, -g * 3, g * 0.4);
  gun.add(grip);

  const triggerGuard = block(g * 1.8, g * 1.2, g * 1.4, mMetal, 'guard');
  triggerGuard.position.set(0, -g * 1.6, -g * 0.2);
  gun.add(triggerGuard);

  const scopeBase = block(g * 1.2, g * 0.6, g * 2.8, mDark, 'scopeBase');
  scopeBase.position.set(0, g * 2.1, -g * 1.5);
  gun.add(scopeBase);

  const scopeTube = block(g * 0.9, g * 0.9, g * 2.4, mDark, 'scopeTube');
  scopeTube.position.set(0, g * 2.85, -g * 1.5);
  gun.add(scopeTube);

  const sightPost = block(g * 0.35, g * 1.1, g * 0.35, mAccent, 'sight');
  sightPost.position.set(0, g * 1.9, -g * 7.5);
  gun.add(sightPost);

  const glow = block(g * 0.6, g * 0.6, g * 0.6, mAccent, 'glow');
  glow.position.set(0, g * 1.2, -g * 0.8);
  gun.add(glow);

  gun.position.set(v * 5.5, -v * 8.2, -v * 10);
  gun.rotation.y = -0.06;
  rig.add(gun);

  const rHand = block(v * 1.6, v * 1.5, v * 1.8, mGlove, 'rHand');
  rHand.position.set(v * 5.4, -v * 8.8, -v * 9.8);
  rig.add(rHand);

  // Slight tilt like held in hands
  rig.rotation.x = -0.04;
  rig.rotation.y = -0.03;
  rig.position.set(0.12, -0.1, -0.42);

  return rig;
}

/**
 * FPS view rig on camera. Camera must be in scene graph (see SpeedrunShooter).
 */
export function loadViewModel(camera) {
  const rig = createMinecraftFpsRig();

  const light = new THREE.PointLight(0xfff5e8, 2.2, 12);
  light.position.set(0.25, 0.05, -0.2);
  rig.add(light);

  const fill = new THREE.PointLight(0x6b8cff, 0.9, 10);
  fill.position.set(-0.35, -0.15, -0.15);
  rig.add(fill);

  camera.add(rig);

  return Promise.resolve({
    rig,
    weapon: rig.getObjectByName('gun'),
    armsSource: 'minecraft',
    dispose() {
      camera.remove(rig);
      disposeObject3D(rig);
    },
  });
}

export const loadWeapon = loadViewModel;
