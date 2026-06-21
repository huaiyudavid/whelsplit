from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Expense, ExpenseSplit, Person
from app.schemas import PersonCreate, PersonRead, PersonUpdate

router = APIRouter(prefix="/people", tags=["people"])


@router.get("", response_model=list[PersonRead])
def list_people(session: Session = Depends(get_session)):
    return session.exec(select(Person).order_by(Person.name)).all()


@router.post("", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonCreate, session: Session = Depends(get_session)):
    person = Person(name=payload.name.strip(), debts_paid=payload.debts_paid)
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.put("/{person_id}", response_model=PersonRead)
def update_person(person_id: int, payload: PersonUpdate, session: Session = Depends(get_session)):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    if payload.name is None and payload.debts_paid is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field is required",
        )

    if payload.name is not None:
        person.name = payload.name.strip()

    if payload.debts_paid is not None:
        person.debts_paid = payload.debts_paid

    session.add(person)
    session.commit()
    session.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: int, session: Session = Depends(get_session)):
    person = session.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    paid_expenses = session.exec(select(Expense).where(Expense.payer_id == person_id)).first()
    has_splits = session.exec(select(ExpenseSplit).where(ExpenseSplit.person_id == person_id)).first()

    if paid_expenses or has_splits:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete person with linked expenses or splits",
        )

    session.delete(person)
    session.commit()
    return None
