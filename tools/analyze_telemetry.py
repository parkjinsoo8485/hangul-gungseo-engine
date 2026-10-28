import json

meta_path = r'C:\Users\user\.gemini\antigravity\brain\1da444f2-688c-42da-97f4-47f722045f3d\ink_telemetry.json'
with open(meta_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

stroke_names = [
    '01_획_ㅎ_꼭지', '02_획_ㅎ_가로', '03_획_ㅎ_원형', '04_획_ㅗ_세로점', '05_획_ㅗ_가로선', '06_획_ㅣ_세로선', '07_획_ㄱ_받침',
    '08_순_ㅅ_좌삐침', '09_순_ㅅ_우파임', '10_순_ㅜ_가로선', '11_순_ㅜ_세로기둥', '12_순_ㄴ_받침'
]

print(f"Total frames: {len(data)}")
print(f"Final total pixels revealed: {data[-1]['shown']} / {data[-1]['totalPixels']}")
print(f"Coverage: {data[-1]['shown'] / data[-1]['totalPixels'] * 100:.2f}%\n")

print(f"{'Frame':5s} | {'Time':7s} | {'Stroke':16s} | {'Step':4s} | {'Shown':6s} | {'Diff':6s} | {'Event'}")
print("-" * 75)

for i, f in enumerate(data):
    s = f['sIdx']
    p = f['pIdx']
    t = f['time']
    shown = f['shown']
    diff = f['diff']
    name = stroke_names[s] if s < len(stroke_names) else f'Done_{s}'
    
    event = ''
    if i > 0 and data[i-1]['sIdx'] != s:
        event = f"▶ TRANSITION {data[i-1]['sIdx']} -> {s}"
    elif p == 4095:
        event = "★ STROKE COMPLETE (100%)"
        
    if diff > 0 or event:
        print(f"{i:5d} | {t:5d}ms | {name:16s} | {p:4d} | {shown:6d} | {diff:6d} | {event}")
