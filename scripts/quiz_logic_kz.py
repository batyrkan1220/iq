"""Short logic / IQ-style questions for the Kazakh Reels bank (all answers computed or hand-checked).
Each generator calls add(topic, level, q, options, 0, v=spoken_q, av=spoken_answer, emo=...) — correct option first.
Levels: 1 = easy hook, 2 = medium logic, 3 = tricky comment question."""

DAYS = ['дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі', 'жексенбі']
MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
MONTHS_ABL = ['қаңтардан', 'ақпаннан', 'наурыздан', 'сәуірден', 'мамырдан', 'маусымнан', 'шілдеден', 'тамыздан', 'қыркүйектен', 'қазаннан', 'қарашадан', 'желтоқсаннан']
# (name, ablative "…-нан/-ден/-тан")
NAMES = [('Арман', 'Арманнан'), ('Бек', 'Бектен'), ('Самат', 'Саматтан'), ('Дана', 'Данадан'), ('Айгерім', 'Айгерімнен'), ('Ерлан', 'Ерланнан'),
         ('Мадина', 'Мадинадан'), ('Нұрлан', 'Нұрланнан'), ('Әлия', 'Әлиядан'), ('Тимур', 'Тимурдан'), ('Әсел', 'Әселден'), ('Дәурен', 'Дәуреннен'),
         ('Аружан', 'Аружаннан'), ('Ержан', 'Ержаннан'), ('Сәуле', 'Сәуледен'), ('Алихан', 'Алиханнан'), ('Жансая', 'Жансаядан'), ('Марат', 'Мараттан'),
         ('Камила', 'Камиладан'), ('Ислам', 'Исламнан'), ('Асан', 'Асаннан'), ('Үсен', 'Үсеннен'), ('Бота', 'Ботадан'), ('Нұржан', 'Нұржаннан')]
# (more, less, ask-most, ask-least)
ATTR = [('ұзын', 'аласа', 'Ең ұзын кім?', 'Ең аласа кім?'),
        ('үлкен', 'кіші', 'Ең үлкені кім?', 'Ең кішісі кім?'),
        ('жылдам', 'баяу', 'Ең жылдам кім?', 'Ең баяу кім?'),
        ('ауыр', 'жеңіл', 'Ең ауыры кім?', 'Ең жеңілі кім?')]

BACK, FRONT, VOW = set('аоұыя'), set('әеөүіэи'), set('аоұыяәеөүіэиуюё')
VOICELESS = set('кқпстфхцчшщ')
def _back(w):
    for ch in reversed(w.lower()):
        if ch in BACK: return True
        if ch in FRONT: return False
    return True
def _last(w): return w.split()[-1]
def poss3(w):  # сегіз → сегізі, екі → екісі
    l = _last(w); b = _back(l)
    return w + (('сы' if b else 'сі') if l[-1] in VOW else ('ы' if b else 'і'))
def acc3(w): return poss3(w) + 'н'                       # сегізін, екісін
def abl3(w): return poss3(w) + ('нан' if _back(_last(w)) else 'нен')   # сегізінен, тоғызынан
def loc(w):
    l = _last(w); b = _back(l)
    return w + (('та' if b else 'те') if l[-1] in VOICELESS else ('да' if b else 'де'))
def dat(w):
    l = _last(w); b = _back(l)
    return w + (('қа' if b else 'ке') if l[-1] in VOICELESS else ('ға' if b else 'ге'))
def ordw(w):  # екінші, алтыншы, жиырмасыншы, елуінші, үшінші
    l = _last(w); b = _back(l)
    if l[-1] in 'ыі': return w + ('ншы' if b else 'нші')
    if l[-1] in 'ае': return w + ('сыншы' if b else 'сінші')
    return w + ('ыншы' if b else 'інші')
def qp(w):  # question particle ма/ме, ба/бе, па/пе
    l = _last(w); b = _back(l) or l in ('минут', 'секунд'); c = l[-1]
    if c in VOW or c in 'лрй': return w + (' ма' if b else ' ме')
    if c in 'мнңзж': return w + (' ба' if b else ' бе')
    return w + (' па' if b else ' пе')
def dsuf(n, kz, fn):  # digit + suffix as written: 8-ін, 2-сін, 4-те
    w = kz(n); return f'{n}-{fn(w)[len(w):]}'
SPOKEN_UNIT = {'см': 'сантиметр', 'км': 'километр', 'кг': 'килограмм'}


