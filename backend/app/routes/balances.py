from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Expense, ExpenseSplit, Person
from app.schemas import BalanceItem
from app.services.currency import CurrencyError, convert, validate_currency

router = APIRouter(prefix="/balances", tags=["balances"])


@router.get("", response_model=list[BalanceItem])
def get_balances(
    currency: str = Query("USD", description="Display currency"),
    session: Session = Depends(get_session),
):
    try:
        display_currency = validate_currency(currency)
    except CurrencyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    people = session.exec(select(Person)).all()
    people_map = {person.id: person.name for person in people if person.id is not None}

    balances: dict[int, Decimal] = {person_id: Decimal("0") for person_id in people_map}

    expenses = session.exec(select(Expense)).all()
    expense_ids = [expense.id for expense in expenses if expense.id is not None]
    all_splits = session.exec(select(ExpenseSplit)).all() if expense_ids else []
    expense_id_set = set(expense_ids)
    splits = [split for split in all_splits if split.expense_id in expense_id_set]

    split_by_expense: dict[int, list[ExpenseSplit]] = {expense_id: [] for expense_id in expense_ids}
    for split in splits:
        split_by_expense.setdefault(split.expense_id, []).append(split)

    for expense in expenses:
        if expense.payer_id not in balances:
            continue

        converted_credit = convert(Decimal(str(expense.amount)), expense.currency, display_currency)
        balances[expense.payer_id] += converted_credit

        for split in split_by_expense.get(expense.id, []):
            if split.person_id not in balances:
                continue
            converted_debt = convert(Decimal(str(split.amount_owed)), split.currency, display_currency)
            balances[split.person_id] -= converted_debt

    creditors = []
    debtors = []

    for person_id, balance in balances.items():
        rounded = balance.quantize(Decimal("0.01"))
        if rounded > Decimal("0"):
            creditors.append([person_id, rounded])
        elif rounded < Decimal("0"):
            debtors.append([person_id, -rounded])

    settlements: list[BalanceItem] = []
    i = 0
    j = 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_amount = debtors[i]
        creditor_id, credit_amount = creditors[j]

        settled = min(debt_amount, credit_amount).quantize(Decimal("0.01"))
        if settled > Decimal("0"):
            settlements.append(
                BalanceItem(
                    from_person_id=debtor_id,
                    to_person_id=creditor_id,
                    from_person=people_map[debtor_id],
                    to_person=people_map[creditor_id],
                    amount=float(settled),
                    currency=display_currency,
                )
            )

        debtors[i][1] = (debt_amount - settled).quantize(Decimal("0.01"))
        creditors[j][1] = (credit_amount - settled).quantize(Decimal("0.01"))

        if debtors[i][1] <= Decimal("0"):
            i += 1
        if creditors[j][1] <= Decimal("0"):
            j += 1

    return settlements
