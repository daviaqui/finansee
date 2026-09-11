"""Create a resettable local demo account populated with fictitious data."""

from datetime import date
from decimal import Decimal

from sqlalchemy import delete, func, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.category import Category
from app.models.enums import TransactionStatus, TransactionType
from app.models.transaction import Transaction
from app.models.user import User
from app.services.categories import DEFAULT_CATEGORIES

DEMO_NAME = "Marina Demo"
DEMO_EMAIL = "demo@finansee.app"
DEMO_PASSWORD = "Demo@FinanSee2026"


def shift_month(value: date, months: int) -> date:
    index = value.year * 12 + value.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def demo_transactions(categories: dict[str, Category]) -> list[Transaction]:
    current_month = date.today().replace(day=1)
    transactions: list[Transaction] = []

    monthly_expenses = [
        ("Aluguel", "2450.00", 5, "Moradia"),
        ("Supermercado", "860.40", 8, "Alimentação"),
        ("Transporte e combustível", "420.00", 12, "Transporte"),
        ("Academia e farmácia", "235.90", 16, "Saúde"),
        ("Cinema e restaurantes", "310.00", 20, "Lazer"),
    ]

    for offset in range(-5, 1):
        month = shift_month(current_month, offset)
        salary = Decimal("7800.00") + Decimal(100 * (offset + 5))
        transactions.append(
            Transaction(
                description="Salário mensal",
                amount=salary,
                type=TransactionType.INCOME,
                status=TransactionStatus.PAID,
                transaction_date=month.replace(day=3),
                category_id=categories["Salário"].id,
                notes="Dados fictícios da demonstração.",
            )
        )
        for description, amount, day, category_name in monthly_expenses:
            adjusted_amount = Decimal(amount) + Decimal(15 * (offset + 5))
            transactions.append(
                Transaction(
                    description=description,
                    amount=adjusted_amount,
                    type=TransactionType.EXPENSE,
                    status=TransactionStatus.PAID,
                    transaction_date=month.replace(day=day),
                    category_id=categories[category_name].id,
                    notes="Dados fictícios da demonstração.",
                )
            )

    transactions.extend(
        [
            Transaction(
                description="Freelance de design",
                amount=Decimal("1250.00"),
                type=TransactionType.INCOME,
                status=TransactionStatus.PAID,
                transaction_date=current_month.replace(day=18),
                category_id=categories["Outros"].id,
                notes="Projeto fictício para a conta de demonstração.",
            ),
            Transaction(
                description="Conta de energia",
                amount=Decimal("198.70"),
                type=TransactionType.EXPENSE,
                status=TransactionStatus.PENDING,
                transaction_date=current_month.replace(day=25),
                category_id=categories["Moradia"].id,
                notes="Vencimento fictício.",
            ),
            Transaction(
                description="Aporte mensal",
                amount=Decimal("900.00"),
                type=TransactionType.EXPENSE,
                status=TransactionStatus.PAID,
                transaction_date=current_month.replace(day=22),
                category_id=categories["Investimentos"].id,
                notes="Aporte fictício para demonstrar a categoria.",
            ),
        ]
    )
    return transactions


def seed_demo() -> None:
    if not settings.enable_demo_seed:
        return

    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == DEMO_EMAIL))
        if user is None:
            user = User(
                name=DEMO_NAME,
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()
        else:
            user.name = DEMO_NAME
            user.password_hash = hash_password(DEMO_PASSWORD)
            user.is_active = True

        db.execute(delete(Transaction).where(Transaction.user_id == user.id))
        db.execute(delete(Category).where(Category.user_id == user.id))
        db.flush()

        categories = {
            name: Category(user_id=user.id, name=name, color=color, icon=icon)
            for name, color, icon in DEFAULT_CATEGORIES
        }
        db.add_all(categories.values())
        db.flush()

        transactions = demo_transactions(categories)
        for transaction in transactions:
            transaction.user_id = user.id
        db.add_all(transactions)
        db.commit()


if __name__ == "__main__":
    seed_demo()
