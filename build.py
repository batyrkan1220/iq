#!/usr/bin/env python3
"""Собирает index.html из исходников в src/ (template.html + gen.js + i18n.js + app.js)."""
from pathlib import Path
src = Path(__file__).parent / "src"
t = (src / "template.html").read_text(encoding="utf-8")
g = (src / "gen.js").read_text(encoding="utf-8").replace(
    "if(typeof module!=='undefined')module.exports={buildQuestions,FAM};", "")
app = (src / "i18n.js").read_text(encoding="utf-8") + "\n" + (src / "app.js").read_text(encoding="utf-8")
out = t.replace("/*GEN*/", g).replace("/*APP*/", app)
(Path(__file__).parent / "index.html").write_text(out, encoding="utf-8")
for d in ("kz", "ru"):
    p = Path(__file__).parent / d
    p.mkdir(exist_ok=True)
    (p / "index.html").write_text(out, encoding="utf-8")
print("index.html, kz/index.html, ru/index.html собраны:", len(out), "байт")
