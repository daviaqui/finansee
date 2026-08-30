FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY pyproject.toml .
COPY app ./app
RUN pip install --prefix=/install .

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/usr/local/bin:$PATH

RUN groupadd --system app && useradd --system --gid app --create-home app
WORKDIR /app
COPY --from=builder /install /usr/local
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
RUN chown -R app:app /app
USER app

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
