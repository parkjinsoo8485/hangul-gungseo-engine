import os
import json
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "hoe_video_frames")
meta_path = os.path.join(artifact_dir, "hoe_video_meta.json")

with open(meta_path, "r", encoding="utf-8") as f:
    meta = json.load(f)

stroke_names = [
    "01_회_ㅎ_꼭지",
    "02_회_ㅎ_가로",
    "03_회_ㅎ_원형",
    "04_회_ㅗ_세로점",
    "05_회_ㅗ_가로선",
    "06_회_ㅣ_세로선",
    "07_의_ㅇ_원형",
    "08_의_ㅡ_가로선",
    "09_의_ㅣ_세로선"
]

print(f"{'Frame':5s} | {'Time':7s} | {'Stroke':15s} | {'Step':4s} | {'Shown':6s} | {'DiffPx':6s} | {'Event / Bounding Box'}")
print("-" * 85)

prev_img = None
for i, m in enumerate(meta):
    f_num = m["frame"]
    s_idx = m["sIdx"]
    p_idx = m["pIdx"]
    t_ms = m["time"]
    shown = m["shown"]
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
                # Check pure ink diff
                is_old_ink = (c1[0] < 45 and c1[1] < 45 and c1[2] < 45)
                is_new_ink = (c2[0] < 45 and c2[1] < 45 and c2[2] < 45)
                if not is_old_ink and is_new_ink:
                    diff_px += 1
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y

    event = ""
    if i > 0 and meta[i-1]["sIdx"] != s_idx:
        event = f"▶ TRANSITION {meta[i-1]['sIdx']} -> {s_idx}"
    elif p_idx == 4095:
        event = "★ COMPLETE"

    bbox_str = f"[{min_x},{min_y}]-[{max_x},{max_y}]" if diff_px > 0 else "-"
    if diff_px > 0 or event:
        print(f"{f_num:5d} | {t_ms:5d}ms | {name:15s} | {p_idx:4d} | {shown:6d} | {diff_px:6d} | {event} {bbox_str}")

    prev_img = im
