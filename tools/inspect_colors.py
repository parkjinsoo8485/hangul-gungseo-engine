from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/exact_canvas_box.png').convert('RGB')
colors = {}
for y in range(img.height):
    for x in range(img.width):
        c = img.getpixel((x, y))
        colors[c] = colors.get(c, 0) + 1

sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
print("Top 15 colors in exact_canvas_box:")
for c, cnt in sorted_colors[:15]:
    print(f"  RGB{c}: {cnt} pixels")
