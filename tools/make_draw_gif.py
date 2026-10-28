from PIL import Image

artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d'

frames = []
for s in range(1, 13):
    f_path = f"{artifactDir}/draw_step_{s}.png"
    im = Image.open(f_path).convert('RGB')
    frames.append(im)

# Duplicate last frame so it pauses on the final completed character
for _ in range(5):
    frames.append(frames[-1])

gif_path = f"{artifactDir}/hoik_soon_drawing_animation.gif"
frames[0].save(
    gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=400,
    loop=0
)
print(f"Saved {gif_path}")
