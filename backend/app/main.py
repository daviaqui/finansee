from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.routes import auth, categories, dashboard, health, transactions
from app.core.config import settings
from app.schemas.error import ErrorResponse

ERROR_RESPONSES = {
    status_code: {"model": ErrorResponse}
    for status_code in (400, 401, 403, 404, 409, 422, 500)
}

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="API para organização de finanças pessoais.",
    docs_url="/docs",
    redoc_url="/redoc",
    responses=ERROR_RESPONSES,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(categories.router, prefix=settings.api_v1_prefix)
app.include_router(transactions.router, prefix=settings.api_v1_prefix)
app.include_router(dashboard.router, prefix=settings.api_v1_prefix)
register_error_handlers(app)

