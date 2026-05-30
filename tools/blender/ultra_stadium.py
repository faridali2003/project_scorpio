# Ultra Stadium — Blender 4.2+ Python Script
# Run: Blender → Scripting → Open → Run Script
# Toggle day/night: set STADIUM_TIME below to "day" or "night"

import bpy
import math
import random
from mathutils import Vector

random.seed(42)

# ── day / night (re-run script after changing) ─────────────────
STADIUM_TIME = "day"   # "day" | "night"

# ══════════════════════════════════════════════════════════════
# 0.  CLEAN SCENE
# ══════════════════════════════════════════════════════════════
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for col in list(bpy.data.collections):
    bpy.data.collections.remove(col)

# ══════════════════════════════════════════════════════════════
# 1.  CONSTANTS  (FIFA-compliant dimensions, metres)
# ══════════════════════════════════════════════════════════════
PL   = 105.0
PW   = 68.0
LW   = 0.12
LZ   = 0.02
GOAL_W  = 7.32
GOAL_H  = 2.44
GOAL_D  = 2.5
POST_R  = 0.06
BOX_W, BOX_D = 40.32, 16.5
SIX_W, SIX_D = 18.32, 5.5
PEN_DIST     = 11.0
ARC_R        = 9.15
CENTER_R     = 9.15

# Double-tier bowl (lower + upper deck)
TIERS      = 2
TIER_H     = 4.0
TIER_D     = 3.5
STAND_PAD  = 8.0
SEAT_INSET = 0.65   # pull seats toward pitch so risers never cover them

# ══════════════════════════════════════════════════════════════
# 2.  MATERIAL FACTORY
# ══════════════════════════════════════════════════════════════
def mat(name, base, rough=0.85, metal=0.0,
        emit_col=None, emit_str=0.0, alpha=1.0,
        spec=0.5, ior=1.45):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    if alpha < 1.0:
        if hasattr(m, "blend_method"):
            m.blend_method = "HASHED"
        if hasattr(m, "shadow_method"):
            m.shadow_method = "HASHED"
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*base, 1.0) if len(base) == 3 else base
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = spec
    elif "Specular" in b.inputs:
        b.inputs["Specular"].default_value = spec
    b.inputs["Alpha"].default_value = alpha
    if emit_col:
        b.inputs["Emission Color"].default_value = (*emit_col, 1.0)
        b.inputs["Emission Strength"].default_value = emit_str
    return m


# Pure soccer turf — saturated greens
M_GD  = mat("Grass_Dark",  (0.02, 0.38, 0.06), rough=0.92)
M_GL  = mat("Grass_Light", (0.05, 0.52, 0.10), rough=0.90)
M_GB  = mat("Grass_Base",  (0.03, 0.45, 0.08), rough=0.95)
M_LN  = mat("White_Line",  (0.95, 0.95, 0.95), rough=0.6)
M_SP  = mat("Penalty_Spot", (0.95, 0.95, 0.95), rough=0.6)
M_PST = mat("Goal_Post",   (0.9, 0.9, 0.9), rough=0.2, metal=0.9)
M_NET = mat("Goal_Net",    (0.85, 0.85, 0.85), rough=0.8, alpha=0.6)
M_CON = mat("Concrete",    (0.18, 0.18, 0.20), rough=0.95)
M_CON2 = mat("Concrete2",  (0.12, 0.12, 0.14), rough=0.95)
M_STL = mat("Steel",       (0.55, 0.58, 0.60), rough=0.25, metal=0.9)
M_GLZ = mat("Glass_Roof",  (0.7, 0.8, 0.9), rough=0.05, alpha=0.25, spec=0.9, ior=1.52)
M_SRD = mat("Seat_Red",    (0.75, 0.05, 0.05), rough=0.8)
M_SBL = mat("Seat_Blue",   (0.05, 0.15, 0.65), rough=0.8)
M_SYL = mat("Seat_Yellow", (0.85, 0.65, 0.02), rough=0.8)
M_SGN = mat("Seat_Green",  (0.04, 0.35, 0.10), rough=0.8)
M_SWH = mat("Seat_White",  (0.88, 0.88, 0.88), rough=0.8)
SEAT_MATS = [M_SRD, M_SBL, M_SYL, M_SGN, M_SWH]
M_CRD = mat("Fan_Red",    (0.85, 0.08, 0.08), emit_col=(0.85, 0.08, 0.08), emit_str=0.6)
M_CBL = mat("Fan_Blue",   (0.08, 0.18, 0.85), emit_col=(0.08, 0.18, 0.85), emit_str=0.6)
M_CWH = mat("Fan_White",  (0.92, 0.92, 0.92), emit_col=(0.92, 0.92, 0.92), emit_str=0.8)
M_CYL = mat("Fan_Yellow", (0.9, 0.7, 0.02), emit_col=(0.9, 0.7, 0.02), emit_str=0.6)
FAN_MATS = [M_CRD, M_CBL, M_CWH, M_CYL]
M_AD1 = mat("Ad_Blue",  (0.0, 0.3, 0.9), emit_col=(0.0, 0.3, 0.9), emit_str=2.5)
M_AD2 = mat("Ad_Red",   (0.9, 0.05, 0.1), emit_col=(0.9, 0.05, 0.1), emit_str=2.5)
M_AD3 = mat("Ad_Green", (0.0, 0.7, 0.2), emit_col=(0.0, 0.7, 0.2), emit_str=2.5)
M_AD4 = mat("Ad_Gold",  (0.9, 0.65, 0.0), emit_col=(0.9, 0.65, 0.0), emit_str=2.5)
AD_MATS = [M_AD1, M_AD2, M_AD3, M_AD4]
M_FLD = mat("Floodlight", (1.0, 1.0, 0.95), emit_col=(1.0, 1.0, 0.9), emit_str=30.0)
M_FRM = mat("Light_Frame", (0.15, 0.15, 0.15), rough=0.4, metal=0.7)
M_SCR = mat("Screen", (0.05, 0.05, 0.08), emit_col=(0.2, 0.8, 1.0), emit_str=4.0)
M_FLAG_R = mat("Flag_Red", (0.85, 0.1, 0.1))
M_FLAG_W = mat("Flag_White", (0.92, 0.92, 0.92))
M_POLE = mat("Flag_Pole", (0.7, 0.7, 0.7), rough=0.3, metal=0.6)
M_DUG = mat("Dugout", (0.20, 0.20, 0.22), rough=0.9)
M_CHAIR = mat("Dug_Chair", (0.0, 0.2, 0.7), rough=0.8)

