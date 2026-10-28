import os
import json
import subprocess
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d"

def analyze_frames(name, frames_sub, meta_file):
    frames_dir = os.path.join(artifact_dir, frames_sub)
    meta_path = os.path.join(artifact_dir, meta_file)
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    print(f"=== Analyzing {name} ({len(meta)} frames) ===")
    prev_img = None
    stroke_trans = []
    
    for i, m in enumerate(meta):
        fname = f"frame_{str(m['frame']).zfill(4)}.png"
        fpath = os.path.join(frames_dir, fname)
        if not os.path.exists(fpath):
            continue
        im = Image.open(fpath).convert("RGB")
        s_idx = m["sIdx"]
        p_idx = m["pIdx"]
        
        if prev_img is not None:
            prev_m = meta[i-1]
            if prev_m["sIdx"] != s_idx:
                stroke_trans.append((prev_m["sIdx"], s_idx, m["frame"]))
        prev_img = im
        
    print(f"Recorded stroke transitions in {name}: {len(stroke_trans)}")
    for t in stroke_trans[:8]:
        print(f"  Stroke {t[0]} -> {t[1]} at frame {t[2]}")

def create_video_and_gif(name, frames_sub):
    frames_dir = os.path.join(artifact_dir, frames_sub)
    mp4_path = os.path.join(artifact_dir, f"{name}_live_demo.mp4")
    gif_path = os.path.join(artifact_dir, f"{name}_live_demo.gif")
    
    # 1. MP4
    cmd_mp4 = [
        "ffmpeg", "-y",
        "-framerate", "15",
        "-i", os.path.join(frames_dir, "frame_%04d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        mp4_path
    ]
    subprocess.run(cmd_mp4, check=True, capture_output=True)
    print(f"Generated MP4: {mp4_path}")
    
    # 2. GIF
    cmd_gif = [
        "ffmpeg", "-y",
        "-framerate", "12",
        "-i", os.path.join(frames_dir, "frame_%04d.png"),
        "-vf", "fps=12,scale=500:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
        gif_path
    ]
    subprocess.run(cmd_gif, check=True, capture_output=True)
    print(f"Generated GIF: {gif_path}")

analyze_frames("빨래", "bbal_video_frames", "bbal_video_meta.json")
create_video_and_gif("bbal", "bbal_video_frames")

analyze_frames("펜체", "pen_video_frames", "pen_video_meta.json")
create_video_and_gif("pen", "pen_video_frames")

print("All frame analysis and demo generation complete!")
