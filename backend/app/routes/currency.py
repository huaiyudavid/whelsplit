from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status

from app.services.currency import CurrencyError, convert, validate_currency

router = APIRouter(prefix="/currency", tags=["currency"])


@router.get("/convert")
def convert_currency(
    amount: Decimal = Query(..., gt=0, description="Amount to convert"),
    from_currency: str = Query(..., alias="from", description="Source currency code"),
    to_currency: str = Query(..., alias="to", description="Target currency code"),
):
    try:
        source = validate_currency(from_currency)
        target = validate_currency(to_currency)
        converted = convert(amount, source, target)
    except CurrencyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {
        "amount": float(amount),
        "from": source,
        "to": target,
        "converted_amount": float(converted),
    }