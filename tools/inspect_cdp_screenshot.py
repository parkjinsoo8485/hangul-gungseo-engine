from PIL import Image

p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_actual_cdp.png'
img = Image.open(p).convert('RGB')
w, h = img.size
print(f"Captured screenshot size: {w}x{h}")

# Find red guideline pixels in the captured screenshot
red_pts = []
for y in range(h):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        # Red guideline in index.html is #d9534f (r: 217, g: 83, b: 79)
        if r > 180 and g < 110 and b < 110:
            red_pts.append((x, y))

print(f"Total red guideline pixels in CDP screenshot: {len(red_pts)}")
if red_pts:
    min_x, max_x = min(pt[0] for pt in red_pts), max(pt[0] for pt in red_pts)
    min_y, max_y = min(pt[1] for pt in red_pts), max(pt[1] for pt in red_pts)
    print(f"Red pixels bounding box: X=[{min_x}..{max_x}], Y=[{min_y}..{max_y}]")
