"""Render each frame of an .excalidraw scene to SVG for a visual check (an approximation, not Excalidraw).
Usage: render.py scene.excalidraw outdir [frame index ...]   env TILE=1300 for zoomed square tiles.
The canvas is padded to a square because qlmanage crops non-square SVGs when it makes thumbnails."""
import json, sys, html, math, os

FF = {2: 'Helvetica, Arial, sans-serif', 3: 'Menlo, Courier, monospace'}
DASH = {'solid': None, 'dashed': '12 9', 'dotted': '3 8'}


def esc(s):
    return html.escape(s, quote=True)


def render(scene, outdir, only=None, tile=None):
    els = scene['elements']
    frames = [e for e in els if e['type'] == 'frame']
    os.makedirs(outdir, exist_ok=True)
    paths = []
    for k, fr in enumerate(frames):
        if only is not None and k not in only:
            continue
        ox, oy, W, H = fr['x'], fr['y'], fr['width'], fr['height']
        S = max(W, H + 60)
        vb = (0, -60, S, S)
        if tile:
            vb = tile
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{vb[2]}" height="{vb[3]}" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}">',
               f'<rect x="{vb[0]}" y="{vb[1]}" width="{vb[2]}" height="{vb[3]}" fill="#ffffff"/>',
               f'<rect x="1" y="1" width="{W - 2}" height="{H - 2}" fill="none" stroke="#868e96" stroke-width="2"/>',
               f'<text x="0" y="-18" font-size="40" font-family="{FF[2]}" fill="#1e1e1e">{esc(fr["name"])}</text>']
        for e in els:
            if e.get('frameId') != fr['id']:
                continue
            x, y = e['x'] - ox, e['y'] - oy
            t = e['type']
            op = e.get('opacity', 100) / 100
            dash = DASH.get(e.get('strokeStyle', 'solid'))
            da = f' stroke-dasharray="{dash}"' if dash else ''
            if t == 'rectangle':
                bg = e['backgroundColor']
                fill = 'none' if bg == 'transparent' else bg
                out.append(f'<rect x="{x}" y="{y}" width="{e["width"]}" height="{e["height"]}" rx="14" fill="{fill}" '
                           f'stroke="{e["strokeColor"]}" stroke-width="{e["strokeWidth"]}"{da} opacity="{op}"/>')
            elif t == 'text':
                fs = e['fontSize']
                lines = e['text'].split('\n')
                anchor = {'left': 'start', 'center': 'middle', 'right': 'end'}[e['textAlign']]
                tx = x if anchor == 'start' else (x + e['width'] / 2 if anchor == 'middle' else x + e['width'])
                if e.get('containerId'):
                    wpx = max(len(l) for l in lines) * fs * 0.55 + 10
                    out.append(f'<rect x="{x + e["width"] / 2 - wpx / 2}" y="{y}" width="{wpx}" height="{len(lines) * fs * 1.25}" fill="#ffffff"/>')
                for i, ln in enumerate(lines):
                    out.append(f'<text x="{tx}" y="{y + i * fs * 1.25 + fs * 0.9}" font-size="{fs}" font-family="{FF[e["fontFamily"]]}" '
                               f'fill="{e["strokeColor"]}" text-anchor="{anchor}" xml:space="preserve">{esc(ln)}</text>')
            elif t in ('arrow', 'line'):
                pts = [(x + p[0], y + p[1]) for p in e['points']]
                out.append('<polyline points="' + ' '.join(f'{a},{b}' for a, b in pts) +
                           f'" fill="none" stroke="{e["strokeColor"]}" stroke-width="{e["strokeWidth"]}"{da} stroke-linejoin="round"/>')

                def head(p, q):
                    ang = math.atan2(q[1] - p[1], q[0] - p[0])
                    L = 18
                    a1 = (q[0] - L * math.cos(ang - 0.4), q[1] - L * math.sin(ang - 0.4))
                    a2 = (q[0] - L * math.cos(ang + 0.4), q[1] - L * math.sin(ang + 0.4))
                    return f'<polygon points="{q[0]},{q[1]} {a1[0]},{a1[1]} {a2[0]},{a2[1]}" fill="{e["strokeColor"]}"/>'
                if t == 'arrow' and e.get('endArrowhead'):
                    out.append(head(pts[-2], pts[-1]))
                if t == 'arrow' and e.get('startArrowhead'):
                    out.append(head(pts[1], pts[0]))
        out.append('</svg>')
        p = os.path.join(outdir, f'frame{k:02d}' + (f'_{tile[0]}_{tile[1]}' if tile else '') + '.svg')
        open(p, 'w').write('\n'.join(out))
        paths.append(p)
    return paths


if __name__ == '__main__':
    sc = json.load(open(sys.argv[1]))
    only = [int(a) for a in sys.argv[3:]] or None
    if os.environ.get('TILE'):
        T = int(os.environ['TILE'])
        for k, fr in enumerate([e for e in sc['elements'] if e['type'] == 'frame']):
            if only is not None and k not in only:
                continue
            for ty in range(-60, int(fr['height']), T - 100):
                for tx in range(0, int(fr['width']), T - 100):
                    for p in render(sc, sys.argv[2], [k], (tx, ty, T, T)):
                        print(p)
    else:
        for p in render(sc, sys.argv[2], only):
            print(p)
