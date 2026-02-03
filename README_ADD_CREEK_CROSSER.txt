ADDING CREEK-CROSSER (SAFE, NON-DESTRUCTIVE)
-------------------------------------------
This patch contains a standalone game wrapper and game files for Creek Crosser.

IMPORTANT: Do NOT overwrite PIXEL-NET/games.json. Instead, add a single entry to your existing games.json.
Example (append safely using jq or python):

jq ' . += [{"id": "creek-crosser", "title": "Creek Crosser", "path": "games/creek-crosser/index.html", "thumbnail": "assets/thumbnails/creek-crosser.png"}] '         PIXEL-NET/games.json > PIXEL-NET/games.new.json && mv PIXEL-NET/games.new.json PIXEL-NET/games.json

OR using python (safe append):

python - <<PY
import json
p = "PIXEL-NET/games.json"
with open(p,"r+",encoding="utf8") as f:
    data = json.load(f)
    entry = {"id":"creek-crosser","title":"Creek Crosser","path":"games/creek-crosser/index.html","thumbnail":"assets/thumbnails/creek-crosser.png"}
    if not any(e.get("id")==entry["id"] for e in data):
        data.append(entry)
        f.seek(0); f.truncate(); json.dump(data,f,indent=2)
PY

After merging, run:
  git add PIXEL-NET/games.json PIXEL-NET/games/creek-crosser/* PIXEL-NET/assets/thumbnails/creek-crosser.png
  git commit -m "Add Creek Crosser (wrapper + game) — safe append to games.json"
  git push

This README is included in the ZIP.
