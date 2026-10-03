# Iconic Ads Analytics: setup, operations and test status

Dashboard (static, GitHub Pages): `dashboard/` in this repo, deployed by `.github/workflows/pages.yml` to
`https://araheemurbansim.github.io/amazon-cross-promo-ads/` **once Pages is enabled and the collector is hosted (see "Status")**.
Backend (collector + reporting API, must be hosted outside Pages): `F:\Test Projects\analytics-backend` (Node 22, SQLite).

## Event-to-dashboard flow

```
Game (Unity module)                       Collector (your host, HTTPS)                    Dashboard (GitHub Pages)
 qualified impression / one click per tap   POST /v1/events/batch                          GET /v1/reports/* (Bearer key)
 -> DurableEventStore (local file, fsync)   validate -> dedup -> SQLite (synchronous=FULL)  overview / games / hosts / diagnostics / CSV
 -> AnalyticsUploader (batch, retry,        -> 15-minute UTC aggregate table                browser holds only a reader key in
    backoff, survives restart)              -> ack ONLY after commit; duplicates acked      sessionStorage; no totals stored in browser
```

* Events carry a UUID `event_id`, UTC occurrence time, type, host package, advertised game id, creative/campaign id, placement, format,
  orientation (interstitial = creative orientation), `host_version`, `sdk_version`, `is_test`. No advertising id, IP or install list is stored.
* Counting rules are unchanged: impression = 50% visible for 1 continuous foreground second; downloads/preloads never count; one click per exposure;
  store-launch attempts/results are stored separately from clicks and are never labelled installs or downloads.
* Server-side dedup: `UNIQUE(host_package,event_id)` plus one impression and one click per exposure. A resent event is acknowledged and counted once.
* Totals are bucketed by **occurrence** time, so a delayed offline upload lands on the day it happened. Receipt time is shown separately (Diagnostics, freshness line).
* CTR = clicks / impressions x 100 from aggregate totals; `—` when impressions are 0; never capped (a click can arrive for an exposure whose impression is not yet counted).
* All 34 games always appear (zero rows) because the display list comes from `inventory/games.json`; grouping uses stable ids (advertised = `target_game_id`, host = package).

## Security model

| Concern | Control |
|---|---|
| Reporting access | Backend enforces a Bearer key on every `/v1/reports/*` and `/v1/auth/check`; no key / wrong key = 401 with no data; failed-attempt throttle (429). |
| Roles | `REPORT_TOKENS` (read-only, one per person, revoke by removing + restart), `ADMIN_TOKEN` (purge/delete, also reads). Ingestion needs neither. |
| Ingestion | No embedded secret (it would be extractable from the APK). Controls: allow-listed host packages, catalog/inventory-consistent ids, strict schema validation, 256 KB / 100-event limits, per-IP and per-installation rate limits, bounded rejected-event log. |
| Secrets in public places | None. `config.json` holds only the collector's public URL. The workflow fails the build if secret-like strings appear in `dist`. |
| CORS | Only origins in `CORS_ORIGINS` (exact match), plus `Access-Control-Allow-Private-Network` answers for preflights. |
| CSV | Cells starting with `= + - @ TAB CR` are prefixed with `'`. |

## Setup

1. **Host the collector** on any HTTPS host with a *persistent disk* and *one instance* (SQLite). `Dockerfile` is provided (Fly.io, Render, Railway, a VPS, Cloud Run with a volume workaround is not recommended).
   Environment: `ADMIN_TOKEN`, `REPORT_TOKENS`, `CORS_ORIGINS=https://araheemurbansim.github.io`, `ALLOWED_HOST_PACKAGES` (the 34 packages), `CATALOG_PATH`, `INVENTORY_PATH` (default in image), `TRUST_PROXY=1` behind a proxy.
   Generate keys: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`. See `.env.example`.
2. **Point the dashboard at it**: set repository variable `ANALYTICS_API_URL` (Settings > Secrets and variables > Actions > Variables) to the collector URL (no trailing slash), or edit `dashboard/public/config.json`.
3. **Enable Pages**: Settings > Pages > Source = *GitHub Actions*. Push to `main` (or run the workflow manually).
4. **Point the games at it**: in each game's `CrossPromoSettings` set `analyticsEndpoint` to `https://<collector>/v1/events/batch` (release builds require HTTPS), rebuild and publish.
5. Give each viewer a reader key. Sign in at the dashboard URL.

Public config (`dashboard/public/config.json`): `apiBaseUrl`, `defaultTimeZone` (Asia/Karachi), `environmentLabel`. Backend secrets (`ADMIN_TOKEN`, `REPORT_TOKENS`) live only in the collector's environment.

## Maintenance

* Backups: `scripts/backup.js` / `scripts/verify-backup.js` in the backend (SQLite online backup). Raw events are purged after `RAW_RETENTION_DAYS` (90); aggregates are kept.
* Adding a game: add it to `inventory/games.json` (+ catalog), restart; it appears (with zeros) immediately.
* Rotate a reader key: edit `REPORT_TOKENS`, restart. Sessions end when the tab closes.
* Costs: GitHub Pages and Actions are free for public repos. The collector needs a small always-on host with a persistent volume (typically a few USD/month).
* Limits: single-instance SQLite (hundreds of events/second is fine; more needs Postgres); the reader key is a shared-secret model, not per-user SSO with audit logs; "Last updated" is the dashboard's last successful fetch.

