const healthBadge = document.getElementById("healthBadge");
const logoutBtn = document.getElementById("logoutBtn");
const tabs = document.querySelectorAll(".tab");
const tabPanels = document.querySelectorAll(".tabpanel");

const billViewSelect = document.getElementById("billViewSelect");
const billFilterCategory = document.getElementById("billFilterCategory");
const billFilterOwner = document.getElementById("billFilterOwner");
const billFilterSource = document.getElementById("billFilterSource");
const billFilterAutopay = document.getElementById("billFilterAutopay");
const billRows = document.getElementById("billRows");
const billSummary = document.getElementById("billSummary");
const billCalPrevBtn = document.getElementById("billCalPrevBtn");
const billCalTodayBtn = document.getElementById("billCalTodayBtn");
const billCalNextBtn = document.getElementById("billCalNextBtn");
const billCalLabel = document.getElementById("billCalLabel");
const billCalendarGrid = document.getElementById("billCalendarGrid");
const billOpenEditorBtn = document.getElementById("billOpenEditorBtn");
const billModal = document.getElementById("billModal");
const billModalCloseBtn = document.getElementById("billModalCloseBtn");

const billForm = document.getElementById("billForm");
const billFormTitle = document.getElementById("billFormTitle");
const billId = document.getElementById("billId");
const billTitle = document.getElementById("billTitle");
const billCategory = document.getElementById("billCategory");
const billAmount = document.getElementById("billAmount");
const billDueDate = document.getElementById("billDueDate");
const billRecurrenceInterval = document.getElementById("billRecurrenceInterval");
const billRecurrenceUnit = document.getElementById("billRecurrenceUnit");
const billRecurrenceDayWrap = document.getElementById("billRecurrenceDayWrap");
const billRecurrenceDayOfMonth = document.getElementById("billRecurrenceDayOfMonth");
const billRecurrenceEndDate = document.getElementById("billRecurrenceEndDate");
const billSource = document.getElementById("billSource");
const billPayer = document.getElementById("billPayer");
const billConfirmer = document.getElementById("billConfirmer");
const billStatus = document.getElementById("billStatus");
const billAutopay = document.getElementById("billAutopay");
const billNotes = document.getElementById("billNotes");
const billSubmitBtn = document.getElementById("billSubmitBtn");
const billResetBtn = document.getElementById("billResetBtn");

const docForm = document.getElementById("docForm");
const docRows = document.getElementById("docRows");
const docTitle = document.getElementById("docTitle");
const docType = document.getElementById("docType");
const docCategory = document.getElementById("docCategory");
const docTags = document.getElementById("docTags");
const docNotes = document.getElementById("docNotes");
const docFile = document.getElementById("docFile");

let cachedBills = [];
let cachedCalendarBills = [];
const billCalendarMonth = new Date();
billCalendarMonth.setDate(1);
const billDrafts = new Map();
let activeBillDraftKey = null;
let activeBillDraftInitial = null;

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString();
}

function toTodayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function recurrenceLabel(bill) {
  if (bill.recurrence_unit === "one_time") return "one-time";
  const unit = Number(bill.recurrence_interval || 1) === 1 ? bill.recurrence_unit : `${bill.recurrence_unit}s`;
  const dayPart =
    bill.recurrence_day_of_month && (bill.recurrence_unit === "month" || bill.recurrence_unit === "year")
      ? ` on day ${bill.recurrence_day_of_month}`
      : "";
  return `every ${bill.recurrence_interval || 1} ${unit}${dayPart}`;
}

function parseISODate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOfMonthFromISO(iso) {
  const day = Number(String(iso || "").split("-")[2]);
  return day >= 1 && day <= 31 ? day : null;
}

function scheduleUsesDayOfMonth(recurrenceUnit) {
  return recurrenceUnit === "month" || recurrenceUnit === "year";
}

function syncRecurrenceFieldState() {
  const unit = billRecurrenceUnit.value;
  const usesDay = scheduleUsesDayOfMonth(unit);
  billRecurrenceDayWrap.classList.toggle("hidden", !usesDay);
  billRecurrenceDayOfMonth.required = usesDay;
  billRecurrenceDayOfMonth.disabled = !usesDay;
  billRecurrenceInterval.disabled = unit === "one_time";
  if (unit === "one_time") {
    billRecurrenceInterval.value = "1";
  }
  if (usesDay && !billRecurrenceDayOfMonth.value) {
    const fallbackDay = dayOfMonthFromISO(billDueDate.value) ?? new Date().getDate();
    billRecurrenceDayOfMonth.value = String(fallbackDay);
  }
}

