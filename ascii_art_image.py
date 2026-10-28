from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/.user_uploaded/media_1793079492567_f16597d5.png').convert('RGB')
w, h = img.size

grid_w, grid_h = 45, 45
cell_w = w / grid_w
cell_h = h / grid_h

print(f"Image {w}x{h} ASCII representation of black ink:")
for gy in range(grid_h):
    row = ""
    for gx in range(grid_w):
        x = int((gx + 0.5) * cell_w)
        y = int((gy + 0.5) * cell_h)
        r, g, b = img.getpixel((x, y))
        if r < 60 and g < 60 and b < 60:
            row += "#"
        elif g > 100 and g > r * 1.3:
            row += "@"
        else:
            row += "."
    print(row)
