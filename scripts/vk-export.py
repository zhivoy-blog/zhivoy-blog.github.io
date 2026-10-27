"""Выгрузка стены ВК (только чтение, wall.get) для переноса постов на сайт.
Запускается из GitHub Actions; ключ берётся из секрета VK_KEY и никуда не пишется."""
import json, os, time, urllib.parse, urllib.request

OWNER_ID = -240983163
OUT = "vk-export"
token = os.environ["VK_KEY"]

def call(method, **params):
    params.update(access_token=token, v="5.199")
    url = f"https://api.vk.com/method/{method}?" + urllib.parse.urlencode(params)
    data = json.load(urllib.request.urlopen(url, timeout=30))
    if "error" in data:
        raise SystemExit(f"VK error {data['error'].get('error_code')}: {data['error'].get('error_msg')}")
    return data["response"]

posts, offset = [], 0
while True:
    r = call("wall.get", owner_id=OWNER_ID, count=100, offset=offset, filter="owner")
    posts += r["items"]
    offset += 100
    if offset >= r["count"]:
        break
    time.sleep(0.4)

os.makedirs(f"{OUT}/photos", exist_ok=True)
out = []
for p in posts:
    photos = []
    for i, a in enumerate(p.get("attachments", [])):
        if a["type"] != "photo":
            continue
        best = max(a["photo"]["sizes"], key=lambda s: s.get("width", 0) * s.get("height", 0))
        name = f"{p['id']}_{i}.jpg"
        try:
            urllib.request.urlretrieve(best["url"], f"{OUT}/photos/{name}")
            photos.append(name)
        except Exception as e:
            print("photo fail", p["id"], e)
    out.append({
        "id": p["id"],
        "date": time.strftime("%Y-%m-%d %H:%M", time.gmtime(p["date"] + 3 * 3600)),
        "text": p.get("text", ""),
        "attachments": [a["type"] for a in p.get("attachments", [])],
        "links": [a["link"]["url"] for a in p.get("attachments", []) if a["type"] == "link"],
        "photos": photos,
        "is_pinned": p.get("is_pinned", 0),
    })

with open(f"{OUT}/wall.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("posts:", len(out))
