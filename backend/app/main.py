from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import bookings, doctors, services, slots

app = FastAPI(title="SmileSlot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Wrong input also gets the { "detail": "message" } shape, as one readable string.
@app.exception_handler(RequestValidationError)
def validation_error_handler(request: Request, exc: RequestValidationError):
    messages = [f"{error['loc'][-1]}: {error['msg']}" for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


for router in (doctors.router, services.router, slots.router, bookings.router):
    app.include_router(router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
