# SmileSlot

> Draft: the full README (what I built and why, how to run it, AI tools, live link) is written in Phase 4.

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
