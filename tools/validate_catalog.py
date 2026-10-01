#!/usr/bin/env python3
"""Validate catalog/v1/catalog.json before publishing. Standard library only.

Mirrors the Unity module's CatalogValidator so a catalog that passes here will not be silently dropped by games.

  python tools/validate_catalog.py                        # structure + local files (hash/size/dimensions)
  python tools/validate_catalog.py --remote               # additionally fetch every imageUrl anonymously
  python tools/validate_catalog.py --known-packages path/to/CrossPromoKnownPackages.json

Exit status 0 = publishable, 1 = problems found.
"""
import argparse, hashlib, json, re, struct, sys, urllib.request
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
IMAGE_HOSTS = {"raw.githubusercontent.com"}
STORE_HOSTS = {"amazon.com", "www.amazon.com", "amazon.co.uk", "www.amazon.co.uk", "amazon.de", "www.amazon.de"}
PACKAGE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$")
ASIN = re.compile(r"^[A-Z0-9]{10}$")
SHA = re.compile(r"^[0-9a-f]{64}$")
MAX_BYTES, MAX_EDGE, MAX_PIXELS = 3 * 1024 * 1024, 2048, 4194304


def image_info(data):
    """Return (kind, width, height) from the header, or None."""
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        w, h = struct.unpack(">II", data[16:24]); return "png", w, h
    if data[:3] == b"\xff\xd8\xff":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF: i += 1; continue
            m = data[i + 1]
            if m == 0xFF: i += 1; continue
            if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7: i += 2; continue
            ln = struct.unpack(">H", data[i + 2:i + 4])[0]
            if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5:i + 9]); return "jpeg", w, h
            i += 2 + ln
    return None


def near(v, target):
    return abs(v - target) / target < 0.02