IS_NIGHT = STADIUM_TIME.strip().lower() == "night"

# ══════════════════════════════════════════════════════════════
# 3.  HELPERS
# ══════════════════════════════════════════════════════════════
def link(obj):
    if obj.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(obj)
    return obj


def cyl(loc, r, depth, material, name="cyl", rot=(0, 0, 0), smooth=True, segs=16):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segs, radius=r, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_euler = rot
    ob.data.materials.clear()
    ob.data.materials.append(material)
    if smooth:
        bpy.ops.object.shade_smooth()
    return ob


def sph(loc, r, material, name="sph", segs=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segs, ring_count=max(segs // 2, 4), radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.clear()
    ob.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return ob


def line_box(lx, ly, lz, sx, sy, material=None):
    m = material if material is not None else M_LN
    bpy.ops.mesh.primitive_cube_add(size=1, location=(lx, ly, lz))
    ob = bpy.context.active_object
    ob.scale = (sx, sy, LW)
    ob.data.materials.clear()
    ob.data.materials.append(m)
    return ob


def pitch_inward_sign(axis_value):
    """Unit vector component toward pitch center along one axis."""
    if axis_value > 0.01:
        return -1.0
    if axis_value < -0.01:
        return 1.0
    return 0.0


# ══════════════════════════════════════════════════════════════
# 4.  PITCH — pure green soccer turf (no brown track)
# ══════════════════════════════════════════════════════════════
STRIPE_N = 20
stripe_w = PL / STRIPE_N

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.12))
base = bpy.context.active_object
base.scale = (PW + 6, PL + 6, 0.18)
base.data.materials.append(M_GB)
base.name = "Pitch_Base"

for i in range(STRIPE_N):
    y = -PL / 2 + stripe_w / 2 + i * stripe_w
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, y, 0.003))
    s = bpy.context.active_object
    s.scale = (PW, stripe_w, 0.006)
    s.data.materials.append(M_GD if i % 2 == 0 else M_GL)
    s.name = f"Grass_Stripe_{i:02d}"

# Run-off margin — still grass, slightly darker
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.005))
runoff = bpy.context.active_object
runoff.scale = (PW + STAND_PAD * 2 - 1.0, PL + STAND_PAD * 2 - 1.0, 0.004)
runoff.data.materials.append(M_GD)
runoff.name = "Pitch_Runoff"

# ══════════════════════════════════════════════════════════════
# 5.  PITCH MARKINGS
# ══════════════════════════════════════════════════════════════
Z = LZ


def h_line(y, x0, x1):
    cx = (x0 + x1) / 2
    line_box(cx, y, Z, abs(x1 - x0) + LW, LW)


def v_line(x, y0, y1):
    cy = (y0 + y1) / 2
    line_box(x, cy, Z, LW, abs(y1 - y0) + LW)


def torus_ring(r, z, scz=0.05, segs=64):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=r, minor_radius=LW / 2,
        major_segments=segs, minor_segments=8,
        location=(0, 0, z))
    t = bpy.context.active_object
    t.scale[2] = scz
    t.data.materials.append(M_LN)
    bpy.ops.object.shade_smooth()


