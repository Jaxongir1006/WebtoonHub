from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.redis import get_redis_client, close_redis
from app.core.storage import init_storage
import app.models  # Populate SQLAlchemy mapper registry
from app.modules.auth.router import router as auth_router
from app.modules.staff.router import router as staff_router
from app.modules.creator_requests.router import (
    client_router as creator_requests_client_router,
    staff_router as creator_requests_staff_router,
)
from app.modules.webtoons.router import (
    client_router as webtoons_client_router,
    staff_router as webtoons_staff_router,
)
from app.modules.rewards.router import (
    client_router as rewards_client_router,
    staff_router as rewards_staff_router,
)
from app.modules.shop.router import (
    client_router as shop_client_router,
    staff_router as shop_staff_router,
)
from app.modules.library.router import router as library_router
from app.modules.comments.router import router as comments_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize MinIO storage buckets and connect to Redis
    init_storage()
    await get_redis_client()
    yield
    # Shutdown: close Redis client connection
    await close_redis()


# FastAPI app instance (Swagger UI disabled as per Document-First rule)
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url=None,       # Disabled as requested
    redoc_url=None,      # Disabled as requested
    openapi_url=None,    # Disabled as requested
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Standardized Error Handlers conforming to docs/03_API_STANDARDS.md
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": getattr(exc, "error_code", "HTTP_ERROR"),
                "message": exc.detail,
                "details": None
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join([str(x) for x in err.get("loc", [])])
        errors.append({
            "field": loc,
            "issue": err.get("msg")
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Kiritilgan ma'lumotlarda xatolik mavjud",
                "details": errors
            }
        }
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Serverda ichki xatolik yuz berdi",
                "details": str(exc) if settings.DEBUG else None
            }
        }
    )


# Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(staff_router, prefix=settings.API_V1_STR)
app.include_router(creator_requests_client_router, prefix=settings.API_V1_STR)
app.include_router(creator_requests_staff_router, prefix=settings.API_V1_STR)
app.include_router(webtoons_client_router, prefix=settings.API_V1_STR)
app.include_router(webtoons_staff_router, prefix=settings.API_V1_STR)
app.include_router(rewards_client_router, prefix=settings.API_V1_STR)
app.include_router(rewards_staff_router, prefix=settings.API_V1_STR)
app.include_router(shop_client_router, prefix=settings.API_V1_STR)
app.include_router(shop_staff_router, prefix=settings.API_V1_STR)
app.include_router(library_router, prefix=settings.API_V1_STR)
app.include_router(comments_router, prefix=settings.API_V1_STR)


# Health Check
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check():
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "app": settings.APP_NAME,
            "environment": settings.APP_ENV
        },
        "message": "WebtoonHub API ish holatida"
    }
