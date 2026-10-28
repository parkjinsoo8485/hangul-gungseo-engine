import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")
out_dir = os.path.join(artifact_dir, "h_frames_crop")
os.makedirs(out_dir, exist_ok=True)

# 'ㅎ' in '획' is located roughly around x: [50, 200], y: [30, 180] in the 600x300 capture
crop_box = (50, 30, 200, 180)

for f_idx in range(0, 27):
    src = os.path.join(frames_dir, f"frame_{str(f_idx).zfill(4)}.png")
    if os.path.exists(src):
        im = Image.open(src)
        cropped = im.crop(crop_box)
        cropped.save(os.path.join(out_dir, f"h_frame_{str(f_idx).zfill(2)}.png"))

print("Cropped frames 0-26 of 'ㅎ' saved.")