def arc_segment(cx, cy, r, a_start, a_end, z, segs=32):
    step = (a_end - a_start) / segs
    for i in range(segs):
        a = a_start + i * step + step / 2
        x = cx + r * math.cos(a)
        y = cy + r * math.sin(a)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
        ob = bpy.context.active_object
        ob.scale = (LW * 2, step * r, LW)
        ob.rotation_euler[2] = a + math.pi / 2
        ob.data.materials.append(M_LN)


v_line(-PW / 2, -PL / 2, PL / 2)
v_line(PW / 2, -PL / 2, PL / 2)
h_line(-PL / 2, -PW / 2, PW / 2)
h_line(PL / 2, -PW / 2, PW / 2)
h_line(0, -PW / 2, PW / 2)
torus_ring(CENTER_R, Z)
bpy.ops.mesh.primitive_circle_add(radius=0.3, location=(0, 0, Z), fill_type="NGON")
cs = bpy.context.active_object
cs.data.materials.append(M_LN)

for sign in (-1, 1):
    gy = sign * PL / 2
    sy = -sign
    v_line(-BOX_W / 2, gy, gy + sy * BOX_D)
    v_line(BOX_W / 2, gy, gy + sy * BOX_D)
    h_line(gy + sy * BOX_D, -BOX_W / 2, BOX_W / 2)
    v_line(-SIX_W / 2, gy, gy + sy * SIX_D)
    v_line(SIX_W / 2, gy, gy + sy * SIX_D)
    h_line(gy + sy * SIX_D, -SIX_W / 2, SIX_W / 2)
    bpy.ops.mesh.primitive_circle_add(
        radius=0.25, location=(0, gy + sy * PEN_DIST, Z), fill_type="NGON")
    bpy.context.active_object.data.materials.append(M_LN)
    box_angle = math.acos((BOX_D - PEN_DIST) / ARC_R)
    a1 = math.pi / 2 + box_angle
    a2 = math.pi / 2 - box_angle + math.pi
    if sign == 1:
        arc_segment(0, gy + sy * PEN_DIST, ARC_R, a1, a2, Z)
    else:
        arc_segment(0, gy + sy * PEN_DIST, ARC_R,
                    math.pi - a2 + math.pi, math.pi - a1 + math.pi, Z)

for cx, cy, a0 in [(-PW / 2, -PL / 2, 0), (PW / 2, -PL / 2, math.pi / 2),
                   (PW / 2, PL / 2, math.pi), (-PW / 2, PL / 2, 3 * math.pi / 2)]:
    arc_segment(cx, cy, 1.0, a0, a0 + math.pi / 2, Z, segs=10)

# ══════════════════════════════════════════════════════════════
# 6.  CORNER FLAGS
# ══════════════════════════════════════════════════════════════
def corner_flag(x, y):
    cyl((x, y, 0.75), 0.025, 1.5, M_POLE, segs=8)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 0.2, y, 1.5))
    f = bpy.context.active_object
    f.scale = (0.4, 0.01, 0.25)
    fm = M_FLAG_R if (x < 0) == (y < 0) else M_FLAG_W
    f.data.materials.append(fm)


for cx in (-PW / 2, PW / 2):
    for cy in (-PL / 2, PL / 2):
        corner_flag(cx, cy)

# ══════════════════════════════════════════════════════════════
# 7.  GOALS
# ══════════════════════════════════════════════════════════════
def build_goal(gy, sign):
    gd = GOAL_D * sign
    for gx in (-GOAL_W / 2, GOAL_W / 2):
        cyl((gx, gy, GOAL_H / 2), POST_R, GOAL_H, M_PST, segs=12)
        sph((gx, gy, 0), POST_R * 1.5, M_PST)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, radius=POST_R,
        depth=GOAL_W + POST_R * 2, location=(0, gy, GOAL_H))
    cb = bpy.context.active_object
    cb.rotation_euler[1] = math.pi / 2
    cb.data.materials.append(M_PST)
    bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12, radius=POST_R,
        depth=GOAL_W + POST_R * 2, location=(0, gy - gd, 0))
    bp = bpy.context.active_object
    bp.rotation_euler[1] = math.pi / 2
    bp.data.materials.append(M_PST)
    for gx in (-GOAL_W / 2, GOAL_W / 2):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8, radius=POST_R,
            depth=GOAL_D, location=(gx, gy - gd / 2, GOAL_H))
        sb = bpy.context.active_object
        sb.rotation_euler[0] = math.pi / 2
        sb.data.materials.append(M_PST)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, gy - gd / 2, GOAL_H / 2))
    net = bpy.context.active_object
    net.scale = (GOAL_W, GOAL_D, GOAL_H)
    net.data.materials.append(M_NET)
    wf = net.modifiers.new("Net_WF", "WIREFRAME")
    wf.thickness = 0.025
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, gy - gd / 2, 0.01))
    gnet = bpy.context.active_object
    gnet.scale = (GOAL_W, GOAL_D, 0.01)
    gnet.data.materials.append(M_NET)
    wf2 = gnet.modifiers.new("GNet_WF", "WIREFRAME")
    wf2.thickness = 0.025


