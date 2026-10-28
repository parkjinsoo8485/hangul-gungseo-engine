import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
out_dir = os.path.join(artifact_dir, "h_frames_crop")

for f_idx in range(0, 26):
    im1 = Image.open(os.path.join(out_dir, f"h_frame_{str(f_idx).zfill(2)}.png")).convert("RGB")
    im2 = Image.open(os.path.join(out_dir, f"h_frame_{str(f_idx+1).zfill(2)}.png")).convert("RGB")
    p1 = im1.load()
    p2 = im2.load()
    w, h = im1.size
    
    # Check pixels that turned into black ink (c[0]<50 and c[1]<50 and c[2]<50)
    new_ink = []
    for y in range(h):
        for x in range(w):
            c1 = p1[x, y]
            c2 = p2[x, y]
            is_ink1 = (c1[0] < 50 and c1[1] < 50 and c1[2] < 50)
            is_ink2 = (c2[0] < 50 and c2[1] < 50 and c2[2] < 50)
            if not is_ink1 and is_ink2:
                new_ink.append((x, y))
    
    if new_ink:
        min_x = min(p[0] for p in new_ink)
        max_x = max(p[0] for p in new_ink)
        min_y = min(p[1] for p in new_ink)
        max_y = max(p[1] for p in new_ink)
        print(f"Frame {f_idx:2d} -> {f_idx+1:2d}: {len(new_ink):4d} new ink px | x: [{min_x:3d}, {max_x:3d}], y: [{min_y:3d}, {max_y:3d}]")
    else:
        print(f"Frame {f_idx:2d} -> {f_idx+1:2d}:    0 new ink px (UI / brush move)")
