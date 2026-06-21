const midnightUtcPattern = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|\+00:00)$/;

export function formatExpenseDate(value: string): string {
  const midnightUtcMatch = value.match(midnightUtcPattern);
  if (midnightUtcMatch) {
    return new Date(`${midnightUtcMatch[1]}T12:00:00Z`).toLocaleDateString();
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString();
}

export function formatExpenseDateTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}