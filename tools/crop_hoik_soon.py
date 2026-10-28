from PIL import Image

p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_actual_cdp.png'
img = Image.open(p).convert('RGB')

# Let's crop the canvas area:
# In the screenshot, the two characters are in the center.
# Let's crop X=[200..1064], Y=[240..700] and save it
crop_img = img.crop((150, 200, 1100, 750))
out_p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_cropped.png'
crop_img.save(out_p)
print(f"Saved cropped screenshot to {out_p}, size: {crop_img.size}")
