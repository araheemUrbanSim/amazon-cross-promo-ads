#!/usr/bin/env python3
"""Developer-side publishing helper. Standard library only. Uses NO tokens: you push with your own git login.

Safe publishing order (images first, catalog last):

  1. python tools/publish_campaign.py new-revision <game-id> <dir-with-4-images>   # copies to creatives/<game>/vN/, prints catalog entries
  2. git add creatives && git commit && git push
  3. python tools/publish_campaign.py wait-public <game-id> <revision>              # raw CDN can lag a few minutes after a push
  4. edit catalog/v1/catalog.json (paste the printed creative entries, bump catalogVersion/generatedAtUtc)
  5. python tools/validate_catalog.py --remote                                      # must print OK
  6. git add catalog && git commit && git push                                      # the atomic final step
  7. python tools/publish_campaign.py verify-live                                   # anonymous fetch of the live catalog + images

Rollback: `git revert <catalog commit>` and push (games fall back on their next catalog check). Never modify bytes under an
existing revision path: create vN+1 instead, because games cache by content hash.
"""
import hashlib, json, shutil, struct, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).parent))
from validate_catalog import image_info  # noqa: E402

BASE = "https://raw.githubusercontent.com/araheemUrbanSim/amazon-cross-promo-ads/main"
FILES = {  # file name -> (format, orientation, extension rule, width, height)
    "banner.png": ("banner", "any", 1280, 200),
    "mrec.jpg": ("mrec", "any", 1200, 1000),
    "interstitial-portrait.jpg": ("interstitial", "portrait", 1080, 1920),
    "interstitial-landscape.jpg": ("interstitial", "landscape", 1920, 1080),
}


def next_revision(game):
    d = ROOT / "creatives" / game
    nums = [int(p.name[1:]) for p in d.glob("v*") if p.name[1:].isdigit()] if d.exists() else []
    return max(nums, default=0) + 1


def new_revision(game, src):
    src = Path(src)
    rev = f"v{next_revision(game)}"
    dest = ROOT / "creatives" / game / rev
    entries = []
    for name, (fmt, ori, w, h) in FILES.items():
        f = src / name
        if not f.exists(): sys.exit(f"missing {f}")
        data = f.read_bytes()
        info = image_info(data)
        if not info or (info[1], info[2]) != (w, h): sys.exit(f"{name}: expected {w}x{h} PNG/JPEG, got {info}")
        if len(data) > 3 * 1024 * 1024: sys.exit(f"{name}: larger than 3 MiB")
    dest.mkdir(parents=True)
    for name, (fmt, ori, w, h) in FILES.items():
        shutil.copyfile(src / name, dest / name)
        data = (dest / name).read_bytes()
        cid = f"{game}-{fmt}" + ("" if ori == "any" else f"-{ori}") + f"-{rev}"
        entries.append({"creativeId": cid, "format": fmt, "orientation": ori, "locale": "default",
                        "imageUrl": f"{BASE}/creatives/{game}/{rev}/{name}", "sha256": hashlib.sha256(data).hexdigest(),
                        "width": w, "height": h, "byteSize": len(data)})
    print(f"created {dest}\nPaste into the campaign's \"creatives\" array:\n")
    print(json.dumps(entries, indent=2))


def wait_public(game, rev, minutes=10):
    deadline = time.time() + minutes * 60
    pending = {n for n in FILES}
    while pending and time.time() < deadline:
        for n in sorted(pending):
            try:
                urllib.request.urlopen(f"{BASE}/creatives/{game}/{rev}/{n}", timeout=20).read(16)
                pending.discard(n)
            except Exception:
                pass
        if pending: time.sleep(10)
    if pending: sys.exit(f"still not public after {minutes} min: {sorted(pending)}")
    print("all images publicly readable")


def verify_live():
    cat = json.loads(urllib.request.urlopen(f"{BASE}/catalog/v1/catalog.json", timeout=30).read())
    bad = n = 0
    for c in cat["campaigns"]:
        for cr in c["creatives"]:
            n += 1
            try:
                data = urllib.request.urlopen(cr["imageUrl"], timeout=30).read()
                info = image_info(data)
                if hashlib.sha256(data).hexdigest() != cr["sha256"] or len(data) != cr["byteSize"] or not info or (info[1], info[2]) != (cr["width"], cr["height"]):
                    bad += 1; print("MISMATCH", cr["imageUrl"])
            except Exception as e:
                bad += 1; print("FAIL", cr["imageUrl"], e)
    print(f"live catalog {cat['catalogVersion']}: {len(cat['campaigns'])} campaigns, {n} images checked, {bad} problem(s)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 3 and a[0] == "new-revision": new_revision(a[1], a[2])
    elif len(a) == 3 and a[0] == "wait-public": wait_public(a[1], a[2])
    elif a == ["verify-live"]: verify_live()
    else: sys.exit(__doc__)