def build(add, R, kz):
    n0 = 0

    # ---------- 1. who is the tallest / youngest … (transitive comparisons) ----------
    for _ in range(4000):
        p = R.sample(NAMES, 3)               # p[0] > p[1] > p[2]
        more, less, ask_max, ask_min = R.choice(ATTR)
        hard = R.random() < .35   # some reversed wording → needs a second of thought
        s1 = f'{p[0][0]} {p[1][1]} {more}' if not (hard and R.random() < .5) else f'{p[1][0]} {p[0][1]} {less}'
        s2 = f'{p[1][0]} {p[2][1]} {more}' if not hard else f'{p[2][0]} {p[1][1]} {less}'
        st = [s1, s2]; R.shuffle(st)
        ask_top = R.random() < .5
        ans = p[0][0] if ask_top else p[2][0]
        q = f'{st[0]}, {st[1].lower() if False else st[1]}.\n{ask_max if ask_top else ask_min}'
        o = [ans] + [x[0] for x in p if x[0] != ans]
        add('cmp', 3 if hard else 2, q, o, 0, emo='👥')

    # ---------- 3. months ----------
    for m in range(12):
        for k in (3, 4, 5):
            a = MONTHS[(m + k) % 12]
            add('months', 2 if k <= 4 else 3, f'{MONTHS_ABL[m].capitalize()} {k} ай\nөткен соң қай ай болады?',
                [a.capitalize(), MONTHS[(m + k + 1) % 12].capitalize(), MONTHS[(m + k - 1) % 12].capitalize()], 0,
                v=f'{MONTHS_ABL[m].capitalize()} {kz(k)} ай өткен соң қай ай болады?', emo='🗓️')

    # ---------- 4. analogies ----------
    OPP = [('ыстық', 'суық'), ('үлкен', 'кіші'), ('ұзын', 'қысқа'), ('биік', 'аласа'), ('ауыр', 'жеңіл'), ('жылдам', 'баяу'), ('ақ', 'қара'),
           ('жаз', 'қыс'), ('кең', 'тар'), ('жаңа', 'ескі'), ('бай', 'кедей'), ('жақын', 'алыс'), ('жоғары', 'төмен'), ('күн', 'түн'), ('дос', 'жау'),
           ('таң', 'кеш'), ('тәтті', 'ащы'), ('ашық', 'жабық'), ('толық', 'бос'), ('қатты', 'жұмсақ')]
    words = [w for pr in OPP for w in pr]
    for i, (a1, b1) in enumerate(OPP):
        for j, (a2, b2) in enumerate(OPP):
            if i == j: continue
            wrong = [w for w in words if w not in (a1, b1, a2, b2)]; R.shuffle(wrong)
            add('analogy', 1, f'{a1.capitalize()} — {b1},\n{a2} — ?', [b2] + wrong[:2], 0, v=f'{a1.capitalize()} дегенге {b1} сәйкес келсе, {a2} дегенге не сәйкес келеді?', emo='🔗')
    YOUNG = [('сиыр', 'бұзау'), ('жылқы', 'құлын'), ('қой', 'қозы'), ('түйе', 'бота'), ('ешкі', 'лақ'), ('ит', 'күшік'), ('тауық', 'балапан'), ('аю', 'қонжық'), ('қасқыр', 'бөлтірік')]
    youngs = [y for _, y in YOUNG]
    for i, (a1, b1) in enumerate(YOUNG):
        for j, (a2, b2) in enumerate(YOUNG):
            if i == j: continue
            wrong = [y for y in youngs if y not in (b1, b2)]; R.shuffle(wrong)
            add('analogy', 2, f'{a1.capitalize()} — {b1},\n{a2} — ?', [b2] + wrong[:2], 0, v=f'{a1.capitalize()} дегенге {b1} сәйкес келсе, {a2} дегенге не сәйкес келеді?', emo='🔗')
    PLACE = [('дәрігер', 'аурухана'), ('мұғалім', 'мектеп'), ('аспаз', 'асхана'), ('сатушы', 'дүкен'), ('кітапханашы', 'кітапхана'), ('ұшқыш', 'ұшақ'), ('ғарышкер', 'зымыран')]
    places = [p for _, p in PLACE]
    for i, (a1, b1) in enumerate(PLACE):
        for j, (a2, b2) in enumerate(PLACE):
            if i == j: continue
            wrong = [p for p in places if p not in (b1, b2)]; R.shuffle(wrong)
            add('analogy', 2, f'{a1.capitalize()} — {b1},\n{a2} — ?', [b2] + wrong[:2], 0, v=f'{a1.capitalize()} дегенге {b1} сәйкес келсе, {a2} дегенге не сәйкес келеді?', emo='🔗')
    PART = [('саусақ', 'қол'), ('бет', 'кітап'), ('дөңгелек', 'көлік'), ('жапырақ', 'ағаш'), ('минут', 'сағат'), ('күн', 'апта'), ('ай', 'жыл'), ('кірпіш', 'үй'), ('әріп', 'сөз'), ('сөз', 'сөйлем')]
    wholes = [w for _, w in PART]
    for i, (a1, b1) in enumerate(PART):
        for j, (a2, b2) in enumerate(PART):
            if i == j or b2 == a1 or b1 == a2: continue
            wrong = [w for w in wholes if w not in (b1, b2, a2)]; R.shuffle(wrong)
            add('analogy', 2, f'{a1.capitalize()} — {b1},\n{a2} — ?', [b2] + wrong[:2], 0, v=f'{a1.capitalize()} дегенге {b1} сәйкес келсе, {a2} дегенге не сәйкес келеді?', emo='🔗')

    # ---------- 5. odd one out (words) ----------
    CAT = {
        'fruit': ['алма', 'алмұрт', 'өрік', 'шие', 'банан', 'жүзім', 'апельсин', 'лимон', 'шабдалы'],
        'veg': ['сәбіз', 'картоп', 'пияз', 'қырыққабат', 'қияр', 'қызылша', 'сарымсақ'],
        'wild': ['қасқыр', 'түлкі', 'аю', 'жолбарыс', 'арыстан', 'піл', 'бұғы'],
        'home': ['сиыр', 'қой', 'ешкі', 'жылқы', 'түйе'],
        'bird': ['бүркіт', 'қарға', 'торғай', 'үкі', 'аққу', 'көгершін'],
        'fish': ['сазан', 'шортан', 'бекіре', 'алабұға'],
        'trans': ['автобус', 'трамвай', 'пойыз', 'ұшақ', 'кеме', 'велосипед'],
        'furn': ['үстел', 'орындық', 'шкаф', 'диван', 'кереует'],
        'instr': ['домбыра', 'қобыз', 'сыбызғы', 'скрипка', 'гитара', 'пианино'],
        'days': DAYS, 'months': MONTHS,
        'planet': ['Меркурий', 'Венера', 'Марс', 'Юпитер', 'Сатурн', 'Нептун'], 'notplanet': ['Ай', 'Күн'],
        'metal': ['алтын', 'күміс', 'мыс', 'темір', 'алюминий'], 'gas': ['оттегі', 'сутегі', 'азот'],
        'color': ['қызыл', 'көк', 'сары', 'жасыл', 'қара', 'ақ'], 'body': ['қол', 'аяқ', 'бас', 'көз', 'құлақ', 'мұрын'],
    }
    PAIRS = [('fruit', 'veg', 1), ('veg', 'fruit', 1), ('wild', 'home', 2), ('home', 'wild', 2), ('bird', 'fish', 1), ('fish', 'bird', 2),
             ('trans', 'furn', 1), ('furn', 'trans', 1), ('instr', 'trans', 2), ('days', 'months', 1), ('months', 'days', 1),
             ('planet', 'notplanet', 3), ('metal', 'gas', 2), ('color', 'body', 1)]
    TRICK = [('fish', ['кит', 'дельфин'], 3), ('bird', ['жарқанат'], 3), ('planet', ['Ай', 'Күн'], 3)]
    for _ in range(800):
        main, odds, lvl = R.choice(TRICK)
        three = R.sample(CAT[main], 3); x = R.choice(odds); shown = three + [x]; R.shuffle(shown)
        add('oddword', lvl, f'Қайсысы артық?\n{", ".join(shown)}', [x] + R.sample(three, 2), 0, emo='🔍')
    for _ in range(6000):
        main, odd, lvl = R.choice(PAIRS)
        three = R.sample(CAT[main], 3); x = R.choice(CAT[odd])
        shown = three + [x]; R.shuffle(shown)
        o = [x] + R.sample(three, 2)
        add('oddword', lvl, f'Қайсысы артық?\n{", ".join(shown)}', o, 0, emo='🔍')

    # ---------- 6. odd one out (numbers) ----------
    SQ = [n * n for n in range(2, 13)]
    PR = [p for p in range(2, 60) if all(p % d for d in range(2, int(p ** .5) + 1))]
    for _ in range(4000):
        kind = R.choice((0, 1, 1))
        if kind == 0:   # three squares + one non-square
            three = R.sample(SQ[:6], 3); x = R.choice([n for n in range(10, 140) if n not in SQ and min(abs(n - s) for s in three) < 12]); lvl = 3
        elif kind == 1:  # multiples of 5 + one not
            three = R.sample(range(10, 100, 5), 3); x = R.choice([n for n in range(11, 99) if n % 5 and min(abs(n - s) for s in three) < 8]); lvl = 2
        elif kind == 2:  # primes + one composite odd
            three = R.sample([p for p in PR if p > 10], 3); x = R.choice([9, 15, 21, 27, 33, 35, 39, 45, 49, 51, 57]); lvl = 3
        else:            # multiples of 3 + one not
            three = R.sample(range(12, 99, 3), 3); x = R.choice([n for n in range(11, 99) if n % 3 and min(abs(n - s) for s in three) < 6]); lvl = 2
        if x in three: continue
        shown = sorted(three + [x])
        o = [x] + R.sample(three, 2)
        add('oddnum', lvl, f'Қай сан артық?\n{", ".join(map(str, shown))}', o, 0,
            v=f'Қай сан артық: {", ".join(kz(n) for n in shown)}?', av=kz(x), emo='🔍')

    # ---------- 7. missing number ----------
    for a in range(3, 13):
        for b in range(3, 13):
            r = a * b
            add('missing', 2, f'? × {b} = {r}', [a, a + 1, a - 1 if a > 3 else a + 2], 0, v=f'Қандай санды {dat(kz(b))} көбейтсе, {kz(r)} шығады?', av=kz(a), emo='❓')
            add('missing', 2, f'{r} ÷ ? = {a}', [b, b + 1, b - 1 if b > 3 else b + 2], 0, v=f'{kz(r)} санын қандай санға бөлсе, {kz(a)} шығады?', av=kz(b), emo='❓')

    # ---------- 8. clock ----------
    for _ in range(3000):
        h, m = R.randint(1, 11), R.choice(range(0, 60, 5)); add_m = R.choice([35, 40, 45, 50, 55, 70])
        t = h * 60 + m + add_m; H, M = (t // 60 - 1) % 12 + 1, t % 60
        f = lambda hh, mm: f'{hh}:{mm:02d}'
        w1 = f(H, (M + 10) % 60); w2 = f((H - 2) % 12 + 1, M)
        if len({f(H, M), w1, w2}) < 3: continue
        add('clock', 2 if add_m < 60 else 3, f'Қазір сағат {f(h, m)}.\n{add_m} минуттан кейін\nсағат неше?', [f(H, M), w1, w2], 0,
            v=f'Қазір сағат {kz(h)}{" " + kz(m) if m else ""}. {kz(add_m)} минуттан кейін сағат неше болады?', av=f'{kz(H)}{" " + kz(M) if M else ""}', emo='🕰️')
    for h in (3, 6, 9):
        ang = min(30 * h, 360 - 30 * h)
        w = sorted({ang + 30, abs(ang - 30) or 45, ang + 60, ang * 2} - {ang, 0})[:2]
        add('clock', 3, f'Сағат {h}:00-де сағат тілдерінің\nарасындағы бұрыш қанша?', [f'{ang}°'] + [f'{x}°' for x in w], 0,
            v=f'Сағат {loc(kz(h))} сағат тілдерінің арасындағы бұрыш неше градус?', av=f'{kz(ang)} градус', emo='🕰️')

    # ---------- 9. which is more (units) ----------
    U = [  # (big unit, factor to small, small unit)
        ('тәулік', 24, 'сағат'), ('сағат', 60, 'минут'), ('апта', 7, 'күн'), ('минут', 60, 'секунд'),
        ('км', 1000, 'метр'), ('кг', 1000, 'грамм'), ('метр', 100, 'см'), ('жыл', 12, 'ай')]
    for big, f, small in U:
        if big in ('км', 'жыл', 'минут'): continue
        for n in range(2, 6):
            for delta in (-3, -2, -1, 0, 1, 2) if f < 100 else (-200, -100, 0, 100, 200):
                s = n * f + delta * (1 if f < 100 else 1)
                if s <= 0: continue
                if f >= 100 and s % 50: continue
                A, B = f'{n} {big}', f'{s} {small}'
                ans = A if n * f > s else B if s > n * f else 'Бірдей'
                o = [ans] + [x for x in (A, B, 'Бірдей') if x != ans]
                add('bigger', 3 if delta in (-1, 1, 0, -100, 100) else 2, f'Қайсысы көп:\n{A} әлде {B}?', o, 0,
                    v=f'Қайсысы көп: {qp(kz(n) + " " + SPOKEN_UNIT.get(big, big))}, әлде {qp(kz(s) + " " + SPOKEN_UNIT.get(small, small))}?', av=(ans if ans == 'Бірдей' else (kz(n) + ' ' + SPOKEN_UNIT.get(big, big) if ans == A else kz(s) + ' ' + SPOKEN_UNIT.get(small, small))), emo='⚖️')

    # ---------- 10. classic trick riddles (comment questions) ----------
    RI = '🕵️'
    for n in range(3, 10):
        add('riddle', 3, f'Отбасында {n} ұл бар. Әр ұлдың\nбір қарындасы бар. Отбасында\nбарлығы неше бала?', [n + 1, 2 * n, n], 0,
            v=f'Отбасында {kz(n)} ұл бар. Әр ұлдың бір қарындасы бар. Отбасында барлығы неше бала?', av=kz(n + 1), emo=RI)
    for n in (5, 6, 7, 8, 10, 12, 15):
        for k in range(2, n - 1):
            add('riddle', 3, f'Себетте {n} алма бар. Сіз\nоның {dsuf(k, kz, acc3)} алдыңыз. Сізде\nнеше алма бар?', [k, n - k, n], 0,
                v=f'Себетте {kz(n)} алма бар. Сіз оның {acc3(kz(k))} алдыңыз. Сізде неше алма бар?', av=kz(k), emo=RI)
    for m in (3, 4, 5, 6, 7, 8, 10):
        for e in (3, 4, 5, 6):
            add('riddle', 3, f'Бір жұмыртқа {m} минутта піседі.\n{e} жұмыртқа бірге қанша\nминутта піседі?', [m, m * e, m + e], 0,
                v=f'Бір жұмыртқа {kz(m)} минутта піседі. {kz(e)} жұмыртқа бірге қанша минутта піседі?', av=f'{kz(m)} минутта', emo=RI)
    for c in (3, 4, 5, 6, 7):
        for big in (30, 50, 100):
            add('riddle', 3, f'{c} мысық {c} тышқанды {c} минутта\nұстайды. {big} мысық {big} тышқанды\nқанша минутта ұстайды?', [c, big, big // c if big // c != c else c + 1], 0,
                v=f'{kz(c)} мысық {kz(c)} тышқанды {kz(c)} минутта ұстайды. {kz(big)} мысық {kz(big)} тышқанды қанша минутта ұстайды?', av=f'{kz(c)} минутта', emo=RI)
    for n in range(11, 30):
        for k in range(5, n - 2):
            if R.random() > .25: continue
            add('riddle', 3, f'Шопанның {n} қойы бар.\n{dsuf(k, kz, abl3)} басқасы қашып кетті.\nНеше қой қалды?', [k, n - k, n], 0,
                v=f'Шопанның {kz(n)} қойы бар. {abl3(kz(k))} басқасы қашып кетті. Неше қой қалды?', av=kz(k), emo=RI)
    for pos in (2, 3, 4, 5):
        add('riddle', 3, f'Жарыста {pos}-орындағы\nжүгірушіні озып кеттіңіз.\nЕнді нешінші орындасыз?', [f'{pos}-орын', f'{pos - 1}-орын', f'{pos + 1}-орын'], 0,
            v=f'Жарыста {ordw(kz(pos))} орындағы жүгірушіні озып кеттіңіз. Енді нешінші орындасыз?', av=f'{ordw(kz(pos))} орын', emo=RI)
    for kg in (1, 2, 3, 4, 5):
        add('riddle', 3, f'Кірпіш {kg} кг және тағы жарты\nкірпішке тең. Бір кірпіш\nнеше кг?', [f'{2 * kg} кг', f'{kg * 1.5:g} кг'.replace('.', ','), f'{kg} кг'], 0,
            v=f'Кірпіш {kz(kg)} килограмм және тағы жарты кірпішке тең. Бір кірпіш неше килограмм?', av=f'{kz(2 * kg)} килограмм', emo=RI)
    for n in range(3, 11):
        add('riddle', 3, f'Бөренені {n} бөлікке бөлу үшін\nнеше рет кесу керек?', [n - 1, n, n + 1], 0,
            v=f'Бөренені {kz(n)} бөлікке бөлу үшін неше рет кесу керек?', av=f'{kz(n - 1)} рет', emo=RI)
    for d in range(10, 61, 2):
        add('riddle', 3, f'Тоғандағы балдыр күн сайын\n2 есе көбейеді. {d}-күні тоған толық\nжабылды. Жартысы қай күні жабылды?', [d - 1, d // 2, d - 2], 0,
            v=f'Тоғандағы балдыр күн сайын екі есе көбейеді. {ordw(kz(d))} күні тоған толық жабылды. Тоғанның жартысы қай күні жабылды?', av=f'{ordw(kz(d - 1))} күні', emo=RI)
    for b in range(1, 5):
        for s in range(1, 5):
            add('riddle', 3, f'Менің {b} ағам және {s} әпкем бар.\nОтбасымызда барлығы\nнеше бала?', [b + s + 1, b + s, b + s + 2], 0,
                v=f'Менің {kz(b)} ағам және {kz(s)} әпкем бар. Отбасымызда барлығы неше бала?', av=kz(b + s + 1), emo=RI)
    for w, b in ((10, 10), (5, 7), (12, 3), (20, 20), (6, 9)):
        add('riddle', 3, f'Жәшікте {w} ақ, {b} қара шұлық бар.\nҚарамай алып, бір түсті жұп болу\nүшін ең кемі неше шұлық алу керек?', [3, 2, min(w, b) + 1], 0,
            v=f'Жәшікте {kz(w)} ақ, {kz(b)} қара шұлық бар. Қарамай алып, бір түсті жұп болу үшін ең кемі неше шұлық алу керек?', av='үш', emo=RI)
    add('riddle', 3, 'Бір жылда неше айда\n28 күн бар?', [12, 1, 4], 0, av='он екі айда', emo=RI)
    add('riddle', 3, 'Бөлменің 4 бұрышында бір-бір мысық\nотыр. Әр мысықтың алдында 3 мысық\nотыр. Бөлмеде неше мысық бар?', [4, 16, 12], 0, av='төрт', emo=RI)

    # ---------- 11. price puzzle (bat-and-ball) ----------
    ITEMS = [('Кітап', 'қалам', 'қаламнан', 'Қалам'), ('Торт', 'шырын', 'шырыннан', 'Шырын'), ('Көйлек', 'белбеу', 'белбеуден', 'Белбеу'),
             ('Сағат', 'бау', 'баудан', 'Бау'), ('Сөмке', 'кілтқап', 'кілтқаптан', 'Кілтқап'), ('Доп', 'насос', 'насостан', 'Насос')]
    for big, small, small_abl, Small in ITEMS:
        for D in (100, 1000):
            for c in (50, 100):
                T = D + 2 * c
                add('price', 3, f'{big} мен {small} бірге {T} ₸.\n{big} {small_abl} {D} ₸ қымбат.\n{Small} қанша тұрады?', [f'{c} ₸', f'{T - D} ₸', f'{c + 50} ₸' if c + 50 != T - D else f'{c + 100} ₸'], 0,
                    v=f'{big} мен {small} бірге {kz(T)} теңге. {big} {small_abl} {kz(D)} теңге қымбат. {Small} қанша тұрады?', av=f'{kz(c)} теңге', emo='💰')

    # ---------- 12. ages ----------
    for M in (24, 25, 27, 28, 30, 32, 35, 36, 40):
        for d in range(2, 6):
            if M % d or M - d < 18: continue
            k = M // d
            if k > 8: continue
            for f in (d + 1, d + 2, 2 * d):
                ans, trap = M + (f - d), k * f
                if trap == ans or ans > 80: continue
                add('age', 3, f'Ана {M} жаста, қызы {d} жаста.\nҚызы {f} жаста болғанда,\nанасы неше жаста болады?', [ans, trap, ans + 2], 0,
                    v=f'Ана {kz(M)} жаста, қызы {kz(d)} жаста. Қызы {kz(f)} жаста болғанда, анасы неше жаста болады?', av=kz(ans), emo='🎂')
    for A in range(8, 15):
        for diff in (2, 3, 4, 5):
            for yrs in (5, 10, 20):
                add('age', 2, f'{A} жастағы Әлия інісінен {diff} жас\nүлкен. {yrs} жылдан кейін олардың\nжас айырмасы қанша болады?', [diff, diff + yrs, yrs], 0,
                    v=f'{kz(A)} жастағы Әлия інісінен {kz(diff)} жас үлкен. {kz(yrs)} жылдан кейін олардың жас айырмасы қанша болады?', av=f'{kz(diff)} жас', emo='🎂')
