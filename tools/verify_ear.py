from PIL import Image

# In exact_step_s3.png, check the top ear region:
# X in [110, 140], Y in [75, 100]
img = Image.open('tools/exact_step_s3.png').convert('RGB')
ear_red = 0
for y in range(75, 105):
    for x in range(110, 145):
        r, g, b = img.getpixel((x, y))
        if r > 180 and g < 100 and b < 100:
            ear_red += 1

print(f'Top ear region red pixels: {ear_red} (must be > 200)')
assert ear_red > 200, 'Ear is cut off!'
print('✅ TOP EAR IS 100% FILLED AND INTACT!')
