import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARENA, setRuntimeBounds } from './arena';
import { STANDING_EYE_HEIGHT } from './playerControls';
import { ASSET_URLS } from './assets';

/**
 * Match tools/blender/export_cafe_big.py (FLOOR_W × FLOOR_D).
 * Small GLBs are scaled so longest floor axis reaches this.
 */
/** Only upscale tiny exports; Untitled1-sized cafes should stay as exported */
const TARGET_FLOOR_EXTENT = 50;
const MIN_EXTENT_BEFORE_UPSCALE = 22;
const MAX_EXTENT_BEFORE_DOWNSCALE = 140;
/** Walk clamp: small fixed pad + % inset so large cafes do not feel like a tight box */
const WALK_PAD_MIN = 0.4;
const WALK_PAD_MAX = 2.2;
const WALK_INSET_RATIO = 0.012;

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function assetUrl(path) {
  const base = process.env.PUBLIC_URL || '';
  return `${base}${path}`;
}

function walkPadding(floorExtent) {
  const proportional = floorExtent * WALK_INSET_RATIO;
  return THREE.MathUtils.clamp(proportional, WALK_PAD_MIN, WALK_PAD_MAX);
}

function boundsFromRoot(root) {
  _box.setFromObject(root);
  _box.getSize(_size);

  const floorExtent = Math.max(_size.x, _size.z);
  const pad = walkPadding(floorExtent);

  const minX = _box.min.x + pad;
  const maxX = _box.max.x - pad;
  const minZ = _box.min.z + pad;
  const maxZ = _box.max.z - pad;

  const floorY = 0;
  const bounds = {
    minX,
    maxX,
    minZ,
    maxZ,
    floorY,
    eyeY: floorY + STANDING_EYE_HEIGHT,
    width: _size.x,
    depth: _size.z,
    height: _size.y,
    floorExtent,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };

  ARENA.width = bounds.width;
  ARENA.depth = bounds.depth;
  ARENA.height = Math.max(bounds.height, 4);

  setRuntimeBounds(bounds);
  return bounds;
}

function applyFloorScale(root) {
  _box.setFromObject(root);
  _box.getSize(_size);
  const floorExtent = Math.max(_size.x, _size.z);

  if (floorExtent < MIN_EXTENT_BEFORE_UPSCALE) {
    root.scale.multiplyScalar(TARGET_FLOOR_EXTENT / floorExtent);
  } else if (floorExtent > MAX_EXTENT_BEFORE_DOWNSCALE) {
    root.scale.multiplyScalar(MAX_EXTENT_BEFORE_DOWNSCALE / floorExtent);
  }
}

/**
 * Load cafe map (cafe-map.glb in public).
 * Centers on XZ, floor at y = 0; upscales undersized Blender exports.
 */
export function loadCafeArena(scene) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      assetUrl(ASSET_URLS.cafeMap),
      (gltf) => {
        const root = gltf.scene;
        root.name = 'cafeArena';

        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(root);

        applyFloorScale(root);

        _box.setFromObject(root);
        _box.getCenter(_center);
        root.position.x -= _center.x;
        root.position.z -= _center.z;
        root.position.y -= _box.min.y;

        const bounds = boundsFromRoot(root);
        console.info(
          '[Scorpio] Cafe map loaded:',
          `${bounds.width.toFixed(1)}m × ${bounds.depth.toFixed(1)}m`,
          `(from public/games/speedrun-shooter/cafe-map.glb)`
        );
        resolve({ root, bounds });
      },
      undefined,
      reject
    );
  });
}

export function getCafeFogSettings(bounds) {
  const extent = Math.max(bounds.floorExtent ?? bounds.width, bounds.depth, 24);
  return {
    color: 0x1a1418,
    near: 10,
    far: extent * 1.65,
    cameraFar: Math.max(220, extent * 3),
  };
}
