# Scorpio Shooter — CS 1.6–style viewmodel blaster (~2.5k tris)
# Blender 3.6+ / 4.x → Scripting → Run Script
import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler

OUTPUT_DIR = r"C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter"
OUTPUT_NAME = "scorpio-blaster.gltf"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def make_material(name, color, metallic=0.35, roughness=0.45, emissive=None, emit_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emissive:
        bsdf.inputs["Emission Color"].default_value = (*emissive, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def box_mesh(name, size, location=(0, 0, 0), rotation=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj


def cyl_mesh(name, radius, depth, location=(0, 0, 0), rotation=(0, 0, 0), mat=None, verts=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj


def join_objects(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = name
    return result


def build_blaster():
    # Materials (CS-like flat reads + one glow strip)
    mat_metal = make_material("Mat_DarkMetal", (0.12, 0.12, 0.14))
    mat_navy = make_material("Mat_NavyArmor", (0.08, 0.1, 0.18))
    mat_cyan = make_material("Mat_CyanGlow", (0.0, 0.55, 0.85), emissive=(0.0, 0.7, 1.0), emit_strength=2.5)
    mat_grip = make_material("Mat_Grip", (0.05, 0.05, 0.06), roughness=0.75)

    parts = []

    # Receiver (bulk of body) — barrel points +X
    parts.append(box_mesh("Receiver", (0.07, 0.11, 0.22), (0, 0, 0.02), mat=mat_navy))
    parts.append(box_mesh("ReceiverTop", (0.05, 0.04, 0.18), (0, 0, 0.1), mat=mat_metal))

    # Barrel stack
    parts.append(cyl_mesh("Barrel", 0.022, 0.38, (0.2, 0, 0.03), (0, math.pi / 2, 0), mat=mat_metal))
    parts.append(cyl_mesh("BarrelShroud", 0.028, 0.22, (0.14, 0, 0.03), (0, math.pi / 2, 0), mat=mat_navy))
    parts.append(box_mesh("MuzzleBrake", (0.04, 0.04, 0.05), (0.41, 0, 0.03), mat=mat_metal))

    # Cyan energy cell / glow strip (classic sci-fi read)
    parts.append(box_mesh("GlowStrip", (0.015, 0.06, 0.14), (0.08, 0, 0.055), mat=mat_cyan))
    parts.append(cyl_mesh("GlowRing", 0.032, 0.02, (0.36, 0, 0.03), (0, math.pi / 2, 0), mat=mat_cyan, verts=12))

    # Magazine (angled)
    parts.append(
        box_mesh(
            "Magazine",
            (0.035, 0.08, 0.1),
            (-0.02, 0, -0.1),
            (math.radians(12), 0, math.radians(8)),
            mat=mat_metal,
        )
    )

    # Pistol grip
    parts.append(
        box_mesh(
            "Grip",
            (0.05, 0.07, 0.12),
            (-0.05, 0, -0.08),
            (math.radians(-18), 0, 0),
            mat=mat_grip,
        )
    )
    parts.append(box_mesh("TriggerGuard", (0.045, 0.02, 0.06), (-0.02, 0, -0.02), mat=mat_metal))

    # Top rail + rear sight (silhouette detail)
    parts.append(box_mesh("TopRail", (0.03, 0.025, 0.2), (0.02, 0, 0.11), mat=mat_metal))
    parts.append(box_mesh("RearSight", (0.02, 0.05, 0.03), (-0.06, 0, 0.12), mat=mat_metal))
    parts.append(box_mesh("FrontSight", (0.015, 0.035, 0.02), (0.28, 0, 0.1), mat=mat_metal))

    # Stock cheek (SMG hint)
    parts.append(box_mesh("Stock", (0.04, 0.09, 0.08), (-0.12, 0, 0.04), mat=mat_navy))

    gun = join_objects(parts, "scorpio-blaster")

    # Grip origin near (0,0,0) — hand attach point
    bpy.context.view_layer.objects.active = gun
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR", center="MEDIAN")
    bpy.ops.object.location_clear()

    # Face barrel down -Z for Three.js (rotate root)
    gun.rotation_euler = (math.radians(-90), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    return gun


def export_gltf(obj):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, OUTPUT_NAME)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLTF_SEPARATE",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
    )
    print(f"Exported: {path}")


def main():
    clear_scene()
    gun = build_blaster()
    export_gltf(gun)
    print("Done — scorpio-blaster (CS-style viewmodel)")


main()