function billFormState() {
  return {
    id: billId.value || "",
    title: billTitle.value,
    category: billCategory.value,
    amount: billAmount.value,
    dueDate: billDueDate.value,
    recurrenceUnit: billRecurrenceUnit.value,
    recurrenceInterval: billRecurrenceInterval.value,
    recurrenceDayOfMonth: billRecurrenceDayOfMonth.value,
    recurrenceEndDate: billRecurrenceEndDate.value,
    source: billSource.value,
    payer: billPayer.value,
    confirmer: billConfirmer.value,
    status: billStatus.value,
    autopay: billAutopay.checked,
    notes: billNotes.value,
    formTitle: billFormTitle.textContent || "Add Bill / Payment Item",
    submitLabel: billSubmitBtn.textContent || "Save bill",
  };
}

function applyBillFormState(state) {
  billId.value = state.id || "";
  billTitle.value = state.title || "";
  billCategory.value = state.category || "utility";
  billAmount.value = state.amount ?? "";
  billDueDate.value = state.dueDate || toTodayISO();
  billRecurrenceUnit.value = state.recurrenceUnit || "month";
  billRecurrenceInterval.value = state.recurrenceInterval || "1";
  billRecurrenceDayOfMonth.value = state.recurrenceDayOfMonth || "";
  billRecurrenceEndDate.value = state.recurrenceEndDate || "";
  billSource.value = state.source || "";
  billPayer.value = state.payer || "";
  billConfirmer.value = state.confirmer || "";
  billStatus.value = state.status || "open";
  billAutopay.checked = !!state.autopay;
  billNotes.value = state.notes || "";
  billFormTitle.textContent = state.formTitle || "Add Bill / Payment Item";
  billSubmitBtn.textContent = state.submitLabel || "Save bill";
  syncRecurrenceFieldState();
}

function openBillModal() {
  billModal.classList.remove("hidden");
  billModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modalOpen");
}

function closeBillModal() {
  billModal.classList.add("hidden");
  billModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modalOpen");
}

function saveCurrentBillDraft() {
  if (!activeBillDraftKey) return;
  billDrafts.set(activeBillDraftKey, billFormState());
}

function addRecurrence(date, recurrenceUnit, recurrenceInterval, recurrenceDayOfMonth) {
  const interval = Math.max(1, Number(recurrenceInterval || 1));
  const next = new Date(date.getTime());

  if (recurrenceUnit === "day") {
    next.setDate(next.getDate() + interval);
    return next;
  }
  if (recurrenceUnit === "week") {
    next.setDate(next.getDate() + interval * 7);
    return next;
  }
  if (recurrenceUnit === "year" || recurrenceUnit === "month") {
    const monthDelta = recurrenceUnit === "year" ? interval * 12 : interval;
    const targetMonthIndex = next.getMonth() + monthDelta;
    const targetYear = next.getFullYear() + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const maxDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const preferredDay = recurrenceDayOfMonth ? Math.max(1, Math.min(31, Number(recurrenceDayOfMonth))) : next.getDate();
    const day = Math.min(preferredDay, maxDay);
    return new Date(targetYear, targetMonth, day);
  }
  return next;
}

function projectBillOccurrencesForMonth(bill, monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const occurrences = [];
  let cursor = parseISODate(bill.due_date);

  if (bill.recurrence_unit === "one_time") {
    if (cursor >= monthStart && cursor <= monthEnd) occurrences.push(new Date(cursor));
    return occurrences;
  }

  const recurrenceEndDate = bill.recurrence_end_date ? parseISODate(bill.recurrence_end_date) : null;
  if (recurrenceEndDate && cursor > recurrenceEndDate) return occurrences;

  let guard = 0;
  while (cursor < monthStart && guard < 1200) {
    cursor = addRecurrence(cursor, bill.recurrence_unit, bill.recurrence_interval, bill.recurrence_day_of_month);
    if (recurrenceEndDate && cursor > recurrenceEndDate) return occurrences;
    guard += 1;
  }

  guard = 0;
  while (cursor <= monthEnd && guard < 500) {
    if (recurrenceEndDate && cursor > recurrenceEndDate) break;
    if (cursor >= monthStart) occurrences.push(new Date(cursor));
    cursor = addRecurrence(cursor, bill.recurrence_unit, bill.recurrence_interval, bill.recurrence_day_of_month);
    guard += 1;
  }

  return occurrences;
}

