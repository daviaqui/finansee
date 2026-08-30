.PHONY: up down logs test lint migrate dev-api dev-web

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

test:
	cd backend && .venv/bin/pytest -q

lint:
	cd backend && .venv/bin/ruff check .
	cd frontend && pnpm lint

migrate:
	cd backend && .venv/bin/alembic upgrade head

dev-api:
	cd backend && .venv/bin/uvicorn app.main:app --reload

dev-web:
	cd frontend && pnpm dev
