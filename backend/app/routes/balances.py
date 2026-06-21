from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Expense, ExpenseSplit, Person
from app.schemas import BalanceItem
from app.services.currency import CurrencyError, validate_currency

router = APIRouter(prefix="/balances", tags=["balances"])


def _expense_rate_to_currency(expense: Expense, target_currency: str) -> Decimal:
    if expense.currency == target_currency:
        return Decimal("1")

    rate = None
    if target_currency == "USD":
        rate = expense.exchange_rate_to_usd
    elif target_currency == "CAD":
        rate = expense.exchange_rate_to_cad
    elif target_currency == "JPY":
        rate = expense.exchange_rate_to_jpy

    if rate is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Expense {expense.id} does not have a locked exchange rate to {target_currency}. "
                "Update the expense to populate missing exchange rates."
            ),
        )

    return Decimal(str(rate))


def _quantize_for_currency(amount: Decimal, currency: str) -> Decimal:
    if currency == "JPY":
        return amount.quantize(Decimal("1"))
    return amount.quantize(Decimal("0.01"))


def _residual_tolerance(currency: str) -> Decimal:
    # Allow tiny residuals caused by repeated quantization/rounding operations.
    if currency == "JPY":
        return Decimal("5")
    return Decimal("0.05")


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

        expense_splits = split_by_expense.get(expense.id, [])
        split_total = sum((Decimal(str(split.amount_owed)) for split in expense_splits), Decimal("0"))
        expense_to_display_rate = _expense_rate_to_currency(expense, display_currency)
        converted_credit = split_total * expense_to_display_rate
        balances[expense.payer_id] += converted_credit

        for split in expense_splits:
            if split.person_id not in balances:
                continue
            if split.currency != expense.currency:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        f"Expense split currency mismatch on expense {expense.id}: "
                        f"expected {expense.currency}, got {split.currency}"
                    ),
                )

            converted_debt = Decimal(str(split.amount_owed)) * expense_to_display_rate
            balances[split.person_id] -= converted_debt

    total_balance = sum(balances.values(), Decimal("0"))
    if abs(total_balance) > _residual_tolerance(display_currency):
        balances_snapshot = {
            people_map[person_id]: float(_quantize_for_currency(amount, display_currency))
            for person_id, amount in balances.items()
        }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Balance invariant violation: balances do not sum to 0 "
                f"(total={float(_quantize_for_currency(total_balance, display_currency))} {display_currency}, balances={balances_snapshot})"
            ),
        )

    creditors = []
    debtors = []
    residual_tolerance = _residual_tolerance(display_currency)

    for person_id in sorted(balances):
        balance = balances[person_id]
        if balance > residual_tolerance:
            creditors.append([person_id, balance])
        elif balance < -residual_tolerance:
            debtors.append([person_id, -balance])

    settlements: list[BalanceItem] = []
    i = 0
    j = 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt_amount = debtors[i]
        creditor_id, credit_amount = creditors[j]

        settled = min(debt_amount, credit_amount)
        settled_display = _quantize_for_currency(settled, display_currency)
        if settled_display > Decimal("0"):
            settlements.append(
                BalanceItem(
                    from_person_id=debtor_id,
                    to_person_id=creditor_id,
                    from_person=people_map[debtor_id],
                    to_person=people_map[creditor_id],
                    amount=float(settled_display),
                    currency=display_currency,
                )
            )

        debtors[i][1] = debt_amount - settled
        creditors[j][1] = credit_amount - settled

        if debtors[i][1] <= residual_tolerance:
            i += 1
        if creditors[j][1] <= residual_tolerance:
            j += 1

    remaining_debtors = [
        [debtor_id, amount]
        for debtor_id, amount in debtors
        if amount > _residual_tolerance(display_currency)
    ]
    remaining_creditors = [
        [creditor_id, amount]
        for creditor_id, amount in creditors
        if amount > _residual_tolerance(display_currency)
    ]
    if remaining_debtors or remaining_creditors:
        debtors_snapshot = [
            {
                "person": people_map[person_id],
                "amount": float(_quantize_for_currency(amount, display_currency)),
            }
            for person_id, amount in remaining_debtors
        ]
        creditors_snapshot = [
            {
                "person": people_map[person_id],
                "amount": float(_quantize_for_currency(amount, display_currency)),
            }
            for person_id, amount in remaining_creditors
        ]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Settlement invariant violation: nonzero residual amounts remain "
                f"(debtors={debtors_snapshot}, creditors={creditors_snapshot})"
            ),
        )

    return settlements
