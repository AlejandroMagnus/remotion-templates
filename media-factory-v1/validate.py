import json,hashlib,pathlib
p=pathlib.Path(__file__).parent
d=json.loads((p/'contracts.json').read_text());assert len(d['units'])==7
last=0
for u in d['units']:
 assert u['startMs']>=last and u['endMs']>u['startMs'];last=u['endMs']
assert last<=d['durationMs'];assert (p/'narration.mp3').stat().st_size>0
expected=json.loads((p/'checksums.json').read_text())
for name,digest in expected.items():assert hashlib.sha256((p/name).read_bytes()).hexdigest()==digest,name
print('PASS: 7 unidades ordenadas, duración y archivos íntegros. No certifica calidad visual, auditiva ni jurídica.')
