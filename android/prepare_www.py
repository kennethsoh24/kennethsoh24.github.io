# Assemble the offline web game into app/src/main/assets/www (run from the repo root in CI)
import os, re, shutil, subprocess, urllib.request
SRC = 'chess'; OUT = 'android/app/src/main/assets/www'; T = 'node_modules/three'
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
for f in ['index.html', 'engine.js', 'mechrig.js']: shutil.copy(f'{SRC}/{f}', f'{OUT}/{f}')
shutil.copytree(f'{SRC}/models', f'{OUT}/models')
os.makedirs(f'{OUT}/assets'); os.makedirs(f'{OUT}/music')
skip = {'keyart_moon.jpg', 'keyart_ops.jpg', 'keyart_strand.jpg', 'intro_moon.mp4'}   # editions the app does not ship
for f in os.listdir(f'{SRC}/assets'):
    if f not in skip: shutil.copy(f'{SRC}/assets/{f}', f'{OUT}/assets/{f}')
for f in os.listdir(f'{SRC}/music'):
    if f.startswith(('bw_', 'mono_')): shutil.copy(f'{SRC}/music/{f}', f'{OUT}/music/{f}')
# three.js + the addons it imports, served locally
os.makedirs(f'{OUT}/lib/three/build'); shutil.copy(f'{T}/build/three.module.js', f'{OUT}/lib/three/build/three.module.js')
html = open(f'{OUT}/index.html').read()
need, seen = set(re.findall(r"from 'three/addons/([^']+)'", html)), set()
while need:
    p = need.pop()
    if p in seen: continue
    seen.add(p)
    code = open(f'{T}/examples/jsm/{p}').read()
    for imp in re.findall(r"from\s+'(\.[^']+)'", code): need.add(os.path.normpath(os.path.join(os.path.dirname(p), imp)))
for p in seen:
    d = f'{OUT}/lib/three/examples/jsm/{p}'; os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy(f'{T}/examples/jsm/{p}', d)
html = re.sub(r'"three": "[^"]+"', '"three": "./lib/three/build/three.module.js"', html)
html = re.sub(r'"three/addons/": "[^"]+"', '"three/addons/": "./lib/three/examples/jsm/"', html)
# fonts: latin + latin-ext faces bundled locally
m = re.search(r'<link href="(https://fonts.googleapis.com/css2[^"]*)" rel="stylesheet">', html)
if m:
    req = urllib.request.Request(m.group(1).replace('&amp;', '&'), headers={'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36'})
    css = urllib.request.urlopen(req).read().decode()
    os.makedirs(f'{OUT}/fonts'); faces = []
    for name, block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
        if name not in ('latin', 'latin-ext'): continue
        u = re.search(r'url\((https://fonts.gstatic.com/[^)]+)\)', block).group(1); fn = 'f' + str(len(faces)) + '.woff2'
        urllib.request.urlretrieve(u, f'{OUT}/fonts/{fn}'); faces.append(block.replace(u, fn))
    open(f'{OUT}/fonts/fonts.css', 'w').write('\n'.join(faces))
    html = html.replace(m.group(0), '<link href="fonts/fonts.css" rel="stylesheet">')
    html = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', html)
assert 'cdn.jsdelivr' not in html
open(f'{OUT}/index.html', 'w').write(html)
print('www ready')
