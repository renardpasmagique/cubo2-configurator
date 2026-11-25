"""
Build script for CUBO 4 3D configurator asset (cubo4.glb).
Reads CAD STLs from Desktop/5426 simulateur/Cubo 4 & Horn, normalizes coordinates
to Three.js (Y-up, +Z front, meters, cabinet bottom at Y=0), separates front baffle
for independent coloring, adds procedural 6.5" woofer seated in the cutout,
compression driver behind the oval horn, top terminal/ID plaque (60x100mm R15),
custom feet, swivel castors, and box UVs for plywood / wood veneer textures.
"""

import os
import math
import numpy as np
import trimesh

STL_ROOT = r"C:\Users\liams\Desktop\5426 simulateur"
OUT_RAW = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "models",
    "cubo4_raw.glb",
)

# CUBO 4 CAD bounds (mm):
# X (width):  [-130, 130] -> center 0
# Y (depth):  [127, 393]  -> center 260 (front=127 -> +0.133m, back=393 -> -0.133m)
# Z (height): [130, 540]  -> bottom=130 -> 0.0m, top=540 -> 0.410m
CAD_CENTER_X = 0.0
CAD_CENTER_Y = 260.0
CAD_BOTTOM_Z = 130.0


def cubo4_cad_to_three() -> np.ndarray:
    """4x4 matrix converting CUBO 4 CAD mm (X=right, Y=back, Z=up) to Three.js m (X=right, Y=up, Z=front)."""
    T = np.zeros((4, 4), dtype=np.float64)
    T[0, 0] = 0.001
    T[0, 3] = -CAD_CENTER_X * 0.001
    T[1, 2] = 0.001
    T[1, 3] = -CAD_BOTTOM_Z * 0.001
    T[2, 1] = -0.001
    T[2, 3] = CAD_CENTER_Y * 0.001
    T[3, 3] = 1.0
    return T


def add_box_uvs(mesh: trimesh.Trimesh, scale: float = 3.0) -> trimesh.Trimesh:
    """Assign clean triplanar box UVs in meters so plywood & wood veneer tile naturally."""
    m = mesh.copy()
    m.unmerge_vertices()
    verts = m.vertices
    normals = m.face_normals
    v_normals = np.repeat(normals, 3, axis=0)
    abs_n = np.abs(v_normals)
    uv = np.zeros((len(verts), 2), dtype=np.float32)

    mask_x = (abs_n[:, 0] >= abs_n[:, 1]) & (abs_n[:, 0] >= abs_n[:, 2])
    uv[mask_x, 0] = verts[mask_x, 2] * scale
    uv[mask_x, 1] = verts[mask_x, 1] * scale

    mask_y = (abs_n[:, 1] > abs_n[:, 0]) & (abs_n[:, 1] >= abs_n[:, 2])
    uv[mask_y, 0] = verts[mask_y, 0] * scale
    uv[mask_y, 1] = verts[mask_y, 2] * scale

    mask_z = ~(mask_x | mask_y)
    uv[mask_z, 0] = verts[mask_z, 0] * scale
    uv[mask_z, 1] = verts[mask_z, 1] * scale

    m.visual = trimesh.visual.TextureVisuals(uv=uv)
    return m


def split_cabinet_baffle(mesh: trimesh.Trimesh):
    """
    Separate the front baffle faces (Z_three > 0.1145m, i.e., front 18.5mm)
    from the rest of the cabinet so the front face can be colored independently.
    """
    centroids = mesh.triangles_center
    is_baffle = centroids[:, 2] > 0.1145
    baffle_faces = np.where(is_baffle)[0]
    body_faces = np.where(~is_baffle)[0]
    return mesh.submesh([body_faces], append=True), mesh.submesh([baffle_faces], append=True)


