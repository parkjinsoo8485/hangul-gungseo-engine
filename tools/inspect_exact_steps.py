from PIL import Image

for s in range(4):
    img = Image.open(f'tools/exact_step_s{s}.png').convert('RGB')
    w, h = img.size
    red_pts = []
    for y in range(h):
        for x in range(w):
            r, g, b = img.getpixel((x, y))
            if r > 180 and g < 100 and b < 100:
                red_pts.append((x, y))
    
    num_red = len(red_pts)
    if num_red > 0:
        xs = [p[0] for p in red_pts]
        ys = [p[1] for p in red_pts]
        print(f'Stroke {s}: {num_red:5d} red pixels, X=[{min(xs):3d}, {max(xs):3d}], Y=[{min(ys):3d}, {max(ys):3d}]')
    else:
        print(f'Stroke {s}: NO RED PIXELS')
