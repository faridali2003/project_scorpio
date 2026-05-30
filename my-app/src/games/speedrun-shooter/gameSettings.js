export const SETTINGS_STORAGE_KEY = 'scorpio_shooter_settings_v1';

/** @typedef {typeof DEFAULT_GAME_SETTINGS} GameSettings */

export const DEFAULT_GAME_SETTINGS = {
  /** 0.25 – 2.5 (multiplier on mouse look) */
  lookSensitivity: 1.15,
  invertY: false,
  /** Vertical field of view (degrees) */
  fov: 90,
  /** 0 – 1 */
  volume: 0.85,
  /** 0.7 – 1.3 walk speed multiplier */
  moveSpeed: 1,
  showCrosshair: true,
};

export function loadGameSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GAME_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GAME_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
