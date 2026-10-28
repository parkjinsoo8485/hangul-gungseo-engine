from PIL import Image, ImageDraw, ImageFont

artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d'

# 12 steps -> 4 rows x 3 columns
cols = 3
rows = 4
cell_w = 300
cell_h = 150

grid = Image.new('RGB', (cols * cell_w, rows * cell_h + 40), (255, 255, 255))
draw = ImageDraw.Draw(grid)

titles = [
    "1. ㅎ 꼭지 점", "2. ㅎ 가로획", "3. ㅎ 이응(ㅇ) [초성 완성]",
    "4. ㅚ ㅗ 꼭지", "5. ㅚ ㅗ 가로획", "6. ㅚ ㅣ 기둥 [중성 완성]",
    "7. ㄱ 받침 ['획' 완성]", "8. ㅅ 좌측 삐침", "9. ㅅ 우측 파임 [초성 완성]",
    "10. ㅜ 가로획", "11. ㅜ 세로 기둥 [중성 완성]", "12. ㄴ 받침 ['획순' 전체 완성]"
]

for idx in range(12):
    s = idx + 1
    im = Image.open(f"{artifactDir}/draw_step_{s}.png").convert('RGB')
    im_resized = im.resize((cell_w - 10, cell_h - 30))
    
    r = idx // cols
    c = idx % cols
    
    x = c * cell_w + 5
    y = r * cell_h + 25
    
    grid.paste(im_resized, (x, y))
    draw.text((x + 10, y - 20), titles[idx], fill=(40, 40, 40))

grid_path = f"{artifactDir}/hoik_soon_12steps_grid.png"
grid.save(grid_path)
print(f"Saved {grid_path}")
