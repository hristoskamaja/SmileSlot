# SmileSlot — Project Brief for Claude Code

## Context
This is my submission for the **TeamLift Product Engineer Internship Challenge**. Deadline: **October 25, 2026**.

The reviewers evaluate:
- a clean, intuitive UI
- a flow that works end to end
- readable, well-organized code
- how I used AI tools
- my own choices and ideas

They evaluate with **~2 hours of work** in mind: "a focused, working app is better than a big unfinished one."

**Rule: I must understand and be able to explain every line in the interview.** Keep the code simple and readable. Don't add anything I didn't ask for. When you write something non-obvious, explain it briefly.

## The app
**SmileSlot** is a booking app for a dental clinic with several doctors.
- Clinic staff publish available time slots for a doctor.
- Patients pick a doctor and a service, see free slots in a weekly calendar, and book one with their name and email.

### Required by the challenge (MUST work end to end)
1. Create available time slots: date, start time, duration.
2. See the list of available slots.
3. Book a slot with name and email.
4. A booked slot is no longer available. **No double bookings**, enforced in the database, not only in the UI.

### Constraints from the challenge
- **No login or user accounts.**
- **One time zone:** Europe/Skopje. Store timestamps as `timestamptz` and display in this zone.
- **Data must persist** in PostgreSQL.
- **Clear local run instructions** in the README.

### My own additions ("Make It Your Own")
- **Multiple doctors.** The brief assumes a single host. I chose a small clinic with several doctors and will explain this choice in the README. There is still no login: doctors are rows in a table.
- **Services with durations:** Check-up 20 min, Cleaning 30 min, Filling 60 min, Whitening 45 min. When creating a slot, staff choose a service and the duration auto-fills (still editable). Patients can filter slots by service.
- **Weekly calendar grid UI** (like Google Calendar week view).
- **Onboarding tour** on first visit (driver.js).

### Optional extras from the challenge (both, in this order)
1. **AI:** when a booking is created, the backend calls **Gemini via Google AI Studio (free tier)**.
   - It generates a short, friendly confirmation message plus 2–3 practical preparation tips for the chosen service.
   - **No medical diagnosis or medical advice.**
   - If Gemini fails, times out, or returns 429, use a template fallback message. **Booking must never fail because of AI.**
2. **Google Calendar:** slots that clash with a doctor's existing Google Calendar events are marked `calendar_busy`. They are shown greyed out, not hidden, and cannot be booked.
   - Use a **service account**. Each doctor's calendar is shared with the service account email, and each doctor has a nullable `google_calendar_id`.
   - Use **FreeBusy.query** for the visible week.
   - If not configured or the call fails, skip the check gracefully.
   - **This is the last phase. Only do it if everything else is done and deployed.**

## Tech stack
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, lucide-react, date-fns, React Router, TanStack Query, react-hook-form + zod, sonner (toasts), driver.js (tour).
- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic (migrations), psycopg, pytest. Gemini via the official `google-genai` SDK. Google Calendar via `google-api-python-client` + `google-auth`.
- **Database:** PostgreSQL (local via Docker Compose; hosted on Neon).
- **Hosting:** frontend on Vercel, backend on Render, database on Neon.

## Repository structure
```
smileslot/
  frontend/          React app
  backend/
    app/
      main.py        FastAPI app, CORS, routers
      config.py      settings from env vars
      db.py          engine + session
      models.py      SQLAlchemy models
      schemas.py     Pydantic request/response models
      routers/       doctors.py, services.py, slots.py, bookings.py
      services/      ai.py (Gemini), calendar.py (Google Calendar)
      seed.py        sample doctors, services, slots
    alembic/
    tests/
  design/            Lovable screenshots (visual reference only)
  docker-compose.yml Postgres for local dev
  README.md
  CLAUDE.md
```

## Data model
- **doctors:** `id`, `name`, `specialty`, `color`, `google_calendar_id` (nullable)
- **services:** `id`, `name`, `duration_minutes`, `description`
- **slots:** `id`, `doctor_id` (FK), `service_id` (FK), `start_at` (timestamptz), `duration_minutes`, `created_at`
- **bookings:** `id`, `slot_id` (FK, **UNIQUE**), `patient_name`, `patient_email`, `note` (nullable), `ai_message`, `created_at`

The **UNIQUE constraint on `bookings.slot_id`** is the real protection against double booking. Insert the booking inside a transaction. If the insert fails on the unique constraint, return **409 Conflict**.

A slot's `status` is computed, not stored:
- `booked` if a booking exists
- `calendar_busy` if it clashes with Google Calendar
- otherwise `available`

