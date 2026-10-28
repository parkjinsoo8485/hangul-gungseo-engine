import os
from PIL import Image, ImageDraw

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")

def save_diff_visual(f1_idx, f2_idx, out_name):
    im1 = Image.open(os.path.join(frames_dir, f"frame_{str(f1_idx).zfill(4)}.png")).convert("RGB")
    im2 = Image.open(os.path.join(frames_dir, f"frame_{str(f2_idx).zfill(4)}.png")).convert("RGB")
    w, h = im1.size
    p1 = im1.load()
    p2 = im2.load()
    
    diff_img = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    dp = diff_img.load()
    for y in range(h):
        for x in range(w):
            c1 = p1[x, y]
            c2 = p2[x, y]
            # If changed, highlight in red
            if abs(c1[0]-c2[0]) > 20 or abs(c1[1]-c2[1]) > 20 or abs(c1[2]-c2[2]) > 20:
                dp[x, y] = (255, 0, 0, 255)
            else:
                # dim background
                dp[x, y] = (c2[0]//2 + 128, c2[1]//2 + 128, c2[2]//2 + 128, 255)
    
    diff_img.save(os.path.join(artifact_dir, out_name))
    print(f"Saved {out_name}")

save_diff_visual(4, 5, "diff_frame_04_05_stroke0_end.png")
save_diff_visual(5, 6, "diff_frame_05_06_stroke1_start.png")
save_diff_visual(13, 14, "diff_frame_13_14_stroke2_start.png")
save_diff_visual(91, 92, "diff_frame_91_92_stroke10_start.png")