function isDateInMonth(iso, monthDate) {
  if (!iso) return false;
  const target = parseISODate(iso);
  return target.getFullYear() === monthDate.getFullYear() && target.getMonth() === monthDate.getMonth();
}

function showTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${name}`));
}

function monthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function monthKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(date, delta) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + delta);
  copy.setDate(1);
  return copy;
}

function isOverdue(bill) {
  const due = String(bill.projected_due_date || bill.due_date);
  return bill.status === "open" && due < toTodayISO();
}

function colorClassForBill(bill) {
  const category = String(bill.category || "").toLowerCase();
  if (category === "utility") return "eventUtility";
  if (category === "shared_card") return "eventCard";
  if (category === "insurance") return "eventInsurance";
  return "eventOther";
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("authentication required");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function renderBillSummary(bills) {
  const open = bills.filter((item) => item.status === "open");
  const openTotal = open.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const overdue = open.filter((item) => String(item.due_date) < toTodayISO());
  const overdueTotal = overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  billSummary.innerHTML = `
    <div class="summaryCard"><div class="label">Open items</div><div class="value">${open.length}</div></div>
    <div class="summaryCard"><div class="label">Open total</div><div class="value">${formatMoney(openTotal)}</div></div>
    <div class="summaryCard"><div class="label">Overdue</div><div class="value">${overdue.length}</div></div>
    <div class="summaryCard"><div class="label">Overdue amount</div><div class="value">${formatMoney(overdueTotal)}</div></div>
  `;
}

function renderBillsTable(bills) {
  if (bills.length === 0) {
    billRows.innerHTML = `<tr><td colspan="9">No bills found for this filter/view.</td></tr>`;
    return;
  }
  billRows.innerHTML = bills
    .map(
      (bill) => `
    <tr class="${isOverdue(bill) ? "rowOverdue" : ""}">
      <td>${formatDate(bill.due_date)}</td>
      <td>
        <strong>${bill.title}</strong>
        ${bill.notes ? `<div class="subtitle">${bill.notes}</div>` : ""}
      </td>
      <td><span class="pill">${bill.category}</span></td>
      <td>${bill.payment_source || "—"}</td>
      <td>
        <div class="subtitle">Pays: ${bill.payer_name || "—"}</div>
        <div class="subtitle">Confirms: ${bill.confirmer_name || "—"}</div>
      </td>
      <td>${formatMoney(bill.amount)}</td>
      <td>${recurrenceLabel(bill)}${bill.autopay ? " • autopay" : ""}</td>
      <td><span class="pill ${bill.status === "paid" ? "statusPaid" : "statusOpen"}">${bill.status}</span></td>
      <td>
        <span class="actionRow">
          <button data-action="edit" data-id="${bill.id}">Edit</button>
          ${
            bill.status === "open"
              ? `<button data-action="mark-paid" data-id="${bill.id}" class="primary">Pay</button>`
              : `<button data-action="mark-open" data-id="${bill.id}">Mark open</button>`
          }
          <button class="danger" data-action="delete" data-id="${bill.id}">Delete</button>
        </span>
      </td>
    </tr>`,
    )
    .join("");
}

function renderBillsCalendar(bills) {
  const year = billCalendarMonth.getFullYear();
  const month = billCalendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const byDay = new Map();

  bills.forEach((bill) => {
    const occurrences = projectBillOccurrencesForMonth(bill, billCalendarMonth);
    occurrences.forEach((occurrenceDate) => {
      const day = occurrenceDate.getDate();
      const list = byDay.get(day) || [];
      list.push({ ...bill, projected_due_date: toISODate(occurrenceDate) });
      byDay.set(day, list);
    });

    if (bill.status === "open" && bill.last_paid_due_date && isDateInMonth(bill.last_paid_due_date, billCalendarMonth)) {
      const paidDay = parseISODate(bill.last_paid_due_date).getDate();
      const list = byDay.get(paidDay) || [];
      list.push({ ...bill, status: "paid", projected_due_date: bill.last_paid_due_date });
      byDay.set(paidDay, list);
    }
  });

  billCalLabel.textContent = monthLabel(billCalendarMonth);

  let html = "";
  for (let i = 0; i < startDow; i += 1) {
    html += `<div class="calendarDay calendarEmpty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const events = byDay.get(day) || [];
    const dayOverdue = events.some((bill) => isOverdue(bill));
    html += `
      <div class="calendarDay ${dayOverdue ? "calendarDayOverdue" : ""}">
        <div class="calendarDayNum">${day}</div>
        <div class="calendarItems">
          ${events
            .slice(0, 3)
            .map((bill) => {
              const overdueClass = isOverdue(bill) ? "calendarItemOverdue" : "";
              const paidClass = bill.status === "paid" ? "calendarItemPaid" : "";
              return `<button class="calendarItem ${colorClassForBill(bill)} ${overdueClass} ${paidClass}" data-bill-id="${bill.id}" title="Edit ${bill.title}">${bill.title} • ${formatMoney(
                bill.amount,
              )}</button>`;
            })
            .join("")}
          ${events.length > 3 ? `<div class="subtitle">+${events.length - 3} more</div>` : ""}
        </div>
      </div>
    `;
  }
  billCalendarGrid.innerHTML = html;
}

