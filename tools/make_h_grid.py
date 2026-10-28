import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
out_dir = os.path.join(artifact_dir, "h_frames_crop")

# Create a grid image of the 26 frames of 'ㅎ' (5 rows x 6 cols)
cols = 6
rows = 5
frame_w, frame_h = 150, 150
grid = Image.new("RGB", (cols * frame_w, rows * frame_h), (255, 255, 255))

for idx in range(27):
    fn = os.path.join(out_dir, f"h_frame_{str(idx).zfill(2)}.png")
    if os.path.exists(fn):
        im = Image.open(fn)
        r = idx // cols
        c = idx % cols
        grid.paste(im, (c * frame_w, r * frame_h))

grid.save(os.path.join(artifact_dir, "h_frames_progression_grid.png"))
print("Saved h_frames_progression_grid.png")
