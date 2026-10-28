import os
import json
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")
meta_path = os.path.join(artifact_dir, "video_meta.json")

with open(meta_path, "r", encoding="utf-8") as f:
    meta = json.load(f)

stroke_names = [
    "01_획_ㅎ_꼭지",
    "02_획_ㅎ_가로",
    "03_획_ㅎ_원형",
    "04_획_ㅗ_세로점",
    "05_획_ㅗ_가로선",
    "06_획_ㅣ_세로선",
    "07_획_ㄱ_받침",
    "08_순_ㅅ_좌삐침",
    "09_순_ㅅ_우파임",
    "10_순_ㅜ_가로선",
    "11_순_ㅜ_세로기둥",
    "12_순_ㄴ_받침"
]

# Let's inspect frame by frame
prev_img = None
report = []

print(f"{'Frame':5s} | {'Time':7s} | {'Stroke':14s} | {'Step':4s} | {'DiffPx':6s} | {'Bounding Box (x, y)':20s} | {'Notes'}")
print("-" * 80)

for i, m in enumerate(meta):
    f_num = m["frame"]
    s_idx = m["sIdx"]
    p_idx = m["pIdx"]
    t_ms = m["time"]
    name = stroke_names[s_idx] if s_idx < len(stroke_names) else f"Stroke_{s_idx}"

    fn = os.path.join(frames_dir, f"frame_{str(f_num).zfill(4)}.png")
    im = Image.open(fn).convert("RGB")
    p_cur = im.load()
    w, h = im.size

    diff_px = 0
    min_x, max_x, min_y, max_y = w, 0, h, 0

    if prev_img is not None:
        p_prev = prev_img.load()
        for y in range(h):
            for x in range(w):
                c1 = p_prev[x, y]
                c2 = p_cur[x, y]
                # Is new black ink?
                is_old_ink = (c1[0] < 50 and c1[1] < 50 and c1[2] < 50)
                is_new_ink = (c2[0] < 50 and c2[1] < 50 and c2[2] < 50)
                if not is_old_ink and is_new_ink:
                    diff_px += 1
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y

    bbox_str = f"[{min_x},{min_y}]-[{max_x},{max_y}]" if diff_px > 0 else "-"
    notes = ""
    # Check if stroke changed from previous frame
    if i > 0 and meta[i-1]["sIdx"] != s_idx:
        notes += f"▶ STROKE TRANSITION {meta[i-1]['sIdx']} -> {s_idx}"
    
    if diff_px > 0 or notes:
        print(f"{f_num:5d} | {t_ms:5d}ms | {name:14s} | {p_idx:4d} | {diff_px:6d} | {bbox_str:20s} | {notes}")

    prev_img = im