## API (prefix `/api`, JSON, snake_case)
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | health check |
| GET | `/doctors` | list doctors |
| GET | `/services` | list services |
| GET | `/slots?doctor_id=&week_start=&service_id=` | slots for one doctor and week, each with computed `status` (+ `patient_name` when booked, for the clinic view) |
| POST | `/slots` | create a slot. Validate: in the future, positive duration, no overlap with the same doctor's slots (422 with a clear message) |
| DELETE | `/slots/{id}` | delete a slot; only if not booked (409 otherwise) |
| POST | `/bookings` | book a slot. Validate name and email (Pydantic `EmailStr`). Reject past, booked, or calendar_busy slots (409). Returns the booking incl. `ai_message` (201) |

Return errors in one consistent shape: `{ "detail": "human readable message" }`.

## Frontend
**Visual design — the screenshots in `/design` (made with Lovable) are the source of truth for how the app looks.**
- Follow the screenshots for colors, fonts, spacing, layout, and component style.
- The text below describes **behavior and states only**. If it conflicts with a screenshot on anything visual, follow the screenshot and tell me about the conflict.
- Screenshot files:
  - `01-book.png`: Book page
  - `02-booking-dialog.png`: booking dialog
  - `03-confirmation.png`: confirmation view
  - `04-clinic.png`: Clinic page
  - `05-tour.png`: onboarding tour
  - `06-states.png`: empty and loading states

All HTTP calls live in `src/api/client.ts`, and types live in `src/types.ts`. The API base URL comes from `VITE_API_URL`.

### Pages
1. **Book (`/`):**
   - Header with the SmileSlot logo, nav, and a "?" button that restarts the tour.
   - Toolbar with doctor selector, service filter chips, and week navigation (prev / Today / next).
   - Weekly grid: Mon–Sat, 08:00–18:00. Slot blocks are positioned by time, sized by duration, and colored by service.
   - States: available (clickable), booked (striped, "Booked"), calendar_busy (grey + calendar icon), past (dimmed).
   - A legend under the grid.
   - Below 768px width, show a list grouped by day instead of the grid.
2. **Booking dialog:**
   - Summary card plus name, email, and optional note fields.
   - On 409, show the toast "Sorry, this slot was just booked" and refetch.
   - On success, show a confirmation view with the summary and a card "A message for you" showing `ai_message`.
3. **Clinic (`/clinic`):**
   - Doctor selector.
   - "Add slot" form: date, start time in 15-min steps, service with auto-filled duration.
   - The same grid, where booked slots show the patient's name and available slots can be deleted (with confirm).
   - A stats row: total / booked / available this week.
4. **Onboarding tour:**
   - driver.js, 4 steps: doctor selector → service filters → grid → help button.
   - A "seen" flag in localStorage, accessed inside try/catch.

### Always handle
- loading skeletons
- empty state ("No free slots this week — try next week" + button)
- error state with Retry
- disabled submit while sending
- toasts
- labels on inputs and visible focus

## Environment variables
**backend `.env`:**
- `DATABASE_URL`
- `CORS_ORIGINS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (a Flash model available on the AI Studio free tier)
- `GOOGLE_SERVICE_ACCOUNT_JSON` (optional)
- `TIMEZONE=Europe/Skopje`

**frontend `.env`:**
- `VITE_API_URL`

Provide `.env.example` files. **Never commit secrets or the service-account key.** Add them to `.gitignore`.

## Phases (work one phase at a time)
**Phase 0 — Setup.**
- Repo structure, Docker Compose Postgres, FastAPI skeleton with `/api/health`, Vite app.
- Alembic migration for the models, plus a seed script (3 doctors, 4 services, sample slots this week).

**Phase 1 — MUST.**
- Endpoints for doctors, services, slots, and bookings, with validation and the unique constraint.
- pytest tests: double booking returns 409, overlapping slot returns 422, booking a past slot is rejected.
- Frontend Book page, booking dialog, and Clinic page connected to the real API.
- **Deploy** (Neon + Render + Vercel) and verify the live flow end to end.

**Phase 2 — SHOULD.**
- Services filter polish, confirmation view, and onboarding tour.
- Gemini endpoint integration with fallback.
- Redeploy.

**Phase 3 — NICE.** Google Calendar FreeBusy integration. Redeploy.

**Phase 4 — Submission.**
- README: how to run locally (step by step), what I built and why (incl. multiple doctors and services), which AI tools I used and how (Lovable for visual design, Claude Code for implementation, Gemini in the app), what I'd improve with more time, and the live link.
- Optional ≤2-min walkthrough video.

## How to work with me
- **Before each phase, show a short plan and wait for my approval.**
- Git: never commit on your own. When a logical step is done, show me a summary of the changes and a proposed commit message, and commit only after I approve. Never push, force-push, or rewrite history; I push myself.
- Use clear commit messages (e.g. `feat(bookings): reject double booking with 409`).
- Prefer simple, readable code over clever code. Use plain functions, clear names, and short comments only where the "why" isn't obvious.
- Don't add libraries, features, or abstractions beyond this file without asking.
- After each phase, tell me how to test it manually, and briefly summarize what changed so I can explain it in the interview.
