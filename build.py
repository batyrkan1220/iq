#!/usr/bin/env python3
"""Собирает index.html из исходников в src/ (template.html + gen.js + i18n.js + track.js + vis.js + app.js)."""
from pathlib import Path
src = Path(__file__).parent / "src"
t = (src / "template.html").read_text(encoding="utf-8")
g = (src / "gen.js").read_text(encoding="utf-8").replace(
    "if(typeof module!=='undefined')module.exports={buildQuestions,FAM};", "")
app = (src / "i18n.js").read_text(encoding="utf-8") + "\n" + (src / "track.js").read_text(encoding="utf-8") + "\n" + (src / "vis.js").read_text(encoding="utf-8") + "\n" + (src / "qv2.js").read_text(encoding="utf-8") + "\n" + (src / "app.js").read_text(encoding="utf-8")
out = t.replace("/*GEN*/", g).replace("/*APP*/", app)
import re as _re
def _bake(m):
    tag, pre, kz, post, inner = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
    if ("<" + tag) in inner: return m.group(0)
    return "<%s%sdata-kz=\"%s\"%s>%s</%s>" % (tag, pre, kz, post, kz, tag)
_body = out.index("<body")
out = out[:_body] + _re.sub(r'<(\w+)([^<>]*?)data-kz="([^"]*)"([^<>]*)>(.*?)</\1>', _bake, out[_body:], flags=_re.S)
(Path(__file__).parent / "index.html").write_text(out, encoding="utf-8")
for d in ("kz",):
    p = Path(__file__).parent / d
    p.mkdir(exist_ok=True)
    (p / "index.html").write_text(out, encoding="utf-8")
print("index.html, kz/index.html, ru/index.html собраны:", len(out), "байт")