def parse_utc(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def check(catalog, known, remote, errors):
    def err(cid, msg): errors.append(f"{cid}: {msg}")

    if catalog.get("schemaVersion") != 1: errors.append("schemaVersion must be 1"); return
    if not isinstance(catalog.get("campaigns"), list): errors.append("campaigns must be a list"); return
    if len(catalog["campaigns"]) > 500: errors.append("too many campaigns")
    ids, packages, asins = set(), set(), set()
    for c in catalog["campaigns"]:
        cid = c.get("campaignId") or "<missing-id>"
        if cid in ids: err(cid, "duplicate campaignId")
        ids.add(cid)
        if not c.get("enabled"): continue            # disabled templates may hold placeholders
        txt = json.dumps(c)
        if "REPLACE_" in txt: err(cid, "enabled campaign contains a REPLACE_* placeholder")
        for k in ("campaignId", "gameId", "title"):
            if not c.get(k) or len(c[k]) > 256: err(cid, f"bad {k}")
        pkg, asin, url = c.get("packageName", ""), c.get("asin", ""), c.get("storeWebUrl", "")
        if not PACKAGE.match(pkg): err(cid, "invalid packageName")
        if pkg in packages: err(cid, "duplicate enabled packageName")
        packages.add(pkg)
        if known is not None and pkg not in known: err(cid, "packageName is not in the known-package list (older/new builds would skip it as Unknown)")
        if not ASIN.match(asin): err(cid, "invalid asin")
        if asin in asins: err(cid, "duplicate enabled asin")
        asins.add(asin)
        u = urlparse(url)
        if u.scheme != "https" or u.hostname not in STORE_HOSTS or u.username or f"/dp/{asin}" not in u.path:
            err(cid, "storeWebUrl must be https on an allowed Amazon host and contain /dp/<asin>")
        if not isinstance(c.get("weight"), int) or c["weight"] < 0: err(cid, "weight must be an integer >= 0")
        for k in ("maxImpressionsPerSession", "maxImpressionsPerUtcDay"):
            if not isinstance(c.get(k), int) or c[k] < 0: err(cid, f"{k} must be an integer >= 0")
        s, e = c.get("startUtc"), c.get("endUtc")
        try:
            if s and e and parse_utc(e) <= parse_utc(s): err(cid, "endUtc must be after startUtc")
        except ValueError: err(cid, "invalid startUtc/endUtc")
        if not c.get("creatives"): err(cid, "no creatives"); continue
        seen = set()
        for cr in c["creatives"]:
            crid = cr.get("creativeId", "<missing>")
            if crid in seen: err(cid, f"duplicate creativeId {crid}")
            seen.add(crid)
            fmt, ori = cr.get("format"), cr.get("orientation")
            if fmt not in ("banner", "mrec", "interstitial") or ori not in ("any", "portrait", "landscape"): err(cid, f"{crid}: bad format/orientation"); continue
            iu = urlparse(cr.get("imageUrl", ""))
            if iu.scheme != "https" or iu.hostname not in IMAGE_HOSTS: err(cid, f"{crid}: imageUrl must be https on {sorted(IMAGE_HOSTS)}")
            if "/blob/" in iu.path or iu.hostname == "github.com": err(cid, f"{crid}: use a raw content URL, never a github.com blob page")
            if not SHA.match(cr.get("sha256", "")): err(cid, f"{crid}: invalid sha256")
            w, h, b = cr.get("width", 0), cr.get("height", 0), cr.get("byteSize", 0)
            if not (0 < b <= MAX_BYTES): err(cid, f"{crid}: byteSize out of range")
            if not (0 < w <= MAX_EDGE and 0 < h <= MAX_EDGE and w * h <= MAX_PIXELS): err(cid, f"{crid}: dimensions out of range"); continue
            a = w / h
            if fmt == "banner" and not near(a, 6.4): err(cid, f"{crid}: banner aspect must be ~6.4:1")
            if fmt == "mrec" and not near(a, 1.2): err(cid, f"{crid}: mrec aspect must be ~1.2:1")
            if fmt == "interstitial":
                if ori == "any": err(cid, f"{crid}: interstitial needs portrait or landscape")
                if ori == "portrait" and a >= 1: err(cid, f"{crid}: portrait must be taller than wide")
                if ori == "landscape" and a <= 1: err(cid, f"{crid}: landscape must be wider than tall")
            verify_image(cid, crid, cr, remote, err)


def verify_image(cid, crid, cr, remote, err):
    marker = "/main/"
    path = urlparse(cr["imageUrl"]).path
    rel = path.split(marker, 1)[1] if marker in path else path.lstrip("/")
    local = ROOT / rel
    if local.exists():
        data = local.read_bytes()
        check_bytes(cid, crid, cr, data, "local file", err)
    else:
        err(cid, f"{crid}: local file {rel} not found (images must be committed before the catalog)")
    if remote:
        try:
            with urllib.request.urlopen(cr["imageUrl"], timeout=30) as r:
                ctype = r.headers.get("Content-Type", "")
                data = r.read()
            if "text/html" in ctype: err(cid, f"{crid}: remote returned HTML")
            check_bytes(cid, crid, cr, data, "remote", err)
        except Exception as e:
            err(cid, f"{crid}: remote fetch failed: {e}")


def check_bytes(cid, crid, cr, data, where, err):
    if len(data) != cr["byteSize"]: err(cid, f"{crid}: {where} byteSize {len(data)} != {cr['byteSize']}")
    if hashlib.sha256(data).hexdigest() != cr["sha256"]: err(cid, f"{crid}: {where} sha256 mismatch")
    info = image_info(data)
    if info is None: err(cid, f"{crid}: {where} is not a PNG/JPEG (Git LFS pointer or HTML?)"); return
    if (info[1], info[2]) != (cr["width"], cr["height"]): err(cid, f"{crid}: {where} dimensions {info[1]}x{info[2]} != {cr['width']}x{cr['height']}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--catalog", default=str(ROOT / "catalog/v1/catalog.json"))
    p.add_argument("--remote", action="store_true", help="also fetch each imageUrl anonymously and compare")
    p.add_argument("--known-packages", help="CrossPromoKnownPackages.json from the Unity project")
    a = p.parse_args()
    catalog = json.loads(Path(a.catalog).read_text(encoding="utf-8-sig"))  # tolerate a BOM added by some editors
    known = None
    if a.known_packages:
        known = set(json.loads(Path(a.known_packages).read_text())["packages"])
    errors = []
    check(catalog, known, a.remote, errors)
    enabled = sum(1 for c in catalog.get("campaigns", []) if c.get("enabled"))
    if errors:
        print(f"FAILED: {len(errors)} problem(s)")
        for e in errors[:100]: print("  -", e)
        return 1
    print(f"OK: {enabled} enabled campaign(s), {len(catalog['campaigns'])} total, catalogVersion={catalog['catalogVersion']}"
          + (" (remote bytes verified)" if a.remote else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
