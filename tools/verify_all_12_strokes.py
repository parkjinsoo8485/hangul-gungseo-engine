from PIL import Image
import json
import math

# Load drawn image
im = Image.open('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_drawn_complete.png').convert('RGB')
w, h = im.size
print(f"Canvas Image size: {w} x {h}")

# Collect ink pixels: dark pixels significantly different from parchment
ink_pixels = set()
for y in range(h):
    for x in range(w):
        r, g, b = im.getpixel((x, y))
        if r < 140 and g < 140 and b < 140:
            ink_pixels.add((x, y))

print(f"Total canvas ink pixels: {len(ink_pixels)}")

# Load dense points of all 12 strokes
strokes = json.load(open('tools/dense_strokes_12.json', 'r', encoding='utf-8'))

scale = w / 200.0  # 600 / 200 = 3.0
print(f"Scale: {scale} px per unit")

total_pts = 0
total_within_2px = 0
total_within_3px = 0
max_overall_dist = 0.0

results = []

for st in strokes:
    s_idx = st['strokeIdx']
    s_name = st['name']
    char = st['char']
    pts = st['points']
    
    dists = []
    outliers = []
    for px_u, py_u in pts:
        cx = px_u * scale
        cy = py_u * scale
        min_d = 999.0
        # search window around (cx, cy)
        rx = int(round(cx))
        ry = int(round(cy))
        for dy in range(-20, 21):
            for dx in range(-20, 21):
                if (rx + dx, ry + dy) in ink_pixels:
                    d = math.hypot((rx + dx) - cx, (ry + dy) - cy)
                    if d < min_d:
                        min_d = d
        dists.append(min_d)
        if min_d > 3.0:
            outliers.append((px_u, py_u, min_d))

    total_pts += len(pts)
    within_2 = sum(1 for d in dists if d <= 2.0)
    within_3 = sum(1 for d in dists if d <= 3.0)
    total_within_2px += within_2
    total_within_3px += within_3
    max_d = max(dists) if dists else 0.0
    avg_d = sum(dists) / len(dists) if dists else 0.0
    if max_d > max_overall_dist:
        max_overall_dist = max_d
        
    res = {
        'stroke': s_idx,
        'char': char,
        'name': s_name,
        'points_count': len(pts),
        'min_dist': min(dists),
        'avg_dist': avg_d,
        'max_dist': max_d,
        'within_2px_pct': within_2 * 100.0 / len(pts),
        'within_3px_pct': within_3 * 100.0 / len(pts),
        'outliers_count': len(outliers)
    }
    results.append(res)
    print(f"Stroke {s_idx:2d} [{char}] {s_name:<16}: {len(pts):3d} pts | avg={avg_d:.2f}px | max={max_d:.2f}px | within 3px: {within_3*100/len(pts):.1f}%")

print("="*70)
print(f"TOTAL POINTS EVALUATED: {total_pts}")
print(f"Points within 2px (exact center): {total_within_2px} ({total_within_2px*100/total_pts:.2f}%)")
print(f"Points within 3px (ink coverage): {total_within_3px} ({total_within_3px*100/total_pts:.2f}%)")
print(f"Max overall distance: {max_overall_dist:.2f} px")
print(f"Total centerline outliers (>3px): {total_pts - total_within_3px}")

with open('tools/verification_12_strokes_result.json', 'w', encoding='utf-8') as f:
    json.dump({
        'overall': {
            'total_points': total_pts,
            'within_2px_pct': total_within_2px * 100.0 / total_pts,
            'within_3px_pct': total_within_3px * 100.0 / total_pts,
            'max_distance_px': max_overall_dist,
            'outliers_gt_3px': total_pts - total_within_3px
        },
        'strokes': results
    }, f, indent=2, ensure_ascii=False)
