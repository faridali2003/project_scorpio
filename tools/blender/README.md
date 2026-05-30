# Scorpio Shooter — Blender asset scripts

CS 1.6–style **low-poly but readable** models (not placeholders).

## Requirements

- **Blender 3.6+** or **4.x**
- Enable add-on: *glTF 2.0 format* (Edit → Preferences → Add-ons)

## Run (one file at a time)

1. Blender → **Scripting** workspace → **Open** a `.py` file → **Run Script** (▶)
2. Or: `blender --background --python export_scorpio_blaster.py`

Scripts export directly to:

`my-app/public/games/speedrun-shooter/`

## Files

| Script | Output |
|--------|--------|
| `export_scorpio_blaster.py` | Sci-fi blaster → `scorpio-blaster.gltf` |
| `export_scorpio_ak47.py` | **AK-47 from reference** → `scorpio-blaster.gltf` (replaces weapon in game) |
| `export_scorpio_drone.py` | `scorpio-drone.gltf` + `.bin` |
| `export_fps_arms.py` | `fps-arms.gltf` + `.bin` |
| `export_cafe_big.py` | **Large cafe arena** → `cafe-map.glb` (50×42m floor) |
| `ultra_stadium.py` | **FIFA stadium** Blender scene (pitch, double-tier stands, day/night) — web game uses built-in Three.js stadium |

## Troubleshooting

- **Run from Scripting** with a **3D Viewport** open (not Layout-only).
- If `origin_set` fails: update script (fixed in latest `export_fps_arms.py`).
- **Blender 5.x**: enable add-on *glTF 2.0 format*.

## Reference image → custom model

Attach a **reference picture** (front + side if possible) in chat and ask for a Blender script. We can match silhouette, colors, and proportions for Scorpio.

## After export

Refresh: http://localhost:3000/?arena=1

If scale is wrong in-game, tell the agent — we tune `viewModel.js` / `enemies.js`.
