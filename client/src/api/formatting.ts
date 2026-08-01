import type { Bill } from "../api";

export function formatMoney(amount: number | null | undefined, currency = "USD") {
  if (amount === null || amount === undefined) return "TBD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatBillAmount(bill: Bill) {
  if (bill.amount_type === "unknown") return "TBD";
  if (bill.amount_type === "variable") return bill.amount === null ? "varies" : `varies ${formatMoney(bill.amount, bill.currency)}`;
  if (bill.amount_type === "estimated") return bill.amount === null ? "estimate TBD" : `~${formatMoney(bill.amount, bill.currency)}`;
  return formatMoney(bill.amount, bill.currency);
}

export function formatShortDate(iso?: string | null) {
  if (!iso) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
