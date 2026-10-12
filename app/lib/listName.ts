export function defaultListName(date: Date = new Date()): string {
  return `Compras ${new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" }).format(date)}`;
}
