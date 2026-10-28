from PIL import Image

p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_actual_cdp.png'
img = Image.open(p).convert('RGB')
w, h = img.size

black_xs = []
black_ys = []
red_xs = []
red_ys = []

for y in range(h):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        if r < 60 and g < 60 and b < 60:
            black_xs.append(x)
            black_ys.append(y)
        elif r > 180 and g < 110 and b < 110:
            red_xs.append(x)
            red_ys.append(y)

print(f"Black bounding box: X=[{min(black_xs)}..{max(black_xs)}], Y=[{min(black_ys)}..{max(black_ys)}]")
print(f"Red bounding box:   X=[{min(red_xs)}..{max(red_xs)}], Y=[{min(red_ys)}..{max(red_ys)}]")