async function loadBills() {
  const common = new URLSearchParams();
  if (billFilterCategory.value) common.set("category", billFilterCategory.value);
  if (billFilterOwner.value.trim()) common.set("owner", billFilterOwner.value.trim());
  if (billFilterSource.value.trim()) common.set("payment_source", billFilterSource.value.trim());
  if (billFilterAutopay.value) common.set("autopay", billFilterAutopay.value);

  const tableParams = new URLSearchParams(common);
  tableParams.set("view", "active");
  const calendarParams = new URLSearchParams(common);
  calendarParams.set("view", "all");

  const [tableData, calendarData] = await Promise.all([
    requestJSON(`/api/bills?${tableParams.toString()}`),
    requestJSON(`/api/bills?${calendarParams.toString()}`),
  ]);

  cachedBills = tableData.bills || [];
  cachedCalendarBills = calendarData.bills || [];
  renderBillSummary(cachedBills);
  renderBillsCalendar(cachedCalendarBills);
  renderBillsTable(cachedBills);
}

function resetBillForm() {
  billId.value = "";
  billForm.reset();
  billStatus.value = "open";
  billDueDate.value = toTodayISO();
  billRecurrenceUnit.value = "month";
  billRecurrenceInterval.value = "1";
  billRecurrenceDayOfMonth.value = String(new Date().getDate());
  billRecurrenceEndDate.value = "";
  billAutopay.checked = false;
  syncRecurrenceFieldState();
  billFormTitle.textContent = "Add Bill / Payment Item";
  billSubmitBtn.textContent = "Save bill";
}

function addBillInitialState() {
  return {
    id: "",
    title: "",
    category: "utility",
    amount: "",
    dueDate: toTodayISO(),
    recurrenceUnit: "month",
    recurrenceInterval: "1",
    recurrenceDayOfMonth: String(new Date().getDate()),
    recurrenceEndDate: "",
    source: "",
    payer: "",
    confirmer: "",
    status: "open",
    autopay: false,
    notes: "",
    formTitle: "Add Bill / Payment Item",
    submitLabel: "Save bill",
  };
}

function editBillInitialState(bill) {
  return {
    id: bill.id,
    title: bill.title || "",
    category: bill.category || "utility",
    amount: String(bill.amount ?? ""),
    dueDate: bill.due_date || toTodayISO(),
    recurrenceUnit: bill.recurrence_unit || "month",
    recurrenceInterval: String(Math.max(1, Number(bill.recurrence_interval || 1))),
    recurrenceDayOfMonth: String(bill.recurrence_day_of_month || dayOfMonthFromISO(bill.due_date) || new Date().getDate()),
    recurrenceEndDate: bill.recurrence_end_date || "",
    source: bill.payment_source || "",
    payer: bill.payer_name || "",
    confirmer: bill.confirmer_name || "",
    status: bill.status || "open",
    autopay: !!bill.autopay,
    notes: bill.notes || "",
    formTitle: "Edit Bill / Payment Item",
    submitLabel: "Update bill",
  };
}

function openAddBillModal() {
  const draftKey = "add";
  activeBillDraftKey = draftKey;
  activeBillDraftInitial = addBillInitialState();
  const existingDraft = billDrafts.get(draftKey);
  if (existingDraft) {
    applyBillFormState(existingDraft);
  } else {
    applyBillFormState(activeBillDraftInitial);
    saveCurrentBillDraft();
  }
  openBillModal();
}

