from PIL import Image

for s in range(4):
    path = f'tools/live_snap_s{s}.png'
    try:
        img = Image.open(path).convert('RGB')
        w, h = img.size
        # inspect preview box on right side: x in [800, 1600], y in [100, 700]
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
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            print(f'Stroke {s}: red pixels = {num_red}, bounds X=[{min_x}, {max_x}], Y=[{min_y}, {max_y}]')
            pad = 20
            crop = img.crop((max(0, min_x - pad), max(0, min_y - pad), min(w, max_x + pad), min(h, max_y + pad)))
            crop.save(f'tools/crop_s{s}.png')
        else:
            print(f'Stroke {s}: NO RED PIXELS')
    except Exception as e:
        print(f'Stroke {s}: {e}')
