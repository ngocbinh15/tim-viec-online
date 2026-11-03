/** Date-only conversion: never pass birthdays through UTC serialization. */
export function parseBirthDate(value: string): Date | undefined {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return;
  const [, year, month, day] = parts.map(Number);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return;
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
    return date;
}

export function serializeBirthDate(date: Date): string {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function displayBirthDate(value: string): string {
  return parseBirthDate(value) ? value.split("-").reverse().join("/") : value;
}

export function readBirthDate(value: string): string {
  // Numeric mobile keyboards do not provide a slash key.
  const normalized = /^\d{8}$/.test(value)
    ? `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`
    : value;
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!parts) return value;
  const iso = `${parts[3]}-${parts[2]}-${parts[1]}`;
  // Keep invalid edits invalid, rather than retaining an earlier valid birthday.
  return parseBirthDate(iso) ? iso : value;
}
