from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/exact_black_box.png').convert('RGB')
cw, ch = img.size

# Let's inspect the top area of left cell: x in [50..200], y in [20..100]
top_black = []
top_red = []

for y in range(20, 100):
    for x in range(50, 200):
        r, g, b = img.getpixel((x, y))
        if r < 40 and g < 40 and b < 40:
            top_black.append((x, y))
        elif r > 160 and g < 110 and b < 110:
            top_red.append((x, y))

print(f"Top black ink pixels: {len(top_black)}")
if top_black:
    print(f"Top black ink X span: [{min(p[0] for p in top_black)}..{max(p[0] for p in top_black)}], Y span: [{min(p[1] for p in top_black)}..{max(p[1] for p in top_black)}]")

print(f"Top red guideline pixels: {len(top_red)}")
if top_red:
    print(f"Top red X span: [{min(p[0] for p in top_red)}..{max(p[0] for p in top_red)}], Y span: [{min(p[1] for p in top_red)}..{max(p[1] for p in top_red)}]")
