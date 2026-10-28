from PIL import Image

img = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/.user_uploaded/media_1793155015714_5ca13639.png').convert('RGB')
w, h = img.size

# Let's inspect where red pixels are vs black ink
for cy_range, name in [
    ((30, 70), "Top ㅎ/ㅅ (1, 8)"),
    ((70, 110), "Bar / Circle (2, 3)"),
    ((110, 160), "Tick / Bar (4, 10, 11)"),
    ((160, 260), "Bottom (7, 12)")
]:
    red_pts = []
    black_pts = []
    for y in range(cy_range[0], cy_range[1]):
        for x in range(w):
            r, g, b = img.getpixel((x, y))
            # Black ink is dark: r < 60, g < 60, b < 60
            if r < 60 and g < 60 and b < 60:
                black_pts.append((x, y))
            # Red dashed line:
            if r > 170 and g < 90 and b < 90:
                red_pts.append((x, y))
    
    print(f"\n--- {name} ---")
    print(f"Red pts count: {len(red_pts)}")
    if red_pts:
        print(f"Red X span: [{min(p[0] for p in red_pts)}..{max(p[0] for p in red_pts)}], Y span: [{min(p[1] for p in red_pts)}..{max(p[1] for p in red_pts)}]")
    print(f"Black ink count: {len(black_pts)}")