build_goal(PL / 2, 1)
build_goal(-PL / 2, -1)

# ══════════════════════════════════════════════════════════════
# 8.  ADVERTISING HOARDINGS
# ══════════════════════════════════════════════════════════════
BOARD_H = 0.9
BOARD_W = 3.0
BOARD_PAD = 2.5


def place_hoardings_along(x0, x1, y_pos, z_rot):
    length = abs(x1 - x0)
    n = max(1, int(length / BOARD_W))
    for i in range(n):
        cx = x0 + (i + 0.5) * (length / n)
        m = AD_MATS[i % len(AD_MATS)]
        bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, y_pos, BOARD_H / 2))
        b = bpy.context.active_object
        b.scale = (BOARD_W * 0.98, 0.1, BOARD_H)
        b.rotation_euler[2] = z_rot
        b.data.materials.append(m)


for sign in (-1, 1):
    place_hoardings_along(-PW / 2, PW / 2, sign * (PL / 2 + BOARD_PAD), 0)
for sign in (-1, 1):
    place_hoardings_along(-PL / 2, -GOAL_W / 2 - 1, sign * (PW / 2 + BOARD_PAD - 1.5), math.pi / 2)
    place_hoardings_along(GOAL_W / 2 + 1, PL / 2, sign * (PW / 2 + BOARD_PAD - 1.5), math.pi / 2)

# ══════════════════════════════════════════════════════════════
# 9.  DUGOUTS
# ══════════════════════════════════════════════════════════════
def build_dugout(side_sign):
    dx = side_sign * (PW / 2 + BOARD_PAD + 1.8)
    for team_sign, col in [(1, M_SRD), (-1, M_SBL)]:
        dy = team_sign * 12.0
        bpy.ops.mesh.primitive_cube_add(size=1, location=(dx, dy, 2.8))
        r = bpy.context.active_object
        r.scale = (3.5, 8.0, 0.15)
        r.data.materials.append(M_DUG)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(dx + side_sign * 1.5, dy, 1.5))
        w = bpy.context.active_object
        w.scale = (0.2, 8.0, 2.8)
        w.data.materials.append(M_DUG)
        for sy in (-1, 1):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(dx, dy + sy * 3.8, 1.5))
            sw = bpy.context.active_object
            sw.scale = (3.5, 0.15, 2.8)
            sw.data.materials.append(M_DUG)
        for si in range(-3, 4):
            bpy.ops.mesh.primitive_cube_add(
                size=1, location=(dx + side_sign * 0.6, dy + si * 1.0, 0.45))
            seat = bpy.context.active_object
            seat.scale = (0.4, 0.5, 0.08)
            seat.data.materials.append(col)


build_dugout(1)
build_dugout(-1)

# ══════════════════════════════════════════════════════════════
# 10. BALL & PLAYERS
# ══════════════════════════════════════════════════════════════
sph((0, 0, 0.11), 0.11, mat("Ball", (0.92, 0.92, 0.92), rough=0.5), segs=24)
M_TM1 = mat("Team1_Kit", (0.8, 0.05, 0.05))
M_TM2 = mat("Team2_Kit", (0.05, 0.15, 0.75))
M_GKP = mat("GK_Kit", (0.05, 0.55, 0.15))
M_SKN = mat("Skin", (0.83, 0.65, 0.50))
M_BTS = mat("Boots", (0.1, 0.1, 0.1))


def place_player(x, y, team_mat, is_gk=False):
    kit = M_GKP if is_gk else team_mat
    for lx in (-0.08, 0.08):
        cyl((x + lx, y, 0.5), 0.07, 1.0, kit, segs=8)
        cyl((x + lx, y - 0.05, 0.05), 0.08, 0.12, M_BTS, segs=8)
    cyl((x, y, 1.2), 0.14, 0.7, kit, segs=8)
    for ax in (-0.22, 0.22):
        cyl((x + ax, y, 1.1), 0.055, 0.55, kit, segs=8, rot=(0, math.radians(15), 0))
    sph((x, y, 1.7), 0.12, M_SKN, segs=10)