## Local development

```
cd analytics-backend && npm test && node scripts/seed-dev.js ./data/dev.db   # synthetic events, dev database only
ADMIN_TOKEN=... REPORT_TOKENS=... CORS_ORIGINS=http://localhost:5173 INVENTORY_PATH=./inventory/games.json DB_PATH=./data/dev.db node dist/src/index.js
cd amazon-cross-promo-ads/dashboard && npm ci && npm test && npm run dev
```
There are no fixtures in the frontend; dev data comes from the real backend, so nothing synthetic can ship in a production build.

## Test results (this session)

| Check | Result |
|---|---|
| Collector tests (33 existing + 28 new: per-game/host aggregation, CTR/zero, DST and 30/45-minute zones, day boundaries, duplicates, delayed events, 401/role separation, CORS, brute-force throttle, CSV injection, ingestion-error log) | **61/61 pass** |
| Dashboard unit/UI tests (CTR formatting, tz presets, table sort/search/pagination, sign-in failure, error never shown as zero, zero-impression state, refresh/sign-out, axe) | **14/14 pass** |
| Real-browser axe-core incl. colour contrast on Overview, Games, Reports, Diagnostics | **0 violations** |
| Responsive screenshots | `docs/screenshots/` desktop (1440), mobile (375, no horizontal scroll). A true tablet-width screenshot was not captured. |
| Deep-link refresh (`#/games/<id>`) with production base path | works (HashRouter) |
| Unity: `sdk_version` added to events; EditMode tests | 129/129 pass; build installed and used in the tablet test below |

## Fire tablet end-to-end test (2026-10-03): PASSED for the device -> collector -> dashboard path

Device: Amazon KFONWI, serial `GCC1AR06212500V5`, Fire OS 7 / API 28. Build `crosspromo-demo-e2e-test.apk` (development build, `markAllEventsAsTest=true`, `sdk_version 1.1.0`), installed with `adb install -r` (app data preserved, nothing uninstalled). A **separate** collector (`DB_PATH=data/e2e-test.db`, port 8789) was reached through `adb reverse tcp:8787 tcp:8789`; the dashboard (local preview of the production build) pointed at it. Evidence: `docs/e2e-evidence/` and `F:\Test Projects\Evidence\dashboard-e2e\`.

| Step | Result |
|---|---|
| Baseline | Test environment: 0 events. Production environment: 20 older events from earlier sessions (they were still queued on the device and arrived late, a delayed-upload example). |
| Show banner, MREC, interstitial portrait x3, interstitial landscape x1; tap each once | Device journal: 6 impressions + 6 clicks + 6 store attempts + 6 results, all `is_test=true`, `sdk_version 1.1.0`. Collector and dashboard (Environment = Test): **6 impressions, 6 clicks, 6 games with activity, 100% CTR** (clicks on cached creatives; CTR is uncapped, as designed). By format: interstitial 4, banner 1, MREC 1; landscape filter 1. |
| Amazon purchase popup | Opened on banner, interstitial portrait and landscape clicks (Cancel pressed, DOWNLOAD never pressed). The MREC campaign (Wild Animal Hunting) fell back to the Amazon detail page showing "Currently unavailable" on this tablet. No download or install was triggered by the test. |
| True offline | Wi-Fi off **and** the adb reverse removed (the reverse tunnel is USB, so Wi-Fi off alone does not cut the uploader; my first attempt was invalid for that reason and is not counted). Preloaded interstitial shown + tapped offline: device `queued 4`, upload error "Cannot connect", server totals unchanged (4/4). Force-stop and relaunch: `queued 4` persisted. Network + reverse restored: all 4 delivered (`uploaded 4/4`), server totals +1 impression/click/attempt/result. |
| Resend | The 4 delivered events POSTed again directly: response `accepted 0, duplicates 4, rejected 0`; totals unchanged (5/5/5 at that point). Diagnostics shows the 4 duplicates. |
| Test vs production separation | Production environment stayed at the 20 pre-existing events; test events appeared only under Environment = Test. |
| Unauthorised access | No key: HTTP 401 on reports. |

Not covered by this run: the hosted-HTTPS path (release builds require HTTPS; this used a development build over loopback), a physical tablet-width screenshot of the dashboard, and the retried-batch-after-lost-response case on the device itself (covered by the backend tests).

## Status and exact missing inputs

* Code, tests and the Pages workflow are complete locally; **nothing is pushed or deployed**: the PC's git credentials belong to `araheem-wanitek`, while the repo owner is `araheemUrbanSim`, and the browser session is signed out of GitHub (Pages settings unreadable).
* **No live URL is reported**, because the dashboard cannot show real data without a reachable HTTPS collector.
* Missing inputs: (1) push access (`git push` from an account with write access) and Pages source = GitHub Actions; (2) a hosting account for the collector with a persistent volume (and its HTTPS URL for `ANALYTICS_API_URL` / games' `analyticsEndpoint`); and, for production, re-enabling real (non-test) events in the shipping games.
