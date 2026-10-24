# SmileSlot

A booking app for a small dental clinic: staff publish time slots for each doctor, and patients pick a doctor and a service, see the free times in a weekly calendar and book one with their name and email.

- Live app: LIVE_URL_HERE
- Code: https://github.com/hristoskamaja/SmileSlot

SCREENSHOTS_HERE

## What I built

**The four required features**
1. Staff create available slots (date, start time, duration) on the Clinic page.
2. Patients see the free slots in a weekly calendar.
3. A patient books a slot with name and email.
4. A booked slot is no longer available, and a slot can never be booked twice.

**My own additions**
- **Several doctors.** The brief has one host. I chose a clinic with three doctors. There is still no login: doctors are rows in a table.
- **Services with durations** (Check-up 20, Cleaning 30, Filling 60, Whitening 45 min). Staff pick a service and the duration fills in, but it can be changed. Patients can filter by service.
- **Weekly calendar grid**, Monday to Saturday, with a day list on small screens.
- **"Your booking" and "My appointments".** A booking can be cancelled up to 24 hours before it starts. There is no login, so each booking gets a secret cancel token that the browser keeps.
- **Onboarding tour** on the first visit to the Book and Clinic pages.
- **Dark mode**, which follows the system setting until you choose.
- **Optional phone number.** The Clinic page opens the patient's details (email, phone, note) for a booked slot. The public slots list never contains them.
- **Demo data relative to today**, so the calendar always has past, current and upcoming slots, some of them booked.

**The two optional extras**
- **Gemini:** when a booking is created, the backend asks Gemini for a short confirmation and 2-3 practical preparation tips. It is told not to give medical advice, and the booking note is never sent to it. If Gemini fails, times out or returns 429, a template message is used.
- **Google Calendar (FreeBusy):** slots that clash with a doctor's calendar show as "Doctor busy" and cannot be booked. I only read busy and free times, never event details. It is connected for **one demo doctor, Dr. Elena Petrova**. The other doctors have no calendar and work normally.

**Key design decisions**
- Double booking is prevented by a UNIQUE constraint on `bookings.slot_id` in the database. The loser of a race gets a 409, so this holds even if the UI is out of date.
- Times are stored as `timestamptz` and shown in Europe/Skopje, the only time zone.
- Every error has the same shape: `{ "detail": "message" }`.
- Gemini and Google Calendar can never make a booking fail. If either is missing or broken, the app carries on without it and logs one short warning.

## Tech stack
- **Frontend:** React + TypeScript (Vite, Tailwind CSS, shadcn/ui, TanStack Query, react-hook-form + zod)
- **Backend:** FastAPI, SQLAlchemy 2, Alembic
- **Database:** PostgreSQL
- **Integrations:** Gemini (`google-genai`), Google Calendar API
- **Tests:** pytest, Vitest + React Testing Library
- **Hosting:** HOSTING_TO_CONFIRM (frontend on Vercel, backend on Render, database on Neon)

## Run it locally
You need Node, Python 3.12 and Docker. Commands are for Windows PowerShell; the macOS/Linux difference is in the comment.

1. **Database**, from the repo root. Postgres listens on port 5433, because I already had one on 5432.
   ```
   docker compose up -d
   ```
2. **Backend**, from `backend/`:
   ```
   python -m venv .venv                  # macOS/Linux: python3 -m venv .venv
   .venv\Scripts\Activate.ps1            # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   Copy-Item .env.example .env           # macOS/Linux: cp .env.example .env
   alembic upgrade head
   python -m app.seed
   uvicorn app.main:app --reload
   ```
3. **Frontend**, in a second terminal, from `frontend/`:
   ```
   npm install
   Copy-Item .env.example .env           # macOS/Linux: cp .env.example .env
   npm run dev
   ```
4. Open http://localhost:5173 for the app and http://localhost:8000/docs for the API docs.

The defaults in `.env.example` work for the steps above. These variables are optional:
- `GEMINI_API_KEY`: without it, bookings get the template message.
- `GOOGLE_SERVICE_ACCOUNT_JSON` (a path to the key file, or the JSON itself) and `DEMO_CALENDAR_ID`: without them there is no calendar. To try it, share a Google Calendar with the service account's email, set both variables, and run `python -m app.seed` again. The seed gives that calendar to Dr. Elena Petrova.

`python -m app.seed` deletes all data first, so it can be run again at any time.

## Running the tests

The tests run on your own machine. There is no CI.

**Backend (pytest).** Needs the Postgres from `docker compose up -d`; the test database is created automatically.

```
cd backend
.venv\Scripts\activate
python -m pytest
```

**Frontend (Vitest + React Testing Library).**

```
cd frontend
npm test
```

## AI tools I used and how
- **Claude (chat)** to plan the scope, the data model and the prompts.
- **Lovable** only to design the look. The screenshots are in `design/`, and there is no Lovable code in the project.
- **Claude Code** to implement the app phase by phase, following a `CLAUDE.md` brief. I approved every plan, tested every step by hand and made the commits myself.
- **Gemini** inside the app, for the confirmation message.

The decisions were mine: the clinic theme, several doctors, the services and their durations, the 24-hour cancellation rule, and what to leave out. 

One example of debugging with logs: two problems came up with the Gemini calls. The first model I picked had been retired, and Gemini rejects deadlines under 10 seconds. The backend logs the status code and message of each Gemini error (never the key or the prompt), which is what pointed to both. I changed the model and set the timeout to 12 seconds.

## What I would improve with more time
1. Add a login for doctors and a protected Clinic page, because the Clinic page is open to everyone now.
2. Send the patient a cancel link by email, instead of keeping the cancel token in the browser.
3. Let patients move their booking to another time.
4. Add a database rule against overlapping slots, because only the code checks that now.
5. Send the confirmation in the background, so a booking does not wait for Gemini.
6. Email or SMS reminders.