def build_revolved_profile(profile_rz: list[tuple[float, float]], segments: int = 64) -> trimesh.Trimesh:
    """Revolve a 2D (radius, z) profile around the Z axis."""
    angles = np.linspace(0, 2 * np.pi, segments, endpoint=False)
    n_pts = len(profile_rz)
    verts = []
    for a in angles:
        ca, sa = math.cos(a), math.sin(a)
        for r, z in profile_rz:
            verts.append([r * ca, r * sa, z])
    verts = np.array(verts, dtype=np.float64)

    faces = []
    for s in range(segments):
        s_next = (s + 1) % segments
        base0 = s * n_pts
        base1 = s_next * n_pts
        for p in range(n_pts - 1):
            i0 = base0 + p
            i1 = base0 + p + 1
            j0 = base1 + p
            j1 = base1 + p + 1
            faces.append([i0, j0, j1])
            faces.append([i0, j1, i1])

    m = trimesh.Trimesh(vertices=verts, faces=np.array(faces), process=True)
    m.fix_normals()
    return m


def build_cubo4_woofer() -> dict[str, trimesh.Trimesh]:
    """
    Build realistic 6.5" woofer seated inside the 148mm cutout of CUBO 4:
      Cutout center in Three.js: X=0, Y=0.240m (370-130 mm), Z=0.133m (front face)
      Outer frame: R=0.074..0.088m
      Surround: R=0.062..0.074m
      Cone: R=0.025..0.062m sloping back to Z=-0.030m
      Dust cap: R=0.026m dome
    """
    frame_profile = [
        (0.073, -0.004),
        (0.073, 0.003),
        (0.077, 0.005),
        (0.086, 0.005),
        (0.088, 0.002),
        (0.088, -0.004),
        (0.073, -0.004),
    ]
    frame = build_revolved_profile(frame_profile, segments=64)

    screws = []
    for k in range(6):
        ang = k * (2 * np.pi / 6) + math.pi / 6
        sx = 0.081 * math.cos(ang)
        sy = 0.081 * math.sin(ang)
        head = trimesh.creation.cylinder(radius=0.0025, height=0.003, sections=14)
        head.apply_translation([sx, sy, 0.0055])
        screws.append(head)
    screws_mesh = trimesh.util.concatenate(screws)

    surround_profile = []
    r_start, r_end = 0.061, 0.073
    for i in range(17):
        t = i / 16.0
        r = r_start + t * (r_end - r_start)
        z = 0.001 + 0.0045 * math.sin(t * math.pi)
        surround_profile.append((r, z))
    for i in range(16, -1, -1):
        t = i / 16.0
        r = r_start + t * (r_end - r_start)
        z = -0.0015 + 0.0045 * math.sin(t * math.pi)
        surround_profile.append((r, z))
    surround = build_revolved_profile(surround_profile, segments=64)

    cone_profile = []
    for i in range(16):
        t = i / 15.0
        r = 0.025 + t * (0.061 - 0.025)
        z_base = -0.029 + 0.030 * (t ** 0.85)
        cone_profile.append((r, z_base))
    for i in range(15, -1, -1):
        t = i / 15.0
        r = 0.025 + t * (0.061 - 0.025)
        z_base = -0.031 + 0.030 * (t ** 0.85)
        cone_profile.append((r, z_base))
    cone = build_revolved_profile(cone_profile, segments=64)

    cap_profile = []
    for i in range(14):
        ang = (i / 13.0) * (math.pi * 0.48)
        r = max(0.001, 0.026 * math.sin(ang))
        z = -0.030 + 0.014 * math.cos(ang)
        cap_profile.append((r, z))
    cap_profile.append((0.001, -0.030))
    dustcap = build_revolved_profile(cap_profile, segments=40)

    offset = [0.0, 0.240, 0.133]
    parts = {
        "woofer_frame": frame,
        "woofer_screws": screws_mesh,
        "woofer_surround": surround,
        "woofer_cone": cone,
        "woofer_dustcap": dustcap,
    }
    for m in parts.values():
        m.apply_translation(offset)
    return parts


