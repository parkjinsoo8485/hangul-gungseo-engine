import os
from PIL import Image

# Let's inspect our_we_browser.png and crop each stroke area
im = Image.open(r"C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d\we_fixed_browser.png").convert("RGB")
w, h = im.size
print("Size:", w, h)

# Print ASCII of our_we_browser.png around the middle area
pixels = im.load()
for y in range(int(h * 0.4), int(h * 0.85), int(h * 0.02)):
    row = f"{y:3d} ({y/h*100:4.1f}%): "
    for x in range(int(w * 0.1), int(w * 0.8), int(w * 0.015)):
        r, g, b = pixels[x, y]
        if g > 110 and r < 80:
            row += "@" # badge
        elif r > 160 and g < 100 and b < 100:
            row += "*" # red guide
        elif r < 60 and g < 60 and b < 60:
            row += "#" # black ink
        else:
            row += "."
    print(row)
