# Scorpio Shooter — CS 1.6–style enemy drone (~4k tris), feet at Y=0
import bpy
import math
import os

OUTPUT_DIR = r"C:\Users\ASUS\Documents\project_scorpio\my-app\public\games\speedrun-shooter"
OUTPUT_NAME = "scorpio-drone.gltf"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def make_material(name, color, metallic=0.2, roughness=0.5, emissive=None, emit_strength=2.0):
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


def box(name, size, loc, rot=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        o.data.materials.append(mat)
    return o


def cyl(name, r, h, loc, rot=(0, 0, 0), mat=None, v=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if mat:
        o.data.materials.append(mat)
    return o


def build_drone():
    mat_armor = make_material("Mat_RedArmor", (0.55, 0.08, 0.1))
    mat_metal = make_material("Mat_DroneMetal", (0.18, 0.18, 0.22), metallic=0.5)
    mat_core = make_material("Mat_OrangeCore", (1.0, 0.35, 0.05), emissive=(1.0, 0.4, 0.0), emit_strength=3.0)
    mat_dark = make_material("Mat_DarkJoint", (0.08, 0.08, 0.1))

    parts = []

    # Legs / base (feet near y=0)
    parts.append(box("Foot_L", (0.22, 0.06, 0.28), (-0.18, 0.03, 0.05), mat=mat_metal))
    parts.append(box("Foot_R", (0.22, 0.06, 0.28), (0.18, 0.03, 0.05), mat=mat_metal))
    parts.append(box("Leg_L", (0.1, 0.35, 0.1), (-0.18, 0.22, 0), mat=mat_dark))
    parts.append(box("Leg_R", (0.1, 0.35, 0.1), (0.18, 0.22, 0), mat=mat_dark))

    # Pelvis + torso (humanoid-bot read)
    parts.append(box("Pelvis", (0.38, 0.2, 0.22), (0, 0.48, 0), mat=mat_metal))
    parts.append(box("Torso", (0.42, 0.45, 0.28), (0, 0.82, 0), mat=mat_armor))
    parts.append(box("ChestPlate", (0.3, 0.32, 0.12), (0, 0.88, 0.14), mat=mat_armor))

    # Glowing core
    parts.append(cyl("Core", 0.12, 0.08, (0, 0.9, 0.18), (math.pi / 2, 0, 0), mat=mat_core, v=16))
    parts.append(box("CoreHousing", (0.22, 0.22, 0.1), (0, 0.88, 0.12), mat=mat_metal))

    # Head / sensor pack
    parts.append(box("Head", (0.28, 0.28, 0.26), (0, 1.22, 0.02), mat=mat_armor))
    parts.append(box("Visor", (0.32, 0.08, 0.06), (0, 1.28, 0.16), mat=mat_core))
    parts.append(box("Antenna_L", (0.03, 0.25, 0.03), (-0.12, 1.38, 0), mat=mat_metal))
    parts.append(box("Antenna_R", (0.03, 0.25, 0.03), (0.12, 1.38, 0), mat=mat_metal))

    # Shoulders + arm stubs (CS terrorist silhouette hint)
    parts.append(box("Shoulder_L", (0.14, 0.14, 0.22), (-0.32, 1.02, 0), mat=mat_armor))
    parts.append(box("Shoulder_R", (0.14, 0.14, 0.22), (0.32, 1.02, 0), mat=mat_armor))
    parts.append(box("Arm_L", (0.1, 0.35, 0.1), (-0.38, 0.78, 0.05), mat=mat_dark))
    parts.append(box("Arm_R", (0.1, 0.35, 0.1), (0.38, 0.78, 0.05), mat=mat_dark))

    # Backpack thruster
    parts.append(box("Pack", (0.32, 0.4, 0.14), (0, 0.85, -0.2), mat=mat_metal))
    parts.append(cyl("Thruster_L", 0.05, 0.12, (-0.1, 0.75, -0.28), (0, 0, 0), mat=mat_core))
    parts.append(cyl("Thruster_R", 0.05, 0.12, (0.1, 0.75, -0.28), (0, 0, 0), mat=mat_core))

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.active_object
    body.name = "DroneMesh"

    # Root empty at floor
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    root = bpy.context.active_object
    root.name = "root"
    body.parent = root
    body.location = (0, 0, 0)

    # Lower so feet ~ y=0 (lowest verts near 0)
    root.location = (0, 0, 0)
    return root


def export_gltf(root):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, OUTPUT_NAME)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for c in root.children:
        c.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLTF_SEPARATE",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported: {path}")


def main():
    clear_scene()
    root = build_drone()
    export_gltf(root)
    print("Done — scorpio-drone")


main()
