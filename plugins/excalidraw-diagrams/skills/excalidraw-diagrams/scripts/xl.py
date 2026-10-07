"""Excalidraw scene builder with layout checks.

Build frames in frame-local coordinates (every frame starts at 0,0). finalize() places the
frames in a grid. check() fails the build on overlaps, text that does not fit, arrows that
cross unrelated boxes, labels that hit boxes, fonts under 16 px, and banned characters.

Frame API (all coordinates local to the frame):
  doc = Doc(); f = doc.frame('1 Name')            frame title is its name
  f.header('Question this frame answers')
  z = f.zone(x, y, w, h, 'Title', tier, sub=None)  background group; call f.zone_h(z, h) once content is placed
  n = f.node(x, y, w, tier, 'Title', 'mono detail', tag=PRO, style='solid'|'dashed', h=None)
  ns = f.row(x, y, gap, [dict(w=, tier=, title=, detail=, tag=)])      equal heights, uniform gap
  ns = f.rowx(y, [dict(x=, w=, ...)])                                  equal heights, free x
  f.arrow(a, b, 'r', 'l', kind='data'|'ctl'|'plan'|'drop', label='text', mid=, via=, oa=, ob=, head='end'|'both')
  f.horiz(a, b) / f.vert(a, b) / f.vert_up(a, b)                       straight arrows between aligned boxes
  f.table(x, y, [(header, chars)], rows, tier, title)                  monospace table, one text per column
  f.pill(x, y, 'text', color) / f.badge(x, y, n) / f.text(x, y, s, fs=, font=, w=) / f.line(...)
  f.fit()                                                              set the frame height from content
"""
import json, random, re, math

random.seed(20261007)
SANS, MONO = 2, 3
CW = {SANS: 0.60, MONO: 0.62}  # conservative average glyph width per em
LH = 1.25
PAD = 16
INK, GREY, AMBER, GREEN, RED = '#1e1e1e', '#495057', '#e67700', '#2b8a3e', '#c92a2a'
# status tags: (text, color). Shown as the last line of a node.
DEC, PRO, TOA, OPN = ('decided', GREEN), ('proposed', AMBER), ('to assign', AMBER), ('open', RED)
LAT, PLN, VER, LIVE = ('later phase', '#6c757d'), ('planned', '#6c757d'), ('user-verify', AMBER), ('live', GREEN)

TIERS = {
    'ext':   ('#495057', '#f1f3f5'),
    'rtr':   ('#c92a2a', '#fff5f5'),
    'dmz':   ('#e8590c', '#fff4e6'),
    'apps':  ('#1971c2', '#e7f5ff'),
    'data':  ('#6741d9', '#f3f0ff'),
    'k8s':   ('#2f9e44', '#ebfbee'),
    'sto':   ('#0c8599', '#e3fafc'),
    'tool':  ('#a61e4d', '#fff0f6'),
    'phys':  ('#343a40', '#e9ecef'),
    'other': ('#868e96', '#f8f9fa'),
    'warn':  ('#e67700', '#fff3bf'),
    'white': ('#868e96', '#ffffff'),
    'prod':  ('#8d5524', '#f6eee7'),
}
KIND = {  # arrow style per meaning
    'data': ('#343a40', 'solid'),
    'ctl':  ('#1971c2', 'dashed'),
    'plan': ('#868e96', 'dotted'),
    'drop': ('#c92a2a', 'dashed'),
}
BAD = re.compile('[' + chr(0x2012) + '-' + chr(0x2015) + chr(0x2212) + chr(0x1F000) + '-' + chr(0x1FAFF)
                 + chr(0x2600) + '-' + chr(0x27BF) + chr(0x2B00) + '-' + chr(0x2BFF) + chr(0xFE0F) + ']')  # dashes and emoji
B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'


