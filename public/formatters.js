(function () {
  function formatToday() {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  }

  function formatUtilityDateParts() {
    const now = new Date();
    return {
      dateLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(now),
      dayLabel: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
      }).format(now),
    };
  }

  function formatMoney(amount, currency = "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0));
  }

  function formatBillAmount(bill) {
    const amountType = bill.amount_type || "fixed";
    const hasAmount = bill.amount !== null && bill.amount !== undefined && bill.amount !== "";
    if (amountType === "unknown") return "TBD";
    if (amountType === "variable") return hasAmount ? `varies (${formatMoney(bill.amount, bill.currency)})` : "varies";
    if (amountType === "estimated") return hasAmount ? `~${formatMoney(bill.amount, bill.currency)}` : "estimate TBD";
    return hasAmount ? formatMoney(bill.amount, bill.currency) : "TBD";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const date = new Date(`${iso}T00:00:00`);
    return date.toLocaleDateString();
  }

  function formatShortDate(iso) {
    if (!iso) return "—";
    const date = new Date(`${iso}T00:00:00`);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  }

  function todayISO() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function addDaysISO(iso, days) {
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function recurrenceLabel(bill) {
    if (bill.recurrence_unit === "one_time") return "one-time";
    const unit = Number(bill.recurrence_interval || 1) === 1 ? bill.recurrence_unit : `${bill.recurrence_unit}s`;
    const dayPart = bill.recurrence_day_of_month && (bill.recurrence_unit === "month" || bill.recurrence_unit === "year") ? ` on day ${bill.recurrence_day_of_month}` : "";
    return `every ${bill.recurrence_interval || 1} ${unit}${dayPart}`;
  }

  function taskRepeatLabel(task) {
    if (!task.repeat_unit || task.repeat_unit === "none") return "one-time";
    return task.repeat_interval > 1 ? `every ${task.repeat_interval} ${task.repeat_unit}s` : `every ${task.repeat_unit}`;
  }

  function itemDateLabel(item) {
    if (item.replace_by_date) return `Replace ${formatDate(item.replace_by_date)}`;
    if (item.restock_by_date) return `Restock ${formatDate(item.restock_by_date)}`;
    return "No target date";
  }

  function dueBadgeText(iso) {
    if (!iso) return "No due date";
    const today = todayISO();
    if (iso < today) return `Overdue since ${formatShortDate(iso)}`;
    if (iso === today) return "Due today";
    if (iso === addDaysISO(today, 1)) return "Due tomorrow";
    return `Due ${formatShortDate(iso)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.FamilyHubFormatters = {
    addDaysISO,
    dueBadgeText,
    escapeHtml,
    formatBillAmount,
    formatDate,
    formatShortDate,
    formatToday,
    formatUtilityDateParts,
    itemDateLabel,
    recurrenceLabel,
    taskRepeatLabel,
    todayISO,
  };
})();
