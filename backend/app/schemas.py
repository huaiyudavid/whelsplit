from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

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
    expense_date: Optional[datetime] = None
    split_type: SplitType = "equal"
    participants: list[ExpenseParticipantInput] = []
    splits: list[ExpenseSplitInput] = []

    @field_validator("expense_date", mode="before")
    @classmethod
    def parse_expense_date(cls, value: object) -> object:
        if value is None or isinstance(value, datetime):
            return value

        if isinstance(value, date):
            return datetime.combine(value, time.min, tzinfo=timezone.utc)

        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                parsed_date = date.fromisoformat(value)
                return datetime.combine(parsed_date, time.min, tzinfo=timezone.utc)

        return value

    @model_validator(mode="after")
    def validate_split_payload(self) -> "ExpenseCreate":
        if self.expense_date is not None:
            if self.expense_date.tzinfo is None:
                self.expense_date = self.expense_date.replace(tzinfo=timezone.utc)
            else:
                self.expense_date = self.expense_date.astimezone(timezone.utc)

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
    exchange_rate_to_usd: Optional[float] = None
    exchange_rate_to_cad: Optional[float] = None
    exchange_rate_to_jpy: Optional[float] = None
    payer_id: int
    expense_date: datetime
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
