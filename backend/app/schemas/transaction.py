from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TransactionStatus, TransactionType
from app.schemas.category import CategoryResponse


class TransactionCreate(BaseModel):
    description: str = Field(min_length=1, max_length=160)
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    type: TransactionType
    status: TransactionStatus = TransactionStatus.PAID
    transaction_date: date
    category_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=1000)


class TransactionUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=160)
    amount: Decimal | None = Field(default=None, gt=0, max_digits=14, decimal_places=2)
    type: TransactionType | None = None
    status: TransactionStatus | None = None
    transaction_date: date | None = None
    category_id: UUID | None = None
    notes: str | None = Field(default=None, max_length=1000)


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    description: str
    amount: Decimal
    type: TransactionType
    status: TransactionStatus
    transaction_date: date
    category_id: UUID | None
    category: CategoryResponse | None
    notes: str | None
    created_at: datetime


class TransactionList(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int
    pages: int

