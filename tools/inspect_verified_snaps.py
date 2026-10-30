from PIL import Image

for s in range(4):
    path = f'tools/verified_snap_s{s}.png'
    img = Image.open(path).convert('RGB')
    w, h = img.size
    red_pts = []
    for y in range(h):
        for x in range(w):
            r, g, b = img.getpixel((x, y))
            # HanziWriter stroke color #ef4444: R > 180, G < 100, B < 100
            if r > 180 and g < 100 and b < 100:
                red_pts.append((x, y))
    
    num_red = len(red_pts)
    if num_red > 0:
        xs = [p[0] for p in red_pts]
        ys = [p[1] for p in red_pts]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        print(f'Stroke {s}: {num_red:5d} red pixels, X=[{min_x:3d}, {max_x:3d}], Y=[{min_y:3d}, {max_y:3d}]')
    else:
        print(f'Stroke {s}: NO RED PIXELS')
