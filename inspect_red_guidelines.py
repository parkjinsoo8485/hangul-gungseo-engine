from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/.user_uploaded/media_1793079492567_f16597d5.png').convert('RGB')
w, h = img.size

# Let's inspect the strokes:
# Red dashed lines: red pixels
red_pixels = []
for y in range(h):
    for x in range(w):
        r, g, b = img.getpixel((x, y))
        # Red dashed line is reddish (e.g. #e74c3c or similar)
        if r > 150 and g < 100 and b < 100:
            red_pixels.append((x, y))

print('Total red guideline pixels:', len(red_pixels))

# Let's group red pixels near each badge to see each stroke's path!
# Badges:
# B0 (10): (190, 32)
# B1 (6): (55, 76)
# B2 (8): (83, 97)
# B3 (7): (55, 102)
# B4 (11): (195, 115)
# B5 (9): (42, 131)
# B6 (12): (138, 157)
# B7 (13): (104, 186)
# B8 (14): (151, 202)

print("\nRed guideline segments around badges:")
for y_min, y_max, label in [
    (20, 140, "Top Right (10, 11)"),
    (60, 145, "Top Left (6, 7, 8, 9)"),
    (145, 175, "Bottom Upper (12)"),
    (175, 195, "Bottom Middle (13)"),
    (195, 250, "Bottom Lower (14)")
]:
    pts = [p for p in red_pixels if y_min <= p[1] <= y_max]
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        print(f"  {label}: {len(pts)} pts, X=[{min(xs)}..{max(xs)}], Y=[{min(ys)}..{max(ys)}]")
