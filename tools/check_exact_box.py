from PIL import Image

img = Image.open('tools/fullpage_snap.png').convert('RGB')
# Crop boxRect: x=814, y=117, w=340, h=340
box_crop = img.crop((814, 117, 814 + 340, 117 + 340))
box_crop.save('tools/exact_box_crop.png')

red_pts = []
for y in range(340):
    for x in range(340):
        r, g, b = box_crop.getpixel((x, y))
        if r > 180 and g < 100 and b < 100:
            red_pts.append((x, y))

print('Total red pixels inside hanzi-preview-box:', len(red_pts))
if red_pts:
    xs = [p[0] for p in red_pts]
    ys = [p[1] for p in red_pts]
    print(f'Inside box red bounds: X=[{min(xs)}, {max(xs)}], Y=[{min(ys)}, {max(ys)}]')
