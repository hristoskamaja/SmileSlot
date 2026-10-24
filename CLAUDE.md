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
   - How it works: `services/ai.py` has `generate_confirmation(patient_name, doctor_name, service_name, when)`, with a 12-second timeout (Gemini rejects deadlines under 10 seconds). It **raises** on any problem (no key, error, timeout, 429, empty text). The single fallback is in `routers/bookings.py` (`get_confirmation_message`): it catches everything, logs a short warning (for Gemini errors the status code and message, otherwise the error type; never the key or the prompt), and uses the template.
   - It is called only after the 404/409 checks pass and before the insert. The patient name is truncated and passed as data; the booking `note` is never sent to Gemini.
   - Tests stub the AI (autouse fixture in `conftest.py`), so no test touches the network.
2. **Google Calendar:** slots that clash with a doctor's existing Google Calendar events are marked `calendar_busy`. They are shown greyed out, not hidden, and cannot be booked.
   - Use a **service account**. Each doctor's calendar is shared with the service account email, and each doctor has a nullable `google_calendar_id`.
   - Use **FreeBusy.query** for the visible week.
   - If not configured or the call fails, skip the check gracefully.
   - How it works: `services/calendar.py` has `get_busy_intervals(calendar_id, start, end)` (5-second timeout, scope `calendar.readonly`). It **raises** on any problem and only ever returns busy time ranges, never event titles. `GOOGLE_SERVICE_ACCOUNT_JSON` is either the JSON itself (starts with `{`) or a path to the key file.
   - `routers/slots.py` has the single fallback, `busy_intervals_or_empty`: no calendar id, no service account, or any error means `[]` and one short warning in the log (error type only). A slot is `calendar_busy` when `slot_start < busy_end AND slot_end > busy_start` (touching ranges do not clash); a booked slot stays `booked`. `GET /slots` makes one FreeBusy call for the whole week. `POST /bookings` checks just the slot's own range (409 "The doctor is busy at this time") before the AI call.
   - The seed leaves `google_calendar_id` empty; only if `DEMO_CALENDAR_ID` is set does the first doctor (Dr. Elena Petrova) get it.
   - UI: "Doctor busy" (grey block, calendar icon, tooltip "Doctor is busy (Google Calendar)"). Not clickable on the Book page; on the Clinic page it stays deletable (unless in the past).
   - Tests mock `get_busy_intervals` (autouse stub in `conftest.py`), so no test touches the network.

## Tech stack
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, lucide-react, date-fns, React Router, TanStack Query, react-hook-form + zod, sonner (toasts), driver.js (tour). Tests (local only, no CI): Vitest + React Testing Library + jest-dom + user-event on jsdom, run with `npm test`.
- **Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic (migrations), psycopg, pytest. Gemini via the official `google-genai` SDK. Google Calendar via `google-api-python-client` + `google-auth`.
- **Database:** PostgreSQL (local via Docker Compose; hosted on Render Postgres).
- **Hosting:** everything on Render: Static Site (frontend), Web Service (backend), Render Postgres (database). See "Deployment".

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
- **bookings:** `id`, `slot_id` (FK, **UNIQUE**), `patient_name`, `patient_email`, `patient_phone` (nullable), `note` (nullable), `ai_message`, `cancel_token` (nullable), `created_at`

The **UNIQUE constraint on `bookings.slot_id`** is the real protection against double booking. Insert the booking inside a transaction. If the insert fails on the unique constraint, return **409 Conflict**.

`cancel_token` is a random secret (`secrets.token_urlsafe`) created with the booking. It is returned **only** in the response to `POST /bookings` and must never appear in any other response (slots list, Clinic view). It is nullable so bookings made before cancellation existed (e.g. the seeded ones) still work; a booking without a token can never be cancelled. The patient's browser keeps the token in localStorage.

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
| GET | `/slots?doctor_id=&week_start=&service_id=` | slots for one doctor and week, each with computed `status` (+ `patient_name` when booked, for the clinic view). **Never** returns email, phone or note |
| GET | `/slots/{id}/booking` | the booking's `patient_name`, `patient_email`, `patient_phone`, `note`, `created_at`, for the clinic details dialog. 404 if the slot has no booking. Never includes `cancel_token` |
| POST | `/slots` | create a slot. Validate: in the future, positive duration, no overlap with the same doctor's slots (422 with a clear message) |
| DELETE | `/slots/{id}` | delete a slot; only if not booked (409 otherwise) |
| POST | `/bookings` | book a slot. Validate name and email (Pydantic `EmailStr`). Optional `patient_phone`: trimmed, empty counts as not provided, otherwise 6-20 characters of digits, spaces, `+ - ( )` (422 if not). The phone is stored but never echoed in the response, put in localStorage, or sent to Gemini. Reject past, booked, or calendar_busy slots (409). Returns the booking incl. `ai_message` and `cancel_token` (201) |
| DELETE | `/bookings/{id}?token=` | cancel a booking, up to 24 hours before the slot starts (`CANCELLATION_HOURS` in `config.py`). 404 if the booking does not exist; 403 if the token is missing or wrong (or the booking has none); 409 if the slot starts in less than 24 hours or is in the past. Otherwise 204, and the slot is available again |

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
   - The grid has a fixed height (760px, whatever the window size; the page scrolls below it), faint dashed lines at the half hours, and scrolls to the week's earliest slot when a week loads. Every block has a tooltip (service and time range; the Clinic also sees the patient's name). A block under 40 minutes shows "Label · 09:00" on one line, with a short label so it is not cut off: "Busy", "Yours", the patient's first name in the Clinic.
   - A thin teal "current time" line with a dot crosses today's column, above the slots but not blocking clicks. It shows only when the shown week is the current week and the clinic time is between 08:00 and 18:00, and it moves every minute (timer cleared on unmount).
   - Default week (both pages, clinic time): the current week, except on a Sunday or when the current week has no future slots; then next week. "Today" always goes to the current week.
   - A legend under the grid.
   - Below 768px width, show a list grouped by day instead of the grid.
