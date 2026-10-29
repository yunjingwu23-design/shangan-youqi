"""Rebuild vendored 400-weight WOFF2 fragments after npm ci (Python 3 stdlib only)."""
from pathlib import Path
import json
import re
import shutil

project = Path(__file__).resolve().parents[1]
manifest = {}
for kind, name in [('sans', 'noto-sans-sc'), ('serif', 'noto-serif-sc')]:
    source = project / 'node_modules' / '@fontsource' / name
    target = project / 'public' / 'fonts' / kind
    target.mkdir(parents=True, exist_ok=True)
    faces = []
    for block in re.findall(r'@font-face\s*\{(.*?)\}', (source / '400.css').read_text(), re.S):
        filename = re.search(r'url\(\./files/([^)]*\.woff2)\)', block).group(1)
        unicode_range = re.search(r'unicode-range:\s*([^;]+)', block).group(1)
        ranges = []
        for token in unicode_range.split(','):
            limits = token.strip().removeprefix('U+').split('-')
            ranges.append([int(limits[0], 16), int(limits[-1], 16)])
        shutil.copy2(source / 'files' / filename, target / filename)
        faces.append({'file': kind + '/' + filename, 'unicode': unicode_range, 'ranges': ranges})
    shutil.copy2(source / 'LICENSE', target.parent / (kind + '-LICENSE.txt'))
    manifest[kind] = faces
(project / 'src/lib/resume/font-manifest.json').write_text(json.dumps(manifest, separators=(',', ':')) + '\n')
print('Prepared', sum(len(faces) for faces in manifest.values()), 'licensed font fragments.')
