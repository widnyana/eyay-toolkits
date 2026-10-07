"""Two small frames that show every helper. Copy this file, rename it, replace the content.

  mkdir work && cd work && cp <skill>/examples/example_frames.py frames_a.py
  python3 <skill>/scripts/build.py frames_a out.excalidraw
  <skill>/scripts/preview.sh out.excalidraw prev
"""
from xl import *


def f0(doc):
    f = doc.frame('0 Legend and how to read')
    f.header('What do the colors, line styles, and tags mean?')
    z = f.zone(60, 110, 1400, 100, 'Tier colors', 'white')
    ns = f.row(80, 170, 30, [
        dict(w=320, tier='dmz', title='DMZ tier', detail='HAProxy and keepalived'),
        dict(w=320, tier='apps', title='Apps tier', detail='certificate issuer, monitoring'),
        dict(w=320, tier='data', title='Data tier', detail='PostgreSQL, ClickHouse'),
        dict(w=320, tier='k8s', title='Kubernetes', detail='Talos nodes, Cilium', style='dashed', tag=LAT)])
    f.zone_h(z, ns[0].b + 24 - 110)
    z2 = f.zone(60, z['y'] + z['h'] + 40, 1400, 100, 'Line styles', 'white')
    y = z2['y'] + 70
    for kind, text in [('data', 'data path'), ('ctl', 'control path'), ('plan', 'planned'), ('drop', 'blocked')]:
        a, b = f.pill(90, y, 'from', GREY, w=110), f.pill(330, y, 'to', GREY, w=110)
        f.horiz(a, b, kind=kind)
        f.text(480, y + 2, text, fs=20, w=400, owner=z2['id'])
        y += 60
    f.zone_h(z2, y - z2['y'] + 6)
    f.fit()
    return f


def f1(doc):
    f = doc.frame('1 One request')
    f.header('How does one request reach the database?')
    users, edge = f.rowx(150, [
        dict(x=60, w=300, tier='ext', title='Users', detail='HTTPS to the public name'),
        dict(x=500, w=300, tier='dmz', title='HAProxy', detail='terminates TLS', tag=PRO)])
    app = f.node(940, 150, 300, 'apps', 'App', 'tcp 8443', h=edge.h)
    db = f.node(940, 400, 300, 'data', 'PostgreSQL', 'tcp 5432', tag=DEC)
    f.horiz(users, edge, label='tcp 443')            # the gap must be wider than the label
    f.horiz(edge, app)
    f.vert(app, db, label='SQL')
    t = f.table(60, 400, [('Hop', 6), ('From', 14), ('To', 14)],
                [['1', 'Users', 'HAProxy'], ['2', 'HAProxy', 'App'], ['3', 'App', 'PostgreSQL']],
                tier='other', title='Hop list')
    f.fit()
    return f
