import os
import json
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")
meta_path = os.path.join(artifact_dir, "video_meta.json")

with open(meta_path, "r", encoding="utf-8") as f:
    meta = json.load(f)

prev_img = None
for i, m in enumerate(meta):
    fname = f"frame_{str(m['frame']).zfill(4)}.png"
    im = Image.open(os.path.join(frames_dir, fname)).convert("RGB")
    s_idx = m["sIdx"]
    p_idx = m["pIdx"]
    
    if prev_img is not None and s_idx in [0, 1, 2, 9, 10]:
        # compare pixels
        p1 = prev_img.load()
        p2 = im.load()
        w, h = im.size
        min_x, max_x, min_y, max_y = w, 0, h, 0
        diff_count = 0
        for y in range(0, h, 2):
            for x in range(0, w, 2):
                c1 = p1[x, y]
                c2 = p2[x, y]
                if abs(c1[0]-c2[0]) > 20 or abs(c1[1]-c2[1]) > 20 or abs(c1[2]-c2[2]) > 20:
                    diff_count += 1
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y
        if diff_count > 0:
            print(f"Frame {m['frame']:3d} | Stroke {s_idx:2d} Step {p_idx:2d} | Diff: {diff_count:5d} px | Box: x=[{min_x:3d}, {max_x:3d}], y=[{min_y:3d}, {max_y:3d}]")
    prev_img = im
