from datetime import date

from fastapi.testclient import TestClient


def test_register_login_and_me(client: TestClient) -> None:
    register = client.post(
        "/api/v1/auth/register",
        json={"name": "Ana Silva", "email": "ANA@example.com", "password": "senha-segura"},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "ana@example.com"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "ana@example.com", "password": "senha-segura"},
    )
    assert login.status_code == 200


def test_duplicate_email_is_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Outra Ana", "email": "ana@example.com", "password": "outra-senha"},
    )
    assert response.status_code == 409


def test_transactions_and_dashboard(client: TestClient, auth_headers: dict[str, str]) -> None:
    categories = client.get("/api/v1/categories", headers=auth_headers).json()
    salary = next(item for item in categories if item["name"] == "Salário")
    food = next(item for item in categories if item["name"] == "Alimentação")
    today = date.today().isoformat()

    income = client.post(
        "/api/v1/transactions",
        headers=auth_headers,
        json={
            "description": "Salário",
            "amount": "5000.00",
            "type": "income",
            "status": "paid",
            "transaction_date": today,
            "category_id": salary["id"],
        },
    )
    expense = client.post(
        "/api/v1/transactions",
        headers=auth_headers,
        json={
            "description": "Supermercado",
            "amount": "750.50",
            "type": "expense",
            "status": "paid",
            "transaction_date": today,
            "category_id": food["id"],
        },
    )
    assert income.status_code == 201
    assert expense.status_code == 201

    listing = client.get("/api/v1/transactions", headers=auth_headers).json()
    assert listing["total"] == 2
    assert listing["items"][0]["description"] in {"Salário", "Supermercado"}

    dashboard = client.get("/api/v1/dashboard", headers=auth_headers).json()
    assert dashboard["summary"]["income"] == "5000.00"
    assert dashboard["summary"]["expenses"] == "750.50"
    assert dashboard["summary"]["balance"] == "4249.50"
    assert dashboard["expenses_by_category"][0]["category"] == "Alimentação"

    deleted = client.delete(
        f"/api/v1/transactions/{expense.json()['id']}", headers=auth_headers
    )
    assert deleted.status_code == 204


def test_user_cannot_use_another_users_category(client: TestClient) -> None:
    first = client.post(
        "/api/v1/auth/register",
        json={"name": "User One", "email": "one@example.com", "password": "senha-segura"},
    ).json()["access_token"]
    second = client.post(
        "/api/v1/auth/register",
        json={"name": "User Two", "email": "two@example.com", "password": "senha-segura"},
    ).json()["access_token"]
    first_headers = {"Authorization": f"Bearer {first}"}
    second_headers = {"Authorization": f"Bearer {second}"}
    category = client.get("/api/v1/categories", headers=first_headers).json()[0]

    response = client.post(
        "/api/v1/transactions",
        headers=second_headers,
        json={
            "description": "Inválido",
            "amount": "10.00",
            "type": "expense",
            "transaction_date": date.today().isoformat(),
            "category_id": category["id"],
        },
    )
    assert response.status_code == 422