T1_POS = [
    (0, -28, False, M_TM1), (-14, -20, False, M_TM1), (-5, -21, False, M_TM1),
    (5, -21, False, M_TM1), (14, -20, False, M_TM1), (-10, -10, False, M_TM1),
    (0, -11, False, M_TM1), (10, -10, False, M_TM1), (-12, -2, False, M_TM1),
    (0, 0, False, M_TM1), (12, -2, False, M_TM1),
]
T2_POS = [
    (0, 28, True, M_TM2), (-14, 20, False, M_TM2), (-5, 21, False, M_TM2),
    (5, 21, False, M_TM2), (14, 20, False, M_TM2), (-10, 10, False, M_TM2),
    (0, 11, False, M_TM2), (10, 10, False, M_TM2), (-12, 2, False, M_TM2),
    (0, 4, False, M_TM2), (12, 2, False, M_TM2),
]
for i, (x, y, gk, km) in enumerate(T1_POS):
    place_player(x, y, km, is_gk=(i == 0))
for i, (x, y, gk, km) in enumerate(T2_POS):
    place_player(x, y, km, is_gk=(i == 0))

# ══════════════════════════════════════════════════════════════
# 11. STADIUM STANDS — double tier, thin risers (no seat-blocking walls)
# ══════════════════════════════════════════════════════════════
stand_coll = bpy.data.collections.new("Stands")
bpy.context.scene.collection.children.link(stand_coll)
crowd_coll = bpy.data.collections.new("Crowd")
bpy.context.scene.collection.children.link(crowd_coll)
seat_positions = []
flood_lights = []


def build_stand_segment(cx, cy, sx, sy, tier, is_ew=False):
    # Single riser slab at this tier only (NOT stacked from ground — that hid seats)
    deck_z = tier * TIER_H
    riser_center_z = deck_z + TIER_H / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, riser_center_z))
    step = bpy.context.active_object
    step.scale = (sx, sy, TIER_H)
    step.data.materials.append(M_CON if tier % 2 == 0 else M_CON2)
    stand_coll.objects.link(step)
    bpy.context.scene.collection.objects.unlink(step)

    seat_z = deck_z + TIER_H + 0.18
    sm = SEAT_MATS[(tier + int(abs(cx) + abs(cy))) % len(SEAT_MATS)]
    iy = pitch_inward_sign(cy) * SEAT_INSET
    ix = pitch_inward_sign(cx) * SEAT_INSET

    if not is_ew:
        for seat_x in range(int(-sx / 2) + 1, int(sx / 2), 2):
            bpy.ops.mesh.primitive_cube_add(
                size=1, location=(cx + seat_x, cy + iy, seat_z))
            s = bpy.context.active_object
            s.scale = (0.55, TIER_D * 0.5, 0.4)
            s.data.materials.append(sm)
            stand_coll.objects.link(s)
            bpy.context.scene.collection.objects.unlink(s)
            seat_positions.append((cx + seat_x, cy + iy, seat_z + 0.3))
    else:
        for seat_y in range(int(-sy / 2) + 1, int(sy / 2), 2):
            bpy.ops.mesh.primitive_cube_add(
                size=1, location=(cx + ix, cy + seat_y, seat_z))
            s = bpy.context.active_object
            s.scale = (TIER_D * 0.5, 0.55, 0.4)
            s.data.materials.append(sm)
            stand_coll.objects.link(s)
            bpy.context.scene.collection.objects.unlink(s)
            seat_positions.append((cx + ix, cy + seat_y, seat_z + 0.3))


max_stand_w = PW + STAND_PAD * 2 + TIERS * TIER_D * 2
max_stand_l = PL + STAND_PAD * 2 + TIERS * TIER_D * 2

for tier in range(TIERS):
    sw_ns = PW + STAND_PAD * 2 + tier * TIER_D * 2
    cy_n = PL / 2 + STAND_PAD + tier * TIER_D + TIER_D / 2
    cy_s = -(PL / 2 + STAND_PAD + tier * TIER_D + TIER_D / 2)
    sl_ew = PL + STAND_PAD * 2 + (tier + 1) * TIER_D * 2
    cx_e = PW / 2 + STAND_PAD + tier * TIER_D + TIER_D / 2
    cx_w = -(PW / 2 + STAND_PAD + tier * TIER_D + TIER_D / 2)
    build_stand_segment(0, cy_n, sw_ns, TIER_D, tier, is_ew=False)
    build_stand_segment(0, cy_s, sw_ns, TIER_D, tier, is_ew=False)
    build_stand_segment(cx_e, 0, TIER_D, sl_ew, tier, is_ew=True)
    build_stand_segment(cx_w, 0, TIER_D, sl_ew, tier, is_ew=True)

# Fascia / outer shell — BEHIND the upper tier (not in front of seats)
fascia_h = TIERS * TIER_H + 2.5
outer_ns_y = PL / 2 + STAND_PAD + TIERS * TIER_D + 1.2
outer_ew_x = PW / 2 + STAND_PAD + TIERS * TIER_D + 1.2

