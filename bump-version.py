#!/usr/bin/env python3
"""ใส่เลขเวอร์ชันท้ายชื่อไฟล์ CSS/JS ให้เบราว์เซอร์โหลดไฟล์ใหม่ทุกครั้งที่อัปเดตเว็บ รัน: python bump-version.py"""
import re, time
v = time.strftime('%Y%m%d%H%M')
edits = {
    'index.html': [(r'href="style\.css(\?v=\w+)?"', f'href="style.css?v={v}"'), (r'src="js/app\.js(\?v=\w+)?"', f'src="js/app.js?v={v}"')],
    'js/app.js': [(r"'\./fit\.js(\?v=\w+)?'", f"'./fit.js?v={v}'"), (r"'\./backend\.js(\?v=\w+)?'", f"'./backend.js?v={v}'")],
    'js/backend.js': [(r"'\./firebase-config\.js(\?v=\w+)?'", f"'./firebase-config.js?v={v}'")],
}
for path, subs in edits.items():
    s = open(path, encoding='utf-8').read()
    for pat, rep in subs:
        s, n = re.subn(pat, rep, s)
        assert n, (path, pat)
    open(path, 'w', encoding='utf-8').write(s)
print('version', v)
