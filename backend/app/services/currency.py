from decimal import Decimal, InvalidOperation

from forex_python.converter import CurrencyRates, RatesNotAvailableError
from requests import RequestException

SUPPORTED_CURRENCIES = {"USD", "CAD", "JPY"}

_CURRENCY_RATES = CurrencyRates(force_decimal=True)


class CurrencyError(ValueError):
    pass


def _target_precision(currency: str) -> Decimal:
    if currency == "JPY":
        return Decimal("1")
    return Decimal("0.01")


def validate_currency(currency: str) -> str:
    normalized = currency.upper().strip()
    if normalized not in SUPPORTED_CURRENCIES:
        raise CurrencyError(f"Unsupported currency: {currency}")
    return normalized


def convert(amount: Decimal | float | int, from_currency: str, to_currency: str) -> Decimal:
    source = validate_currency(from_currency)
    target = validate_currency(to_currency)

    try:
        amount_decimal = Decimal(str(amount))
    except (InvalidOperation, TypeError) as exc:
        raise CurrencyError("Invalid amount for currency conversion") from exc

    if source == target:
        return amount_decimal.quantize(_target_precision(target))

    try:
        rate = _CURRENCY_RATES.get_rate(source, target)
    except (RatesNotAvailableError, RequestException, ValueError) as exc:
        raise CurrencyError("Unable to fetch exchange rate") from exc

    if not isinstance(rate, Decimal):
        rate = Decimal(str(rate))

    converted = amount_decimal * rate
    return converted.quantize(_target_precision(target))