function openBillEditorFromButton() {
  if (activeBillDraftKey && billDrafts.has(activeBillDraftKey)) {
    applyBillFormState(billDrafts.get(activeBillDraftKey));
    openBillModal();
    return;
  }
  openAddBillModal();
}

function startEditBill(bill) {
  const draftKey = `edit:${bill.id}`;
  activeBillDraftKey = draftKey;
  activeBillDraftInitial = editBillInitialState(bill);
  const existingDraft = billDrafts.get(draftKey);
  if (existingDraft) {
    applyBillFormState(existingDraft);
  } else {
    applyBillFormState(activeBillDraftInitial);
    saveCurrentBillDraft();
  }
  openBillModal();
}

function resetActiveBillDraft() {
  if (!activeBillDraftKey || !activeBillDraftInitial) return;
  billDrafts.delete(activeBillDraftKey);
  applyBillFormState(activeBillDraftInitial);
  saveCurrentBillDraft();
}

async function submitBillForm(event) {
  event.preventDefault();
  const recurrenceUnit = billRecurrenceUnit.value;
  const recurrenceInterval = recurrenceUnit === "one_time" ? 1 : Math.max(1, Number(billRecurrenceInterval.value || 1));
  const recurrenceDay = scheduleUsesDayOfMonth(recurrenceUnit)
    ? Math.max(1, Math.min(31, Number(billRecurrenceDayOfMonth.value || dayOfMonthFromISO(billDueDate.value) || 1)))
    : null;
  const payload = {
    title: billTitle.value.trim(),
    category: billCategory.value,
    amount: Number(billAmount.value),
    due_date: billDueDate.value,
    recurrence_unit: recurrenceUnit,
    recurrence_interval: recurrenceInterval,
    recurrence_day_of_month: recurrenceDay,
    recurrence_end_date: billRecurrenceEndDate.value || null,
    payment_source: billSource.value.trim() || null,
    payer_name: billPayer.value.trim() || null,
    confirmer_name: billConfirmer.value.trim() || null,
    status: billStatus.value,
    autopay: billAutopay.checked,
    notes: billNotes.value.trim() || null,
    paid_on: billStatus.value === "paid" ? toTodayISO() : null,
  };

  const id = billId.value;
  if (id) {
    await requestJSON(`/api/bills/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } else {
    await requestJSON("/api/bills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
  if (id) {
    billDrafts.delete(`edit:${id}`);
  } else {
    billDrafts.delete("add");
  }
  if (activeBillDraftKey) {
    billDrafts.delete(activeBillDraftKey);
  }
  activeBillDraftKey = null;
  activeBillDraftInitial = null;
  closeBillModal();
  resetBillForm();
  await loadBills();
}

async function handleBillTableClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  if (action === "edit") {
    const bill = cachedBills.find((item) => item.id === id);
    if (bill) startEditBill(bill);
    return;
  }

  if (action === "delete") {
    if (!window.confirm("Delete this bill item?")) return;
    await requestJSON(`/api/bills/${id}`, { method: "DELETE" });
    await loadBills();
    return;
  }

  if (action === "mark-paid" || action === "mark-open") {
    const status = action === "mark-paid" ? "paid" : "open";
    await requestJSON(`/api/bills/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, paid_on: status === "paid" ? toTodayISO() : null }),
    });
    await loadBills();
  }
}

function handleBillCalendarClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.billId;
  if (!id) return;
  const bill = cachedCalendarBills.find((item) => item.id === id) || cachedBills.find((item) => item.id === id);
  if (bill) startEditBill(bill);
}

function bytesLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderDocTable(documents) {
  if (documents.length === 0) {
    docRows.innerHTML = `<tr><td colspan="6">No documents uploaded yet.</td></tr>`;
    return;
  }
  docRows.innerHTML = documents
    .map(
      (doc) => `
      <tr>
        <td>
          <strong>${doc.title}</strong>
          ${doc.tags ? `<div class="subtitle">${doc.tags}</div>` : ""}
        </td>
        <td><span class="pill">${doc.doc_type}</span></td>
        <td>${doc.category || "—"}</td>
        <td>${bytesLabel(doc.size_bytes)}</td>
        <td>${new Date(doc.uploaded_at).toLocaleString()}</td>
        <td>
          <span class="actionRow">
            <a href="/api/documents/${encodeURIComponent(doc.id)}/download"><button>Download</button></a>
            <button class="danger" data-doc-delete="${doc.id}">Delete</button>
          </span>
        </td>
      </tr>`,
    )
    .join("");
}

