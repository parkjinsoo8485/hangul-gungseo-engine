import os
import json
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")
meta_path = os.path.join(artifact_dir, "video_meta.json")

with open(meta_path, "r", encoding="utf-8") as f:
    meta = json.load(f)

# Group frames by stroke index
by_stroke = {}
for m in meta:
    s = m["sIdx"]
    if s not in by_stroke:
        by_stroke[s] = []
    by_stroke[s].append(m)

# Let's save key snapshots for each stroke (start, mid, end)
analysis_dir = os.path.join(artifact_dir, "video_stroke_analysis")
os.makedirs(analysis_dir, exist_ok=True)

stroke_names = [
    "01_hoik_h_dot",
    "02_hoik_h_bar",
    "03_hoik_h_circle",
    "04_hoik_o_dot",
    "05_hoik_o_bar",
    "06_hoik_i_stem",
    "07_hoik_g_final",
    "08_soon_s_left",
    "09_soon_s_right",
    "10_soon_u_bar",
    "11_soon_u_stem",
    "12_soon_n_final"
]

print("Stroke frame counts:")
for s_idx in range(12):
    frames = by_stroke.get(s_idx, [])
    name = stroke_names[s_idx] if s_idx < len(stroke_names) else f"stroke_{s_idx}"
    print(f"Stroke {s_idx} ({name}): {len(frames)} frames")
    if frames:
        # Save start, mid, end frame
        for label, f_info in [("start", frames[0]), ("mid", frames[len(frames)//2]), ("end", frames[-1])]:
            src = os.path.join(frames_dir, f"frame_{str(f_info['frame']).padStart(4, '0') if hasattr(str, 'padStart') else str(f_info['frame']).zfill(4)}.png")
            im = Image.open(src)
            im.save(os.path.join(analysis_dir, f"{name}_{label}.png"))

print("Analysis frames saved.")
