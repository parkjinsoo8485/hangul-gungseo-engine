from PIL import Image
import os

parts = ['Cho_T1_ㅈ', 'Cho_T2_ㅈ', 'Cho_T3_ㅈ', 'Jong_T1_ㅈ', 'Jong_T2_ㅈ']

for partId in parts:
    print(f"\n========================================================")
    print(f"Detailed Frame-by-Frame Analysis for [{partId}]")
    print(f"========================================================")
    
    dir_path = f"tools/frames_{partId}"
    if not os.path.exists(dir_path):
        print(f"Directory {dir_path} does not exist.")
        continue

    # 1. Analyze stroke 0 final frame
    s0_img = Image.open(f"{dir_path}/stroke_0_final.png").convert('RGB')
    w, h = s0_img.size
    s0_red = []
    for y in range(h):
        for x in range(w):
            r, g, b = s0_img.getpixel((x, y))
            if r > 180 and g < 100 and b < 100:
                s0_red.append((x, y))
    
    xs0 = [p[0] for p in s0_red]
    ys0 = [p[1] for p in s0_red]
    print(f"[Stroke 0 Final] Red Pixels: {len(s0_red):5d}, X=[{min(xs0):3d}, {max(xs0):3d}], Y=[{min(ys0):3d}, {max(ys0):3d}]")

    # 2. Analyze stroke 1 final frame
    s1_img = Image.open(f"{dir_path}/stroke_1_final.png").convert('RGB')
    s1_red = []
    for y in range(h):
        for x in range(w):
            r, g, b = s1_img.getpixel((x, y))
            if r > 180 and g < 100 and b < 100:
                s1_red.append((x, y))
    
    xs1 = [p[0] for p in s1_red]
    ys1 = [p[1] for p in s1_red]
    new_s1_red = len(s1_red) - len(s0_red)
    print(f"[Stroke 1 Final] Red Pixels: {len(s1_red):5d} (+{new_s1_red:4d}), X=[{min(xs1):3d}, {max(xs1):3d}], Y=[{min(ys1):3d}, {max(ys1):3d}]")

    # 3. Analyze stroke 2 final frame
    s2_img = Image.open(f"{dir_path}/stroke_2_final.png").convert('RGB')
    s2_red = []
    for y in range(h):
        for x in range(w):
            r, g, b = s2_img.getpixel((x, y))
            if r > 180 and g < 100 and b < 100:
                s2_red.append((x, y))
    
    xs2 = [p[0] for p in s2_red]
    ys2 = [p[1] for p in s2_red]
    new_s2_red = len(s2_red) - len(s1_red)
    print(f"[Stroke 2 Final] Red Pixels: {len(s2_red):5d} (+{new_s2_red:4d}), X=[{min(xs2):3d}, {max(xs2):3d}], Y=[{min(ys2):3d}, {max(ys2):3d}]")

    # 4. Check step-by-step progression during Stroke 0 (horizontal bar)
    print("\n  --- Stroke 0 Progression Steps ---")
    for step in range(1, 6):
        step_path = f"{dir_path}/stroke_0_step_{step}.png"
        if os.path.exists(step_path):
            img = Image.open(step_path).convert('RGB')
            red_pts = []
            for y in range(h):
                for x in range(w):
                    r, g, b = img.getpixel((x, y))
                    if r > 180 and g < 100 and b < 100:
                        red_pts.append((x, y))
            if red_pts:
                cur_xs = [p[0] for p in red_pts]
                cur_ys = [p[1] for p in red_pts]
                print(f"   Step {step}: {len(red_pts):4d} red px, X=[{min(cur_xs):3d}, {max(cur_xs):3d}], Y=[{min(cur_ys):3d}, {max(cur_ys):3d}]")

    # 5. Check step-by-step progression during Stroke 1 (left slant)
    print("\n  --- Stroke 1 Progression Steps ---")
    for step in range(1, 6):
        step_path = f"{dir_path}/stroke_1_step_{step}.png"
        if os.path.exists(step_path):
            img = Image.open(step_path).convert('RGB')
            red_pts = []
            for y in range(h):
                for x in range(w):
                    r, g, b = img.getpixel((x, y))
                    if r > 180 and g < 100 and b < 100:
                        red_pts.append((x, y))
            if red_pts:
                cur_xs = [p[0] for p in red_pts]
                cur_ys = [p[1] for p in red_pts]
                print(f"   Step {step}: {len(red_pts):4d} red px, X=[{min(cur_xs):3d}, {max(cur_xs):3d}], Y=[{min(cur_ys):3d}, {max(cur_ys):3d}]")

    # 6. Check step-by-step progression during Stroke 2 (right slant)
    print("\n  --- Stroke 2 Progression Steps ---")
    for step in range(1, 6):
        step_path = f"{dir_path}/stroke_2_step_{step}.png"
        if os.path.exists(step_path):
            img = Image.open(step_path).convert('RGB')
            red_pts = []
            for y in range(h):
                for x in range(w):
                    r, g, b = img.getpixel((x, y))
                    if r > 180 and g < 100 and b < 100:
                        red_pts.append((x, y))
            if red_pts:
                cur_xs = [p[0] for p in red_pts]
                cur_ys = [p[1] for p in red_pts]
                print(f"   Step {step}: {len(red_pts):4d} red px, X=[{min(cur_xs):3d}, {max(cur_xs):3d}], Y=[{min(cur_ys):3d}, {max(cur_ys):3d}]")
