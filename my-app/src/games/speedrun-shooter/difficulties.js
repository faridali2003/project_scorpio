/** Aim-trainer difficulty presets (cafe arena). */
export const DIFFICULTIES = {
  practice: {
    id: 'practice',
    label: 'Free Practice',
    description: 'No timer — endless targets',
    targetKills: 0,
    timeSeconds: null,
    noTimeLimit: true,
    noWinLimit: true,
    activeTargets: 12,
    spawn: { floor: 0.7, elevated: 0.22, wall: 0.08 },
    elevationMin: 1.2,
    elevationMax: 3.5,
    wallHeightMin: 1.5,
    wallHeightMax: 3.8,
  },
  easy: {
    id: 'easy',
    label: 'Easy',
    targetKills: 8,
    timeSeconds: 45,
    activeTargets: 8,
    spawn: { floor: 0.7, elevated: 0.22, wall: 0.08 },
    elevationMin: 1.2,
    elevationMax: 3.2,
    wallHeightMin: 1.5,
    wallHeightMax: 3.5,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    targetKills: 12,
    timeSeconds: 35,
    activeTargets: 10,
    spawn: { floor: 0.6, elevated: 0.28, wall: 0.12 },
    elevationMin: 1.3,
    elevationMax: 4,
    wallHeightMin: 1.6,
    wallHeightMax: 4,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    targetKills: 16,
    timeSeconds: 28,
    activeTargets: 12,
    spawn: { floor: 0.55, elevated: 0.3, wall: 0.15 },
    elevationMin: 1.5,
    elevationMax: 4.5,
    wallHeightMin: 1.8,
    wallHeightMax: 4.5,
  },
  extreme: {
    id: 'extreme',
    label: 'Extreme',
    targetKills: 22,
    timeSeconds: 22,
    activeTargets: 14,
    spawn: { floor: 0.5, elevated: 0.32, wall: 0.18 },
    elevationMin: 1.6,
    elevationMax: 5,
    wallHeightMin: 2,
    wallHeightMax: 5,
  },
};

export const DIFFICULTY_LIST = Object.values(DIFFICULTIES);

export const DEFAULT_DIFFICULTY_ID = 'medium';

export function getDifficulty(id) {
  return DIFFICULTIES[id] ?? DIFFICULTIES[DEFAULT_DIFFICULTY_ID];
}
