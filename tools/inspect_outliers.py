from PIL import Image
import math

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/exact_black_box.png').convert('RGB')
cw, ch = img.size
black_pts = set()
red_pts = []

for y in range(ch):
    for x in range(cw):
        r, g, b = img.getpixel((x, y))
        if r < 40 and g < 40 and b < 40:
            black_pts.add((x, y))
        elif r > 160 and g < 110 and b < 110:
            red_pts.append((x, y))

outliers = []
for rx, ry in red_pts:
    min_d = 999
    for dy in range(-25, 26):
        for dx in range(-25, 26):
            if (rx + dx, ry + dy) in black_pts:
                d = math.hypot(dx, dy)
                if d < min_d: min_d = d
    if min_d > 10:
        outliers.append((rx, ry, min_d))

print(f"Total outliers (>10px from ink): {len(outliers)}")
# Group outliers by region:
# Left cell: x in [0..300], Right cell: x in [300..600]
left_outliers = [p for p in outliers if p[0] < 300]
right_outliers = [p for p in outliers if p[0] >= 300]

print(f"Left cell ('획') outliers: {len(left_outliers)}")
if left_outliers:
    for p in left_outliers[:10]:
        print(f"  pt: ({p[0]}, {p[1]}), dist={p[2]:.1f}")

print(f"Right cell ('순') outliers: {len(right_outliers)}")
if right_outliers:
    for p in right_outliers[:10]:
        print(f"  pt: ({p[0]}, {p[1]}), dist={p[2]:.1f}")
