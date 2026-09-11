from conftest import TestingSessionLocal
from sqlalchemy import func, select

import app.seed_demo as demo_seed
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User


def test_demo_seed_is_repeatable(client, monkeypatch) -> None:
    monkeypatch.setattr(demo_seed.settings, "enable_demo_seed", True)
    monkeypatch.setattr(demo_seed, "SessionLocal", TestingSessionLocal)

    demo_seed.seed_demo()
    demo_seed.seed_demo()

    with TestingSessionLocal() as db:
        assert db.scalar(select(func.count(User.id))) == 1
        assert db.scalar(select(func.count(Category.id))) == 8
        assert db.scalar(select(func.count(Transaction.id))) == 39

    login = client.post(
        "/api/v1/auth/login",
        json={"email": demo_seed.DEMO_EMAIL, "password": demo_seed.DEMO_PASSWORD},
    )
    assert login.status_code == 200

    dashboard = client.get(
        "/api/v1/dashboard",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert dashboard.status_code == 200
    assert float(dashboard.json()["summary"]["income"]) > 0
    assert float(dashboard.json()["summary"]["expenses"]) > 0