def build_compression_driver(z_pos: float, y_pos: float) -> dict[str, trimesh.Trimesh]:
    """Build 1" compression driver behind the oval horn, facing +Z."""
    flange = trimesh.creation.cylinder(radius=0.046, height=0.007, sections=36)
    flange.apply_translation([0.0, 0.0, 0.022])

    plate_front = trimesh.creation.cylinder(radius=0.054, height=0.0045, sections=44)
    plate_front.apply_translation([0.0, 0.0, 0.011])
    plate_rear = trimesh.creation.cylinder(radius=0.054, height=0.0045, sections=44)
    plate_rear.apply_translation([0.0, 0.0, -0.011])
    metal_plates = trimesh.util.concatenate([plate_front, plate_rear, flange])

    ferrite = trimesh.creation.cylinder(radius=0.053, height=0.020, sections=44)
    cap_main = trimesh.creation.cylinder(radius=0.046, height=0.014, sections=36)
    cap_main.apply_translation([0.0, 0.0, -0.020])
    cap_back = trimesh.creation.cylinder(radius=0.038, height=0.007, sections=36)
    cap_back.apply_translation([0.0, 0.0, -0.029])
    body = trimesh.util.concatenate([ferrite, cap_main, cap_back])

    metal_plates.apply_translation([0.0, y_pos, z_pos])
    body.apply_translation([0.0, y_pos, z_pos])
    return {"body": body, "metal": metal_plates}


def build_cubo4_terminal_plate() -> dict[str, trimesh.Trimesh]:
    """
    Top-left terminal & identification plaque (60mm x 100mm, R15mm corners)
    matching cotation cubo 4 plaque texte.png & IMG_20261003_164127138 (1).jpg.
    Placed on top-left of CUBO 4 cabinet (Y=0.410m) beside the oval horn base.
    """
    from shapely.geometry import Polygon

    w, d, r = 0.060, 0.100, 0.015
    hw, hd = w / 2 - r, d / 2 - r
    pts = []
    corners = [
        (hw, -hd, -math.pi / 2, 0),
        (hw, hd, 0, math.pi / 2),
        (-hw, hd, math.pi / 2, math.pi),
        (-hw, -hd, math.pi, 3 * math.pi / 2),
    ]
    for cx, cz, a0, a1 in corners:
        for i in range(9):
            a = a0 + (a1 - a0) * (i / 8.0)
            pts.append([cx + r * math.cos(a), cz + r * math.sin(a)])

    poly = Polygon(pts)
    plate = trimesh.creation.extrude_polygon(poly, height=0.0025)
    plate.apply_transform(trimesh.transformations.rotation_matrix(-math.pi / 2, [1, 0, 0]))

    plate.unmerge_vertices()
    v = plate.vertices
    uv = np.zeros((len(v), 2), dtype=np.float32)
    uv[:, 0] = (v[:, 0] + w / 2) / w
    uv[:, 1] = 1.0 - (v[:, 2] + d / 2) / d
    plate.visual = trimesh.visual.TextureVisuals(uv=uv)

    # 4 gold banana-jack binding posts (X = ±18mm, Z = ±34mm)
    gold_parts, red_parts, black_parts = [], [], []
    for px, is_pos in ((-0.018, True), (0.018, False)):
        for pz in (-0.034, 0.034):
            base = trimesh.creation.cylinder(radius=0.0042, height=0.012, sections=16)
            base.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
            base.apply_translation([px, 0.008, pz])
            gold_parts.append(base)

            collar = trimesh.creation.cylinder(radius=0.0046, height=0.010, sections=16)
            collar.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
            collar.apply_translation([px, 0.018, pz])
            if is_pos:
                red_parts.append(collar)
            else:
                black_parts.append(collar)

    posts_gold = trimesh.util.concatenate(gold_parts)
    posts_red = trimesh.util.concatenate(red_parts)
    posts_black = trimesh.util.concatenate(black_parts)

    # Top-left of cabinet (width 0.260 -> X=-0.092, Y=0.410, Z=-0.068)
    center_x, base_y, center_z = -0.092, 0.410, -0.068
    for m in (plate, posts_gold, posts_red, posts_black):
        m.apply_translation([center_x, base_y, center_z])

    return {
        "terminal_plate": plate,
        "binding_posts": posts_gold,
        "binding_posts_red": posts_red,
        "binding_posts_black": posts_black,
    }


