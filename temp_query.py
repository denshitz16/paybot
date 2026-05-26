import json, urllib.request
run_id='26418879486'
url=f'https://api.github.com/repos/PayBot-PH/paybot/actions/runs/{run_id}'
headers={'User-Agent':'python-urllib/3','Accept':'application/vnd.github+json'}
req=urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    data=json.load(resp)
print('status', data.get('status'))
print('conclusion', data.get('conclusion'))
art_url=data.get('artifacts_url')
print('artifacts_url', art_url)
if art_url:
    req2=urllib.request.Request(art_url, headers=headers)
    with urllib.request.urlopen(req2) as resp2:
        art_data=json.load(resp2)
    print('artifacts', len(art_data.get('artifacts', [])))
    for a in art_data.get('artifacts', []):
        print(a['id'], a['name'], a['archive_download_url'])
