#!/usr/bin/env python3
"""Rebuild locally hosted font subsets (optional tooling, not a build dependency).

Requires fonttools[woff], and Debian fonts-noto-core/fonts-noto-cjk. Run from repo root.
The CJK subsets cover all current Chinese text; OS fonts handle other characters.
Myanmar retains every glyph and shaping table, avoiding combining-mark loss.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/fonts'
OUTPUT.mkdir(parents=True, exist_ok=True)
text = ''.join(path.read_text() for folder in ['src', 'data/words']
               for path in (ROOT / folder).rglob('*')
               if path.suffix in ['.astro', '.js', '.mjs', '.json'])
characters = sorted({ord(c) for c in text} | set(range(0x20, 0x250)))
for weight in ['Regular', 'Bold']:
    # Full Myanmar font, including GSUB/GPOS shaping and all Myanmar extensions.
    font = TTFont(f'/usr/share/fonts/truetype/noto/NotoSansMyanmar-{weight}.ttf')
    font.flavor = 'woff2'
    font.save(OUTPUT / f'myanmar-{weight.lower()}.woff2')
    for script, number in [('sc', 2), ('tc', 3)]:
        font = TTFont(f'/usr/share/fonts/opentype/noto/NotoSansCJK-{weight}.ttc', fontNumber=number)
        options = subset.Options()
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.name_legacy = True
        options.name_languages = ['*']
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=characters)
        subsetter.subset(font)
        # Identify these modified, content-specific subsets distinctly.
        family = f'HSK CJK {script.upper()}'
        for record in font['name'].names:
            value = {1: family, 2: weight, 3: f'{family}-{weight}',
                     4: f'{family} {weight}', 6: f'HSKCJK{script.upper()}-{weight}',
                     16: family, 17: weight}.get(record.nameID)
            if value:
                record.string = value.encode(record.getEncoding())
        font.flavor = 'woff2'
        font.save(OUTPUT / f'cjk-{script}-{weight.lower()}.woff2')
        print(f'{script} {weight}: {len(font.getBestCmap())} codepoints')
