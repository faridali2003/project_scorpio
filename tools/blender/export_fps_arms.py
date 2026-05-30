# Scorpio Shooter — FPS arms + chest (CS 1.6–style viewmodel)
# Blender 3.6 / 4.x / 5.x → Scripting → Run Script
import bpy
import math
import os

OUTPUT_DIR = r"C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter"
OUTPUT_NAME = "fps-arms.gltf"


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


def set_bsdf_input(bsdf, names, value):
    """Blender 3.x–5.x Principled BSDF socket name differences."""
    if not isinstance(names, (list, tuple)):
        names = (names,)
    for name in names:
        if name in bsdf.inputs:
            bsdf.inputs[name].default_value = value
            return
    print(f"Warning: none of {names} found on Principled BSDF")


def make_material(name, color, roughness=0.55):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    set_bsdf_input(bsdf, "Base Color", (*color, 1.0))
    set_bsdf_input(bsdf, "Roughness", roughness)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def box(name, size, loc, rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.view_layer.objects.active
    if obj is None:
        raise RuntimeError("cube_add failed — open a 3D Viewport and retry")
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


def join_meshes(parts, result_name):
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = result_name
    return result


def set_origin_to_bounds_center(obj):
    """Avoid fragile origin_set(center=...) API differences across Blender versions."""
    ensure_object_mode()
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="MEDIAN")
    # Move mesh so median sits at world origin
    bpy.ops.object.location_clear(clear_delta=False)


def build_arms():
    mat_suit = make_material("Mat_Suit", (0.12, 0.12, 0.2))
    mat_glove = make_material("Mat_Glove", (0.18, 0.14, 0.12))
    mat_skin = make_material("Mat_Skin", (0.55, 0.38, 0.32))
    mat_strap = make_material("Mat_Strap", (0.08, 0.08, 0.1))

    parts = []

    parts.append(box("Chest", (0.42, 0.28, 0.2), (0, -0.32, -0.15), mat=mat_suit))
    parts.append(box("Collar", (0.2, 0.1, 0.12), (0, -0.18, -0.12), mat=mat_strap))
    parts.append(box("Belly", (0.34, 0.16, 0.16), (0, -0.42, -0.12), mat=mat_suit))

    parts.append(
        box(
            "R_Upper",
            (0.12, 0.14, 0.22),
            (0.22, -0.22, -0.2),
            (math.radians(35), math.radians(-15), math.radians(25)),
            mat=mat_suit,
        )
    )
    parts.append(
        box(
            "R_Forearm",
            (0.1, 0.12, 0.24),
            (0.3, -0.3, -0.38),
            (math.radians(55), math.radians(-8), math.radians(15)),
            mat=mat_suit,
        )
    )
    parts.append(
        box(
            "R_Glove",
            (0.09, 0.08, 0.1),
            (0.34, -0.34, -0.48),
            (math.radians(40), math.radians(5), math.radians(10)),
            mat=mat_glove,
        )
    )
    parts.append(box("R_Thumb", (0.03, 0.05, 0.04), (0.31, -0.32, -0.44), mat=mat_skin))

    parts.append(
        box(
            "L_Upper",
            (0.11, 0.13, 0.2),
            (-0.12, -0.2, -0.22),
            (math.radians(45), math.radians(20), math.radians(-30)),
            mat=mat_suit,
        )
    )
    parts.append(
        box(
            "L_Forearm",
            (0.09, 0.11, 0.22),
            (0.06, -0.3, -0.42),
            (math.radians(70), math.radians(25), math.radians(-15)),
            mat=mat_suit,
        )
    )
    parts.append(
        box(
            "L_Glove",
            (0.08, 0.07, 0.09),
            (0.14, -0.34, -0.52),
            (math.radians(55), math.radians(12), math.radians(5)),
            mat=mat_glove,
        )
    )

    parts.append(box("R_Cuff", (0.11, 0.04, 0.11), (0.26, -0.28, -0.32), mat=mat_strap))
    parts.append(box("L_Cuff", (0.1, 0.04, 0.1), (0.02, -0.28, -0.36), mat=mat_strap))

    arms = join_meshes(parts, "fps-arms")

    try:
        set_origin_to_bounds_center(arms)
    except TypeError:
        # Older Blender: no center= keyword
        bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY")

    arms.location = (0.0, 0.0, 0.0)
    arms.rotation_euler = (math.radians(-90), 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    return arms


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
    # Blender 3.x / 4.x separate .gltf + .bin
    try:
        bpy.ops.export_scene.gltf(export_format="GLTF_SEPARATE", **kwargs)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)

    print(f"Exported: {path}")


def main():
    clear_scene()
    arms = build_arms()
    export_gltf(arms)
    print("Done — fps-arms")


if __name__ == "__main__":
    main()
