# Job Search CRM

A bilingual local-first job-search CRM with pipeline tracking, follow-ups and a transparent vacancy-matching layer.

**Live demo:** https://job-search-crm-psi.vercel.app/

## Portfolio snapshot

**Role:** Product concept · UX/UI · data model · front-end · matching logic · deployment  
**Status:** MVP v0.3 — deployed  
**Format:** EN / RU · local-first web app  
**Core idea:** turn scattered vacancy tracking into a clear, private and actionable decision system

## Problem

Job searching quickly becomes hard to manage when vacancies are spread across job boards, chats, emails and notes. A spreadsheet can store rows, but it does not automatically surface the strongest opportunities, overdue follow-ups or the reasoning behind a match score.

## Solution

Job Search CRM combines a lightweight application pipeline with local decision support.

The user can:

- add, edit and delete vacancies
- move roles through application stages
- assign match score and priority
- store salary, source, link and notes
- set follow-up dates
- search, filter and sort the pipeline
- see live pipeline statistics
- paste a vacancy description into a local matcher
- receive detected strengths, gaps and a suggested score
- save the analysis directly into the CRM
- export and restore the whole dataset as JSON
- switch between English and Russian

## Product flow

```text
Vacancy / application data
      ↓
Local data model
      ↓
localStorage persistence
      ↓
Search / filters / sorting
      ↓
Pipeline dashboard + next actions

Vacancy description
      ↓
Transparent local matching rules
      ↓
Strengths + risks + suggested score
      ↓
Optional save into CRM
```

## Key product decisions

### 1. Local-first by default

The MVP stores job-search data in the browser. No account, backend or database is required, and personal vacancy data does not need to leave the device.

### 2. Transparent matching instead of fake AI

The current matcher is deliberately rule-based. It checks vacancy text for relevant signals and risk patterns, then explains what contributed to the result. The logic is inspectable in `app.js` and can be adjusted.

### 3. Decision support, not just storage

The dashboard calculates active opportunities, average match, follow-up pressure and the strongest current role. The matcher adds an explainable first-pass evaluation before a vacancy enters the pipeline.

### 4. Portable data

JSON export and import make the local-first approach less fragile. A user can back up the pipeline and restore it in another browser session.

### 5. Shared bilingual UX

English and Russian reuse one application state and logic layer instead of duplicating the project.

## What I built

- Product concept and workflow
- Vacancy data model
- CRUD flow
- application status pipeline
- match and priority system
- search, filters and sorting
- live statistics
- next-action recommendations
- localStorage persistence
- JSON backup / restore
- EN / RU interface
- rule-based vacancy parser
- strengths / risks extraction
- score and verdict generation
- save-analysis-to-CRM flow
- responsive UI
- Vercel deployment

## Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Local Storage API
- File / Blob API
- JSON parsing and validation
- rule-based text matching
- responsive layout
- Git / GitHub
- Vercel

## Matching logic

The matcher looks for signals relevant to a junior AI-builder / design-led product profile, such as:

- Figma and product design
- AI coding tools
- JavaScript
- GitHub and deployment
- APIs / JSON
- visual communication
- product thinking
- junior-friendly language
- remote work

It also flags selected risk signals such as advanced backend requirements, strong production React / TypeScript expectations, multiple years of commercial development, office-only constraints and mandatory specialist degrees.

The output is intentionally framed as **decision support**, not as a model-generated truth about a candidate.

## What I learned

This project gave me practical experience with application state, CRUD operations, browser persistence, data portability, text parsing and explainable scoring logic.

The strongest product lesson was that automation does not always need an LLM. For a constrained first-pass task, transparent rules can be faster to test, cheaper to run and easier to explain. That also creates a clear future path: compare the deterministic matcher with a server-side AI evaluator instead of replacing working logic blindly.

## Current MVP

**MVP v0.3 — deployed local vacancy matcher**

Included now:

- EN / RU interface
- local-first CRM
- application pipeline
- search / filters / sorting
- dashboard statistics
- follow-up support
- JSON backup / restore
- local vacancy matcher
- explained strengths and gaps
- suggested match score
- deployed live demo

## Next iterations

- editable skill profile and weights
- CSV export
- kanban pipeline view
- richer analytics
- optional AI-assisted comparison behind a server endpoint
- cloud sync / Supabase version
- reminders and browser notifications

## Related work

**AI Brand Brief:** https://ai-brand-brief.vercel.app/  
A bilingual branding product focused on structured generation, safe server-side AI architecture, editable output and graceful fallback.

**Portfolio:** https://anostosio.ru/

---

Created by **Anostosio°**  
Graphic Design · Branding · Advertising · AI-assisted Product Building