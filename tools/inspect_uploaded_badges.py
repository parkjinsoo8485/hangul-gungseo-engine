from PIL import Image
import os

img_path = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/.user_uploaded/media_1793155015714_5ca13639.png'
img = Image.open(img_path).convert('RGB')
w, h = img.size
print(f"Image size: {w}x{h}")

# Find green badge circles (#2e8b57)
# Badge green is roughly R < 80, G in 100..180, B in 60..120
green_pixels = []
red_pixels = []

for y in range(h):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        if g > 110 and r < 80 and b < 100:
            green_pixels.append((x, y))
        elif r > 180 and g < 90 and b < 90:
            red_pixels.append((x, y))

print(f"Green badge pixels: {len(green_pixels)}")
print(f"Red guideline pixels: {len(red_pixels)}")

# Cluster green pixels to find badge centers
badges = []
visited = set()
for p in green_pixels:
    if p in visited:
        continue
    # BFS
    cluster = [p]
    visited.add(p)
    q = [p]
    while q:
        curr = q.pop()
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                np = (curr[0] + dx, curr[1] + dy)
                if np in green_pixels and np not in visited:
                    visited.add(np)
                    cluster.append(np)
                    q.append(np)
    if len(cluster) > 30: # threshold for badge circle
        avg_x = sum(pt[0] for pt in cluster) / len(cluster)
        avg_y = sum(pt[1] for pt in cluster) / len(cluster)
        badges.append((avg_x, avg_y, len(cluster)))

badges.sort(key=lambda b: (b[0], b[1]))
print("\nDetected Badges (x, y, size):")
for idx, b in enumerate(badges):
    print(f"  Badge {idx+1}: x={b[0]:.1f}, y={b[1]:.1f}, size={b[2]}")
