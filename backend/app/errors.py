import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.errors")


class NotFoundError(Exception):
    def __init__(self, message: str = "Not found"):
        self.message = message


class ConflictError(Exception):
    def __init__(self, message: str = "Conflict"):
        self.message = message


class DomainValidationError(Exception):
    def __init__(self, fields: dict[str, str], message: str = "Validation failed"):
        self.fields = fields
        self.message = message


def _envelope(code: str, message: str, fields: dict[str, str] | None = None) -> dict:
    error: dict = {"code": code, "message": message}
    if fields:
        error["fields"] = fields
    return {"error": error}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def handle_not_found(request: Request, exc: NotFoundError):
        return JSONResponse(status_code=404, content=_envelope("NOT_FOUND", exc.message))

    @app.exception_handler(ConflictError)
    async def handle_conflict(request: Request, exc: ConflictError):
        return JSONResponse(status_code=409, content=_envelope("CONFLICT", exc.message))

    @app.exception_handler(DomainValidationError)
    async def handle_domain_validation(request: Request, exc: DomainValidationError):
        return JSONResponse(
            status_code=422, content=_envelope("VALIDATION_ERROR", exc.message, exc.fields)
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation(request: Request, exc: RequestValidationError):
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(part) for part in err["loc"] if part != "body"]
            field_name = ".".join(loc) if loc else "__root__"
            fields[field_name] = err["msg"]
        return JSONResponse(
            status_code=422, content=_envelope("VALIDATION_ERROR", "Validation failed", fields)
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500, content=_envelope("INTERNAL_ERROR", "An unexpected error occurred")
        )
