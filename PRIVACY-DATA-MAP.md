# Job Search CRM — Privacy & Data Map

**Anostosio° / Product Lab**  
Audit baseline: **4 September 2026**

This document describes the actual data flow of the strict local-first build. It is a technical map, not a claim of complete legal compliance.

## 1. Core CRM data flow

```text
USER INPUT
  company / role / salary / notes / follow-up / URL
  vacancy description / match score / recruiter contact
  candidate profiles
        ↓
BROWSER UI
        ↓
NORMALIZATION + LOCAL VALIDATION
        ↓
LOCALSTORAGE
        ↓
LOCAL PROCESSING
  Today / Pipeline / local statistics / vacancy matcher
        ↓
OPTIONAL LOCAL EXPORT
  JSON / CSV file created in the browser
```

The application has no account system, application backend, cloud database or cloud synchronization in this version.

## 2. What is stored locally

The main workspace is persisted under the browser localStorage key:

`anostosio-job-search-crm-v3`

It may contain:

- company and role;
- source and vacancy URL;
- location and work mode;
- salary;
- vacancy description;
- notes;
- status, priority and match score;
- application and follow-up dates;
- next action and rejection reason;
- recruiter/contact name and channel;
- strengths, gaps and activity history;
- candidate profiles and their matching preferences.

Language and onboarding state are also stored locally in separate localStorage keys.

## 3. Local vacancy matcher

`lib/matcher.js` is deterministic browser-side JavaScript. The pasted vacancy text and candidate profile are not sent to an AI/LLM service.

When the user chooses to add an analysis result to the pipeline, the resulting vacancy data becomes part of the local workspace in localStorage.

## 4. Import and export

### Export

JSON and CSV backups are created with browser `Blob` and object URLs. The application does not upload those files.

Backup files may contain personal or sensitive notes entered by the user. Their storage and sharing are the user's responsibility.

### Import

A selected JSON backup is read with the browser File API and parsed locally. Import includes:

- 2 MB file-size limit;
- record-count limits;
- recognized schema checks;
- unsafe object-key rejection;
- field normalization and length limits;
- safe identifier normalization;
- HTTP(S)-only vacancy URL normalization.

Imported JSON is parsed as data and is not evaluated as JavaScript.

## 5. Page hosting is a separate data flow

```text
PAGE REQUEST
     ↓
VERCEL
     ↓
STATIC HTML / CSS / JS / FONTS / ASSETS
```

The CRM contents in localStorage are not included in this page request by application code.

Vercel, as the technical hosting platform, may process normal infrastructure information associated with web requests, such as IP address, request metadata and platform/access logs. This infrastructure layer must not be described as the same thing as CRM workspace contents.

## 6. External links

A user may explicitly open:

- a stored vacancy URL;
- the Anostosio° portfolio link.

That navigation goes to a third-party website. The destination site then receives and processes its own request under its own rules.

The application does not track those outbound clicks.

## 7. Third-party runtime services

The strict local-first build intentionally does **not** include:

- Yandex Metrica;
- Google Analytics;
- Webvisor;
- advertising trackers;
- Google Fonts runtime requests;
- AI/LLM API calls;
- Supabase;
- server-side vacancy parsing;
- cloud sync.

Manrope and Unbounded are copied from Fontsource packages at build time and served as local WOFF2 files from the application origin.

## 8. Browser storage lifecycle

Data remains tied to the current browser/profile and origin. It may disappear when the user:

- clears site data;
- clears browser storage;
- uses a different browser profile or device;
- loses the local browser profile.

There is no automatic cross-device recovery. Exported backups are therefore the user's responsibility.

## 9. Future privacy gate

A new privacy/legal/security audit is required **before** implementing any feature that changes this data flow, especially:

- account system or authentication;
- Supabase or another cloud database;
- cloud backup/sync;
- server-side notifications;
- email integration;
- collaboration or shared workspaces;
- AI/LLM evaluation;
- server-side processing of vacancy text or notes;
- product analytics or advertising analytics.

Those features must not inherit the current local-first privacy wording without a new audit.
