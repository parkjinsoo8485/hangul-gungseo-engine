from PIL import Image
import math

p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_full_black.png'
img = Image.open(p).convert('RGB')

# canvas rect is x in [325..924], y in [121..420]
crop_box = img.crop((325, 121, 925, 421))
crop_box.save('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/exact_black_box.png')
print(f"Saved exact_black_box.png, size: {crop_box.size}")

cw, ch = crop_box.size
black_pts = set()
red_pts = []

for y in range(ch):
    for x in range(cw):
        r, g, b = crop_box.getpixel((x, y))
        # Black ink (#151311 is roughly r < 35, g < 35, b < 35)
        if r < 40 and g < 40 and b < 40:
            black_pts.add((x, y))
        # Red guideline: #d9534f (r: 217, g: 83, b: 79)
        elif r > 160 and g < 110 and b < 110:
            red_pts.append((x, y))

print(f"Canvas black ink pixels: {len(black_pts)}")
print(f"Canvas red guideline pixels: {len(red_pts)}")

# For each red pixel, check distance to black ink
distances = []
for rx, ry in red_pts:
    min_d = 999
    for dy in range(-20, 21):
        for dx in range(-20, 21):
            if (rx + dx, ry + dy) in black_pts:
                d = math.hypot(dx, dy)
                if d < min_d:
                    min_d = d
    distances.append(min_d)

inside_ink = sum(1 for d in distances if d == 0)
within_3px = sum(1 for d in distances if d <= 3)
within_6px = sum(1 for d in distances if d <= 6)
within_10px = sum(1 for d in distances if d <= 10)
outside_10 = sum(1 for d in distances if d > 10)

print(f"Red pixels directly ON ink: {inside_ink} ({inside_ink*100/len(distances):.1f}%)")
print(f"Red pixels within 3px: {within_3px} ({within_3px*100/len(distances):.1f}%)")
print(f"Red pixels within 6px: {within_6px} ({within_6px*100/len(distances):.1f}%)")
print(f"Red pixels within 10px: {within_10px} ({within_10px*100/len(distances):.1f}%)")
print(f"Red pixels >10px from ink: {outside_10} ({outside_10*100/len(distances):.1f}%)")
