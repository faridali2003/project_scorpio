import * as THREE from 'three';

/** Room size in world units (width × height × depth). Updated when cafe map loads. */
export const ARENA = {
  width: 52,
  height: 14,
  depth: 52,
};

/** Walk / spawn bounds after cafe GLB load. */
let runtimeBounds = null;

export function setRuntimeBounds(bounds) {
  runtimeBounds = bounds;
}

export function getRuntimeBounds() {
  return runtimeBounds;
}

const COLORS = {
  floor: 0x32324a,
  ceiling: 0x3a3a52,
  wall: 0x4a4a68,
  trim: 0x6b5b95,
};

export function createArena(scene) {
  const { width, height, depth } = ARENA;
  const group = new THREE.Group();
  group.name = 'arena';

  const floorGeo = new THREE.PlaneGeometry(width, depth);
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    roughness: 0.72,
    metalness: 0.08,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const grid = new THREE.GridHelper(Math.min(width, depth), 26, 0x6d28d9, 0x2a2a40);
  grid.position.y = 0.02;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  group.add(grid);

  const ceilingGeo = new THREE.PlaneGeometry(width, depth);
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: COLORS.ceiling,
    roughness: 0.88,
    side: THREE.BackSide,
  });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  group.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    roughness: 0.68,
    metalness: 0.06,
  });

  const halfW = width / 2;
  const halfD = depth / 2;
  const wallHeight = height;
  const wallThickness = 0.5;

  const wallNorth = new THREE.Mesh(
    new THREE.BoxGeometry(width, wallHeight, wallThickness),
    wallMat
  );
  wallNorth.position.set(0, wallHeight / 2, -halfD);
  group.add(wallNorth);

  const wallSouth = new THREE.Mesh(
    new THREE.BoxGeometry(width, wallHeight, wallThickness),
    wallMat.clone()
  );
  wallSouth.position.set(0, wallHeight / 2, halfD);
  group.add(wallSouth);

  const wallWest = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, depth),
    wallMat.clone()
  );
  wallWest.position.set(-halfW, wallHeight / 2, 0);
  group.add(wallWest);

  const wallEast = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, wallHeight, depth),
    wallMat.clone()
  );
  wallEast.position.set(halfW, wallHeight / 2, 0);
  group.add(wallEast);

  const trimMat = new THREE.MeshStandardMaterial({
    color: COLORS.trim,
    roughness: 0.45,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.35,
  });
  const baseboardGeo = new THREE.BoxGeometry(width - 2, 0.12, 0.12);
  [-halfD + 0.25, halfD - 0.25].forEach((z) => {
    const trim = new THREE.Mesh(baseboardGeo, trimMat);
    trim.position.set(0, 0.06, z);
    group.add(trim);
  });

  scene.add(group);
  return group;
}

export function createArenaLights(scene, { cafe = false } = {}) {
  const hemiStr = cafe ? 0.72 : 0.55;
  const ambStr = cafe ? 0.55 : 0.42;
  const hemi = new THREE.HemisphereLight(0xffd4b8, 0x2a2030, hemiStr);
  hemi.name = 'hemi';
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffe8d8, ambStr);
  ambient.name = 'ambient';
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xfff8ee, 1.05);
  directional.position.set(12, 20, 10);
  directional.castShadow = true;
  directional.shadow.mapSize.set(1024, 1024);
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 80;
  const s = 35;
  directional.shadow.camera.left = -s;
  directional.shadow.camera.right = s;
  directional.shadow.camera.top = s;
  directional.shadow.camera.bottom = -s;
  directional.name = 'sun';
  scene.add(directional);

  const fill = new THREE.DirectionalLight(0x8b5cf6, 0.38);
  fill.position.set(-14, 10, -12);
  fill.name = 'fill';
  scene.add(fill);

  const rim = new THREE.PointLight(0x22d3ee, 0.45, 60);
  rim.position.set(0, ARENA.height * 0.55, 0);
  rim.name = 'rim';
  scene.add(rim);

  return { ambient, directional, fill, hemi, rim };
}

export function getSpawnPosition() {
  const b = runtimeBounds;
  if (b) {
    return new THREE.Vector3(b.centerX, b.eyeY, b.centerZ);
  }
  return new THREE.Vector3(0, 1.75, 0);
}