async function loadDocuments() {
  const data = await requestJSON("/api/documents");
  renderDocTable(data.documents || []);
}

async function submitDocumentForm(event) {
  event.preventDefault();
  if (!docFile.files?.length) {
    window.alert("Please choose a file.");
    return;
  }

  const formData = new FormData();
  formData.set("title", docTitle.value.trim());
  formData.set("doc_type", docType.value);
  formData.set("category", docCategory.value.trim());
  formData.set("tags", docTags.value.trim());
  formData.set("notes", docNotes.value.trim());
  formData.set("file", docFile.files[0]);

  await requestJSON("/api/documents", {
    method: "POST",
    body: formData,
  });

  docForm.reset();
  await loadDocuments();
}

async function handleDocumentDelete(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const id = target.dataset.docDelete;
  if (!id) return;
  if (!window.confirm("Delete this document?")) return;
  await requestJSON(`/api/documents/${id}`, { method: "DELETE" });
  await loadDocuments();
}

function debounce(fn, wait = 260) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

async function boot() {
  try {
    await requestJSON("/api/health");
    healthBadge.textContent = "API Ready";
  } catch {
    healthBadge.textContent = "API Unreachable";
  }

  closeBillModal();
  billViewSelect.value = "active";
  billViewSelect.disabled = true;
  resetBillForm();
  await Promise.all([loadBills(), loadDocuments()]);
}

tabs.forEach((tab) =>
  tab.addEventListener("click", () => {
    showTab(tab.dataset.tab);
  }),
);

billViewSelect.addEventListener("change", loadBills);
billFilterCategory.addEventListener("change", loadBills);
billFilterAutopay.addEventListener("change", loadBills);
billFilterOwner.addEventListener("input", debounce(loadBills));
billFilterSource.addEventListener("input", debounce(loadBills));

billCalPrevBtn.addEventListener("click", () => {
  const next = addMonths(billCalendarMonth, -1);
  billCalendarMonth.setTime(next.getTime());
  renderBillsCalendar(cachedBills);
});
billCalTodayBtn.addEventListener("click", () => {
  const today = new Date();
  today.setDate(1);
  billCalendarMonth.setTime(today.getTime());
  renderBillsCalendar(cachedBills);
});
billCalNextBtn.addEventListener("click", () => {
  const next = addMonths(billCalendarMonth, 1);
  billCalendarMonth.setTime(next.getTime());
  renderBillsCalendar(cachedBills);
});
billCalendarGrid.addEventListener("click", handleBillCalendarClick);

billForm.addEventListener("submit", submitBillForm);
billForm.addEventListener("input", saveCurrentBillDraft);
billForm.addEventListener("change", saveCurrentBillDraft);
billOpenEditorBtn.addEventListener("click", openBillEditorFromButton);
billModalCloseBtn.addEventListener("click", closeBillModal);
billModal.addEventListener("click", (event) => {
  if (event.target === billModal) closeBillModal();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !billModal.classList.contains("hidden")) {
    closeBillModal();
  }
});
billResetBtn.addEventListener("click", resetActiveBillDraft);
billRecurrenceUnit.addEventListener("change", syncRecurrenceFieldState);
billDueDate.addEventListener("change", () => {
  if (scheduleUsesDayOfMonth(billRecurrenceUnit.value)) {
    const day = dayOfMonthFromISO(billDueDate.value);
    if (day) billRecurrenceDayOfMonth.value = String(day);
  }
});
billRows.addEventListener("click", (event) => {
  handleBillTableClick(event).catch((err) => {
    console.error(err);
    window.alert("Action failed. Check server logs.");
  });
});

docForm.addEventListener("submit", (event) => {
  submitDocumentForm(event).catch((err) => {
    console.error(err);
    window.alert("Upload failed. Check server logs.");
  });
});
docRows.addEventListener("click", (event) => {
  handleDocumentDelete(event).catch((err) => {
    console.error(err);
    window.alert("Delete failed. Check server logs.");
  });
});

logoutBtn.addEventListener("click", async () => {
  try {
    await requestJSON("/auth/logout", { method: "POST" });
  } catch {
    // fall through to login page
  }
  window.location.href = "/login";
});

boot().catch((err) => {
  console.error(err);
  window.alert("Failed to initialize app.");
});
