import re

# Consonant standard stroke count in Gungseo:
# ㄱ: 1, ㄴ: 1, ㄷ: 2, ㄹ: 3, ㅁ: 3, ㅂ: 4, ㅅ: 2, ㅇ: 1, ㅈ: 3 (or 2), ㅊ: 4 (or 3), ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 3
# ㄲ: 2, ㄸ: 4, ㅃ: 8 (or 4?), ㅆ: 4, ㅉ: 6 (or 4?)
# Vowels:
# ㅏ: 2, ㅐ: 3, ㅑ: 3, ㅒ: 4, ㅓ: 2, ㅔ: 3, ㅕ: 3, ㅖ: 4, ㅗ: 2, ㅘ: 4, ㅙ: 5, ㅚ: 3, ㅛ: 3, ㅜ: 2, ㅝ: 4, ㅞ: 5, ㅟ: 3, ㅠ: 3, ㅡ: 1, ㅢ: 2, ㅣ: 1
# Jong consonants:
# ㄱ: 1, ㄴ: 1, ㄷ: 2, ㄹ: 3, ㅁ: 3, ㅂ: 4, ㅅ: 2, ㅇ: 1, ㅈ: 3, ㅊ: 4, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 3

CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

with open('all_words.txt', 'r', encoding='utf-8') as f:
    words = f.read().split()

print(f'Checking {len(words)} words...')
for w in words:
    # decompose char 0 and char 1
    c0, c1 = w[0], w[1]
    # check char 1: what is cho, jung, jong?
    o1 = ord(c1) - 0xAC00
    cho1 = CHO_LIST[o1 // 588]
    jung1 = JUNG_LIST[(o1 % 588) // 28]
    jong1 = JONG_LIST[o1 % 28]

    # In our image:
    # jung is ㅏ (or ㅑ or similar vertical)
    # jong is ㅎ or ㅇ or similar
    # cho has 4 strokes (like ㅍ or ㅂ)
    if jung1 in ['ㅏ', 'ㅑ', 'ㅐ'] and jong1 in ['ㅎ', 'ㅇ', 'ㄹ', 'ㅁ']:
        print(f'{w} -> {c1}: cho={cho1}, jung={jung1}, jong={jong1}')
