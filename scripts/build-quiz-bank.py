"""Builds admin/quiz-bank.json — the offline Kazakh quiz bank for Reels (no AI needed).
Facts come from hand-checked tables below; logic/math questions are computed, so every answer is correct by construction.
Levels: 1 = easy (Q1–Q2), 2 = medium (Q3), 3 = comment question (Q4).
Run: python3 scripts/build-quiz-bank.py"""
import json, random, re, sys, os
R = random.Random(20261125)
OUT = os.path.join(os.path.dirname(__file__), '..', 'admin', 'quiz-bank.json')
items, seen = [], set()

ONES = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз']
TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан']
def kz(n):
    """Kazakh number words (0..999999), supports one decimal comma part via kzdec."""
    if n == 0: return 'нөл'
    if n < 0: return 'минус ' + kz(-n)
    out = []
    if n >= 1000:
        th = n // 1000; out.append('мың' if th == 1 else kz(th) + ' мың'); n %= 1000
    if n >= 100:
        h = n // 100; out.append('жүз' if h == 1 else ONES[h] + ' жүз'); n %= 100
    if n >= 10: out.append(TENS[n // 10]); n %= 10
    if n: out.append(ONES[n])
    return ' '.join(out)
def kzdec(s):  # "0,45" -> "нөл бүтін жүзден қырық бес"
    a, b = s.split(',')
    den = {1: 'оннан', 2: 'жүзден', 3: 'мыңнан'}[len(b)]
    return f'{kz(int(a))} бүтін {den} {kz(int(b))}'

EMO = {'capital': '🏙️', 'continent': '🌍', 'element': '🧪', 'mult': '🧮', 'add': '➕', 'sub': '➖', 'conv': '⏱️', 'len': '📏',
       'seq': '🧩', 'order': '🤯', 'pct': '💯', 'dec': '⚖️', 'prime': '🔢', 'odd': '🎲', 'fact': '💡'}
COL = {'capital': '#ffedd5', 'continent': '#dbeafe', 'element': '#ccfbf1', 'mult': '#ede9fe', 'add': '#dcfce7', 'sub': '#fee2e2', 'conv': '#fef3c7',
       'len': '#e0f2fe', 'seq': '#fae8ff', 'order': '#fde68a', 'pct': '#e0e7ff', 'dec': '#e5e7eb', 'prime': '#f3e8ff', 'odd': '#fce7f3', 'fact': '#fef9c3',
       'cmp': '#e0e7ff', 'days': '#dcfce7', 'months': '#fef3c7', 'analogy': '#fae8ff', 'oddword': '#e0f2fe', 'oddnum': '#fce7f3', 'missing': '#ede9fe',
       'clock': '#ffedd5', 'bigger': '#e5e7eb', 'riddle': '#fde68a', 'price': '#dcfce7', 'age': '#fee2e2'}

def add(topic, lvl, q, o, a_idx, v=None, av=None, emo=None, col=None):
    o = [str(x) for x in o]
    key = re.sub(r'\s+', ' ', q.replace('\n', ' ')).strip().lower()
    if key in seen or len(set(o)) != 3 or any(len(x) > 18 for x in o): return
    seen.add(key)
    items.append({'id': len(items) + 1, 't': topic, 'l': lvl, 'emo': emo or EMO[topic], 'col': col or COL[topic], 'q': q,
                  'v': v or q.replace('\n', ' '), 'o': o, 'a': a_idx, 'av': av or o[a_idx]})

def opts(correct, wrong):  # correct first; QUIZ.fromAI shuffles on screen
    return [correct] + wrong[:2], 0

# ---------------- capitals (country, genitive, capital, continent, level, tempting wrong city) ----------------
C = [
 ('Франция','Францияның','Париж','Еуразия',1,None),('Германия','Германияның','Берлин','Еуразия',1,None),('Италия','Италияның','Рим','Еуразия',1,None),
 ('Испания','Испанияның','Мадрид','Еуразия',1,'Барселона'),('Ұлыбритания','Ұлыбританияның','Лондон','Еуразия',1,None),('Португалия','Португалияның','Лиссабон','Еуразия',2,'Порту'),
 ('Нидерланды','Нидерландының','Амстердам','Еуразия',3,'Гаага'),('Бельгия','Бельгияның','Брюссель','Еуразия',2,None),('Австрия','Австрияның','Вена','Еуразия',2,'Зальцбург'),
 ('Швейцария','Швейцарияның','Берн','Еуразия',3,'Цюрих'),('Польша','Польшаның','Варшава','Еуразия',2,'Краков'),('Чехия','Чехияның','Прага','Еуразия',2,None),
 ('Венгрия','Венгрияның','Будапешт','Еуразия',2,None),('Грекия','Грекияның','Афина','Еуразия',1,None),('Швеция','Швецияның','Стокгольм','Еуразия',2,None),
 ('Норвегия','Норвегияның','Осло','Еуразия',2,None),('Финляндия','Финляндияның','Хельсинки','Еуразия',2,None),('Дания','Данияның','Копенгаген','Еуразия',2,None),
 ('Ирландия','Ирландияның','Дублин','Еуразия',2,None),('Румыния','Румынияның','Бухарест','Еуразия',2,None),('Болгария','Болгарияның','София','Еуразия',2,None),
 ('Сербия','Сербияның','Белград','Еуразия',2,None),('Хорватия','Хорватияның','Загреб','Еуразия',2,None),('Украина','Украинаның','Киев','Еуразия',1,None),
 ('Беларусь','Беларусьтің','Минск','Еуразия',1,None),('Ресей','Ресейдің','Мәскеу','Еуразия',1,'Санкт-Петербург'),('Исландия','Исландияның','Рейкьявик','Еуразия',2,None),
 ('Латвия','Латвияның','Рига','Еуразия',2,None),('Литва','Литваның','Вильнюс','Еуразия',2,None),('Эстония','Эстонияның','Таллин','Еуразия',2,None),
 ('Қытай','Қытайдың','Бейжің','Еуразия',1,'Шанхай'),('Жапония','Жапонияның','Токио','Еуразия',1,None),('Оңтүстік Корея','Оңтүстік Кореяның','Сеул','Еуразия',1,'Пусан'),
 ('Үндістан','Үндістанның','Нью-Дели','Еуразия',3,'Мумбаи'),('Түркия','Түркияның','Анкара','Еуразия',3,'Стамбул'),('Иран','Иранның','Тегеран','Еуразия',2,None),
 ('Ирак','Ирактың','Бағдат','Еуразия',2,None),('Сауд Арабиясы','Сауд Арабиясының','Эр-Рияд','Еуразия',2,'Мекке'),('БАӘ','БАӘ-нің','Абу-Даби','Еуразия',3,'Дубай'),
 ('Таиланд','Таиландтың','Бангкок','Еуразия',2,None),('Вьетнам','Вьетнамның','Ханой','Еуразия',3,'Хошимин'),('Малайзия','Малайзияның','Куала-Лумпур','Еуразия',2,None),
 ('Филиппин','Филиппиннің','Манила','Еуразия',2,None),('Пәкістан','Пәкістанның','Исламабад','Еуразия',3,'Карачи'),('Ауғанстан','Ауғанстанның','Кабул','Еуразия',2,None),
 ('Моңғолия','Моңғолияның','Ұлан-Батор','Еуразия',1,None),('Өзбекстан','Өзбекстанның','Ташкент','Еуразия',1,'Самарқан'),('Қырғызстан','Қырғызстанның','Бішкек','Еуразия',1,'Ош'),
 ('Тәжікстан','Тәжікстанның','Душанбе','Еуразия',1,None),('Түрікменстан','Түрікменстанның','Ашхабад','Еуразия',1,None),('Әзербайжан','Әзербайжанның','Баку','Еуразия',1,None),
 ('Грузия','Грузияның','Тбилиси','Еуразия',1,'Батуми'),('Армения','Арменияның','Ереван','Еуразия',1,None),('Непал','Непалдың','Катманду','Еуразия',2,None),
 ('Бангладеш','Бангладештің','Дакка','Еуразия',2,None),('Мьянма','Мьянманың','Нейпьидо','Еуразия',3,'Янгон'),
 ('Египет','Египеттің','Каир','Африка',1,'Александрия'),('Марокко','Марокко映','Рабат','Африка',3,'Касабланка'),('Кения','Кенияның','Найроби','Африка',2,None),
 ('Нигерия','Нигерияның','Абуджа','Африка',3,'Лагос'),('Эфиопия','Эфиопияның','Аддис-Абеба','Африка',2,None),('Гана','Гананың','Аккра','Африка',2,None),
 ('Сенегал','Сенегалдың','Дакар','Африка',2,None),('Танзания','Танзанияның','Додома','Африка',3,'Дар-эс-Салам'),('Ангола','Анголаның','Луанда','Африка',2,None),
 ('АҚШ','АҚШ-тың','Вашингтон','Солтүстік Америка',2,'Нью-Йорк'),('Канада','Канаданың','Оттава','Солтүстік Америка',3,'Торонто'),('Мексика','Мексиканың','Мехико','Солтүстік Америка',2,'Канкун'),
 ('Куба','Кубаның','Гавана','Солтүстік Америка',2,None),('Бразилия','Бразилияның','Бразилиа','Оңтүстік Америка',3,'Рио-де-Жанейро'),('Аргентина','Аргентинаның','Буэнос-Айрес','Оңтүстік Америка',2,None),
 ('Чили','Чилидің','Сантьяго','Оңтүстік Америка',2,None),('Перу','Перудің','Лима','Оңтүстік Америка',2,None),('Колумбия','Колумбияның','Богота','Оңтүстік Америка',2,'Медельин'),
 ('Венесуэла','Венесуэланың','Каракас','Оңтүстік Америка',2,None),('Эквадор','Эквадордың','Кито','Оңтүстік Америка',3,'Гуаякиль'),('Уругвай','Уругвайдың','Монтевидео','Оңтүстік Америка',2,None),
 ('Австралия','Австралияның','Канберра','Австралия',3,'Сидней'),('Жаңа Зеландия','Жаңа Зеландияның','Веллингтон','Австралия',3,'Окленд'),
]
C = [(c, g.replace('映', 'ның'), cap, cont, l, trap) for (c, g, cap, cont, l, trap) in C]
by_cont = {}
for c in C: by_cont.setdefault(c[3], []).append(c)
for (c, g, cap, cont, l, trap) in C:
    pool = [x[2] for x in by_cont[cont] if x[2] != cap]
    R.shuffle(pool)
    wrong = ([trap] if trap else []) + [p for p in pool if p != trap]
    o, a = opts(cap, wrong)
    add('capital', l, f'{g} астанасы\nқандай қала?', o, a, emo='🏙️')
CONTS = ['Еуразия', 'Африка', 'Солтүстік Америка', 'Оңтүстік Америка', 'Австралия']
ISLANDS = {'Жапония', 'Филиппин', 'Исландия', 'Куба', 'Ұлыбритания', 'Ирландия', 'Жаңа Зеландия', 'Малайзия'}
for (c, g, cap, cont, l, trap) in C:
    if c in ISLANDS: continue
    wrong = [x for x in CONTS if x != cont]; R.shuffle(wrong)
    lvl = 1 if l == 1 else 2
    o, a = opts(cont, wrong)
    add('continent', lvl, f'{c} қай материкте\nорналасқан?', o, a)

# ---------------- chemical element symbols ----------------
E = [('H','Сутегі',1),('O','Оттегі',1),('C','Көміртегі',2),('N','Азот',2),('Fe','Темір',2),('Cu','Мыс',3),('Ag','Күміс',3),('Au','Алтын',2),
     ('Na','Натрий',3),('K','Калий',3),('Ca','Кальций',2),('Mg','Магний',2),('Al','Алюминий',2),('Zn','Мырыш',2),('Pb','Қорғасын',3),('Hg','Сынап',3),
     ('Sn','Қалайы',3),('S','Күкірт',2),('Cl','Хлор',2),('He','Гелий',2),('Ne','Неон',2),('Si','Кремний',2),('P','Фосфор',2),('Pt','Платина',2),('Ni','Никель',2)]
names = [e[1] for e in E]
TRAP = {'K': 'Кальций', 'Ag': 'Алтын', 'Na': 'Азот', 'S': 'Кремний', 'Pb': 'Платина', 'Sn': 'Кремний', 'Cu': 'Хлор', 'Hg': 'Гелий', 'Au': 'Күміс', 'C': 'Кальций', 'Ca': 'Көміртегі', 'P': 'Калий', 'Ni': 'Азот'}
for sym, name, l in E:
    pool = [n for n in names if n != name]; R.shuffle(pool)
    wrong = ([TRAP[sym]] if sym in TRAP else []) + [p for p in pool if p != TRAP.get(sym)]
    o, a = opts(name, wrong)
    add('element', l, f'«{sym}» — қай химиялық\nэлементтің таңбасы?', o, a, v=f'{" ".join(sym)} — қай химиялық элементтің таңбасы?')

# ---------------- unit conversions (easy) ----------------
for n in range(2, 5):
    add('conv', 1, f'{n} сағатта неше\nминут бар?', [n*60, n*60+40 if n%2 else n*60-20, n*100], 0, v=f'{kz(n)} сағатта неше минут бар?', av=f'{kz(n*60)} минут')
    add('conv', 1, f'{n} минутта неше\nсекунд бар?', [n*60, n*100, n*30], 0, v=f'{kz(n)} минутта неше секунд бар?', av=f'{kz(n*60)} секунд')
    add('conv', 1, f'{n} тәулікте неше\nсағат бар?', [n*24, n*20, n*12], 0, v=f'{kz(n)} тәулікте неше сағат бар?', av=f'{kz(n*24)} сағат')
    add('conv', 1, f'{n} аптада неше\nкүн бар?', [n*7, n*5, n*10], 0, v=f'{kz(n)} аптада неше күн бар?', av=f'{kz(n*7)} күн')
for n in range(2, 0):
    add('len', 1, f'{n} километрде неше\nметр бар?', [n*1000, n*100, n*10000], 0, v=f'{kz(n)} километрде неше метр бар?', av=f'{kz(n*1000)} метр')
    add('len', 1, f'{n} метрде неше\nсантиметр бар?', [n*100, n*10, n*1000], 0, v=f'{kz(n)} метрде неше сантиметр бар?', av=f'{kz(n*100)} сантиметр')
    add('len', 1, f'{n} килограмда неше\nграмм бар?', [n*1000, n*100, n*10000], 0, v=f'{kz(n)} килограмда неше грамм бар?', av=f'{kz(n*1000)} грамм')

# ---------------- arithmetic ----------------
for a_ in range(3, 10):
    for b in range(3, 10):
        r = a_*b; w = sorted({r + a_, r - b, r + 1, r - 1} - {r}); R.shuffle(w)
        add('mult', 1, f'{a_} × {b} = ?', [r] + w[:2], 0, v=f'{kz(a_)} көбейту {kz(b)} неше болады?', av=kz(r))
for _ in range(9000):
    if len([i for i in items if i['t'] == 'add']) >= 150: break
    a_, b = R.randint(12, 89), R.randint(12, 89); r = a_ + b
    w = [r + 10, r - 10] if R.random() < .5 else [r + 1, r - 9]
    add('add', 1, f'{a_} + {b} = ?', [r] + w, 0, v=f'{kz(a_)} қосу {kz(b)} неше болады?', av=kz(r))
for _ in range(9000):
    if len([i for i in items if i['t'] == 'sub']) >= 150: break
    a_ = R.randint(41, 99); b = R.randint(12, a_ - 11); r = a_ - b
    w = [r + 10, r - 10] if R.random() < .5 else [r + 2, r - 8]
    add('sub', 2, f'{a_} − {b} = ?', [r] + w, 0, v=f'{kz(a_)} алу {kz(b)} неше болады?', av=kz(r))
for _ in range(6000):
    if len([i for i in items if i['t'] == 'mult' and i['l'] == 2]) >= 700: break
    a_, b = R.randint(12, 99), R.randint(3, 9); r = a_ * b
    w = [r + b, r - 10] if R.random() < .5 else [r + 10, r - a_]
    add('mult', 2, f'{a_} × {b} = ?', [r] + w, 0, v=f'{kz(a_)} көбейту {kz(b)} неше болады?', av=kz(r))

# ---------------- percentages ----------------
for base in (40, 60, 80, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000):
    for p in (5, 10, 15, 20, 25, 30, 40, 50, 75):
        r = base * p / 100
        if r != int(r): continue
        r = int(r); w = [int(base * p / 10) if base * p / 10 != r else r * 3, r * 2 if r * 2 != base else r + 5]
        add('pct', 2, f'{base} санының {p}%-ы\nқанша?', [r] + w, 0, v=f'{kz(base)} санының {kz(p)} пайызы қанша?', av=kz(r))

# ---------------- number sequences ----------------
def seq_item(sq, nxt, lvl, wrong):
    shown = ', '.join(map(str, sq))
    add('seq', lvl, f'Келесі сан қандай?\n{shown}, ?', [nxt] + wrong, 0,
        v=f'Қатардағы келесі сан қандай: {", ".join(kz(x) for x in sq)}?', av=kz(nxt))
for st in range(1, 31):
    for d in range(2, 13):
        sq = [st + d * k for k in range(4)]; n = sq[-1] + d
        seq_item(sq, n, 2, [n + 1, n - 2] if d > 2 else [n + 2, n + 3])
for st in range(1, 8):
    for m in (2, 3):
        sq = [st * m ** k for k in range(4)]; n = sq[-1] * m
        if n > 5000: continue
        seq_item(sq, n, 3 if m == 3 else 2, [sq[-1] + (sq[-1] - sq[-2]), n - m])
for st in range(1, 9):
    sq = [(st + k) ** 2 for k in range(4)]; n = (st + 4) ** 2
    seq_item(sq, n, 3, [sq[-1] + (sq[-1] - sq[-2]), n + 1])
for a_ in range(1, 10):
    for b in range(1, 10):
        sq = [a_, b, a_ + b, a_ + 2 * b]
        sq = [a_, b]; [sq.append(sq[-1] + sq[-2]) for _ in range(3)]; n = sq[-1] + sq[-2]
        seq_item(sq, n, 3, [sq[-1] + (sq[-1] - sq[-2]), n + 1])
for st in range(1, 60):
    for d1, d2 in ((2, 3), (3, 1), (5, 2), (1, 4), (4, 1), (2, 5), (3, 4), (6, 1)):
        sq = [st]; [sq.append(sq[-1] + (d1 if k % 2 == 0 else d2)) for k in range(4)]; n = sq[-1] + d1
        seq_item(sq, n, 3, [sq[-1] + d2, n + 1])

# ---------------- order of operations (comment questions) ----------------
for _ in range(20000):
    if len([i for i in items if i['t'] == 'order']) >= 1200: break
    kind = R.randint(0, 3)
    if kind == 0:
        a_, b, c = R.randint(2, 20), R.randint(2, 9), R.randint(2, 9); r = a_ + b * c; w = (a_ + b) * c
        q, v = f'{a_} + {b} × {c} = ?', f'{kz(a_)} қосу {kz(b)} көбейту {kz(c)} неше болады?'
    elif kind == 1:
        b, c = R.randint(2, 9), R.randint(2, 9); a_ = R.randint(b * c + 1, b * c + 30); r = a_ - b * c; w = (a_ - b) * c
        q, v = f'{a_} − {b} × {c} = ?', f'{kz(a_)} алу {kz(b)} көбейту {kz(c)} неше болады?'
    elif kind == 2:
        b, c = R.randint(2, 6), R.randint(2, 6); a_ = b * R.randint(2, 9)
        if a_ % (b * c): continue
        r = a_ // b * c; w = a_ // (b * c)
        q, v = f'{a_} ÷ {b} × {c} = ?', f'{kz(a_)} бөлу {kz(b)} көбейту {kz(c)} неше болады?'
    else:
        c = R.randint(2, 9); b = c * R.randint(2, 9); a_ = R.randint(2, 40); r = a_ + b // c
        if (a_ + b) % c: continue
        w = (a_ + b) // c
        q, v = f'{a_} + {b} ÷ {c} = ?', f'{kz(a_)} қосу {kz(b)} бөлу {kz(c)} неше болады?'
    if w == r or w <= 0: continue
    third = r + R.choice([1, 2, 10, -1]) if r > 2 else r + 3
    if third in (r, w): third = r + 7
    add('order', 3, q, [r, w, third], 0, v=v, av=kz(r))

# ---------------- decimals (comment questions) ----------------
for i in range(1, 10):
    for j in range(10, 100):
        if j // 10 >= i or j % 10 == 0: continue
        a_, b = f'0,{i}', f'0,{j}'
        add('dec', 3, f'Қайсысы үлкен:\n{a_} әлде {b}?', [a_, b, 'Бірдей'], 0, v=f'Қайсысы үлкен: {kzdec(a_)} әлде {kzdec(b)}?', av=kzdec(a_))

# ---------------- odd / prime ----------------
for _ in range(4000):
    if len([i for i in items if i['t'] == 'odd']) >= 0: break
    odd = R.randrange(11, 99, 2); ev = R.sample(range(10, 99, 2), 2)
    add('odd', 1, f'Қай сан тақ?\n({odd}, {ev[0]}, {ev[1]})', [odd] + ev, 0, v=f'Мына сандардың қайсысы тақ: {kz(odd)}, {kz(ev[0])}, {kz(ev[1])}?', av=kz(odd))
PR = [p for p in range(11, 100) if all(p % d for d in range(2, int(p ** .5) + 1))]
CO = [n for n in range(15, 100, 2) if n not in PR]
for p in PR:
    for _ in range(6):
        w = R.sample(CO, 2)
        add('prime', 2, f'Қай сан жай сан?\n({p}, {w[0]}, {w[1]})', [p] + w, 0, v=f'Мына сандардың қайсысы жай сан: {kz(p)}, {kz(w[0])}, {kz(w[1])}?', av=kz(p))

# ---------------- hand-checked facts (curated) ----------------
def F(lvl, emo, q, o, v=None, av=None): add('fact', lvl, q, o, 0, v=v, av=av, emo=emo)
sys.path.insert(0, os.path.dirname(__file__))
from quiz_facts_kz import FACTS  # noqa: E402
for f in FACTS: F(*f)

# ---------------- short logic / IQ-style questions (v2) ----------------
from quiz_logic_kz import build as build_logic  # noqa: E402
build_logic(add, R, kz)

R.shuffle(items)
for k, it in enumerate(items, 1): it['id'] = k
json.dump(items, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(items), dict(Counter(i['t'] for i in items)), dict(Counter(i['l'] for i in items)), os.path.getsize(OUT) // 1024, 'KB')
