import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const path = process.argv[2];
const buf = fs.readFileSync(path);
const loader = new GLTFLoader();
const gltf = await new Promise((res, rej) => {
  loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej);
});

const names = [];
gltf.scene.traverse((o) => {
  if (o.isMesh || o.name) {
    names.push({ name: o.name || '(unnamed)', type: o.type, mesh: o.isMesh });
  }
});

const meshCount = names.filter((n) => n.mesh).length;
console.log('meshes', meshCount);
const keywords = ['ball', 'player', 'ref', 'goal', 'pitch', 'grass', 'keeper', 'team'];
for (const kw of keywords) {
  const hits = names.filter((n) => n.name.toLowerCase().includes(kw));
  if (hits.length) console.log('\n' + kw + ':', hits.slice(0, 20).map((h) => h.name));
}

console.log('\nSample names:');
names.filter((n) => n.mesh).slice(0, 40).forEach((n) => console.log(' ', n.name));
