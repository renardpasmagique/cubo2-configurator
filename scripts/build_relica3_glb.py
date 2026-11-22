"""
Build calibrated Relica 3 3D asset (relica3.glb) from Relica3_Crossover3V_3D.glb
and rasterize a 100% clean bare PCB top texture directly from the KiCad Gerbers
(no baked 3D components on the PCB surface!).
"""

import os
import re
import numpy as np
import trimesh
from PIL import Image, ImageDraw

SRC_GLB = r"C:\Users\liams\Desktop\PCB_Relica3_Crossover3V\Relica3_Crossover3V_3D.glb"
GERBER_DIR = r"C:\Users\liams\Desktop\PCB_Relica3_Crossover3V\gerbers"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_RAW_GLB = os.path.join(ROOT_DIR, "public", "models", "relica3_raw.glb")
OUT_PCB_TEX = os.path.join(ROOT_DIR, "public", "relica3_pcb_top.png")

# PCB physical dimensions in mm: 292 x 190 mm, origin at (20, 20) mm in KiCad
PCB_MIN_X_MM = 20.0
PCB_MAX_X_MM = 312.0
PCB_MIN_Y_MM = 20.0
PCB_MAX_Y_MM = 210.0
TEX_W = 2048
TEX_H = 1333  # 2048 * 190 / 292 = 1332.6


def mm_to_px(x_mm, y_mm):
    px = (x_mm - PCB_MIN_X_MM) / (PCB_MAX_X_MM - PCB_MIN_X_MM) * TEX_W
    py = (y_mm - PCB_MIN_Y_MM) / (PCB_MAX_Y_MM - PCB_MIN_Y_MM) * TEX_H
    return px, py


