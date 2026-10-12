export const purchaseTimeZone = "America/Argentina/Buenos_Aires";

export function completedPurchaseName(name: string, date: Date) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: purchaseTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${name} [${value("day")}/${value("month")}/${value("year")}-${value("hour")}:${value("minute")}:${value("second")}]`;
}