def idx(n):
    if n < 62:
        return 'a' + B62[n]
    n -= 62
    return 'b' + B62[n // 62] + B62[n % 62]


def tw(s, fs, font):
    return len(s) * fs * CW[font]


def wrap(s, maxpx, fs, font):
    maxc = int(maxpx // (fs * CW[font]))
    out = []
    for para in s.split('\n'):
        line = ''
        for w in para.split(' '):
            if len(w) > maxc:
                raise ValueError(f'word {w!r} longer than {maxc} chars ({maxpx}px, {fs}px)')
            cand = (line + ' ' + w) if line else w
            if len(cand) <= maxc:
                line = cand
            else:
                out.append(line)
                line = w
        out.append(line)
    return out


class Doc:
    def __init__(self):
        self.els, self.ids, self.frames, self.errors = [], set(), [], []

    def nid(self):
        while True:
            i = ''.join(random.choices('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=8))
            if i not in self.ids:
                self.ids.add(i)
                return i

    def base(self, typ, x, y, w, h, **kw):
        el = dict(id=self.nid(), type=typ, x=x, y=y, width=w, height=h, angle=0, strokeColor=INK,
                  backgroundColor='transparent', fillStyle='solid', strokeWidth=2, strokeStyle='solid',
                  roughness=0, opacity=100, groupIds=[], frameId=None, roundness=None,
                  seed=random.randint(1, 2**31 - 1), version=1, versionNonce=random.randint(1, 2**31 - 1),
                  isDeleted=False, boundElements=[], updated=1790000000000, link=None, locked=False)
        el.update(kw)
        el['index'] = idx(len(self.els))
        self.els.append(el)
        return el

    def err(self, msg):
        self.errors.append(msg)

    def frame(self, name, w=2400):
        f = Frame(self, name, w)
        self.frames.append(f)
        return f


class Node:
    def __init__(self, fr, el, x, y, w, h, name):
        self.fr, self.el, self.id, self.x, self.y, self.w, self.h, self.name = fr, el, el['id'], x, y, w, h, name

    def side(self, s, o=0.5):
        if s == 'r': return (self.x + self.w, self.y + self.h * o)
        if s == 'l': return (self.x, self.y + self.h * o)
        if s == 't': return (self.x + self.w * o, self.y)
        if s == 'b': return (self.x + self.w * o, self.y + self.h)
        raise ValueError(s)

    @property
    def cx(self): return self.x + self.w / 2
    @property
    def cy(self): return self.y + self.h / 2
    @property
    def r(self): return self.x + self.w
    @property
    def b(self): return self.y + self.h


class Frame:
    def __init__(self, doc, name, w):
        self.doc, self.name, self.w, self.h = doc, name, w, 400
        self.el = doc.base('frame', 0, 0, w, 400, strokeColor='#868e96', strokeWidth=2, name=name)
        self.id = self.el['id']
        self.nodes, self.zones, self.texts, self.arrows, self.labels = [], [], [], [], []
        self.members = []
        self.gseq = 0

    # ---- primitives -------------------------------------------------
    def _mk(self, typ, x, y, w, h, **kw):
        el = self.doc.base(typ, x, y, w, h, frameId=self.id, **kw)
        self.members.append(el)
        return el

    def text(self, x, y, s, fs=16, font=SANS, color=INK, align='left', w=None, owner=None, group=None, bound=None):
        if isinstance(s, str):
            lines = wrap(s, w, fs, font) if w else s.split('\n')
        else:
            lines = list(s)
        if fs < 16:
            self.doc.err(f'[{self.name}] font {fs}px < 16: {lines[0]!r}')
        for ln in lines:
            if BAD.search(ln):
                self.doc.err(f'[{self.name}] banned char in {ln!r}')
        est = max(tw(ln, fs, font) for ln in lines)
        width = w if w else est
        h = len(lines) * fs * LH
        txt = '\n'.join(lines)
        el = self._mk('text', x, y, width, h, strokeColor=color, text=txt, fontSize=fs, fontFamily=font,
                      textAlign=align, verticalAlign='top', containerId=bound, originalText=txt,
                      autoResize=False, lineHeight=LH, groupIds=[group] if group else [])
        self.texts.append(dict(id=el['id'], x=x, y=y, w=width, h=h, est=est, s=txt, owner=owner, bound=bound))
        return el

    def header(self, question):
        self.text(60, 40, 'Question: ' + question, fs=24, color=GREY, w=self.w - 120, owner='frame')

    def gid(self):
        self.gseq += 1
        return f'g{self.doc.nid()}'

    def zone(self, x, y, w, h, title, tier, sub=None, style='solid'):
        st, bg = TIERS[tier]
        el = self._mk('rectangle', x, y, w, h, strokeColor=st, backgroundColor=bg, strokeStyle=style,
                      roundness={'type': 3}, opacity=60)
        zid = el['id']
        self.zones.append(dict(id=zid, x=x, y=y, w=w, h=h, name=title))
        self.text(x + PAD, y + 12, title, fs=22, color=st, owner=zid, w=w - 2 * PAD)
        if sub:
            self.text(x + PAD, y + 12 + 22 * LH + 2, sub, fs=16, font=MONO, color=GREY, owner=zid, w=w - 2 * PAD)
        return dict(id=zid, x=x, y=y, w=w, h=h)

    def zone_h(self, z, h):
        z['h'] = h
        for zz in self.zones:
            if zz['id'] == z['id']:
                zz['h'] = h
        for el in self.members:
            if el['id'] == z['id']:
                el['height'] = h

    def measure(self, w, title, detail=None, tag=None, fs_t=20, fs_d=16):
        inner = w - 2 * PAD
        tl = wrap(title, inner, fs_t, SANS) if title else []
        dl = wrap(detail, inner, fs_d, MONO) if detail else []
        h = PAD + len(tl) * fs_t * LH
        if dl: h += 6 + len(dl) * fs_d * LH
        if tag: h += 6 + 16 * LH
        return h + PAD, tl, dl

    def node(self, x, y, w, tier, title, detail=None, tag=None, h=None, style='solid', align='left',
             fs_t=20, fs_d=16, name=None):
        st, bg = TIERS[tier]
        mh, tl, dl = self.measure(w, title, detail, tag, fs_t, fs_d)
        h = max(h or 0, mh)
        g = self.gid()
        el = self._mk('rectangle', x, y, w, h, strokeColor=st, backgroundColor=bg, strokeStyle=style,
                      roundness={'type': 3}, groupIds=[g], strokeWidth=3 if style == 'solid' else 2)
        n = Node(self, el, x, y, w, h, name or title)
        self.nodes.append(n)
        inner = w - 2 * PAD
        cy = y + PAD
        if tl:
            self.text(x + PAD, cy, tl, fs=fs_t, color=INK, align=align, w=inner, owner=n.id, group=g)
            cy += len(tl) * fs_t * LH
        if dl:
            cy += 6
            self.text(x + PAD, cy, dl, fs=fs_d, font=MONO, color='#343a40', align=align, w=inner, owner=n.id, group=g)
            cy += len(dl) * fs_d * LH
        if tag:
            cy += 6
            tt, tc = tag
            self.text(x + PAD, cy, tt, fs=16, color=tc, align=align, w=inner, owner=n.id, group=g)
        return n

    def row(self, x, y, gap, specs):
        """specs: dicts for node(); equal heights; returns nodes."""
        hs = [self.measure(s['w'], s['title'], s.get('detail'), s.get('tag'), s.get('fs_t', 20), s.get('fs_d', 16))[0] for s in specs]
        H = max(hs)
        out, cx = [], x
        for s in specs:
            s = dict(s)
            out.append(self.node(cx, y, h=H, **s))
            cx += s['w'] + gap
        return out

    def rowx(self, y, specs):
        """Row of nodes at free x positions (each spec has x and w); equal heights; returns nodes."""
        hs = [self.measure(s['w'], s['title'], s.get('detail'), s.get('tag'), s.get('fs_t', 20), s.get('fs_d', 16))[0] for s in specs]
        H = max(hs)
        return [self.node(s.pop('x'), y, h=H, **s) for s in [dict(sp) for sp in specs]]

    def vert_up(self, a, b, **kw):
        """Straight vertical arrow from the top of a to the bottom of b (b above a)."""
        lo, hi = max(a.x, b.x), min(a.r, b.r)
        if hi - lo < 4:
            raise ValueError(f'vert_up: no x overlap {a.name} / {b.name}')
        cx = (lo + hi) / 2
        return self.arrow(a, b, 't', 'b', oa=(cx - a.x) / a.w, ob=(cx - b.x) / b.w, **kw)

    def pill(self, x, y, s, color, w=None):
        w = w or int(tw(s, 16, SANS)) + 2 * PAD
        el = self._mk('rectangle', x, y, w, 16 * LH + 12, strokeColor=color, backgroundColor='#ffffff',
                      roundness={'type': 3}, strokeWidth=2)
        n = Node(self, el, x, y, w, 16 * LH + 12, s)
        self.nodes.append(n)
        self.text(x + PAD, y + 6, s, fs=16, color=color, owner=n.id, w=w - 2 * PAD, align='center')
        return n

    def badge(self, x, y, n_, tier='phys'):
        st, bg = TIERS[tier]
        el = self._mk('rectangle', x, y, 44, 44, strokeColor=st, backgroundColor=st, roundness={'type': 3})
        nd = Node(self, el, x, y, 44, 44, f'badge{n_}')
        self.nodes.append(nd)
        self.text(x, y + 10, str(n_), fs=20, color='#ffffff', align='center', w=44, owner=nd.id)
        return nd

    def line(self, x1, y1, x2, y2, color='#adb5bd', width=1, style='solid'):
        return self._mk('line', x1, y1, abs(x2 - x1), abs(y2 - y1), strokeColor=color, strokeWidth=width,
                        strokeStyle=style, points=[[0, 0], [x2 - x1, y2 - y1]], lastCommittedPoint=None,
                        startBinding=None, endBinding=None, startArrowhead=None, endArrowhead=None)

    def table(self, x, y, cols, rows, tier='other', title=None, fs=16, tcolor=None):
        """cols: [(header, chars)], rows: [[cell,...]]. One monospace text per column."""
        st, bg = TIERS[tier]
        cwpx = [c[1] * fs * CW[MONO] for c in cols]
        gap = 20
        wtot = sum(cwpx) + gap * (len(cols) + 1)
        lh = fs * LH
        wrapped = []
        for r in [[c[0] for c in cols]] + rows:
            cells = [wrap(str(v), cwpx[i], fs, MONO) for i, v in enumerate(r)]
            wrapped.append(cells)
        cy = y + 12
        title_h = 0
        if title:
            title_h = 22 * LH + 6
        body_h = 0
        for cells in wrapped:
            body_h += max(len(c) for c in cells) * lh + lh  # row + one separator line
        H = 12 + title_h + body_h + 6
        el = self._mk('rectangle', x, y, wtot, H, strokeColor=st, backgroundColor='#ffffff', roundness={'type': 3}, strokeWidth=2)
        tb = Node(self, el, x, y, wtot, H, title or 'table')
        self.nodes.append(tb)
        if title:
            self.text(x + gap, cy, title, fs=22, color=st, owner=tb.id, w=wtot - 2 * gap)
            cy += title_h
        # header strip
        hh = max(len(c) for c in wrapped[0]) * lh
        strip = self._mk('rectangle', x + 2, cy - 4, wtot - 4, hh + 8, strokeColor=bg, backgroundColor=bg, strokeWidth=1)
        # columns text
        colx = [x + gap + sum(cwpx[:i]) + gap * i for i in range(len(cols))]
        ycur = cy
        per_col = [[] for _ in cols]
        seps = []
        for ri, cells in enumerate(wrapped):
            nl = max(len(c) for c in cells)
            for ci, c in enumerate(cells):
                per_col[ci].extend(c + [''] * (nl - len(c)) + [''])
            ycur += nl * lh + lh
            if ri < len(wrapped) - 1:
                seps.append(ycur - lh / 2)
        for ci in range(len(cols)):
            lines = per_col[ci][:-1]
            self.text(colx[ci], cy, lines, fs=fs, font=MONO, color='#212529', owner=tb.id, w=cwpx[ci])
        for sy in seps:
            self.line(x + 8, sy, x + wtot - 8, sy, '#ced4da', 1)
        return tb

    # ---- arrows -----------------------------------------------------
    def arrow(self, a, b, sa='r', sb='l', mid=None, via=None, label=None, kind='data', oa=0.5, ob=0.5,
              head='end', color=None, lw=3, label_at=None):
        s = a.side(sa, oa)
        e = b.side(sb, ob)
        if via is not None:
            pts = [s] + list(via) + [e]
        else:
            hs, he = sa in 'lr', sb in 'lr'
            if hs and he:
                if abs(s[1] - e[1]) < 0.5:
                    pts = [s, e]
                else:
                    mx = mid if mid is not None else (s[0] + e[0]) / 2
                    pts = [s, (mx, s[1]), (mx, e[1]), e]
            elif not hs and not he:
                if abs(s[0] - e[0]) < 0.5:
                    pts = [s, e]
                else:
                    my = mid if mid is not None else (s[1] + e[1]) / 2
                    pts = [s, (s[0], my), (e[0], my), e]
            elif hs and not he:
                pts = [s, (e[0], s[1]), e]
            else:
                pts = [s, (s[0], e[1]), e]
        clean = [pts[0]]
        for p in pts[1:]:
            if abs(p[0] - clean[-1][0]) > 0.01 or abs(p[1] - clean[-1][1]) > 0.01:
                clean.append(p)
        pts = clean
        for p, q in zip(pts, pts[1:]):
            if abs(p[0] - q[0]) > 0.5 and abs(p[1] - q[1]) > 0.5:
                self.doc.err(f'[{self.name}] diagonal arrow segment {a.name} -> {b.name}: {p} {q}')
        col, st = KIND[kind]
        col = color or col
        minx, miny = min(p[0] for p in pts), min(p[1] for p in pts)
        maxx, maxy = max(p[0] for p in pts), max(p[1] for p in pts)
        rel = [[p[0] - pts[0][0], p[1] - pts[0][1]] for p in pts]

        def fp(n, pt):
            return [round(min(max((pt[0] - n.x) / n.w, 0), 1), 4), round(min(max((pt[1] - n.y) / n.h, 0), 1), 4)]
        el = self._mk('arrow', pts[0][0], pts[0][1], maxx - minx, maxy - miny, strokeColor=col, strokeStyle=st,
                      strokeWidth=lw, points=rel, lastCommittedPoint=None,
                      startBinding={'elementId': a.id, 'mode': 'orbit', 'fixedPoint': fp(a, pts[0])},
                      endBinding={'elementId': b.id, 'mode': 'orbit', 'fixedPoint': fp(b, pts[-1])},
                      startArrowhead='triangle' if head == 'both' else None,
                      endArrowhead=None if head == 'none' else 'triangle', elbowed=False)
        a.el['boundElements'].append({'type': 'arrow', 'id': el['id']})
        b.el['boundElements'].append({'type': 'arrow', 'id': el['id']})
        rec = dict(id=el['id'], pts=pts, a=a.id, b=b.id, an=a.name, bn=b.name, kind=kind)
        self.arrows.append(rec)
        if label:
            # place at midpoint of the longest segment (or label_at index)
            segs = list(zip(pts, pts[1:]))
            if label_at is None:
                k = max(range(len(segs)), key=lambda i: abs(segs[i][0][0] - segs[i][1][0]) + abs(segs[i][0][1] - segs[i][1][1]))
            else:
                k = label_at
            p, q = segs[k]
            mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
            lines = label.split('\n')
            lw_ = max(tw(l, 16, SANS) for l in lines) + 12
            lh_ = len(lines) * 16 * LH + 6
            t = self.text(mx - lw_ / 2, my - lh_ / 2, lines, fs=16, color=col if kind != 'data' else INK,
                          align='center', w=lw_, bound=el['id'])
            t['verticalAlign'] = 'middle'
            el['boundElements'].append({'type': 'text', 'id': t['id']})
            self.labels.append(dict(id=t['id'], x=mx - lw_ / 2, y=my - lh_ / 2, w=lw_, h=lh_, s=label, arrow=el['id']))
        return el

    def vert(self, a, b, **kw):
        """Straight vertical arrow from the bottom of a to the top of b (x ranges must overlap)."""
        lo, hi = max(a.x, b.x), min(a.r, b.r)
        if hi - lo < 4:
            raise ValueError(f'vert: no x overlap {a.name} / {b.name}')
        cx = (lo + hi) / 2
        return self.arrow(a, b, 'b', 't', oa=(cx - a.x) / a.w, ob=(cx - b.x) / b.w, **kw)

    def horiz(self, a, b, **kw):
        """Straight horizontal arrow from the right of a to the left of b (y ranges must overlap)."""
        lo, hi = max(a.y, b.y), min(a.b, b.b)
        if hi - lo < 4:
            raise ValueError(f'horiz: no y overlap {a.name} / {b.name}')
        cy = (lo + hi) / 2
        return self.arrow(a, b, 'r', 'l', oa=(cy - a.y) / a.h, ob=(cy - b.y) / b.h, **kw)

    def fit(self, bottom_pad=60):
        ys = [n.b for n in self.nodes] + [z['y'] + z['h'] for z in self.zones] + [t['y'] + t['h'] for t in self.texts]
        self.h = int(max(ys) + bottom_pad)
        self.el['height'] = self.h


# ---- checks ---------------------------------------------------------
def inter(a, b, m=0):
    return not (a[0] + a[2] + m <= b[0] or b[0] + b[2] + m <= a[0] or a[1] + a[3] + m <= b[1] or b[1] + b[3] + m <= a[1])


def inside(a, b, m=0):
    return a[0] >= b[0] + m and a[1] >= b[1] + m and a[0] + a[2] <= b[0] + b[2] - m and a[1] + a[3] <= b[1] + b[3] - m


def seg_hits_rect(p, q, r, m=4):
    x0, x1 = sorted((p[0], q[0]))
    y0, y1 = sorted((p[1], q[1]))
    return inter((x0, y0, x1 - x0, y1 - y0), (r[0] - m, r[1] - m, r[2] + 2 * m, r[3] + 2 * m))


def check(doc):
    E = doc.err
    for f in doc.frames:
        F = (0, 0, f.w, f.h)
        N = {n.id: (n.x, n.y, n.w, n.h) for n in f.nodes}
        names = {n.id: n.name for n in f.nodes}
        Z = {z['id']: (z['x'], z['y'], z['w'], z['h']) for z in f.zones}
        zn = {z['id']: z['name'] for z in f.zones}
        for i, r in {**N, **Z}.items():
            if not inside(r, F, 20):
                E(f'[{f.name}] outside frame: {names.get(i) or zn.get(i)}')
        ids = list(N)
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                if inter(N[ids[i]], N[ids[j]], 8):
                    E(f'[{f.name}] nodes overlap or too close: {names[ids[i]]} / {names[ids[j]]}')
        for zid, zr in Z.items():
            for nid, nr in N.items():
                if inter(nr, zr, 0) and not inside(nr, zr, 6):
                    E(f'[{f.name}] node {names[nid]} straddles zone {zn[zid]}')
        zl = list(Z)
        for i in range(len(zl)):
            for j in range(i + 1, len(zl)):
                a, b = Z[zl[i]], Z[zl[j]]
                if inter(a, b, 0) and not inside(a, b, 4) and not inside(b, a, 4):
                    E(f'[{f.name}] zones partially overlap: {zn[zl[i]]} / {zn[zl[j]]}')
        owners = {**N, **Z, 'frame': F}
        free = []
        for t in f.texts:
            r = (t['x'], t['y'], t['w'], t['h'])
            if t['est'] > t['w'] + 0.5:
                E(f'[{f.name}] text too wide ({t["est"]:.0f}>{t["w"]:.0f}): {t["s"][:50]!r}')
            if t['bound']:
                continue
            o = t['owner']
            if o in owners:
                if not inside(r, owners[o], 6 if o != 'frame' else 20):
                    E(f'[{f.name}] text outside owner {names.get(o) or zn.get(o) or o}: {t["s"][:50]!r}')
            else:
                free.append(t)
        # free-standing texts must not hit nodes
        for t in free:
            r = (t['x'], t['y'], t['w'], t['h'])
            for nid, nr in N.items():
                if inter(r, nr, 2):
                    E(f'[{f.name}] free text hits node {names[nid]}: {t["s"][:40]!r}')
        # texts owned by a zone (titles) must not hit nodes inside that zone
        for t in f.texts:
            if t['owner'] in Z and not t['bound']:
                r = (t['x'], t['y'], t['w'], t['h'])
                for nid, nr in N.items():
                    if inter(r, nr, 2):
                        E(f'[{f.name}] zone title hits node {names[nid]}: {t["s"][:40]!r}')
        # arrows
        texts_all = [(t['x'], t['y'], min(t['w'], t['est'] + 4), t['h'], t['s'], t['owner']) for t in f.texts if not t['bound']]
        for ar in f.arrows:
            for p, q in zip(ar['pts'], ar['pts'][1:]):
                for nid, nr in N.items():
                    if nid in (ar['a'], ar['b']):
                        continue
                    if seg_hits_rect(p, q, nr, 4):
                        E(f'[{f.name}] arrow {ar["an"]} -> {ar["bn"]} crosses node {names[nid]}')
                for tx in texts_all:
                    if tx[5] in (ar['a'], ar['b']):
                        continue
                    if tx[5] in Z or tx[5] == 'frame' or tx[5] is None or tx[5] in N:
                        if seg_hits_rect(p, q, tx[:4], 2):
                            E(f'[{f.name}] arrow {ar["an"]} -> {ar["bn"]} crosses text {tx[4][:40]!r}')
        L = f.labels
        for i, lb in enumerate(L):
            r = (lb['x'], lb['y'], lb['w'], lb['h'])
            for nid, nr in N.items():
                if inter(r, nr, 2):
                    E(f'[{f.name}] arrow label hits node {names[nid]}: {lb["s"][:30]!r}')
            for tx in texts_all:
                if inter(r, tx[:4], 2):
                    E(f'[{f.name}] arrow label hits text {tx[4][:30]!r}: {lb["s"][:30]!r}')
            for j in range(i + 1, len(L)):
                if inter(r, (L[j]['x'], L[j]['y'], L[j]['w'], L[j]['h']), 2):
                    E(f'[{f.name}] arrow labels overlap: {lb["s"][:25]!r} / {L[j]["s"][:25]!r}')
            # label must not sit on another arrow's segment
            for ar in f.arrows:
                if ar['id'] == lb['arrow']:
                    continue
                for p, q in zip(ar['pts'], ar['pts'][1:]):
                    if seg_hits_rect(p, q, r, 0):
                        E(f'[{f.name}] arrow label {lb["s"][:25]!r} sits on another arrow')
    return doc.errors


def finalize(doc, colx=(0, 2700), gap=300):
    """Place frames in a 2-column grid, shift members, return scene dict."""
    rowy, y, i = [], 0, 0
    frames = doc.frames
    for r in range(0, len(frames), 2):
        pair = frames[r:r + 2]
        for c, f in enumerate(pair):
            f.ox, f.oy = colx[c], y
            f.el['x'], f.el['y'] = f.ox, f.oy
            for el in f.members:
                el['x'] += f.ox
                el['y'] += f.oy
        y += max(f.h for f in pair) + gap
    return {'type': 'excalidraw', 'version': 2,
            'source': 'https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag/2.26.4',
            'elements': doc.els,
            'appState': {'gridSize': None, 'viewBackgroundColor': '#ffffff'}, 'files': {}}
