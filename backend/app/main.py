from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, categories, dashboard, health, transactions
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="API para organização de finanças pessoais.",
    docs_url="/docs",
    redoc_url="/redoc",
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


@app.exception_handler(Exception)
async def unhandled_exception(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})

