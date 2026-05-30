# Scorpio Shooter — AK-47 viewmodel from side-reference (CS 1.6–style low poly)
# Reference: side-profile AK. Not photo-real — readable silhouette for web FPS.
# Blender 3.6+ / 4.x / 5.x → Scripting → Run Script
#
# Exports: my-app/public/games/speedrun-shooter/scorpio-blaster.gltf
import bpy
import math
import os

OUTPUT_DIR = r"C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter"
OUTPUT_NAME = "scorpio-blaster.gltf"


def ensure_object_mode():
    obj = bpy.context.view_layer.objects.active
    if obj is not None and obj.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def clear_scene():
    ensure_object_mode()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        if block.users == 0:
            bpy.data.materials.remove(block)


def set_bsdf_input(bsdf, name, value):
    if name in bsdf.inputs:
        bsdf.inputs[name].default_value = value


def make_material(name, color, metallic=0.35, roughness=0.55):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    set_bsdf_input(bsdf, "Base Color", (*color, 1.0))
    set_bsdf_input(bsdf, "Metallic", metallic)
    set_bsdf_input(bsdf, "Roughness", roughness)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def box(name, size, loc, rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.view_layer.objects.active
    if obj is None:
        raise RuntimeError("Open a 3D Viewport, then run the script again.")
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.data.materials[0] = mat
    return obj


def cyl(name, radius, depth, loc, rot=(0, 0, 0), mat=None, verts=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.data.materials[0] = mat
    return obj


def join_meshes(parts, name):
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = name
    return result


def build_ak47():
    """
    Side-view AK layout: barrel +X, stock -X, magazine -Y.
    Total length ~0.88m (realistic scale; game auto-scales viewmodel).
    """
    mat_metal = make_material("Mat_AK_Metal", (0.14, 0.14, 0.16), metallic=0.55, roughness=0.45)
    mat_metal_worn = make_material("Mat_AK_Worn", (0.22, 0.22, 0.24), metallic=0.65, roughness=0.35)
    mat_wood = make_material("Mat_AK_Wood", (0.32, 0.2, 0.1), metallic=0.0, roughness=0.75)
    mat_grip = make_material("Mat_AK_Grip", (0.42, 0.22, 0.12), metallic=0.05, roughness=0.65)
    mat_dark = make_material("Mat_AK_Dark", (0.08, 0.08, 0.09), metallic=0.4, roughness=0.5)

    parts = []

    # --- Barrel group (left in reference image = +X) ---
    parts.append(
        cyl("Barrel", 0.0075, 0.42, (0.36, 0, 0.01), (0, math.pi / 2, 0), mat=mat_metal, verts=10)
    )
    parts.append(box("Muzzle", (0.025, 0.025, 0.03), (0.58, 0, 0.01), mat=mat_metal_worn))
    parts.append(box("FrontSight", (0.012, 0.055, 0.012), (0.5, 0, 0.045), mat=mat_metal))
    parts.append(box("GasBlock", (0.035, 0.04, 0.04), (0.42, 0, 0.02), mat=mat_metal_worn))
    parts.append(
        cyl("GasTube", 0.006, 0.28, (0.28, 0, 0.055), (0, math.pi / 2, 0), mat=mat_metal, verts=8)
    )
    parts.append(
        cyl("CleaningRod", 0.004, 0.38, (0.3, 0, -0.02), (0, math.pi / 2, 0), mat=mat_dark, verts=8)
    )

    # --- Receiver ---
    parts.append(box("Receiver", (0.22, 0.095, 0.055), (0.12, 0, 0.02), mat=mat_metal))
    parts.append(box("ReceiverTop", (0.18, 0.025, 0.04), (0.12, 0, 0.065), mat=mat_metal_worn))
    parts.append(box("EjectionPort", (0.06, 0.04, 0.008), (0.14, 0.048, 0.025), mat=mat_dark))
    parts.append(box("DustCover", (0.16, 0.015, 0.045), (0.08, 0, 0.068), mat=mat_metal))

    # --- Handguard (wood, upper + lower) ---
    parts.append(box("HandguardUpper", (0.2, 0.045, 0.055), (0.28, 0, 0.04), mat=mat_wood))
    parts.append(box("HandguardLower", (0.2, 0.05, 0.05), (0.28, 0, 0.005), mat=mat_wood))
    parts.append(box("HandguardCap", (0.02, 0.08, 0.07), (0.38, 0, 0.025), mat=mat_metal))

    # --- Curved magazine (banana mag — 3 boxes) ---
    parts.append(
        box("MagTop", (0.07, 0.11, 0.04), (0.1, -0.02, -0.02), (math.radians(8), 0, math.radians(6)), mat=mat_metal)
    )
    parts.append(
        box("MagMid", (0.075, 0.12, 0.045), (0.08, -0.1, -0.04), (math.radians(22), 0, math.radians(10)), mat=mat_metal)
    )
    parts.append(
        box("MagBottom", (0.08, 0.1, 0.04), (0.06, -0.2, -0.06), (math.radians(38), 0, math.radians(8)), mat=mat_metal)
    )
    parts.append(box("MagRib", (0.01, 0.18, 0.05), (0.075, -0.11, -0.035), (math.radians(25), 0, 0), mat=mat_metal_worn))

    # --- Pistol grip (bakelite / brown) ---
    parts.append(
        box("Grip", (0.055, 0.11, 0.07), (0.02, -0.06, -0.05), (math.radians(-12), 0, math.radians(4)), mat=mat_grip)
    )
    parts.append(box("TriggerGuard", (0.07, 0.02, 0.05), (0.06, -0.02, -0.02), mat=mat_metal))
    parts.append(box("Trigger", (0.015, 0.03, 0.02), (0.05, -0.03, -0.015), mat=mat_dark))

    # --- Stock (wood, angled down-back) ---
    parts.append(
        box("StockMain", (0.2, 0.11, 0.055), (-0.18, -0.02, 0.01), (math.radians(-8), 0, math.radians(-2)), mat=mat_wood)
    )
    parts.append(
        box("StockHeel", (0.08, 0.14, 0.05), (-0.3, -0.06, -0.02), (math.radians(-18), 0, 0), mat=mat_wood)
    )
    parts.append(box("Buttplate", (0.025, 0.13, 0.06), (-0.36, -0.08, -0.02), mat=mat_metal))

    # --- Rear sight / selector hints ---
    parts.append(box("RearSight", (0.02, 0.05, 0.025), (0.02, 0, 0.09), mat=mat_metal))
    parts.append(box("Selector", (0.03, 0.02, 0.03), (0.08, 0.052, 0.01), mat=mat_dark))

    gun = join_meshes(parts, "scorpio-ak47")

    # Center on receiver / grip for FPS attach
    ensure_object_mode()
    bpy.context.view_layer.objects.active = gun
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="MEDIAN")
    gun.location = (0, 0, 0)

    # Barrel forward = -Z (Three.js FPS)
    gun.rotation_euler = (math.radians(-90), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    return gun


def export_gltf(obj):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, OUTPUT_NAME)
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    kwargs = dict(
        filepath=path,
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
    )
    try:
        bpy.ops.export_scene.gltf(export_format="GLTF_SEPARATE", **kwargs)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)

    print(f"Exported AK viewmodel: {path}")


def main():
    clear_scene()
    gun = build_ak47()
    export_gltf(gun)
    print("Done — AK-47 style weapon (scorpio-blaster.gltf)")


if __name__ == "__main__":
    main()
