import re,sys,json
import os
S=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + os.sep  # store/
def section(txt,head):
    m=re.search(r'^## '+re.escape(head)+r'.*?\n(.*?)(?=^## |\Z)',txt,re.S|re.M)
    return m.group(1).strip('\n').strip()
def parse(lang):
    filename = 'listing.md' if lang in ('en', 'en-US') else f'listing.{lang}.md'
    t=open(S+filename,encoding='utf-8').read()
    sub=re.search(r'^\*\*Subtitle \(30\):\*\* (.*)$',t,re.M).group(1).strip()
    promo=section(t,'Promotional text')
    desc=section(t,'Description')
    kw=section(t,'Keywords').splitlines()[0].strip()
    return t,sub,promo,desc,kw
banned=r'for kids|para niños|pour enfants|für kinder|para crianças|子ども向け|子供向け|#1|best|mejor|meilleur|beste|melhor|最高|No\.1|free|gratis|gratuit|kostenlos|grátis|無料|\$|€|¥|sale|oferta|promo|hurry|limited|limitad|limité|begrenzt|jetzt|\bnow\b|ahora|maintenant|agora|今すぐ|期間限定'
langs = sys.argv[1:] or ["en", "es", "fr", "de", "pt", "ja"]
failed = False
for lang in langs:
    t,sub,promo,desc,kw=parse(lang)
    print(f'== {lang}')
    print(f'  subtitle {len(sub)} chars: {sub!r}')
    print(f'  promo {len(promo)} chars')
    print(f'  desc {len(desc)} chars')
    kb=len(kw.encode("utf-8"))
    terms=kw.split(',')
    print(f'  keywords {kb} bytes, {len(terms)} terms, spaces={" " in kw}')
    short=[x for x in terms if len(x)<=2]
    if short: print('  short terms:',short)
    dup=[x for x in terms if x.lower() in (sub+' comet garden').lower()]
    if dup: print('  KW in name/subtitle:',dup)
    for name,txt in [('sub',sub),('promo',promo),('desc',desc),('kw',kw)]:
        for m in re.finditer(banned,txt,re.I):
            print('  BANNED?',name,repr(txt[max(0,m.start()-20):m.end()+20]))
    ok = len(sub)<=30 and len(promo)<=170 and len(desc)<=4000 and kb<=100
    print('  OK' if ok else '  OVER LIMIT')
    failed |= not ok
sys.exit(1 if failed else 0)
