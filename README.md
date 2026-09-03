# Job Search CRM

**Anostosio° / Product Lab · Project 02 · v1.0**

Job Search CRM turns job search into a clear system of opportunities, actions and decisions. It is a bilingual, local-first workspace for daily pipeline management — not a job board and not a spreadsheet wrapper.

**Live:** https://job-search-crm-psi.vercel.app/  
**Portfolio:** https://anostosio.ru/

## What v1.0 does

- **Today workspace** surfaces due actions, overdue contacts, applications waiting for response, roles that still need an application, upcoming tests/interviews and the strongest current opportunity.
- **Pipeline** has Board and Table views, active stages (`candidate → preparing → applied → test → interview → offer`) and a separate Archive for `rejected` / `closed`.
- **Vacancy detail** keeps overview, application data, match evidence, contact details, notes and activity history in one focused surface.
- **Duplicate protection** checks normalized URL and normalized `company + role` before a new record is created.
- **Candidate Profiles** support Design and AI Builder out of the box and remain fully editable.
- **Vacancy Analyzer** uses transparent local rules with six visible dimensions instead of an opaque score.
- **Analytics** focuses on applications, active opportunities, response rate, interviews, offers, overdue contacts, conversion and source performance.
- **Data safety** includes versioned JSON backup, legacy migration, import preview, Merge / Replace, safety backup before Replace, CSV export and undo for vacancy deletion.
- **Bilingual UX** keeps the same product structure in English and Russian.
- **Accessibility** includes semantic landmarks, skip link, visible focus, keyboard-accessible actions, modal dialogs, live status messages, minimum mobile hit areas and reduced-motion support.

## Product model

The application is local-first. No account, backend or cloud database is required for v1.0. Vacancy data stays in the browser until the user explicitly exports it.

```text
Vacancy / analyzer input
        ↓
Schema v3 workspace
        ↓
localStorage persistence
        ↓
Today / Pipeline / Analytics
        ↓
Versioned JSON + CSV backup
```

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

Activity history records key events such as creation, stage changes, application, scheduled follow-up, notes, tests, interviews, rejection and offer.

### Legacy migration

v1.0 reads the previous `anostosio-job-search-crm-v1` / v2-style data and migrates it to schema v3 without deleting the old storage key. Legacy fields such as `match` and `followup` are normalized to `matchScore` and `followUpAt`.

## Transparent matcher v2

The local matcher scores a vacancy against the selected Candidate Profile across visible dimensions:

| Dimension | Max |
| --- | ---: |
| Role relevance | 25 |
| Skills | 25 |
| Format / geography | 15 |
| Experience level | 15 |
| Compensation | 10 |
| Risks / constraints | 10 |

The result includes a final score, dimension breakdown, strong signals, gaps, hard blockers, recommendation and suggested priority. The implementation is deterministic and does not present local rules as AI.

## Import / export safety

JSON backups use:

```json
{
  "schemaVersion": 3,
  "exportedAt": "...",
  "profiles": [],
  "jobs": [],
  "settings": {}
}
```

Import validates JSON shape and size, normalizes jobs and URLs, supports older backups, previews the incoming workspace and offers **Merge** or **Replace**. Replace creates a safety backup first.

## Empty and demo workspaces

v1.0 does not silently seed fake vacancies. First launch offers three explicit options:

- Start empty
- Load demo workspace
- Import backup

Demo vacancies are marked as demo records.

## Architecture

Vanilla JavaScript stays intentionally lightweight and is split by responsibility:

```text
app.js                 UI orchestration
lib/storage.js         schema v3 persistence + migration
lib/jobs.js            vacancy model + duplicates + history + URL safety
lib/matcher.js         profile-aware transparent scoring
lib/profiles.js        candidate profile model
lib/date.js            local calendar-date helpers
lib/import-export.js   backup validation / merge / CSV
lib/analytics.js       pipeline and conversion calculations
lib/i18n.js            EN / RU product copy
```

No React, Supabase, authentication or LLM dependency is required for v1.0.

## Design system

Job Search CRM shares the Product Lab visual language with Brand Brief Studio without copying its information architecture:

- warm editorial palette
- Unbounded for display / key numbers
- Manrope for UI and body
- calm cards and panels
- semantic status colors
- visible focus states
- restrained shadows
- tool-first layout instead of a recurring marketing hero

## Responsive behavior

Desktop uses the full workspace and board. Tablet collapses the application shell while keeping the navigation available. Mobile uses horizontally navigable pipeline columns, compact controls, full-height vacancy detail and 44px minimum interactive targets.

## Quality

Run locally with any static server. Automated checks require Node 20+:

```bash
npm test
npm run check
```

Tests cover:

- data migration
- duplicate detection
- matcher calculation
- local date helpers
- import validation
- URL sanitization
- pipeline statistics / analytics

GitHub Actions runs tests and syntax checks on pushes and pull requests to `main`.

## Product Lab surface

The repository includes favicon, web manifest, theme color, Open Graph / Twitter metadata, canonical URL, hreflang, robots.txt and sitemap.xml. v1.0 does not load third-party analytics by default, keeping the production surface aligned with the local-first product promise.

---

**Product concept, UX/UI and front-end by Anostosio°**  
https://anostosio.ru/
