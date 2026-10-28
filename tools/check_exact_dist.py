from PIL import Image
import math

im = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/exact_black_box.png')
w, h = im.size

# Background color of board is parchment: around (250, 246, 237)
# Any pixel significantly darker than background is ink:
ink_pixels = set()
red_pixels = []
for y in range(h):
    for x in range(w):
        c = im.getpixel((x, y))
        # Red guideline (#d9534f)
        if c[0] > 170 and c[1] < 110 and c[2] < 110:
            red_pixels.append((x, y))
        # Ink: significantly darker than parchment
        elif c[0] < 150 and c[1] < 150 and c[2] < 150:
            ink_pixels.add((x, y))

print(f"Ink pixels: {len(ink_pixels)}, Red pixels: {len(red_pixels)}")

outliers_5px = []
outliers_8px = []
for rx, ry in red_pixels:
    min_d = 999
    for dy in range(-25, 26):
        for dx in range(-25, 26):
            if (rx + dx, ry + dy) in ink_pixels:
                d = math.hypot(dx, dy)
                if d < min_d: min_d = d
    if min_d > 5.0:
        outliers_5px.append((rx, ry, min_d))
    if min_d > 8.0:
        outliers_8px.append((rx, ry, min_d))

print(f"Red pixels > 5px from ink: {len(outliers_5px)} / {len(red_pixels)} ({len(outliers_5px)*100/len(red_pixels):.2f}%)")
print(f"Red pixels > 8px from ink: {len(outliers_8px)} / {len(red_pixels)} ({len(outliers_8px)*100/len(red_pixels):.2f}%)")
if outliers_8px:
    for rx, ry, d in outliers_8px:
        cell = '획' if rx < 300 else '순'
        lx = rx if cell == '획' else rx - 300
        print(f"  {cell} ({lx/3:.1f}, {ry/3:.1f}): dist={d:.1f}px")
