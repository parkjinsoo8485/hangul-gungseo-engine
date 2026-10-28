from PIL import Image
import math

p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_actual_cdp.png'
img = Image.open(p).convert('RGB')
w, h = img.size

# Find all black pixels (ink) and red pixels (guidelines)
black_pts = set()
red_pts = []

for y in range(h):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        if r < 60 and g < 60 and b < 60:
            black_pts.add((x, y))
        elif r > 180 and g < 110 and b < 110:
            red_pts.append((x, y))

print(f"Total black ink pixels: {len(black_pts)}")
print(f"Total red guideline pixels: {len(red_pts)}")

# For each red pixel, find minimum distance to a black ink pixel
distances = []
for rx, ry in red_pts:
    min_d = 999
    # check nearby box +/- 15
    for dy in range(-15, 16):
        for dx in range(-15, 16):
            if (rx + dx, ry + dy) in black_pts:
                d = math.hypot(dx, dy)
                if d < min_d:
                    min_d = d
    distances.append(min_d)

inside_ink = sum(1 for d in distances if d == 0)
within_2px = sum(1 for d in distances if d <= 2)
within_4px = sum(1 for d in distances if d <= 4)
outside = sum(1 for d in distances if d > 4)

print(f"Red pixels directly ON ink: {inside_ink} ({inside_ink*100/len(distances):.1f}%)")
print(f"Red pixels within 2px of ink: {within_2px} ({within_2px*100/len(distances):.1f}%)")
print(f"Red pixels within 4px of ink: {within_4px} ({within_4px*100/len(distances):.1f}%)")
print(f"Red pixels >4px from ink: {outside} ({outside*100/len(distances):.1f}%)")
