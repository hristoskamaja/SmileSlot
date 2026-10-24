import json
from datetime import datetime

import google_auth_httplib2
import httplib2
from google.oauth2 import service_account
from googleapiclient.discovery import build

from app.config import settings

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
TIMEOUT_SECONDS = 5


def load_credentials():
    """The setting is either the JSON itself (easy to set on Render) or the path to a JSON file."""
    value = settings.google_service_account_json.strip()
    if value.startswith("{"):
        return service_account.Credentials.from_service_account_info(json.loads(value), scopes=SCOPES)
    return service_account.Credentials.from_service_account_file(value, scopes=SCOPES)


def get_busy_intervals(calendar_id: str, start: datetime, end: datetime) -> list[tuple[datetime, datetime]]:
    """Busy time ranges of one Google Calendar between start and end. Raises on ANY problem;
    the caller carries on without the calendar.

    FreeBusy only returns when the calendar is busy, never the event titles or details.
    """
    http = google_auth_httplib2.AuthorizedHttp(load_credentials(), http=httplib2.Http(timeout=TIMEOUT_SECONDS))
    # cache_discovery=False: don't try to write a cache file (not needed, and servers may not allow it).
    api = build("calendar", "v3", http=http, cache_discovery=False)

    body = {
        "timeMin": start.isoformat(),
        "timeMax": end.isoformat(),
        "timeZone": settings.timezone,
        "items": [{"id": calendar_id}],
    }
    response = api.freebusy().query(body=body).execute()

    calendar = response["calendars"][calendar_id]
    if calendar.get("errors"):
        # e.g. "notFound" when the calendar was not shared with the service account.
        raise RuntimeError(f"FreeBusy error: {calendar['errors'][0].get('reason')}")

    # Google sends times like "2026-10-26T08:00:00Z"; fromisoformat reads that (Python 3.11+).
    return [(datetime.fromisoformat(b["start"]), datetime.fromisoformat(b["end"])) for b in calendar["busy"]]
