# Job Search CRM

A bilingual job-search CRM with local vacancy matching, application stages, follow-ups and decision support.

**Live demo:** https://job-search-crm-psi.vercel.app/

This is the second project in my AI-assisted product building / vibe-coding portfolio.

## What it does

- Add, edit and delete vacancy records
- Track application status from candidate to offer / rejection
- Assign match score and priority
- Store salary, source, vacancy URL and notes
- Set follow-up dates
- Search, filter and sort the pipeline
- Show live pipeline statistics
- Surface priority recommendations
- Paste a vacancy description and run a local fit analysis
- Highlight matched skills and potential gaps
- Generate a suggested match score and recommendation
- Save the analysis result directly into the CRM
- Persist all CRM data locally with `localStorage`
- Export and import JSON backups
- Switch between English and Russian UI

## Local vacancy matcher

The v0.3 matcher is deliberately rule-based and runs entirely in the browser.

It checks vacancy text for signals relevant to a junior AI-builder / design-led product profile, including Figma and product design, AI coding tools, JavaScript, GitHub, deployment, API / JSON work, visual communication, product thinking, junior-friendly language and remote work.

It also detects several risk signals such as advanced backend requirements, strong production React / TypeScript expectations, multiple years of commercial development, office-only constraints and mandatory specialist degrees.

The matcher then produces:

- a 20–96% suggested match score
- a fit verdict
- detected strengths
- detected gaps / risks
- an application recommendation

The result is decision support, not a claim that a model has evaluated the candidate. The rules are visible in `app.js` and can be changed or extended.

## Why local-first

For this MVP, vacancy descriptions and personal job-search data do not need to leave the browser. The app therefore works without an account, database, API key or paid AI service.

This also creates a clear product progression: first make the analysis logic transparent and testable, then optionally replace or augment it with an AI-assisted server-side evaluator later.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Local Storage API
- rule-based text matching
- File / Blob API for JSON export
- JSON import and validation flow
- responsive layout
- Git / GitHub
- Vercel static deployment

## Product architecture

```text
Vacancy description
      ↓
Local keyword / risk rules
      ↓
Match score + strengths + gaps
      ↓
Optional save to CRM
      ↓
localStorage persistence
      ↓
Filters / sorting / dashboard
      ↓
JSON backup / restore
```

## Key product decisions

### Local-first storage

The MVP stores records in the browser. This keeps the app immediately usable without authentication, a database or a backend.

### Transparent matching

Instead of pretending that a deterministic score is AI, the current version clearly labels the feature as a local rule-based matcher. The scoring logic can be inspected, tested and adjusted.

### Decision support, not just storage

The dashboard calculates active pipeline size, average match score, overdue follow-ups and the strongest current opportunity. The matcher adds another layer by turning raw vacancy text into an actionable fit summary.

### Bilingual UX

The interface and matcher outputs switch between English and Russian without maintaining two separate applications.

## Demo data

The first launch contains three fictional example vacancies so the dashboard is understandable immediately. The matcher also includes a fictional junior AI Product Builder description for one-click testing.

## Current status

**MVP v0.3 — deployed local vacancy matcher**

Live at: https://job-search-crm-psi.vercel.app/

Next improvements:

- editable matcher profile / skill weights
- CSV export
- kanban pipeline view
- richer analytics
- optional AI-assisted comparison behind a server-side endpoint
- cloud sync / Supabase version
- reminders and browser notifications

## About

Created by **Anostosio°**  
Graphic Design · Branding · Advertising · AI-assisted Product Building

Portfolio: https://anostosio.ru/
