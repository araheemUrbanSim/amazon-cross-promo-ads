# amazon-cross-promo-ads

Public, **read-only** content source for the first-party cross-promotion module used in the owner's Amazon Appstore games.
Games read it over anonymous HTTPS. **No token is ever shipped in a game**, and no player data is ever sent here.

```
catalog/v1/catalog.json          the live campaign catalog (schemaVersion 1)
catalog/v1/catalog.schema.json   JSON Schema (structure)
creatives/<game-id>/<rev>/       immutable images: banner.png, mrec.jpg, interstitial-portrait.jpg, interstitial-landscape.jpg
tools/validate_catalog.py        full validation (mirrors the Unity module's validator); --remote re-fetches every image
tools/publish_campaign.py        new-revision / wait-public / verify-live helpers
```

Live URLs (replaceable; `raw.githubusercontent.com` is not a CDN with a bandwidth or availability guarantee):

* Catalog: `https://raw.githubusercontent.com/araheemUrbanSim/amazon-cross-promo-ads/main/catalog/v1/catalog.json`
* Images: `https://raw.githubusercontent.com/araheemUrbanSim/amazon-cross-promo-ads/main/creatives/<game-id>/v1/<file>`

## Rules

1. **Images first, catalog last.** Commit and push new images, wait until they are publicly readable, validate, then push the catalog.
2. **Never change bytes under an existing revision folder.** Make `vN+1`. Games cache by SHA-256.
3. Enabled campaigns may not contain empty values or `REPLACE_*` placeholders; the validator rejects them.
4. Never use `github.com/.../blob/...` URLs or Git LFS for images; use raw URLs and plain git objects.
5. Keep analytics data, admin credentials and tokens **out of this repository**.

## Everyday tasks

```bash
python tools/validate_catalog.py                 # local files vs catalog
python tools/validate_catalog.py --remote        # also fetch every imageUrl anonymously
python tools/publish_campaign.py verify-live     # after pushing: anonymous check of the live catalog + images
```

Disable one game or everything: set `"enabled": false` on the campaign (or at the top level), bump `catalogVersion`, validate, push.
Roll back: `git revert <catalog commit>` and push. Adding a **new promoted game** also needs a rebuild of the host games (Android package
visibility), see the module's operator guide.

> Note observed while publishing: a freshly pushed path can return a cached `404` from raw.githubusercontent.com for a few minutes.
> Games treat that as "no ad" and retry on their normal schedule.