for sign in (-1, 1):
    ny = sign * outer_ns_y
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, ny, fascia_h / 2))
    f = bpy.context.active_object
    f.scale = (max_stand_w + 2, 0.7, fascia_h)
    f.data.materials.append(M_CON)
    f.name = f"Fascia_NS_{'N' if sign > 0 else 'S'}"
    ex = sign * outer_ew_x
    bpy.ops.mesh.primitive_cube_add(size=1, location=(ex, 0, fascia_h / 2))
    f2 = bpy.context.active_object
    f2.scale = (0.7, max_stand_l + 2, fascia_h)
    f2.data.materials.append(M_CON)
    f2.name = f"Fascia_EW_{'E' if sign > 0 else 'W'}"

# Vomitory gap between lower and upper tier (visual double-deck)
if TIERS >= 2:
    gap_z = TIER_H + 0.4
    for sign in (-1, 1):
        gy = sign * (PL / 2 + STAND_PAD + TIER_D * 0.5)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, gy, gap_z))
        g = bpy.context.active_object
        g.scale = (PW + STAND_PAD, 1.2, 0.25)
        g.data.materials.append(M_STL)
        g.name = "Tier_Concourse_NS"
        gx = sign * (PW / 2 + STAND_PAD + TIER_D * 0.5)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(gx, 0, gap_z))
        g2 = bpy.context.active_object
        g2.scale = (1.2, PL + STAND_PAD, 0.25)
        g2.data.materials.append(M_STL)
        g2.name = "Tier_Concourse_EW"

# ══════════════════════════════════════════════════════════════
# 12. ROOF
# ══════════════════════════════════════════════════════════════
roof_z = TIERS * TIER_H + 3.5
overhang = 12.0
roof_t = 0.8

for sign in (-1, 1):
    ry = sign * (PL / 2 + STAND_PAD + TIERS * TIER_D / 2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, ry, roof_z))
    r = bpy.context.active_object
    r.scale = (max_stand_w + overhang * 2, TIERS * TIER_D + overhang, roof_t)
    r.rotation_euler[0] = math.radians(8 * sign)
    r.data.materials.append(M_GLZ)
for sign in (-1, 1):
    rx = sign * (PW / 2 + STAND_PAD + TIERS * TIER_D / 2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(rx, 0, roof_z))
    r = bpy.context.active_object
    r.scale = (TIERS * TIER_D + overhang, max_stand_l + overhang * 2, roof_t)
    r.rotation_euler[1] = math.radians(-8 * sign)
    r.data.materials.append(M_GLZ)

GIRDER_SPACING = 12.0
for sign in (-1, 1):
    ry = sign * (PL / 2 + STAND_PAD + TIERS * TIER_D / 2)
    n_girders = int(max_stand_w / GIRDER_SPACING)
    for gi in range(n_girders + 1):
        gx = -max_stand_w / 2 + gi * GIRDER_SPACING
        cyl((gx, ry, roof_z + 1.5), 0.25, TIERS * TIER_D + overhang, M_STL,
            segs=8, rot=(math.pi / 2, 0, 0))
for sign_x, sign_y in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
    px = sign_x * (PW / 2 + STAND_PAD + TIERS * TIER_D)
    py = sign_y * (PL / 2 + STAND_PAD + TIERS * TIER_D)
    cyl((px, py, roof_z / 2), 0.55, roof_z, M_STL, segs=12)

# ══════════════════════════════════════════════════════════════
# 13. SCOREBOARDS
# ══════════════════════════════════════════════════════════════
SCR_W, SCR_H = 14.0, 6.0
screen_z = TIERS * TIER_H + 1.0
for sx, sy, angle in [
    (max_stand_w / 2 - 4, max_stand_l / 2 - 4, math.radians(-135)),
    (-max_stand_w / 2 + 4, max_stand_l / 2 - 4, math.radians(-45)),
    (max_stand_w / 2 - 4, -max_stand_l / 2 + 4, math.radians(135)),
    (-max_stand_w / 2 + 4, -max_stand_l / 2 + 4, math.radians(45)),
]:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, screen_z))
    scr = bpy.context.active_object
    scr.scale = (SCR_W, 0.4, SCR_H)
    scr.rotation_euler[2] = angle
    scr.data.materials.append(M_SCR)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, sy, screen_z))
    frm = bpy.context.active_object
    frm.scale = (SCR_W + 0.4, 0.5, SCR_H + 0.4)
    frm.rotation_euler[2] = angle
    frm.data.materials.append(M_STL)

# ══════════════════════════════════════════════════════════════
# 14. FLOODLIGHT TOWERS
# ══════════════════════════════════════════════════════════════
TOWER_H = 55.0
lights_coll = bpy.data.collections.new("Stadium_Lights")
bpy.context.scene.collection.children.link(lights_coll)

