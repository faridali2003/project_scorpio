import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function inspect(filePath) {
  const loader = new GLTFLoader();
  const buf = fs.readFileSync(filePath);
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });
  const root = gltf.scene;
  let meshes = 0;
  root.traverse((c) => {
    if (c.isMesh) meshes += 1;
  });
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return {
    file: path.basename(filePath),
    meshes,
    min: box.min.toArray().map((v) => +v.toFixed(2)),
    max: box.max.toArray().map((v) => +v.toFixed(2)),
    size: size.toArray().map((v) => +v.toFixed(2)),
    center: center.toArray().map((v) => +v.toFixed(2)),
    floorExtent: +Math.max(size.x, size.z).toFixed(2),
  };
}

function applySoccerTransform(root) {
  const TARGET_LENGTH = 105;
  const TARGET_WIDTH = 68;
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const sx = TARGET_WIDTH / Math.max(size.x, 1);
  const sz = TARGET_LENGTH / Math.max(size.z, 1);
  root.scale.multiply(new THREE.Vector3(sx, 1, sz));
  root.rotation.x = -Math.PI / 2;
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.y -= center.y;
  root.position.z -= box2.min.z;
  root.updateMatrixWorld(true);
}

const files = process.argv.slice(2);
for (const f of files) {
  const loader = new GLTFLoader();
  const buf = fs.readFileSync(f);
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', resolve, reject);
  });
  const root = gltf.scene;
  console.log('--- raw', path.basename(f), '---');
  console.log(JSON.stringify(await inspect(f), null, 2));
  applySoccerTransform(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('--- after soccer transform ---');
  console.log(JSON.stringify({
    size: size.toArray().map((v) => +v.toFixed(2)),
    min: box.min.toArray().map((v) => +v.toFixed(2)),
    max: box.max.toArray().map((v) => +v.toFixed(2)),
  }, null, 2));
}
