# Job Search CRM

A bilingual job-search CRM for tracking vacancies, application stages, match scores, follow-ups and notes.

**Live demo:** https://job-search-crm-psi.vercel.app/

This is the second project in my AI-assisted product building / vibe-coding portfolio.

## What it does

- Add, edit and delete vacancy records
- Track application status from candidate to offer / rejection
- Assign match score and priority
- Store salary, source, vacancy URL and notes
- Set follow-up dates
- Search and filter the pipeline
- Sort by match, recency or follow-up
- Show live pipeline statistics
- Surface simple priority recommendations
- Persist data locally in the browser with `localStorage`
- Export the full CRM as JSON
- Import JSON backups
- Switch between English and Russian UI

## Why I built it

Job searching becomes difficult to manage once vacancies are spread across job boards, chats, emails and notes. This project turns that process into a lightweight personal CRM with a clear pipeline and a small decision-support layer.

The product is intentionally local-first: no account is required and no personal job-search data leaves the browser.

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Local Storage API
- File / Blob API for JSON export
- JSON import and validation flow
- Responsive layout
- Git / GitHub
- Vercel static deployment

## Product architecture

```text
Vacancy input
    ↓
Local data model
    ↓
localStorage persistence
    ↓
Filters / sorting / search
    ↓
Pipeline dashboard + recommendations
    ↓
JSON backup / restore
```

## Key product decisions

### Local-first storage

The MVP stores records in the browser. This keeps the app immediately usable without authentication, a database or a backend.

### Portable data

Users can export their pipeline as JSON and restore it later. This avoids locking the data into one browser session.

### Decision support, not just storage

The dashboard calculates active pipeline size, average match score, overdue follow-ups and the strongest current opportunity. It also surfaces simple next-action recommendations.

### Bilingual UX

The interface can switch between English and Russian without duplicating the app into separate codebases.

## Demo data

The first launch contains three fictional example vacancies so the dashboard is understandable immediately. They can be edited or deleted.

## Current status

**MVP v0.2 — deployed portfolio prototype**

Live at: https://job-search-crm-psi.vercel.app/

Next improvements:

- optional AI vacancy analysis
- automatic match summary from pasted vacancy text
- CSV export
- kanban pipeline view
- richer analytics
- cloud sync / Supabase version
- reminders and browser notifications

## About

Created by **Anostosio°**  
Graphic Design · Branding · Advertising · AI-assisted Product Building

Portfolio: https://anostosio.ru/
