/**
 * Pitch surface — dry vs damp (night dew). Affects bounce and roll friction.
 */
export function getPitchSurface(lightingMode = 'day') {
  if (lightingMode === 'night') {
    return {
      label: 'damp',
      friction: 0.38,
      restitution: 0.72,
      rollDamping: 0.992,
      spinGroundDamping: 0.94,
    };
  }
  return {
    label: 'dry',
    friction: 0.52,
    restitution: 0.58,
    rollDamping: 0.988,
    spinGroundDamping: 0.91,
  };
}
