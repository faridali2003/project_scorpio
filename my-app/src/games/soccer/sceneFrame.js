import * as THREE from 'three';
import { PITCH_LENGTH, PITCH_WIDTH } from './pitchConstants';

const _box = new THREE.Box3();

/** Frame only the playable pitch — not seats/sky/parking (those push the camera miles away). */
export function getPitchBounds(scene) {
  const box = new THREE.Box3();
  let hit = false;

  const stadium = scene.getObjectByName('StadiumGLB');
  if (stadium) {
    stadium.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.name || '';
      if (!/^Grass_Stripe|^Pitch_Base|^Pitch$/i.test(n)) return;
      _box.setFromObject(o);
      box.union(_box);
      hit = true;
    });
  }

  if (!hit) {
    const builtIn = scene.getObjectByName('BuiltInPitch');
    if (builtIn) {
      const grass = builtIn.getObjectByName('Grass_Stripe');
      if (grass) {
        box.setFromObject(grass);
        hit = true;
      } else {
        box.setFromObject(builtIn);
        hit = true;
      }
    }
  }

  if (!hit) {
    box.set(new THREE.Vector3(-PITCH_WIDTH / 2, 0, -PITCH_LENGTH / 2), new THREE.Vector3(PITCH_WIDTH / 2, 0.1, PITCH_LENGTH / 2));
  }
  return box;
}

export function frameMenuCamera(camera, scene) {
  const box = getPitchBounds(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 50);
  camera.position.set(center.x, span * 0.55, center.z + span * 0.72);
  camera.lookAt(center.x, 0.5, center.z);
  camera.far = Math.max(camera.far, span * 6);
  camera.updateProjectionMatrix();
}

export function getPitchLookTarget(scene) {
  const box = getPitchBounds(scene);
  const center = box.getCenter(new THREE.Vector3());
  return { x: center.x, y: 0.5, z: center.z };
}