def draw_gerber_layer(filepath, draw, color, scale_px_per_mm, region_color=None, max_seg_mm=65.0):
    """Lightweight RS-274X Gerber parser for traces (D01), flashes (D03), and regions (G36/G37)."""
    if region_color is None:
        region_color = color
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    # Format specification: %FSLAX46Y46*% -> 4 integer, 6 decimal -> divide by 1e6
    fs = re.search(r"%FS[LT][AI]X(\d)(\d)Y(\d)(\d)\*%", text)
    div = 10 ** int(fs.group(2)) if fs else 1e6

    # Aperture definitions: %ADD10C,0.250000*% or %ADD11R,1.2X1.2*% or %ADD12O,...*%
    apertures = {}
    for m in re.finditer(r"%ADD(\d+)([CRO]),([^*]+)\*%", text):
        code = int(m.group(1))
        shape = m.group(2)
        params = [float(p) for p in m.group(3).split("X") if p]
        apertures[code] = (shape, params)

    cur_x, cur_y = 0.0, 0.0
    cur_ap = None
    in_region = False
    region_pts = []

    tokens = text.replace("\n", "").replace("\r", "").split("*")
    for tok in tokens:
        tok = tok.strip()
        if not tok or tok.startswith("%"):
            continue
        if tok.startswith("G36"):
            in_region = True
            region_pts = []
            continue
        if tok.startswith("G37"):
            if in_region and len(region_pts) >= 3:
                draw.polygon(region_pts, fill=region_color)
            in_region = False
            region_pts = []
            continue
        if tok.startswith("D") and tok[1:].isdigit():
            dcode = int(tok[1:])
            if dcode >= 10:
                cur_ap = apertures.get(dcode)
            continue
        if tok.startswith("G54D") and tok[4:].isdigit():
            cur_ap = apertures.get(int(tok[4:]))
            continue

        # Coordinates + optional D01/D02/D03
        xm = re.search(r"X(-?\d+)", tok)
        ym = re.search(r"Y(-?\d+)", tok)
        dm = re.search(r"D0([123])$", tok)
        if not xm and not ym and not dm:
            continue
        nx = int(xm.group(1)) / div if xm else cur_x
        ny = int(ym.group(1)) / div if ym else cur_y
        # KiCad Gerber Y axis is +up, while KiCad board/PNG Y is +down
        op = int(dm.group(1)) if dm else 1

        px0, py0 = mm_to_px(cur_x, -cur_y)
        px1, py1 = mm_to_px(nx, -ny)

        if in_region:
            if dm and op == 2:
                if len(region_pts) >= 3:
                    draw.polygon(region_pts, fill=region_color)
                region_pts = [(px1, py1)]
            else:
                region_pts.append((px1, py1))
        else:
            if dm and op == 1 and cur_ap and (xm or ym):
                seg_mm = ((nx - cur_x) ** 2 + (ny - cur_y) ** 2) ** 0.5
                if seg_mm <= max_seg_mm:
                    w_mm = cur_ap[1][0] if cur_ap[1] else 0.25
                    w_px = max(1, int(round(w_mm * scale_px_per_mm)))
                    draw.line([(px0, py0), (px1, py1)], fill=color, width=w_px)
                    r_px = max(1, w_px // 2)
                    draw.ellipse([px1 - r_px, py1 - r_px, px1 + r_px, py1 + r_px], fill=color)
            elif dm and op == 3 and cur_ap:
                shape, params = cur_ap
                if shape == "C":
                    r_px = max(1, params[0] * 0.5 * scale_px_per_mm)
                    draw.ellipse([px1 - r_px, py1 - r_px, px1 + r_px, py1 + r_px], fill=color)
                elif shape in ("R", "O"):
                    hw = params[0] * 0.5 * scale_px_per_mm
                    hh = (params[1] if len(params) > 1 else params[0]) * 0.5 * scale_px_per_mm
                    draw.rectangle([px1 - hw, py1 - hh, px1 + hw, py1 + hh], fill=color)

        cur_x, cur_y = nx, ny


def build_bare_pcb_texture():
    """Render matte-black FR4 PCB + raised dark copper traces + ENIG gold pads + white silkscreen."""
    scale = TEX_W / (PCB_MAX_X_MM - PCB_MIN_X_MM)
    img = Image.new("RGB", (TEX_W, TEX_H), (20, 22, 25))
    draw = ImageDraw.Draw(img)

    # 1. Copper traces under matte black solder mask (subtle dark charcoal relief)
    f_cu = os.path.join(GERBER_DIR, "crossover3v-F_Cu.gtl")
    if os.path.isfile(f_cu):
        draw_gerber_layer(f_cu, draw, (32, 35, 40), scale, max_seg_mm=300.0)

    # 2. Solder mask openings: pads in gold ENIG, logo/cathedral artwork polygons in crisp white/silver
    f_mask = os.path.join(GERBER_DIR, "crossover3v-F_Mask.gts")
    if os.path.isfile(f_mask):
        draw_gerber_layer(f_mask, draw, (212, 175, 55), scale, region_color=(235, 237, 240))

    # 3. White silkscreen (RELICA 3, component outlines & labels)
    f_silk = os.path.join(GERBER_DIR, "crossover3v-F_Silkscreen.gto")
    if os.path.isfile(f_silk):
        draw_gerber_layer(f_silk, draw, (238, 240, 242), scale, region_color=(238, 240, 242))

    img.save(OUT_PCB_TEX, optimize=True)
    print(f"Saved clean bare PCB texture: {OUT_PCB_TEX} ({os.path.getsize(OUT_PCB_TEX):,} bytes)")


def main():
    os.makedirs(os.path.dirname(OUT_RAW_GLB), exist_ok=True)
    build_bare_pcb_texture()

    sc = trimesh.load(SRC_GLB)

    groups = {
        "relica_pcb_top": [],
        "relica_pcb_body": [],
        "relica_pads": [],
        "relica_cap_body": [],
        "relica_cap_end": [],
        "relica_cap_leads": [],
        "relica_coil_air_bobbin": [],
        "relica_coil_air_wire": [],
        "relica_coil_ferrite_bobbin": [],
        "relica_coil_ferrite_wire": [],
        "relica_resistor": [],
        "relica_tb_body": [],
        "relica_tb_screws": [],
    }

    for node_name in sc.graph.nodes_geometry:
        transform, geom_name = sc.graph[node_name]
        geom = sc.geometry[geom_name].copy()
        geom.apply_transform(transform)

        mat = getattr(geom.visual, "material", None)
        col = tuple(mat.baseColorFactor.tolist()) if mat is not None and getattr(mat, "baseColorFactor", None) is not None else (0, 0, 0, 255)
        prefix = geom_name.split("_")[0]

        if prefix == "crossover3v":
            if geom_name == "crossover3v_mounted_PCB_3":
                groups["relica_pcb_top"].append(geom)
            elif np.max(geom.extents) > 0.10:
                groups["relica_pcb_body"].append(geom)
            else:
                groups["relica_pads"].append(geom)
        elif prefix == "C":
            if col[0] > 120 and col[1] > 120 and col[2] > 120:
                groups["relica_cap_leads"].append(geom)
            elif col[0] > 60 and col[2] < 30:
                groups["relica_cap_end"].append(geom)
            else:
                groups["relica_cap_body"].append(geom)
        elif prefix in ("L3", "Lm2"):
            if col[0] > 130 and col[1] < 60:
                groups["relica_coil_air_wire"].append(geom)
            else:
                groups["relica_coil_air_bobbin"].append(geom)
        elif prefix in ("L1", "Lm1"):
            if col[0] > 130 and col[1] < 60:
                groups["relica_coil_ferrite_wire"].append(geom)
            else:
                groups["relica_coil_ferrite_bobbin"].append(geom)
        elif prefix == "R":
            groups["relica_resistor"].append(geom)
        elif prefix == "TB":
            if col[0] > 100 and col[1] > 80:
                groups["relica_tb_screws"].append(geom)
            else:
                groups["relica_tb_body"].append(geom)

    merged = {}
    all_meshes = []
    for key, list_m in groups.items():
        if list_m:
            m = trimesh.util.concatenate(list_m)
            m.fix_normals()
            merged[key] = m
            all_meshes.append(m)

    total_bounds = trimesh.util.concatenate(all_meshes).bounds
    cx = (total_bounds[0, 0] + total_bounds[1, 0]) * 0.5
    min_y = total_bounds[0, 1]
    cz = (total_bounds[0, 2] + total_bounds[1, 2]) * 0.5

    pcb_body = merged["relica_pcb_body"]
    pcb_body.apply_translation([-cx, -min_y, -cz])
    pb = pcb_body.bounds

    # Create a clean +Y-facing top PCB face just above the FR4 body (y = pb[1,1] + 0.00003)
    # so the Gerber texture is never occluded by the FR4 body and aligns 1:1 with components.
    top_y = float(pb[1, 1]) + 0.00003
    x0, x1 = float(pb[0, 0]), float(pb[1, 0])
    z0, z1 = float(pb[0, 2]), float(pb[1, 2])
    quad_verts = np.array([
        [x0, top_y, z0],
        [x0, top_y, z1],
        [x1, top_y, z1],
        [x1, top_y, z0],
    ], dtype=np.float32)
    quad_faces = np.array([[0, 1, 2], [0, 2, 3]], dtype=np.int64)
    quad_uv = np.array([
        [0.0, 1.0],
        [0.0, 0.0],
        [1.0, 0.0],
        [1.0, 1.0],
    ], dtype=np.float32)
    pcb_top = trimesh.Trimesh(
        vertices=quad_verts,
        faces=quad_faces,
        visual=trimesh.visual.TextureVisuals(uv=quad_uv),
        process=False,
    )

    out_scene = trimesh.Scene()
    out_scene.add_geometry(pcb_top, node_name="relica_pcb", geom_name="relica_pcb")
    out_scene.add_geometry(pcb_body, node_name="relica_pcb_body", geom_name="relica_pcb_body")

    for key, m in merged.items():
        if key in ("relica_pcb_top", "relica_pcb_body"):
            continue
        m.apply_translation([-cx, -min_y, -cz])
        if key == "relica_pads":
            m.apply_translation([0.0, 0.00005, 0.0])
        out_scene.add_geometry(m, node_name=key, geom_name=key)

    out_scene.export(OUT_RAW_GLB)
    print(f"Exported {OUT_RAW_GLB} ({os.path.getsize(OUT_RAW_GLB):,} bytes), nodes: {list(out_scene.geometry.keys())}")


if __name__ == "__main__":
    main()
