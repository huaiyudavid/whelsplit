from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Expense, ExpenseSplit, Person
from app.schemas import ExpenseCreate, ExpenseRead, ExpenseSplitRead, ExpenseUpdate
from app.services.currency import CurrencyError, validate_currency

router = APIRouter(prefix="/expenses", tags=["expenses"])


def _load_people_map(session: Session) -> dict[int, Person]:
    people = session.exec(select(Person)).all()
    return {person.id: person for person in people if person.id is not None}


def _build_equal_splits(amount: Decimal, participant_ids: list[int]) -> list[Decimal]:
    count = len(participant_ids) + 1 # Always account for the payer as well
    if count == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="participants are required")

    split = (amount / Decimal(count)).quantize(Decimal("0.01"))
    splits = [split for _ in participant_ids]

    diff = amount - sum(splits, Decimal("0")) - split
    if diff != 0:
        splits[-1] = (splits[-1] + diff).quantize(Decimal("0.01"))

    return splits


def _create_expense_splits(expense: Expense, payload: ExpenseCreate, session: Session) -> None:
    people_map = _load_people_map(session)
    if expense.payer_id not in people_map:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="payer_id does not exist")

    expense_currency = validate_currency(expense.currency)

    if payload.split_type == "equal":
        participant_ids = [participant.person_id for participant in payload.participants]
        if len(participant_ids) != len(set(participant_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="duplicate participants found")

        invalid_participants = [pid for pid in participant_ids if pid not in people_map]
        if invalid_participants:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="one or more participants not found")

        split_amounts = _build_equal_splits(Decimal(str(expense.amount)), participant_ids)
        for person_id, split_amount in zip(participant_ids, split_amounts, strict=True):
            expense_split = ExpenseSplit(
                expense_id=expense.id,
                person_id=person_id,
                amount_owed=float(split_amount),
                currency=expense_currency,
            )
            session.add(expense_split)
    else:
        person_ids = [split.person_id for split in payload.splits]
        if len(person_ids) != len(set(person_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="duplicate split person_id found")

        invalid_splits = [split.person_id for split in payload.splits if split.person_id not in people_map]
        if invalid_splits:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="one or more split people not found")

        for split in payload.splits:
            expense_split = ExpenseSplit(
                expense_id=expense.id,
                person_id=split.person_id,
                amount_owed=float(split.amount),
                currency=expense_currency,
            )
            session.add(expense_split)


def _to_expense_read(expense: Expense, splits: list[ExpenseSplit]) -> ExpenseRead:
    return ExpenseRead(
        id=expense.id,
        description=expense.description,
        amount=expense.amount,
        currency=expense.currency,
        payer_id=expense.payer_id,
        expense_date=expense.expense_date,
        created_at=expense.created_at,
        splits=[
            ExpenseSplitRead(
                id=split.id,
                expense_id=split.expense_id,
                person_id=split.person_id,
                amount_owed=split.amount_owed,
                currency=split.currency,
            )
            for split in splits
        ],
    )


@router.get("", response_model=list[ExpenseRead])
def list_expenses(session: Session = Depends(get_session)):
    expenses = session.exec(select(Expense).order_by(Expense.expense_date.desc(), Expense.created_at.desc())).all()
    expense_ids = [expense.id for expense in expenses if expense.id is not None]
    splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.expense_id.in_(expense_ids))).all() if expense_ids else []

    split_map: dict[int, list[ExpenseSplit]] = {expense_id: [] for expense_id in expense_ids}
    for split in splits:
        split_map.setdefault(split.expense_id, []).append(split)

    return [_to_expense_read(expense, split_map.get(expense.id, [])) for expense in expenses]


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, session: Session = Depends(get_session)):
    try:
        currency = validate_currency(payload.currency)
    except CurrencyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    expense = Expense(
        description=payload.description.strip(),
        amount=float(payload.amount),
        currency=currency,
        payer_id=payload.payer_id,
        expense_date=payload.expense_date or date.today(),
    )

    session.add(expense)
    session.flush()

    _create_expense_splits(expense, payload, session)

    session.commit()
    session.refresh(expense)

    splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.expense_id == expense.id)).all()
    return _to_expense_read(expense, splits)


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.expense_id == expense.id)).all()
    return _to_expense_read(expense, splits)


@router.put("/{expense_id}", response_model=ExpenseRead)
def update_expense(expense_id: int, payload: ExpenseUpdate, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    try:
        currency = validate_currency(payload.currency)
    except CurrencyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    expense.description = payload.description.strip()
    expense.amount = float(payload.amount)
    expense.currency = currency
    expense.payer_id = payload.payer_id
    expense.expense_date = payload.expense_date or expense.expense_date

    old_splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.expense_id == expense_id)).all()
    for old_split in old_splits:
        session.delete(old_split)

    session.flush()
    _create_expense_splits(expense, payload, session)

    session.add(expense)
    session.commit()
    session.refresh(expense)

    new_splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.expense_id == expense.id)).all()
    return _to_expense_read(expense, new_splits)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, session: Session = Depends(get_session)):
    expense = session.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")

    splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.expense_id == expense_id)).all()
    for split in splits:
        session.delete(split)

    session.delete(expense)
    session.commit()
    return None
