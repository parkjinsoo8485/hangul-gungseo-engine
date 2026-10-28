from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/.user_uploaded/media_1793079492567_f16597d5.png').convert('RGB')

# Let's crop each badge area (20x20 around badge center) and print an ascii representation
# Badges from earlier:
# Badge 0: x=190.1, y=32.1
# Badge 1: x=54.7, y=75.6
# Badge 2: x=82.9, y=96.7
# Badge 3: x=55.0, y=102.0
# Badge 4: x=195.0, y=115.4
# Badge 5: x=42.1, y=130.7
# Badge 6: x=137.6, y=157.1
# Badge 7: x=103.5, y=185.5
# Badge 8: x=150.5, y=202.4

badges = [
    ('B0', 190, 32),
    ('B1', 55, 76),
    ('B2', 83, 97),
    ('B3', 55, 102),
    ('B4', 195, 115),
    ('B5', 42, 131),
    ('B6', 138, 157),
    ('B7', 104, 186),
    ('B8', 151, 202)
]

for name, bx, by in badges:
    print(f"\n--- Badge at ({bx}, {by}) ---")
    crop = img.crop((bx - 10, by - 10, bx + 10, by + 10))
    for y in range(crop.height):
        row = ""
        for x in range(crop.width):
            r, g, b = crop.getpixel((x, y))
            # White text inside green circle
            if r > 180 and g > 180 and b > 180:
                row += "#"
            elif g > 90 and g > r * 1.2:
                row += "."
            else:
                row += " "
        print(row)
