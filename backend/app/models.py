from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Person(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, min_length=1, max_length=100)
    debts_paid: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class Expense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, index=True)
    payer_id: int = Field(foreign_key="person.id", index=True)
    expense_date: date = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ExpenseSplit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id", index=True)
    person_id: int = Field(foreign_key="person.id", index=True)
    amount_owed: float = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3, index=True)
