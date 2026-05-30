# Claude prompt — Big cafe map for Scorpio Aim Trainer

Copy everything inside the box below into Claude (or ChatGPT). Run the generated script in **Blender 4.x**, then export to:

`C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter\cafe-map.glb`

---

```
You are an expert Blender 4.x Python (bpy) developer building game levels for a web-based FPS aim trainer (Three.js + GLTF).

## GOAL
Write ONE complete, runnable Blender Python script that builds a LARGE interior **coffee shop / cafe** optimized for aim practice — not a tiny room. Visual target: cozy industrial cafe (exposed brick, counters, booths, upper mezzanine or balcony optional), but geometry must stay **low-poly** (~15k–40k tris total) for browser performance.

## CRITICAL SCALE (users said current map feels too small)
- Blender units: **1 unit = 1 meter**
- **Walkable floor footprint: at least 35m × 28m** (prefer **40m × 35m** or larger)
- **Ceiling height: 5m–8m** (tall enough for elevated aim targets)
- **Second level / mezzanine** OR tall shelves (3–6m high) along walls for vertical targets
- After build, print bounding box size in console before export

## LAYOUT REQUIREMENTS (read like a real cafe)
Include clearly readable zones:
1. **Main floor** — open seating, tables, chairs (simple boxes)
2. **Counter / bar** — long counter L-shape, espresso machine block, shelves
3. **Kitchen pass-through** or back wall (optional)
4. **Booth seating** along at least 2 walls
5. **Central pillars** or columns (2–4) for cover / visual interest
6. **Large windows** on one wall (planes, emissive sky or dark blue) — no exterior geometry needed
7. **Wall targets zone**: flat wall panels 3m–7m height (billboards, menu boards, neon sign planes) — good for aim trainer
8. **Catwalk / balcony / upper walkway** along 1–2 sides OR tall bookshelf wall (4–8m) if mezzanine is too heavy

## STYLE
- Warm industrial cafe: brick or plaster walls, wood floor, dark metal accents
- Colors: warm browns, cream, muted orange accent lights (emissive planes OK)
- NOT photoreal — **CS 1.6 / Aim Lab readable** shapes
- No tiny clutter (cups OK as simple cylinders, max ~20 props)

## TECHNICAL RULES
- Use bpy + bmesh or primitives; join into logical objects then export as one scene OR grouped under empty `CafeRoot`
- **Origin / floor**: empty named `CafeRoot` at floor center; all geometry parented; floor at **Z = 0**
- Player walks on floor only — keep walkable area **mostly flat** (ramps OK but subtle)
- Materials: Principled BSDF, no pure black albedo (min 0.08 RGB)
- Apply all transforms before export (Ctrl+A)
- **Do NOT** export cameras or lights (Three.js adds lights)

## EXPORT (mandatory end of script)
```python
import os
OUTPUT = r"C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter\cafe-map.glb"
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format='GLTF_SEPARATE',  # or GLB: export_format='GLB'
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_materials='EXPORT',
)
print("Exported", OUTPUT)
```

If using GLB single file, filepath must end in `.glb` and game loads `cafe-map.glb`.

## DELIVERABLE FORMAT
1. **Step 1** — How to run (Blender version, enable glTF add-on)
2. **Step 2** — Full Python script (no pseudocode, no placeholders)
3. **Step 3** — After export checklist:
   - File exists at OUTPUT path
   - Printed bounds show width/depth ≥ 35m
   - Refresh http://localhost:3000/?arena=1

## QUALITY BAR
- Silhouette must read as **cafe** from player view, not a grey box
- Enough **vertical surfaces** (walls, signs, balcony) for aim targets at multiple heights
- Performance-safe: merge meshes where possible, avoid subdivision surfaces

## DO NOT
- Build exterior city block (interior only)
- Use HDRI-only lighting as substitute for geometry
- Export scale in centimeters (must be meters)
- Create map smaller than 30m on longest floor axis

Generate the script now.
```

---

## After you get the new map

1. Run script in Blender (or save as `export_cafe_big.py` in `tools/blender/`)
2. Confirm `cafe-map.glb` in `public/games/speedrun-shooter/`
3. Hard refresh the game (`Ctrl+F5`)
4. Pick difficulty **Hard** or **Extreme** for wall/high spawns

Prefer running **`tools/blender/export_cafe_big.py`** (50×42m floor, 7m ceiling) — game upscales only if longest floor axis &lt; 44m.

After export, hard-refresh `http://localhost:3000/?arena=1`.
