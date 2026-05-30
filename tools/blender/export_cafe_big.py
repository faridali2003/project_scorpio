# Scorpio Aim Trainer — large interior cafe (meters, floor at Z=0)
# Run in Blender 4.x Scripting → exports cafe-map.glb for the web game.
#
# Target footprint: 50m (X) × 42m (Y) walkable floor, ~7m ceiling.
# Game code (cafeArena.js) expects similar scale; tiny exports are auto-scaled up.

import bpy
import math
import os
from mathutils import Vector

OUTPUT = r"C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter\cafe-map.glb"

# --- dimensions (1 Blender unit = 1 meter) ---
FLOOR_W = 50.0
FLOOR_D = 42.0
WALL_H = 7.0
MEZZ_H = 4.2
MEZZ_DEPTH = 3.5


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mat_principled(name, color, roughness=0.65, metallic=0.05, emit=None, emit_strength=1.5):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def box(name, sx, sy, sz, loc, rot=(0, 0, 0), material=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (sx / 2, sy / 2, sz / 2)
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if material:
        if len(o.data.materials):
            o.data.materials[0] = material
        else:
            o.data.materials.append(material)
    return o


def plane(name, w, d, loc, rot=(0, 0, 0), material=None):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w / 2, d / 2, 1)
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if material:
        o.data.materials.append(material)
    return o


def build_cafe(parts, mats):
    hw, hd = FLOOR_W / 2, FLOOR_D / 2
    t = 0.35

    # Floor slab
    parts.append(box("Floor", FLOOR_W, FLOOR_D, 0.12, (0, 0, 0.06), mat=mats["wood"]))

    # Perimeter walls
    parts.append(box("Wall_N", FLOOR_W + t * 2, t, WALL_H, (0, hd + t / 2, WALL_H / 2), mat=mats["brick"]))
    parts.append(box("Wall_S", FLOOR_W + t * 2, t, WALL_H, (0, -hd - t / 2, WALL_H / 2), mat=mats["brick"]))
    parts.append(box("Wall_E", t, FLOOR_D + t * 2, WALL_H, (hw + t / 2, 0, WALL_H / 2), mat=mats["brick"]))
    parts.append(box("Wall_W", t, FLOOR_D + t * 2, WALL_H, (-hw - t / 2, 0, WALL_H / 2), mat=mats["brick"]))

    # Window band (north wall)
    for i, x in enumerate([-14, -4, 6, 16]):
        parts.append(
            plane(
                f"Window_{i}",
                6.5,
                3.2,
                (x, hd - 0.02, 3.4),
                (math.pi / 2, 0, 0),
                mats["glass"],
            )
        )

    # Ceiling beams (open industrial)
    for y in (-hd + 6, 0, hd - 6):
        parts.append(box(f"Beam_{y}", FLOOR_W - 4, 0.35, 0.45, (0, y, WALL_H - 0.5), mat=mats["metal"]))

    # Columns
    col_positions = [(-16, -12), (16, -12), (-16, 12), (16, 12), (0, 0)]
    for i, (cx, cy) in enumerate(col_positions):
        parts.append(box(f"Pillar_{i}", 0.9, 0.9, WALL_H - 0.3, (cx, cy, (WALL_H - 0.3) / 2), mat=mats["metal"]))

    # L-counter (bar)
    parts.append(box("Counter_Main", 18, 1.1, 1.05, (-8, hd - 5, 0.55), mat=mats["dark_wood"]))
    parts.append(box("Counter_Side", 8, 1.1, 1.05, (-17, hd - 9, 0.55), mat=mats["dark_wood"]))
    parts.append(box("Counter_Top", 18.5, 1.3, 0.08, (-8, hd - 5, 1.12), mat=mats["metal"]))
    parts.append(box("Espresso", 1.2, 0.8, 1.4, (-14, hd - 5.5, 0.75), mat=mats["metal"]))

    # Booth rows
    for i in range(4):
        bx = -hw + 6 + i * 9
        parts.append(box(f"BoothSeat_S_{i}", 2.4, 0.9, 0.45, (bx, -hd + 3.5, 0.28), mat=mats["dark_wood"]))
        parts.append(box(f"BoothBack_S_{i}", 2.4, 0.12, 1.1, (bx, -hd + 2.6, 0.65), mat=mats["brick"]))

    for i in range(3):
        bz = -8 + i * 8
        parts.append(box(f"BoothSeat_W_{i}", 0.9, 2.2, 0.45, (-hw + 3.2, bz, 0.28), mat=mats["dark_wood"]))
        parts.append(box(f"BoothBack_W_{i}", 0.12, 2.2, 1.1, (-hw + 2.3, bz, 0.65), mat=mats["brick"]))

    # Tables (center)
    for cx, cy in [(-6, 2), (6, -4), (0, 8), (10, 6)]:
        parts.append(box(f"Table_{cx}_{cy}", 1.6, 1.6, 0.08, (cx, cy, 0.78), mat=mats["dark_wood"]))
        for ox, oy in [(-0.55, -0.55), (0.55, -0.55), (0.55, 0.55), (-0.55, 0.55)]:
            parts.append(box(f"Chair_{cx}_{cy}_{ox}", 0.45, 0.45, 0.85, (cx + ox, cy + oy, 0.45), mat=mats["metal"]))

    # Tall shelf wall (vertical aim targets) — east side
    for row in range(4):
        for col in range(5):
            parts.append(
                box(
                    f"Shelf_{row}_{col}",
                    1.1,
                    0.35,
                    0.9,
                    (hw - 2.2, -14 + col * 6.5, 0.6 + row * 1.55),
                    mat=mats["dark_wood"],
                )
            )

    # Menu / sign boards (wall targets)
    sign_data = [
        ((-hw + 0.2, 0, 4.5), (0, math.pi / 2, 0), 4, 2.5),
        ((0, hd - 0.2, 5.2), (math.pi / 2, 0, 0), 6, 2.2),
        ((hw - 0.2, -8, 3.8), (0, -math.pi / 2, 0), 3.5, 2.0),
    ]
    for i, (loc, rot, w, h) in enumerate(sign_data):
        parts.append(plane(f"Sign_{i}", w, h, loc, rot, mats["neon"]))

    # Mezzanine walkway (west side)
    parts.append(
        box(
            "Mezz_Deck",
            MEZZ_DEPTH,
            FLOOR_D - 10,
            0.22,
            (-hw + MEZZ_DEPTH / 2 + 1.2, 0, MEZZ_H),
            mat=mats["metal"],
        )
    )
    parts.append(
        box(
            "Mezz_Rail",
            0.12,
            FLOOR_D - 10,
            1.0,
            (-hw + MEZZ_DEPTH + 1.35, 0, MEZZ_H + 0.55),
            mat=mats["metal"],
        )
    )
    for z in range(-16, 18, 4):
        parts.append(
            box(
                f"Mezz_Strut_{z}",
                MEZZ_DEPTH,
                0.25,
                MEZZ_H,
                (-hw + MEZZ_DEPTH / 2 + 1.2, z, MEZZ_H / 2),
                mat=mats["metal"],
            )
        )

    # Kitchen back wall block
    parts.append(box("Kitchen_Wall", 14, 0.25, 2.8, (hw - 9, -hd + 2, 1.5), mat=mats["plaster"]))


