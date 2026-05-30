import * as THREE from 'three';

/** GLB exports often need color-space + metalness fixes or the pitch renders black. */
export function ensureGlbMaterialsVisible(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach((mat) => {
      if (!mat) return;
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }
      if (mat.emissiveMap) {
        mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        mat.emissiveMap.needsUpdate = true;
      }
      if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        mat.metalness = Math.min(mat.metalness ?? 0, 0.35);
        mat.roughness = Math.max(mat.roughness ?? 0.5, 0.45);
        mat.envMapIntensity = 0.35;
      }
      mat.side = THREE.DoubleSide;
      mat.needsUpdate = true;
    });
  });
}
