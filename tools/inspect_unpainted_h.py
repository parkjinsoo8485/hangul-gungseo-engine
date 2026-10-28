import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
out_dir = os.path.join(artifact_dir, "h_frames_crop")

im1 = Image.open(os.path.join(out_dir, "h_frame_25.png")).convert("RGB")
im2 = Image.open(os.path.join(out_dir, "h_frame_26.png")).convert("RGB")
p1 = im1.load()
p2 = im2.load()
w, h = im1.size

unpainted_pixels = []
for y in range(h):
    for x in range(w):
        c1 = p1[x, y]
        c2 = p2[x, y]
        is_ink1 = (c1[0] < 50 and c1[1] < 50 and c1[2] < 50)
        is_ink2 = (c2[0] < 50 and c2[1] < 50 and c2[2] < 50)
        if not is_ink1 and is_ink2:
            unpainted_pixels.append((x, y))

print(f"Total unpainted pixels at transition: {len(unpainted_pixels)}")
# Let's create an image highlighting where these unpainted pixels are
diff_vis = im2.copy()
dp = diff_vis.load()
for (x, y) in unpainted_pixels:
    dp[x, y] = (255, 0, 0) # bright red

diff_vis.save(os.path.join(artifact_dir, "h_unpainted_at_transition.png"))
print("Saved h_unpainted_at_transition.png")