2. **Booking dialog:**
   - Summary card plus name, email, optional phone, and optional note fields.
   - On 409, show the toast "Sorry, this slot was just booked" and refetch.
   - On success, show a confirmation view with the summary and a card "A message for you" showing `ai_message`.
3. **Clinic (`/clinic`):**
   - Doctor selector.
   - "Add slot" form: date, start time in 15-min steps, service with auto-filled duration.
   - The same grid, where booked slots show the patient's name and available slots can be deleted (with confirm).
   - Clicking a booked slot opens a read-only details dialog (service, doctor, date and time, patient name, email, phone, note; "Not provided" for empty fields), loaded from `GET /slots/{id}/booking`.
   - The header's "My appointments" button is hidden on this page.
   - A stats row: total / booked / available this week.
4. **Onboarding tour:**
   - driver.js, 4 steps: doctor selector → service filters → grid → help button.
   - A "seen" flag in localStorage, accessed inside try/catch.
5. **Dark mode:**
   - A sun/moon toggle in the header, next to the "?" button. The first visit follows `prefers-color-scheme`; a click is saved in localStorage (`smileslot-theme`, always in try/catch).
   - A `dark` class on `<html>` (set by `lib/theme.ts`, and by a small script in `index.html` before the first paint). `index.css` has the dark values for the same CSS variables; components never hardcode colors. Sonner is told the theme through its `theme` prop; the driver.js popover follows the variables.
   - Text contrast stays at least 4.5:1 in dark mode, including the 70%-opacity time line on slot blocks.

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
- `GEMINI_MODEL` (default `gemini-3.5-flash-lite`, a Flash model on the AI Studio free tier)
- `GOOGLE_SERVICE_ACCOUNT_JSON` (optional): the JSON content itself, or a path to the key file
- `DEMO_CALENDAR_ID` (optional, used only by the seed for the first doctor)
- `TIMEZONE=Europe/Skopje`

**frontend `.env`:**
- `VITE_API_URL`

Provide `.env.example` files. **Never commit secrets or the service-account key.** Add them to `.gitignore`.

## Deployment (all on Render)
- **Database: Render Postgres.**
  - The backend service uses the **Internal URL**. To run the migration and the seed from my computer, I set `DATABASE_URL` to the **External URL** for that command.
  - `config.py` accepts `postgres://` and `postgresql://` and turns them into `postgresql+psycopg://`; a URL already in that form stays as it is.
  - The free Render Postgres **expires 30 days after creation**.
- **Backend: Web Service.**
  - Root directory `backend`.
  - Build command: `pip install -r requirements.txt && alembic upgrade head`.
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
  - Python: `backend/.python-version` has `3.12.6`; also set the environment variable `PYTHON_VERSION=3.12.6` (the file may not be found when a root directory is set).
  - Environment: `DATABASE_URL` (Internal URL), `CORS_ORIGINS`, `GEMINI_API_KEY`, optional `GOOGLE_SERVICE_ACCOUNT_JSON` (the JSON itself).
  - `CORS_ORIGINS` is a comma-separated list; each origin has its scheme and no trailing slash, e.g. `https://smileslot-web.onrender.com,http://localhost:5173` (spaces after the commas are ignored).
- **Frontend: Static Site.**
  - Root directory `frontend`.
  - Build command: `npm install && npm run build`; publish directory `dist`.
  - Redirects/Rewrites: source `/*`, destination `/index.html`, action **Rewrite**, so `/clinic` works on refresh.
  - Environment: `VITE_API_URL` = the backend's public URL **ending in `/api`**, e.g. `https://smileslot-api.onrender.com/api` (as in `frontend/.env.example`). Vite puts it into the build, so changing it needs a new deploy.
- **Seed: manual.** `python -m app.seed` wipes the data, so it never runs on deploy. Run it from my computer when needed, with `DATABASE_URL` set to the External URL (same for a manual `alembic upgrade head`).

## Phases (work one phase at a time)
**Phase 0 — Setup.**
- Repo structure, Docker Compose Postgres, FastAPI skeleton with `/api/health`, Vite app.
- Alembic migration for the models, plus a seed script (3 doctors, 4 services). The seed is relative to today: slots Mon-Sat (none after 18:00, no overlaps) for a few past days, the current week and the next 3 weeks, about 35% of the future slots booked by fake patients (`@example.com`, some with phone or note, no `cancel_token`) plus a few past bookings. It uses a fixed random seed and is safe to run again.

**Phase 1 — MUST.**
- Endpoints for doctors, services, slots, and bookings, with validation and the unique constraint.
- pytest tests: double booking returns 409, overlapping slot returns 422, booking a past slot is rejected.
- Frontend Book page, booking dialog, and Clinic page connected to the real API.
- **Deploy** (everything on Render) and verify the live flow end to end.

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
- Never add a `Co-Authored-By` trailer to commits.
- Prefer simple, readable code over clever code. Use plain functions, clear names, and short comments only where the "why" isn't obvious.
- Don't add libraries, features, or abstractions beyond this file without asking.
- After each phase, tell me how to test it manually, and briefly summarize what changed so I can explain it in the interview.
