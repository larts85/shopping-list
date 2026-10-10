/** Convert a formatted Sheets number into a value accepted by HTML number inputs. */
export function normalizeSheetNumber(value: string | number | null | undefined, locale: string): string {
  if (value == null || value === "") return "";
  if (typeof value === "number") return String(value);
  const parts = new Intl.NumberFormat(locale.replace(/_/g, "-")).formatToParts(12345.6);
  const group = parts.find((part) => part.type === "group")?.value;
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  let normalized = value.trim();
  if (group) normalized = normalized.split(group).join("");
  normalized = normalized.replace(decimal, ".");
  return normalized;
}
