import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PITCH_WIDTH, PITCH_LENGTH } from './pitchConstants';
import { lockFifaPlayBounds } from './playBounds';
import { buildPitchWorld, getPitchWorldBounds } from './pitchWorld';
import { createLinesOverlay, createRuntimeGoals } from './pitchOverlay';
import {
  hideStaticStadiumActors,
  hidePitchClutterMeshes,
  findStadiumBallTemplate,
  fixGrassStripeSeams,
  fixPitchMarkingZFight,
} from './stadiumActors';
import { ensureGlbMaterialsVisible } from './stadiumMaterials';

const STADIUM_URL = '/games/soccer/stadium.glb';
const LOAD_TIMEOUT_MS = 8000;

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function stadiumAssetUrl() {
  const base = process.env.PUBLIC_URL || '';
  return `${base}${STADIUM_URL}`;
}

const PLAYABLE_TURF =
  /^Grass_Stripe|^Pitch_Base|^Pitch$|^FallbackGrass|^FallbackPitch/i;
const NON_PLAYABLE_TURF =
  /Runoff|Parking|Lot|Sky|Dome|Roof|Seat|Stand|Crowd|Outer|Plaza|Track|Wall/i;

/** Bounding box of playable grass only — never the full GLB root. */
function measurePlayableTurf(root) {
  const box = new THREE.Box3();
  let hit = false;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const n = o.name || '';
    if (NON_PLAYABLE_TURF.test(n)) return;
    if (!PLAYABLE_TURF.test(n)) return;
    box.expandByObject(o);
    hit = true;
  });
  return hit ? box : null;
}

function fitStadiumToPitch(root) {
  const fit = measurePlayableTurf(root);
  if (!fit) {
    console.warn('[Scorpio Soccer] No playable turf mesh — stadium scale unchanged');
    return;
  }

  fit.getSize(_size);
  const sx = PITCH_WIDTH / Math.max(_size.x, 1);
  const sz = PITCH_LENGTH / Math.max(_size.z, 1);
  root.scale.multiply(new THREE.Vector3(sx, 1, sz));
  root.updateMatrixWorld(true);

  _box.setFromObject(root);
  _box.getCenter(_center);
  root.position.x -= _center.x;
  root.position.z -= _center.z;
  root.updateMatrixWorld(true);

  _box.setFromObject(root);
  root.position.y -= _box.min.y;
  root.updateMatrixWorld(true);
}

function loadGltfWithTimeout(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('stadium load timeout'));
    }, LOAD_TIMEOUT_MS);

    loader.load(
      url,
      (gltf) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(gltf);
      },
      undefined,
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function finishGlbStadium(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
    }
  });
  ensureGlbMaterialsVisible(root);
  fitStadiumToPitch(root);
  hideStaticStadiumActors(root);
  hidePitchClutterMeshes(root);
  fixGrassStripeSeams(root);
  fixPitchMarkingZFight(root);
}

function addGameplayLayers(scene) {
  const layer = new THREE.Group();
  layer.name = 'GameplayOverlay';
  layer.add(createLinesOverlay());
  layer.add(createRuntimeGoals());
  scene.add(layer);
  return layer;
}

/** Blender stadium.glb + lines + single goal pair. */
export function loadStadiumGlb(scene) {
  lockFifaPlayBounds();

  const builtInPitch = buildPitchWorld();
  builtInPitch.name = 'BuiltInPitch';
  scene.add(builtInPitch);

  const overlay = addGameplayLayers(scene);

  const url = stadiumAssetUrl();
  return loadGltfWithTimeout(url)
    .then((gltf) => {
      const prev = scene.getObjectByName('StadiumGLB');
      if (prev) scene.remove(prev);
      const root = gltf.scene;
      root.name = 'StadiumGLB';
      scene.add(root);
      finishGlbStadium(root);
      /* Hide duplicate built-in grass; keep group for fallback bounds. */
      const builtInGrass = builtInPitch.getObjectByName('Grass_Stripe');
      if (builtInGrass) builtInGrass.visible = false;
      const ballTemplate = findStadiumBallTemplate(root);
      return {
        root,
        overlay,
        bounds: getPitchWorldBounds(),
        ballTemplate,
        fallback: false,
      };
    })
    .catch((err) => {
      console.warn('[Scorpio Soccer] GLB failed, built-in pitch:', err?.message || err);
      builtInPitch.visible = true;
      return {
        root: builtInPitch,
        overlay,
        bounds: getPitchWorldBounds(),
        ballTemplate: null,
        fallback: true,
      };
    });
}

export function getStadiumFog(bounds) {
  const extent = Math.max(bounds?.width ?? 120, bounds?.length ?? 160, 120);
  return {
    color: 0x87b8d8,
    near: 160,
    far: Math.max(320, extent * 2.8),
    cameraFar: Math.max(450, extent * 4),
  };
}