def print_bounds_meshes(meshes):
    mins = [1e9, 1e9, 1e9]
    maxs = [-1e9, -1e9, -1e9]
    for o in meshes:
        if o.type != "MESH":
            continue
        for corner in o.bound_box:
            world = o.matrix_world @ Vector(corner)
            mins[0] = min(mins[0], world.x)
            mins[1] = min(mins[1], world.y)
            mins[2] = min(mins[2], world.z)
            maxs[0] = max(maxs[0], world.x)
            maxs[1] = max(maxs[1], world.y)
            maxs[2] = max(maxs[2], world.z)
    sx, sy, sz = maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]
    print(f"Cafe bounds (m): X={sx:.2f} Y={sy:.2f} Z={sz:.2f}")
    print(f"  Floor footprint ~ {sx:.1f} x {sy:.1f}, height {sz:.1f}")
    if max(sx, sy) < 35:
        print("WARNING: floor axis < 35m — increase FLOOR_W / FLOOR_D in this script.")


def select_tree(obj):
    obj.select_set(True)
    for child in obj.children:
        select_tree(child)


def export_glb(root):
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    select_tree(root)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported: {OUTPUT}")


def main():
    clear_scene()

    mats = {
        "wood": mat_principled("Mat_WoodFloor", (0.42, 0.28, 0.16), roughness=0.75),
        "brick": mat_principled("Mat_Brick", (0.45, 0.22, 0.18), roughness=0.88),
        "plaster": mat_principled("Mat_Plaster", (0.55, 0.52, 0.48), roughness=0.9),
        "dark_wood": mat_principled("Mat_DarkWood", (0.22, 0.14, 0.1), roughness=0.7),
        "metal": mat_principled("Mat_Metal", (0.2, 0.2, 0.24), metallic=0.45, roughness=0.45),
        "glass": mat_principled("Mat_Glass", (0.15, 0.22, 0.35), roughness=0.15, metallic=0.1),
        "neon": mat_principled(
            "Mat_NeonSign", (0.9, 0.45, 0.12), emit=(1.0, 0.5, 0.15), emit_strength=2.5
        ),
    }
    mats["glass"].blend_method = "BLEND"

    parts = []
    build_cafe(parts, mats)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "CafeRoot"

    for p in parts:
        p.parent = root

    bpy.context.view_layer.update()
    print_bounds_meshes(parts)
    export_glb(root)
    print("Done — re-export cafe-map.glb; hard-refresh ?arena=1 in browser.")


main()
