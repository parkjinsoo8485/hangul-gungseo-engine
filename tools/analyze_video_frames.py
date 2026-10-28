import json
import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"
frames_dir = os.path.join(artifact_dir, "video_frames")
meta_path = os.path.join(artifact_dir, "video_meta.json")

with open(meta_path, "r", encoding="utf-8") as f:
    meta = json.load(f)

print(f"Total recorded frames: {len(meta)}")

# Let's inspect stroke transitions
strokes_seen = {}
for m in meta:
    s = m["sIdx"]
    p = m["pIdx"]
    if s not in strokes_seen:
        strokes_seen[s] = []
    strokes_seen[s].append((m["frame"], m["time"], p))

for s, frames in strokes_seen.items():
    print(f"Stroke {s}: {len(frames)} frames, start frame {frames[0][0]} (t={frames[0][1]}ms), end frame {frames[-1][0]} (t={frames[-1][1]}ms)")