for lx, ly in [
    (-max_stand_w / 2 - 3, max_stand_l / 2 + 3),
    (max_stand_w / 2 + 3, max_stand_l / 2 + 3),
    (max_stand_w / 2 + 3, -max_stand_l / 2 - 3),
    (-max_stand_w / 2 - 3, -max_stand_l / 2 - 3),
]:
    cyl((lx, ly, TOWER_H * 0.45), 0.9, TOWER_H * 0.9, M_STL, segs=8)
    cyl((lx, ly, TOWER_H * 0.90), 0.5, TOWER_H * 0.2, M_STL, segs=8)
    for bx, by in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        bpy.ops.mesh.primitive_cube_add(
            size=1, location=(lx + bx * 5, ly + by * 5, TOWER_H * 0.4))
        st = bpy.context.active_object
        st.scale = (0.2, 0.2, TOWER_H * 0.5)
        angle_z = math.atan2(by, bx)
        st.rotation_euler = (math.radians(25), 0, angle_z)
        st.data.materials.append(M_STL)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(lx, ly, TOWER_H + 1))
    rig = bpy.context.active_object
    rig.scale = (8, 3.5, 0.3)
    angle_z2 = math.atan2(-ly, -lx)
    rig.rotation_euler[2] = angle_z2
    rig.data.materials.append(M_FRM)
    for row in range(3):
        for col_i in range(5):
            dx = (col_i - 2) * 1.4
            bpy.ops.mesh.primitive_cube_add(
                size=1,
                location=(lx + dx * math.cos(angle_z2 + math.pi / 2),
                          ly + dx * math.sin(angle_z2 + math.pi / 2),
                          TOWER_H + 1.5 + row * 0.9))
            lp = bpy.context.active_object
            lp.scale = (1.2, 0.4, 0.7)
            lp.rotation_euler[2] = angle_z2
            lp.data.materials.append(M_FLD)
            lp.name = "Flood_Lamp"
            if not IS_NIGHT:
                lp.hide_render = True
                lp.hide_viewport = False

    bpy.ops.object.light_add(type="SPOT", location=(lx, ly, TOWER_H + 2))
    spt = bpy.context.active_object
    spt.name = f"Flood_Spot_{lx:.0f}_{ly:.0f}"
    direction = Vector((0, 0, 0)) - Vector((lx, ly, TOWER_H + 2))
    rot_quat = direction.to_track_quat("-Z", "Y")
    spt.rotation_euler = rot_quat.to_euler()
    spt.data.energy = 120_000 if IS_NIGHT else 0.0
    spt.data.spot_size = math.radians(42)
    spt.data.spot_blend = 0.25
    if hasattr(spt.data, "shadow_soft_size"):
        spt.data.shadow_soft_size = 4.0
    spt.data.color = (1.0, 0.98, 0.90)
    spt.hide_render = not IS_NIGHT
    lights_coll.objects.link(spt)
    flood_lights.append(spt)

# ══════════════════════════════════════════════════════════════
# 15. CROWD
# ══════════════════════════════════════════════════════════════
fan_meshes = []
for fm in FAN_MATS:
    bpy.ops.mesh.primitive_cube_add(size=0.35)
    fob = bpy.context.active_object
    fob.data.materials.append(fm)
    bpy.context.scene.collection.objects.unlink(fob)
    crowd_coll.objects.link(fob)
    fan_meshes.append(fob)

CROWD_FILL = 0.75
for (sx, sy, sz) in seat_positions:
    if random.random() > CROWD_FILL:
        continue
    base_ob = random.choice(fan_meshes)
    fan = base_ob.copy()
    fan.location = (
        sx + random.uniform(-0.35, 0.35),
        sy + random.uniform(-0.35, 0.35),
        sz + 0.25)
    fan.scale = (
        random.uniform(0.8, 1.1),
        random.uniform(0.8, 1.1),
        random.uniform(1.2, 1.8))
    crowd_coll.objects.link(fan)

# ══════════════════════════════════════════════════════════════
# 16. DAY / NIGHT LIGHTING
# ══════════════════════════════════════════════════════════════
def _sky_type_ids():
    prop = bpy.types.ShaderNodeTexSky.bl_rna.properties.get("sky_type")
    if prop is None:
        return []
    return [item.identifier for item in prop.enum_items]


