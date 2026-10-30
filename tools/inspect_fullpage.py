from PIL import Image

img = Image.open('tools/fullpage_snap.png').convert('RGB')
w, h = img.size

# Divide screen into regions:
# Left sidebar: x < 300
# Middle editor: 300 <= x < 900
# Right preview panel: x >= 900
counts = {'left': 0, 'middle': 0, 'right': 0}
right_pts = []
for y in range(h):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        if r > 180 and g < 100 and b < 100:
            if x < 300:
                counts['left'] += 1
            elif x < 900:
                counts['middle'] += 1
            else:
                counts['right'] += 1
                right_pts.append((x, y))

print('Red pixel counts by region:', counts)
if right_pts:
    r_xs = [p[0] for p in right_pts]
    r_ys = [p[1] for p in right_pts]
    print(f'Right panel red bounds: X=[{min(r_xs)}, {max(r_xs)}], Y=[{min(r_ys)}, {max(r_ys)}]')
    crop = img.crop((min(r_xs)-10, min(r_ys)-10, max(r_xs)+10, max(r_ys)+10))
    crop.save('tools/right_panel_red.png')
    print('Saved tools/right_panel_red.png')
