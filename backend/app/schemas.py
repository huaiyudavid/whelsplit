from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

CurrencyCode = Literal["USD", "CAD", "JPY"]
SplitType = Literal["equal", "manual"]


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    debts_paid: bool = False


class PersonUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    debts_paid: Optional[bool] = None


class PersonRead(BaseModel):
    id: int
    name: str
    debts_paid: bool
    created_at: datetime


class ExpenseParticipantInput(BaseModel):
    person_id: int


class ExpenseSplitInput(BaseModel):
    person_id: int
    amount: Decimal = Field(gt=0)


class ExpenseCreate(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=0)
    currency: CurrencyCode
    payer_id: int
    expense_date: Optional[date] = None
    split_type: SplitType = "equal"
    participants: list[ExpenseParticipantInput] = []
    splits: list[ExpenseSplitInput] = []

    @model_validator(mode="after")
    def validate_split_payload(self) -> "ExpenseCreate":
        if self.split_type == "equal" and not self.participants:
            raise ValueError("participants are required for equal split")

        if self.split_type == "manual":
            if not self.splits:
                raise ValueError("splits are required for manual split")
            total = sum((split.amount for split in self.splits), Decimal("0"))
            if total > self.amount:
                raise ValueError("manual splits cannot sum to greater than expense amount")

        return self


class ExpenseUpdate(ExpenseCreate):
    pass


class ExpenseSplitRead(BaseModel):
    id: int
    expense_id: int
    person_id: int
    amount_owed: float
    currency: CurrencyCode


class ExpenseRead(BaseModel):
    id: int
    description: str
    amount: float
    currency: CurrencyCode
    payer_id: int
    expense_date: date
    created_at: datetime
    splits: list[ExpenseSplitRead]


class BalanceItem(BaseModel):
    from_person_id: int
    to_person_id: int
    from_person: str = Field(serialization_alias="from")
    to_person: str = Field(serialization_alias="to")
    amount: float
    currency: CurrencyCode

    model_config = {
        "populate_by_name": True,
    }