def build_cubo4_feet() -> trimesh.Trimesh:
    """4 custom feet under the 260x266mm CUBO 4 cabinet (resting at Y=0..0.016m)."""
    parts = []
    for sx in (-0.092, 0.092):
        for sz in (-0.095, 0.095):
            foot = trimesh.creation.cylinder(radius=0.019, height=0.016, sections=24)
            foot.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
            foot.apply_translation([sx, 0.008, sz])
            parts.append(foot)
    return trimesh.util.concatenate(parts)


def build_cubo4_castors() -> dict[str, trimesh.Trimesh]:
    """4 industrial swivel castors under the 260x266mm CUBO 4 cabinet (total height 55mm)."""
    brackets, wheels = [], []
    for sx in (-0.088, 0.088):
        for sz in (-0.090, 0.090):
            plate = trimesh.creation.box(extents=[0.044, 0.004, 0.044])
            plate.apply_translation([sx, 0.053, sz])
            brackets.append(plate)

            fork_l = trimesh.creation.box(extents=[0.004, 0.032, 0.022])
            fork_l.apply_translation([sx - 0.012, 0.036, sz])
            fork_r = trimesh.creation.box(extents=[0.004, 0.032, 0.022])
            fork_r.apply_translation([sx + 0.012, 0.036, sz])
            brackets.extend([fork_l, fork_r])

            wheel = trimesh.creation.cylinder(radius=0.021, height=0.018, sections=24)
            wheel.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [0, 1, 0]))
            wheel.apply_translation([sx, 0.021, sz])
            wheels.append(wheel)

    return {
        "castors_bracket": trimesh.util.concatenate(brackets),
        "castors_wheel": trimesh.util.concatenate(wheels),
    }


