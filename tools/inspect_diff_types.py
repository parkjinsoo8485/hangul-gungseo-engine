import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")

def inspect_colors(f1_idx, f2_idx):
    im1 = Image.open(os.path.join(frames_dir, f"frame_{str(f1_idx).zfill(4)}.png")).convert("RGB")
    im2 = Image.open(os.path.join(frames_dir, f"frame_{str(f2_idx).zfill(4)}.png")).convert("RGB")
    p1 = im1.load()
    p2 = im2.load()
    changes = []
    w, h = im1.size
    for y in range(h):
        for x in range(w):
            c1 = p1[x, y]
            c2 = p2[x, y]
            if abs(c1[0]-c2[0]) > 20 or abs(c1[1]-c2[1]) > 20 or abs(c1[2]-c2[2]) > 20:
                changes.append((x, y, c1, c2))
    print(f"Diff {f1_idx} -> {f2_idx}: {len(changes)} changed pixels.")
    # Show sample of changed colors
    black_ink_changes = [c for c in changes if c[3][0] < 50 and c[3][1] < 50 and c[3][2] < 50]
    badge_or_guide_changes = [c for c in changes if c not in black_ink_changes]
    print(f"  New black ink pixels (<50, <50, <50): {len(black_ink_changes)}")
    print(f"  Badge/brush/guide UI changes: {len(badge_or_guide_changes)}")
    if badge_or_guide_changes:
        sample = badge_or_guide_changes[:5]
        print(f"  Sample UI changes: {sample}")

inspect_colors(4, 5)
inspect_colors(13, 14)
inspect_colors(91, 92)
