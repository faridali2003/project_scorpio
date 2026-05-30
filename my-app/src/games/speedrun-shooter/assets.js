/**
 * Drop Blender exports into my-app/public/games/speedrun-shooter/
 * Keep these filenames (or update paths here).
 */
export const ASSET_URLS = {
  weapon: '/games/speedrun-shooter/scorpio-blaster.gltf',
  enemy: '/games/speedrun-shooter/scorpio-drone.gltf',
  viewArms: '/games/speedrun-shooter/fps-arms.gltf',
  /**
   * Cafe map — must live under public/ (browser cannot load src/).
   * After exporting in Blender, copy e.g. Untitled1.glb → public/.../cafe-map.glb
   */
  cafeMap: '/games/speedrun-shooter/cafe-map.glb',
};