def main():
    os.makedirs(os.path.dirname(OUT_RAW), exist_ok=True)
    T = cubo4_cad_to_three()
    c4_dir = os.path.join(STL_ROOT, "Cubo 4")
    scene = trimesh.Scene()

    # 1. Standard cabinet (Caisse Cubo 4.stl)
    c_std = trimesh.load(os.path.join(c4_dir, "Caisse Cubo 4.stl"), force="mesh")
    c_std.apply_transform(T)
    std_body, std_baffle = split_cabinet_baffle(c_std)
    scene.add_geometry(add_box_uvs(std_body), node_name="cabinet_std_body", geom_name="cabinet_std_body")
    scene.add_geometry(add_box_uvs(std_baffle), node_name="cabinet_std_baffle", geom_name="cabinet_std_baffle")

    # 2. Metal-facade cabinet (Caisse Cubo 4 pour facade metal.stl)
    c_met = trimesh.load(os.path.join(c4_dir, "Caisse Cubo 4 pour facade metal.stl"), force="mesh")
    c_met.apply_transform(T)
    met_body, met_baffle = split_cabinet_baffle(c_met)
    scene.add_geometry(add_box_uvs(met_body), node_name="cabinet_metal_body", geom_name="cabinet_metal_body")
    scene.add_geometry(add_box_uvs(met_baffle), node_name="cabinet_metal_baffle", geom_name="cabinet_metal_baffle")

    # 3. Flush Metal Plate (Plaque metal.stl)
    p_met = trimesh.load(os.path.join(c4_dir, "Plaque metal.stl"), force="mesh")
    p_met.apply_transform(T)
    scene.add_geometry(add_box_uvs(p_met), node_name="front_metal_plate", geom_name="front_metal_plate")

    # 4. Front HP surround / cover (Facade avant HP.stl)
    hp_front = trimesh.load(os.path.join(c4_dir, "Facade avant HP.stl"), force="mesh")
    hp_front.apply_transform(T)
    scene.add_geometry(hp_front, node_name="facade_avant_hp", geom_name="facade_avant_hp")

    # 5. Ports: Standard (Even cubo 4.stl) & Metal Plate (Even plaque en metal.stl)
    ev_std = trimesh.load(os.path.join(c4_dir, "Even cubo 4.stl"), force="mesh")
    ev_std.apply_transform(T)
    scene.add_geometry(ev_std, node_name="even_std", geom_name="even_std")

    ev_met = trimesh.load(os.path.join(c4_dir, "Even plaque en metal.stl"), force="mesh")
    ev_met.apply_transform(T)
    scene.add_geometry(ev_met, node_name="even_metal", geom_name="even_metal")

    # 6. Oval Horn (5426 oval horn.stl) -> centered at X=0, resting on top of cabinet Y=0.410m, front at Z=+0.133m
    hoval = trimesh.load(os.path.join(STL_ROOT, "Horn", "5426 oval horn.stl"), force="mesh")
    # Convert from Horn local mm (X=width, Y=back..front, Z=height) to Three.js m:
    # Rotate +90 deg around X? Wait: let's check build_glb.py convention:
    # In build_glb.py, Horn was rotated +90 deg around Z and then transformed by T_cubo2 (where x_three=y_cad, y_three=z_cad, z_three=-x_cad).
    # That effectively maps local horn (x, y, z) -> (x_three=-x, y_three=z, z_three=-y).
    # Instead, let's map directly: rotate -90 deg around X (so local +Z -> +Y_three, local +Y -> -Z_three? Let's check mouth!).
    # In 5426 oval horn.stl: bounds=[[-126.83, -290.67, 62.33], [126.83, -62.67, 248.66]].
    # In build_glb.py: rotZ(+90) maps (x, y, z) -> (-y, x, z), then T maps (-y, x, z) -> (x_three=x, y_three=z, z_three=y).
    #Wait: in build_glb.py, hoval mouth is at -Y in local CAD (-290.67 is throat or mouth?), let's use the exact same axis mapping as build_glb.py!
    H = np.zeros((4, 4), dtype=np.float64)
    H[0, 0] = 0.001
    H[1, 2] = 0.001
    H[2, 1] = 0.001
    H[3, 3] = 1.0
    hoval.apply_transform(H)
    bov = hoval.bounds
    cxov = (bov[0, 0] + bov[1, 0]) * 0.5
    hoval.apply_translation([-cxov, 0.410 - bov[0, 1], 0.133 - bov[1, 2]])
    scene.add_geometry(hoval, node_name="horn_oval", geom_name="horn_oval")

    # 7. Compression driver behind oval horn
    drv_oval = build_compression_driver(z_pos=hoval.bounds[0, 2] - 0.025, y_pos=0.410 + 0.088)
    scene.add_geometry(drv_oval["body"], node_name="driver_oval", geom_name="driver_oval")
    scene.add_geometry(drv_oval["metal"], node_name="driver_oval_metal", geom_name="driver_oval_metal")

    # 8. Woofer 6.5" seated inside cutout
    for name, mesh in build_cubo4_woofer().items():
        scene.add_geometry(mesh, node_name=name, geom_name=name)

    # 9. Top-left terminal & ID plaque
    for name, mesh in build_cubo4_terminal_plate().items():
        scene.add_geometry(mesh, node_name=name, geom_name=name)

    # 10. Custom feet & Castors
    scene.add_geometry(build_cubo4_feet(), node_name="mount_feet", geom_name="mount_feet")
    for name, mesh in build_cubo4_castors().items():
        scene.add_geometry(mesh, node_name=name, geom_name=name)

    scene.export(OUT_RAW)
    size_mb = os.path.getsize(OUT_RAW) / (1024 * 1024)
    print(f"Exported {OUT_RAW} ({size_mb:.2f} MB), nodes: {list(scene.geometry.keys())}")
    print(f"horn_oval bounds: {hoval.bounds.round(4)}")


if __name__ == "__main__":
    main()
