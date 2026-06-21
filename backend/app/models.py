from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.types import String, TypeDecorator
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator[datetime]):
    impl = String
    cache_ok = True
    python_type = datetime

    def process_bind_param(self, value: Optional[datetime], dialect) -> Optional[str]:
        if value is None:
            return None

        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)

        return value.isoformat()

    def process_literal_param(self, value: Optional[datetime], dialect) -> Optional[str]:
        return self.process_bind_param(value, dialect)

    def process_result_value(self, value: Optional[object], dialect) -> Optional[datetime]:
        if value is None:
            return None

        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc)

        if isinstance(value, str):
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)

        raise TypeError(f"Unsupported datetime value: {value!r}")


class Person(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, min_length=1, max_length=100)
    debts_paid: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(UTCDateTime(), nullable=False),
    )


class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, index=True)
    exchange_rate_to_usd: Optional[float] = Field(default=None, nullable=True)
    exchange_rate_to_cad: Optional[float] = Field(default=None, nullable=True)
    exchange_rate_to_jpy: Optional[float] = Field(default=None, nullable=True)
    payer_id: int = Field(foreign_key="person.id", index=True)
    expense_date: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(UTCDateTime(), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(UTCDateTime(), nullable=False),
    )


class ExpenseSplit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id", index=True)
    person_id: int = Field(foreign_key="person.id", index=True)
    amount_owed: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, index=True)
