# Job Search CRM

**Anostosio° / Product Lab · Project 02 · v1.1**

Job Search CRM turns job search into a clear system of opportunities, actions and decisions. It is a bilingual, local-first workspace for daily pipeline management.

**Live:** https://job-search-crm-psi.vercel.app/  
**Portfolio:** https://anostosio.ru/

## Local-first promise

The v1.1 application keeps the CRM workspace in the current browser.

```text
USER INPUT
    ↓
BROWSER
    ↓
NORMALIZATION / LOCAL VALIDATION
    ↓
LOCALSTORAGE
    ↓
LOCAL MATCHER + UI + LOCAL PIPELINE STATISTICS
    ↓
OPTIONAL LOCAL JSON / CSV EXPORT
```

There is no application account system, cloud database, cloud synchronization, AI/LLM API or server-side vacancy parser in this version.

The **Analytics** view is local pipeline reporting calculated from the user's own workspace. It is not visitor analytics.

The page itself is hosted on Vercel, so ordinary infrastructure requests and technical hosting logs remain a separate data flow from CRM contents. See [`PRIVACY-DATA-MAP.md`](./PRIVACY-DATA-MAP.md).

## What v1.1 does

- **Today workspace** surfaces due actions, overdue contacts and current priorities.
- **Pipeline** supports Board and Table views plus active and archived stages.
- **Vacancy detail** keeps application data, match evidence, contacts, notes and activity history together.
- **Duplicate protection** checks normalized vacancy URL and `company + role`.
- **Candidate Profiles** are editable and power deterministic matching.
- **Vacancy Analyzer** runs transparent local rules in the browser; pasted vacancy text is not sent to an AI service.
- **Local Analytics** calculates application activity, response rate, interviews, offers, conversion and source performance from browser-stored records.
- **Data safety** includes JSON backup, CSV export, import preview, Merge / Replace, a safety backup before Replace and undo for deletion.
- **Bilingual UX** supports English and Russian.

## Privacy surface

The public UI includes a compact bilingual Privacy dialog explaining:

- CRM data is stored in browser `localStorage`;
- vacancy records, notes and recruiter contacts are not sent to an application server;
- matcher/import/export processing is local;
- browser storage can be cleared and there is no cross-device sync;
- backup files are the user's responsibility;
- Vercel may process ordinary technical hosting request data;
- external links are handled by their destination sites.

This documentation describes current product behavior. It does not claim complete legal compliance.

See also:

- [`PRIVACY.md`](./PRIVACY.md)
- [`PRIVACY-DATA-MAP.md`](./PRIVACY-DATA-MAP.md)
- [`SECURITY-NOTES.md`](./SECURITY-NOTES.md)

## No product tracking

v1.1 intentionally contains no:

- Yandex Metrica;
- Google Analytics;
- Webvisor;
- advertising/session-replay tracker.

The previous analytics-consent module and counter code were removed rather than keeping a consent banner for analytics the product does not need.

## Self-hosted fonts

Manrope and Unbounded no longer load from `fonts.googleapis.com` / `fonts.gstatic.com`.

Pinned Fontsource packages are used at build time. `npm run build` copies only the required Latin and Cyrillic variable WOFF2 files into the static deployment together with their OFL license files.

Runtime font requests therefore go to the same application origin.

## Data schema v3

A vacancy supports:

```text
id
company / role / direction
status / priority / matchScore
source / url
location / workMode / salary
description / notes
createdAt / updatedAt / appliedAt / followUpAt
nextAction
contactName / contactChannel
strengths / gaps
rejectionReason
profileId
history[]
```

The workspace is stored under:

`anostosio-job-search-crm-v3`

Legacy v1/v2 workspace keys are read and migrated locally.

## Import / export security

JSON import is treated as an untrusted-data boundary. Current protections include:

- 2 MB maximum backup size;
- record-count limits;
- schema/envelope validation;
- rejection of unsupported future schema versions;
- dangerous object-key rejection;
- nesting-depth limit;
- normalized safe identifiers;
- bounded fields/lists/history;
- HTTP(S)-only vacancy URLs;
- no execution of JSON as JavaScript.

CSV export neutralizes leading spreadsheet formula characters before writing user-controlled values.

Backups can contain personal or sensitive notes and should be stored accordingly.

## Security headers

The Vercel static deployment adds a restrictive Content Security Policy and basic hardening headers. In particular, `connect-src 'self'` prevents runtime JavaScript from making arbitrary cross-origin network connections without an explicit future policy change.

## Architecture

```text
app.js                 UI orchestration
privacy.js             bilingual privacy UI; no telemetry
fonts.css               local @font-face declarations
style.css               product styles
privacy.css             privacy UI styles
lib/storage.js          localStorage persistence + migration
lib/jobs.js             vacancy model + URL/ID/history normalization
lib/matcher.js          local deterministic matcher
lib/profiles.js         bounded candidate profile model
lib/date.js             local calendar helpers
lib/import-export.js    backup validation / JSON / CSV
lib/analytics.js        local pipeline-statistics calculations
scripts/build.mjs       static dist build + local font copy
vercel.json             static output + security headers
```

## Development

Requires Node 20+.

```bash
npm install
npm run check
npm run build
```

`npm run build` produces a static `dist/` directory. No runtime Node server is required.

GitHub Actions installs dependencies, runs syntax/tests and verifies the static build.

## Future privacy gate

**Do not add cloud sync, Supabase, accounts, server-side notifications, AI APIs, server-side vacancy processing or visitor analytics without a new privacy/legal/security audit.**

Those features change the data flow and invalidate assumptions in the current privacy documentation.

---

**Product concept, UX/UI and front-end by Anostosio°**
