import sys
sys.stdout.reconfigure(encoding='utf-8')

# Consonant standard stroke count in Gungseo:
# ㄱ: 1, ㄴ: 1, ㄷ: 2, ㄹ: 3, ㅁ: 3, ㅂ: 4, ㅅ: 2, ㅇ: 1, ㅈ: 3, ㅊ: 4, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 3
# ㄲ: 2, ㄸ: 4, ㅃ: 8, ㅆ: 4, ㅉ: 6
# Vowels:
# ㅏ: 2, ㅐ: 3, ㅑ: 3, ㅒ: 4, ㅓ: 2, ㅔ: 3, ㅕ: 3, ㅖ: 4, ㅗ: 2, ㅘ: 4, ㅙ: 5, ㅚ: 3, ㅛ: 3, ㅜ: 2, ㅝ: 4, ㅞ: 5, ㅟ: 3, ㅠ: 3, ㅡ: 1, ㅢ: 2, ㅣ: 1
# Jong consonants:
# ㄱ: 1, ㄴ: 1, ㄷ: 2, ㄹ: 3, ㅁ: 3, ㅂ: 4, ㅅ: 2, ㅇ: 1, ㅈ: 3, ㅊ: 4, ㅋ: 2, ㅌ: 3, ㅍ: 4, ㅎ: 3

CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']
JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']
JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ']

cho_strokes = {'ㄱ':1,'ㄲ':2,'ㄴ':1,'ㄷ':2,'ㄸ':4,'ㄹ':3,'ㅁ':3,'ㅂ':4,'ㅃ':8,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅉ':6,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3}
# Note: In index.html, is ㅈ 2 or 3? Let's check: JAMO_DB_CALLI['ㅈ'] has 3 strokes!
# 'ㅅ' has 2 strokes. 'ㅎ' has 3 strokes. 'ㅍ' has 4 strokes. 'ㅂ' has 4 strokes.
jung_strokes = {'ㅏ':2,'ㅐ':3,'ㅑ':3,'ㅒ':4,'ㅓ':2,'ㅔ':3,'ㅕ':3,'ㅖ':4,'ㅗ':2,'ㅘ':4,'ㅙ':5,'ㅚ':3,'ㅛ':3,'ㅜ':2,'ㅝ':4,'ㅞ':5,'ㅟ':3,'ㅠ':3,'ㅡ':1,'ㅢ':2,'ㅣ':1}
jong_strokes = {'':0,'ㄱ':1,'ㄲ':2,'ㄳ':2,'ㄴ':1,'ㄵ':2,'ㄶ':2,'ㄷ':2,'ㄹ':3,'ㄺ':2,'ㄻ':3,'ㄼ':3,'ㄽ':3,'ㄾ':3,'ㄿ':3,'ㅀ':3,'ㅁ':3,'ㅂ':4,'ㅄ':4,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3}

def count_strokes(ch):
    o = ord(ch) - 0xAC00
    if o < 0 or o >= 11172: return 0
    c = CHO_LIST[o // 588]
    ju = JUNG_LIST[(o % 588) // 28]
    jo = JONG_LIST[o % 28]
    return cho_strokes.get(c, 1) + jung_strokes.get(ju, 1) + jong_strokes.get(jo, 0)

with open('all_words.txt', 'r', encoding='utf-8') as f:
    words = f.read().split()

print('Words where len(w)==2, count(c0)==5, count(c1)==9:')
for w in words:
    if len(w) == 2:
        s0 = count_strokes(w[0])
        s1 = count_strokes(w[1])
        if s0 == 5 and s1 == 9:
            print(f'  {w}: {w[0]}({s0}) + {w[1]}({s1})')
