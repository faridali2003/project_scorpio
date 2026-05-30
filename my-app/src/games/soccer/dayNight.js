/** Real-time day/night for stadium lighting (auto, no menu toggle). */
export const DAY_START_HOUR = 6;
export const NIGHT_START_HOUR = 19;

export function isNightHour(date = new Date()) {
  const h = date.getHours();
  return h >= NIGHT_START_HOUR || h < DAY_START_HOUR;
}

export function stadiumLightingMode(date = new Date()) {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.get('soccerDay') === '1') return 'day';
    if (q.get('night') === '1' || q.get('soccerNight') === '1') return 'night';
  }
  return isNightHour(date) ? 'night' : 'day';
}

export function applyStadiumLighting(scene, mode) {
  const night = mode === 'night';
  scene.userData.lightingMode = mode;

  const sun = scene.getObjectByName('Stadium_Sun');
  if (sun) {
    sun.intensity = night ? 0 : 2.8;
    sun.visible = !night;
  }

  const floodGroup = scene.getObjectByName('Floodlights');
  if (floodGroup) {
    floodGroup.visible = true;
    floodGroup.traverse((o) => {
      if (o.isSpotLight || o.isPointLight) {
        const energy = o.userData.nightEnergy ?? 20;
        o.intensity = night ? energy : 0;
      }
    });
  }

  const ambient = scene.getObjectByName('Stadium_Ambient');
  if (ambient) {
    ambient.intensity = night ? 0.22 : 0.55;
    ambient.color.setHex(night ? 0x334466 : 0xb8d4ff);
  }

  const hemi = scene.getObjectByName('Stadium_Hemi');
  if (hemi) {
    hemi.intensity = night ? 0.35 : 0.45;
    hemi.groundColor.setHex(night ? 0x1a3d1a : 0x1a3d12);
    hemi.color.setHex(night ? 0x99aacc : 0x87ceeb);
  }

  if (scene.background?.isColor) {
    scene.background.setHex(night ? 0x080c18 : 0x6a8faa);
  }

  if (scene.fog) {
    scene.fog.color.setHex(night ? 0x080c18 : 0x6a8faa);
    scene.fog.near = night ? 35 : 80;
    scene.fog.far = night ? 200 : 280;
  }
}