def setup_world_background(is_night):
    """World shader compatible with Blender 3.6–5.x (no NISHITA required)."""
    world = bpy.context.scene.world
    world.use_nodes = True
    nt = world.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")

    if is_night:
        bg.inputs["Color"].default_value = (0.01, 0.015, 0.04, 1.0)
        bg.inputs["Strength"].default_value = 0.06
    else:
        available = _sky_type_ids()
        prefer = ("NISHITA", "HOSEK_WILKIE", "PREETHAM", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING")
        sky_id = next((s for s in prefer if s in available), available[0] if available else None)
        if sky_id:
            sky = nodes.new("ShaderNodeTexSky")
            sky.sky_type = sky_id
            elev = math.radians(48)
            rot = math.radians(25)
            if hasattr(sky, "sun_elevation"):
                sky.sun_elevation = elev
            if hasattr(sky, "sun_rotation"):
                sky.sun_rotation = rot
            if hasattr(sky, "sun_direction"):
                sky.sun_direction = (0.25, 0.1, 0.96)
            if hasattr(sky, "sun_intensity"):
                sky.sun_intensity = 1.0
            if hasattr(sky, "sun_size"):
                sky.sun_size = math.radians(3.0)
            if hasattr(sky, "air_density"):
                sky.air_density = 1.0
            if hasattr(sky, "dust_density"):
                sky.dust_density = 0.0
            if hasattr(sky, "altitude"):
                sky.altitude = 0.0
            links.new(sky.outputs["Color"], bg.inputs["Color"])
        else:
            bg.inputs["Color"].default_value = (0.45, 0.62, 0.95, 1.0)
        bg.inputs["Strength"].default_value = 1.0

    links.new(bg.outputs["Background"], out.inputs["Surface"])


scene = bpy.context.scene
scene["stadium_time"] = STADIUM_TIME
setup_world_background(IS_NIGHT)

# Sun (day) — key fill on pitch
bpy.ops.object.light_add(type="SUN", location=(30, -40, 80))
sun = bpy.context.active_object
sun.name = "Stadium_Sun"
sun.rotation_euler = (math.radians(35), math.radians(15), math.radians(210))
sun.data.angle = math.radians(1.2)
sun.data.color = (1.0, 0.97, 0.88)
if IS_NIGHT:
    sun.data.energy = 0.0
    sun.hide_render = True
else:
    sun.data.energy = 6.0
    sun.data.use_shadow = True

# Soft sky fill (day only)
bpy.ops.object.light_add(type="AREA", location=(0, 0, 90))
sky_fill = bpy.context.active_object
sky_fill.name = "Sky_Fill"
sky_fill.data.energy = 800 if not IS_NIGHT else 0
sky_fill.data.size = 220
sky_fill.data.color = (0.55, 0.72, 1.0)
sky_fill.hide_render = IS_NIGHT

# Pitch accent lights at night (subtle ground wash)
if IS_NIGHT:
    for lx, ly in [(0, 0), (25, 20), (-25, -20)]:
        bpy.ops.object.light_add(type="AREA", location=(lx, ly, 42))
        al = bpy.context.active_object
        al.data.energy = 2500
        al.data.size = 35
        al.data.color = (0.9, 0.95, 0.85)
        al.rotation_euler = (math.radians(90), 0, 0)
        lights_coll.objects.link(al)

# ══════════════════════════════════════════════════════════════
# 17. CAMERA
# ══════════════════════════════════════════════════════════════
cam_x, cam_y, cam_z = PW / 2 + 60, -PL / 4, 45
bpy.ops.object.camera_add(location=(cam_x, cam_y, cam_z))
cam = bpy.context.active_object
cam.name = "Broadcast_Cam"
look_at = Vector((0, 0, 1))
direction = look_at - Vector((cam_x, cam_y, cam_z))
rot = direction.to_track_quat("-Z", "Y")
cam.rotation_euler = rot.to_euler()
cam.data.lens = 50
cam.data.sensor_width = 36
cam.data.dof.use_dof = True
cam.data.dof.focus_distance = math.hypot(cam_x, cam_y, cam_z - 1)
cam.data.dof.aperture_fstop = 4.0
scene.camera = cam

# ══════════════════════════════════════════════════════════════
# 18. RENDER SETTINGS
# ══════════════════════════════════════════════════════════════
scene.render.engine = "CYCLES"
scene.cycles.device = "GPU"
scene.cycles.samples = 256
scene.cycles.use_denoising = True
scene.render.resolution_x = 2560
scene.render.resolution_y = 1440
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = "//ultra_stadium_render.png"

# ══════════════════════════════════════════════════════════════
# 19. SUMMARY
# ══════════════════════════════════════════════════════════════
n_seats = len(seat_positions)
n_crowd = sum(1 for c in crowd_coll.objects if c not in fan_meshes)
n_obj = len(bpy.data.objects)
print("=" * 60)
print("  ULTRA STADIUM — GENERATION COMPLETE")
print("=" * 60)
print(f"  Mode           : {STADIUM_TIME.upper()} ({'floodlights ON' if IS_NIGHT else 'sun + sky'})")
print(f"  Seating tiers  : {TIERS}")
print(f"  Objects total  : {n_obj}")
print(f"  Seat positions : {n_seats}")
print(f"  Crowd figures  : {n_crowd}  (~{CROWD_FILL * 100:.0f}% fill)")
print(f"  Players        : 22 (11v11 with GKs)")
print(f"  Floodlight towers : 4")
print("  Tip: set STADIUM_TIME = 'night' or 'day' at top and re-run.")
print("=" * 60)
