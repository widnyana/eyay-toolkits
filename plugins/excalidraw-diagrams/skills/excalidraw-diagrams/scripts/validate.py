import json,re,sys
sc=json.load(open(sys.argv[1])); E=sc['elements']; err=[]
ids={e['id']:e for e in E}
if len(ids)!=len(E): err.append('duplicate ids')
fr={e['id']:e for e in E if e['type']=='frame'}
idx=[e['index'] for e in E]
if idx!=sorted(idx) or len(set(idx))!=len(idx): err.append('indices not strictly ascending')
BAD = re.compile('[' + chr(0x2012) + '-' + chr(0x2015) + chr(0x2212) + chr(0x1F000) + '-' + chr(0x1FAFF)
                 + chr(0x2600) + '-' + chr(0x27BF) + chr(0x2B00) + '-' + chr(0x2BFF) + chr(0xFE0F) + ']')  # dashes and emoji
for e in E:
    if e.get('frameId') and e['frameId'] not in fr: err.append(f"bad frameId {e['id']}")
    f=fr.get(e.get('frameId'))
    if f:
        if not (e['x']>=f['x'] and e['y']>=f['y'] and e['x']+e['width']<=f['x']+f['width']+1 and e['y']+e['height']<=f['y']+f['height']+1):
            if e['type']!='arrow' and e['type']!='line': err.append(f"outside frame: {e['type']} {e.get('text','')[:30]!r}")
    if e['type']=='arrow':
        for k in ('startBinding','endBinding'):
            b=e[k]
            if not b or b['elementId'] not in ids: err.append(f"arrow {e['id']} missing {k}")
            elif not any(x['id']==e['id'] for x in ids[b['elementId']]['boundElements']): err.append(f"arrow {e['id']} not listed on {b['elementId']}")
    if e['type']=='text':
        if e['fontSize']<16: err.append('font<16')
        if BAD.search(e['text']): err.append('banned char '+e['text'][:30])
        c=e.get('containerId')
        if c:
            if c not in ids or not any(x['id']==e['id'] for x in ids[c]['boundElements']): err.append(f"text {e['id']} not bound back")
    for be in e.get('boundElements') or []:
        if be['id'] not in ids: err.append(f"dangling boundElement {be['id']}")
print('elements',len(E),'frames',len(fr),'arrows',sum(e['type']=='arrow' for e in E),'texts',sum(e['type']=='text' for e in E),'errors',len(err))
for x in err[:20]: print(' ',x)
sys.exit(1 if err else 0)
