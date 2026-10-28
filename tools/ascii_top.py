from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/exact_black_box.png').convert('RGB')

# Print ASCII of top tick
for y in range(30, 65, 2):
    row = f"{y:2d}: "
    for x in range(60, 180, 2):
        r, g, b = img.getpixel((x, y))
        is_black = (r < 40 and g < 40 and b < 40)
        is_red = (r > 160 and g < 110 and b < 110)
        if is_red:
            row += "R"
        elif is_black:
            row += "#"
        else:
            row += "."
    print(row)
