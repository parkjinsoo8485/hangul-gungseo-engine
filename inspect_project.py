with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'char-input' in line:
        print(f'{i}: {line.strip()}')
    if 'Engine.loadText' in line:
        print(f'{i}: {line.strip()}')
