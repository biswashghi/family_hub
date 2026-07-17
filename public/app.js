const logoutBtn = document.getElementById("logoutBtn");
const addTaskBtn = document.getElementById("addTaskBtn");
const addNoteBtn = document.getElementById("addNoteBtn");
const pageTitle = document.getElementById("pageTitle");
const currentDate = document.getElementById("currentDate");
const weatherTempLabel = document.getElementById("weatherTempLabel");
const weatherLocationLabel = document.getElementById("weatherLocationLabel");
const utilityDateLabel = document.getElementById("utilityDateLabel");
const utilityDayLabel = document.getElementById("utilityDayLabel");
const sessionPill = document.getElementById("sessionPill");
const sidebarNav = document.getElementById("sidebarNav");
const mobileNav = document.getElementById("mobileNav");
const views = document.querySelectorAll(".view");
const openMoneyButtons = document.querySelectorAll("[data-open-money]");

const moneyStatusFilter = document.getElementById("moneyStatusFilter");
const moneyCategoryFilter = document.getElementById("moneyCategoryFilter");
const moneySourceFilter = document.getElementById("moneySourceFilter");
const moneyResponsibilityFilter = document.getElementById("moneyResponsibilityFilter");
const moneyBillsRows = document.getElementById("moneyBillsRows");
const moneyBillsEmpty = document.getElementById("moneyBillsEmpty");
const moneyDueSoonList = document.getElementById("moneyDueSoonList");
const moneyDueSoonEmpty = document.getElementById("moneyDueSoonEmpty");
const moneyDueSoonBadge = document.getElementById("moneyDueSoonBadge");

const billModal = document.getElementById("billModal");
const openBillModalBtn = document.getElementById("openBillModalBtn");
const billModalCloseBtn = document.getElementById("billModalCloseBtn");
const billForm = document.getElementById("billForm");
const billModalTitle = document.getElementById("billModalTitle");
const billId = document.getElementById("billId");
const billTitle = document.getElementById("billTitle");
const billCategory = document.getElementById("billCategory");
const billAmount = document.getElementById("billAmount");
const billAmountType = document.getElementById("billAmountType");
const billCurrency = document.getElementById("billCurrency");
const billDueDate = document.getElementById("billDueDate");
const billSource = document.getElementById("billSource");
const billResponsibility = document.getElementById("billResponsibility");
const billStatus = document.getElementById("billStatus");
const billRecurrenceUnit = document.getElementById("billRecurrenceUnit");
const billRecurrenceInterval = document.getElementById("billRecurrenceInterval");
const billRecurrenceDayOfMonth = document.getElementById("billRecurrenceDayOfMonth");
const billRecurrenceEndDate = document.getElementById("billRecurrenceEndDate");
const billAutopayEnabled = document.getElementById("billAutopayEnabled");
const billIsSubscription = document.getElementById("billIsSubscription");
const billNotes = document.getElementById("billNotes");
const billResetBtn = document.getElementById("billResetBtn");
const billDeleteBtn = document.getElementById("billDeleteBtn");
const billSubmitBtn = document.getElementById("billSubmitBtn");

const homeTaskForm = document.getElementById("homeTaskForm");
const homeTaskTitle = document.getElementById("homeTaskTitle");
const homeTaskArea = document.getElementById("homeTaskArea");
const homeTaskDueDate = document.getElementById("homeTaskDueDate");
const homeTaskRepeatUnit = document.getElementById("homeTaskRepeatUnit");
const homeTaskNotes = document.getElementById("homeTaskNotes");
const homeTasksList = document.getElementById("homeTasksList");
const homeTasksEmpty = document.getElementById("homeTasksEmpty");
const homeItemForm = document.getElementById("homeItemForm");
const homeItemName = document.getElementById("homeItemName");
const homeItemType = document.getElementById("homeItemType");
const homeItemLocation = document.getElementById("homeItemLocation");
const homeItemReplaceBy = document.getElementById("homeItemReplaceBy");
const homeItemRestockBy = document.getElementById("homeItemRestockBy");
const homeItemNotes = document.getElementById("homeItemNotes");
const homeItemsList = document.getElementById("homeItemsList");
const homeItemsEmpty = document.getElementById("homeItemsEmpty");

const docUploadForm = document.getElementById("docUploadForm");
const docTitle = document.getElementById("docTitle");
const docType = document.getElementById("docType");
const docCategory = document.getElementById("docCategory");
const docExpiryDate = document.getElementById("docExpiryDate");
const docTags = document.getElementById("docTags");
const docNotes = document.getElementById("docNotes");
const docPinned = document.getElementById("docPinned");
const docFile = document.getElementById("docFile");
const docsList = document.getElementById("docsList");
const docsEmpty = document.getElementById("docsEmpty");

const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteType = document.getElementById("noteType");
const noteTags = document.getElementById("noteTags");
const notePinned = document.getElementById("notePinned");
const noteBody = document.getElementById("noteBody");
const notesList = document.getElementById("notesList");
const notesEmpty = document.getElementById("notesEmpty");

const ICONS = {
  alert: `<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>`,
  archive: `<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>`,
  calendar: `<path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>`,
  check: `<path d="m20 6-11 11-5-5"/>`,
  chevron: `<path d="m9 18 6-6-6-6"/>`,
  clock: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
  dollar: `<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>`,
  edit: `<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
  file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>`,
  folder: `<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>`,
  home: `<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>`,
  note: `<path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>`,
  package: `<path d="m7.5 4.3 9 5.2"/><path d="m21 8-9 5-9-5"/><path d="M3 8v8l9 5 9-5V8l-9-5Z"/><path d="M12 13v8"/>`,
  plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
  repeat: `<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
  trash: `<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>`,
  wallet: `<path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V7"/><path d="M16 14h.01"/>`,
};

function iconMarkup(name, className = "icon") {
  const paths = ICONS[name] || ICONS.note;
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = iconMarkup(element.dataset.icon, element.dataset.iconClass || "icon");
  });
}

const NAV_ITEMS = [
  { view: "today", label: "Today", icon: "sun" },
  { view: "money", label: "Money", icon: "wallet" },
  { view: "home", label: "Home", icon: "home" },
  { view: "docs", label: "Docs", icon: "folder" },
  { view: "notes", label: "Notes", icon: "note" },
];

const pageMeta = {
  today: { title: "Today" },
  money: { title: "Money" },
  home: { title: "Home" },
  docs: { title: "Docs" },
  notes: { title: "Notes" },
};

const metricBindings = {
  todayOpenBills: { valueId: "todayOpenBills", textId: "todayOpenBillsText" },
  todayOpenTasks: { valueId: "todayOpenTasks", textId: "todayOpenTasksText" },
  todayStoredDocs: { valueId: "todayStoredDocs", textId: "todayStoredDocsText" },
  todayActiveNotes: { valueId: "todayActiveNotes", textId: "todayActiveNotesText" },
};

let cachedBills = [];
let cachedTasks = [];
let cachedItems = [];
let cachedDocuments = [];
let cachedNotes = [];
let currentView = "today";
const DEFAULT_VIEW = "today";
let navItems = [];

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

function navMarkup(item, { itemClass, iconClass }) {
  return `<button class="${itemClass}" data-view="${item.view}"><span class="${iconClass}">${iconMarkup(item.icon)}</span><span>${item.label}</span></button>`;
}

function renderNavigation() {
  sidebarNav.innerHTML = NAV_ITEMS.map((item) => navMarkup(item, { itemClass: "navItem", iconClass: "navIcon" })).join("");
  mobileNav.innerHTML = NAV_ITEMS.map((item) => navMarkup(item, { itemClass: "mobileNavItem", iconClass: "mobileNavIcon" })).join("");
  navItems = Array.from(document.querySelectorAll(".navItem, .mobileNavItem"));
}

function normalizeViewName(viewName) {
  return Object.prototype.hasOwnProperty.call(pageMeta, viewName) ? viewName : DEFAULT_VIEW;
}

function persistCurrentView(viewName) {
  const normalized = normalizeViewName(viewName);
  const nextHash = `#${normalized}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

function initialViewFromLocation() {
  const fromHash = (window.location.hash || "").replace(/^#/, "").trim();
  return normalizeViewName(fromHash || DEFAULT_VIEW);
}

function getViewConfig(viewName) {
  return viewRegistry[normalizeViewName(viewName)] || viewRegistry[DEFAULT_VIEW];
}

async function navigateToView(viewName) {
  setActiveView(viewName);
  await loadViewData(viewName);
}

function setActiveView(viewName) {
  const normalized = normalizeViewName(viewName);
  const meta = pageMeta[normalized] || pageMeta.today;
  currentView = normalized;
  pageTitle.textContent = meta.title;

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === normalized);
  });

  views.forEach((view) => {
    view.classList.toggle("active", view.id === `view-${normalized}`);
  });

  persistCurrentView(normalized);
}

async function requestJSON(url, options = {}) {
  const hasJsonBody = options.body && !(options.body instanceof FormData);
  const response = await fetch(url, {
    headers: { ...(hasJsonBody ? { "content-type": "application/json" } : {}), ...(options.headers || {}) },
    ...options,
  });

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("authentication required");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  if (response.status === 204) return null;
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : null;
}

async function loadEnvironment() {
  const environment = await requestJSON("/api/environment");
  const location = environment.location || {};
  weatherLocationLabel.textContent = location.label || "Household location";

  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    weatherTempLabel.textContent = "--°F";
    return;
  }

  try {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m",
      temperature_unit: "fahrenheit",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error("weather lookup failed");
    const weather = await response.json();
    const temperature = weather?.current?.temperature_2m;
    weatherTempLabel.textContent = Number.isFinite(temperature) ? `${Math.round(temperature)}°F` : "--°F";
  } catch (error) {
    console.warn(error);
    weatherTempLabel.textContent = "--°F";
  }
}

async function loadSession() {
  try {
    const session = await requestJSON("/api/session");
    sessionPill.textContent = `Signed in as ${session.username}`;
  } catch {
    window.location.href = "/login";
  }
}

function setMetric(id, value, text) {
  const binding = metricBindings[id];
  if (!binding) throw new Error(`Unknown metric binding: ${id}`);
  const valueElement = document.getElementById(binding.valueId);
  if (!valueElement) return;
  valueElement.textContent = String(value);
  if (binding.textId && text !== undefined) {
    const textElement = document.getElementById(binding.textId);
    if (textElement) textElement.textContent = text;
  }
}

function renderDataList(containerId, emptyId, items, renderItem) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  if (!items.length) {
    container.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  container.innerHTML = items.map(renderItem).join("");
}

function renderTodayBills(items) {
  renderDataList("todayBillsList", "todayBillsEmpty", items, (bill) => `
    <article class="listCard">
      <span class="rowIcon accentCoralIcon">${iconMarkup("wallet")}</span>
      <div>
        <strong>${escapeHtml(bill.title)}</strong>
        <div class="metaText">${escapeHtml(bill.source || "No source")} • ${escapeHtml(bill.responsibility_label || "No responsibility")}</div>
      </div>
      <div class="cardValueBlock">
        <span>${formatDate(bill.due_date)}</span>
        <strong>${escapeHtml(formatBillAmount(bill))}</strong>
      </div>
    </article>
  `);
}

function renderTodayDocs(items) {
  renderDataList("todayDocsList", "todayDocsEmpty", items, (doc) => `
    <article class="listCard compactCard">
      <span class="rowIcon accentBrassIcon">${iconMarkup("file")}</span>
      <div>
        <strong>${escapeHtml(doc.title)}</strong>
        <div class="metaText">${escapeHtml(doc.category || doc.type || "document")}</div>
      </div>
      <div class="cardValueBlock">
        <span>${doc.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : doc.is_pinned ? "Pinned" : "Document"}</span>
      </div>
    </article>
  `);
}

function renderTodayTasks(items) {
  renderDataList("todayTasksList", "todayTasksEmpty", items, (task) => `
    <label class="taskRow ${task.due_date && task.due_date < todayISO() ? "taskRowLate" : ""}">
      <input type="checkbox" data-task-done="${task.id}" ${task.status === "done" ? "checked" : ""} />
      <span>
        <strong>${escapeHtml(task.title)}</strong>
        <small>${escapeHtml(task.area || "household")}${task.due_date ? ` • ${dueBadgeText(task.due_date)}` : ""}</small>
      </span>
      <button type="button" class="miniAction iconOnlyBtn" data-task-snooze="${task.id}" title="Snooze">${iconMarkup("clock")}</button>
    </label>
  `);
}

function renderTodayItems(items) {
  renderDataList("todayItemsList", "todayItemsEmpty", items, (item) => `
    <article class="listCard compactCard">
      <span class="rowIcon accentSlateIcon">${iconMarkup("repeat")}</span>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="metaText">${escapeHtml(item.location || item.type)}</div>
      </div>
      <div class="cardValueBlock">
        <span>${itemDateLabel(item)}</span>
      </div>
    </article>
  `);
}

function renderTodayNotes(items) {
  renderDataList("todayNotesList", "todayNotesEmpty", items, (note) => `
    <article class="noteCard">
      <span class="notePin">${iconMarkup("note")}</span>
      <strong>${escapeHtml(note.title)}</strong>
      <p>${escapeHtml(note.body)}</p>
      <span class="metaText">${escapeHtml(note.note_type.replace("_", " "))}${note.tags ? ` • ${escapeHtml(note.tags)}` : ""}</span>
    </article>
  `);
}

function formatAgendaDate(iso) {
  if (!iso) {
    return { day: "—", month: "Any" };
  }
  const date = new Date(`${iso}T00:00:00`);
  return {
    day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
  };
}

function buildDashboardAgenda(data) {
  const bills = (data.upcomingBills || []).map((bill) => ({
    id: bill.id,
    kind: "Bill",
    title: bill.title,
    date: bill.due_date,
    value: formatBillAmount(bill),
    detail: dueBadgeText(bill.due_date),
  }));

  const tasks = (data.tasksToday || []).map((task) => ({
    id: task.id,
    kind: "Task",
    title: task.title,
    date: task.due_date,
    value: task.status === "done" ? "Done" : task.status === "snoozed" ? "Snoozed" : "Open",
    detail: task.due_date ? dueBadgeText(task.due_date) : "No due date",
  }));

  const items = (data.replaceSoon || []).map((item) => ({
    id: item.id,
    kind: item.replace_by_date ? "Replace" : "Restock",
    title: item.name,
    date: item.replace_by_date || item.restock_by_date,
    value: item.replace_by_date ? "Replace" : "Restock",
    detail: itemDateLabel(item),
  }));

  const docs = (data.importantDocs || []).map((doc) => ({
    id: doc.id,
    kind: "Doc",
    title: doc.title,
    date: doc.expiry_date,
    value: doc.expiry_date ? "Expires" : doc.is_pinned ? "Pinned" : "Stored",
    detail: doc.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : "Pinned",
  }));

  return [...bills, ...tasks, ...items, ...docs]
    .sort((left, right) => {
      const leftDate = left.date || "9999-12-31";
      const rightDate = right.date || "9999-12-31";
      if (leftDate === rightDate) return left.kind.localeCompare(right.kind);
      return leftDate.localeCompare(rightDate);
    })
    .slice(0, 8);
}

function renderTodayAgenda(data) {
  const items = buildDashboardAgenda(data);
  renderDataList("todayAgendaList", "todayAgendaEmpty", items, (item) => {
    const date = formatAgendaDate(item.date);
    return `
      <article class="agendaRow">
        <div class="agendaMain">
          <div class="agendaTitleRow">
            <span class="agendaKind">${escapeHtml(item.kind)}</span>
            <span class="agendaDateInline">${escapeHtml(date.month)} ${escapeHtml(date.day)}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </div>
        </div>
        <div class="agendaValue">
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      </article>
    `;
  });
}

function renderTodayPulse(metrics) {
  setMetric("todayOpenBills", metrics.openBillsCount, `${metrics.openBillsCount} open`);
  setMetric("todayOpenTasks", metrics.openTasksCount, `${metrics.openTasksCount} open`);
  setMetric("todayStoredDocs", metrics.storedDocsCount, `${metrics.storedDocsCount} stored`);
  setMetric("todayActiveNotes", metrics.activeNotesCount, `${metrics.activeNotesCount} active`);
}

async function loadDashboard() {
  const data = await requestJSON("/api/dashboard");
  renderTodayPulse(data.metrics);
  renderTodayAgenda(data);
  renderTodayBills(data.upcomingBills || []);
  renderTodayDocs(data.importantDocs || []);
  renderTodayTasks(data.tasksToday || []);
  renderTodayItems(data.replaceSoon || []);
  renderTodayNotes(data.recentNotes || []);
}

function renderMoneyDueSoon(bills) {
  moneyDueSoonBadge.textContent = bills.length === 1 ? "1 due" : `${bills.length} due`;
  renderDataList("moneyDueSoonList", "moneyDueSoonEmpty", bills, (bill) => `
    <article class="moduleRow ${bill.due_date < todayISO() ? "moduleRowAlert" : ""}">
      <span class="rowIcon accentCoralIcon">${iconMarkup(bill.due_date < todayISO() ? "alert" : "wallet")}</span>
      <div class="moduleMain">
        <strong>${escapeHtml(bill.title)}</strong>
        <span class="metaText">${escapeHtml(bill.source || "No source")} • ${escapeHtml(bill.responsibility_label || "Household")} • ${dueBadgeText(bill.due_date)}</span>
      </div>
      <div class="moduleValue">
        <strong>${escapeHtml(formatBillAmount(bill))}</strong>
        <span>${formatShortDate(bill.due_date)}</span>
      </div>
    </article>
  `);
}

function renderMoneyRows(bills) {
  if (!bills.length) {
    moneyBillsRows.innerHTML = "";
    moneyBillsEmpty.classList.remove("hidden");
    return;
  }

  moneyBillsEmpty.classList.add("hidden");
  moneyBillsRows.innerHTML = bills
    .map(
      (bill) => `
      <tr class="${bill.status === "open" && bill.due_date < todayISO() ? "rowOverdue" : ""}">
        <td>${formatDate(bill.due_date)}</td>
        <td>
          <strong>${escapeHtml(bill.title)}</strong>
          ${bill.notes ? `<div class="tableSubtle">${escapeHtml(bill.notes)}</div>` : ""}
        </td>
        <td><span class="tablePill">${escapeHtml(bill.category)}</span></td>
        <td>${escapeHtml(bill.source || "—")}</td>
        <td>${escapeHtml(bill.responsibility_label || "—")}</td>
        <td>${escapeHtml(formatBillAmount(bill))}</td>
        <td>${escapeHtml(recurrenceLabel(bill))}${bill.autopay_enabled ? " • autopay" : ""}</td>
        <td><span class="tablePill ${bill.status === "paid" ? "tablePillOk" : ""}">${escapeHtml(bill.status)}</span></td>
        <td>
          <div class="tableActions">
            <button type="button" class="miniAction iconOnlyBtn" data-bill-edit="${bill.id}" title="Edit">${iconMarkup("edit")}</button>
            ${bill.status === "open" ? `<button type="button" class="miniAction primaryMini iconOnlyBtn" data-bill-paid="${bill.id}" title="Mark paid">${iconMarkup("check")}</button>` : ""}
            <button type="button" class="miniAction iconOnlyBtn" data-bill-delete="${bill.id}" title="Delete">${iconMarkup("trash")}</button>
          </div>
        </td>
      </tr>
    `,
    )
    .join("");
}

async function loadMoney() {
  const params = new URLSearchParams();
  if (moneyStatusFilter.value) params.set("status", moneyStatusFilter.value);
  if (moneyCategoryFilter.value) params.set("category", moneyCategoryFilter.value);
  if (moneySourceFilter.value.trim()) params.set("source", moneySourceFilter.value.trim());
  if (moneyResponsibilityFilter.value.trim()) params.set("responsibility", moneyResponsibilityFilter.value.trim());
  const query = params.toString();
  const [data, overview] = await Promise.all([
    requestJSON(`/api/bills${query ? `?${query}` : ""}`),
    requestJSON("/api/money/overview"),
  ]);
  cachedBills = data.bills || [];
  renderMoneyDueSoon(overview.dueSoon || []);
  renderMoneyRows(cachedBills);
}

function openBillModal(bill = null) {
  billModal.classList.remove("hidden");
  billModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modalOpen");
  if (bill) {
    billModalTitle.textContent = "Edit Bill";
    billSubmitBtn.textContent = "Save changes";
    billDeleteBtn.classList.remove("hidden");
    billId.value = bill.id;
    billTitle.value = bill.title || "";
    billCategory.value = bill.category || "other";
    billAmount.value = bill.amount ?? "";
    billAmountType.value = bill.amount_type || "fixed";
    billCurrency.value = bill.currency || "USD";
    billDueDate.value = bill.due_date || todayISO();
    billSource.value = bill.source || "";
    billResponsibility.value = bill.responsibility_label || "";
    billStatus.value = bill.status || "open";
    billRecurrenceUnit.value = bill.recurrence_unit || "month";
    billRecurrenceInterval.value = bill.recurrence_interval || 1;
    billRecurrenceDayOfMonth.value = bill.recurrence_day_of_month || "";
    billRecurrenceEndDate.value = bill.recurrence_end_date || "";
    billAutopayEnabled.checked = !!bill.autopay_enabled;
    billIsSubscription.checked = !!bill.is_subscription;
    billNotes.value = bill.notes || "";
    return;
  }
  resetBillForm();
}

function closeBillModal() {
  billModal.classList.add("hidden");
  billModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modalOpen");
}

function resetBillForm() {
  billModalTitle.textContent = "Add Bill";
  billSubmitBtn.textContent = "Save bill";
  billDeleteBtn.classList.add("hidden");
  billForm.reset();
  billId.value = "";
  billCurrency.value = "USD";
  billAmountType.value = "fixed";
  billDueDate.value = todayISO();
  billRecurrenceUnit.value = "month";
  billRecurrenceInterval.value = 1;
  billStatus.value = "open";
}

function billPayloadFromForm() {
  const hasAmount = billAmount.value.trim() !== "";
  const amountType = !hasAmount && billAmountType.value === "fixed" ? "unknown" : billAmountType.value;
  return {
    title: billTitle.value.trim(),
    category: billCategory.value,
    amount: hasAmount ? Number(billAmount.value) : null,
    amount_type: amountType,
    currency: billCurrency.value.trim().toUpperCase() || "USD",
    due_date: billDueDate.value,
    source: billSource.value.trim(),
    responsibility_label: billResponsibility.value.trim(),
    status: billStatus.value,
    recurrence_unit: billRecurrenceUnit.value,
    recurrence_interval: Number(billRecurrenceInterval.value || 1),
    recurrence_day_of_month: billRecurrenceDayOfMonth.value ? Number(billRecurrenceDayOfMonth.value) : null,
    recurrence_end_date: billRecurrenceEndDate.value || null,
    autopay_enabled: billAutopayEnabled.checked,
    is_subscription: billIsSubscription.checked,
    notes: billNotes.value.trim(),
  };
}

async function saveBill(event) {
  event.preventDefault();
  const payload = billPayloadFromForm();
  const existingId = billId.value;
  if (existingId) {
    await requestJSON(`/api/bills/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  } else {
    await requestJSON("/api/bills", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  closeBillModal();
  await Promise.all([loadMoney(), loadDashboard()]);
}

function renderHomeTasks(tasks) {
  if (!tasks.length) {
    homeTasksList.innerHTML = "";
    homeTasksEmpty.classList.remove("hidden");
    return;
  }

  homeTasksEmpty.classList.add("hidden");
  homeTasksList.innerHTML = tasks
    .map(
      (task) => `
      <article class="entityRow ${task.status === "done" ? "entityRowMuted" : ""}">
        <span class="rowIcon accentForestIcon">${iconMarkup("check")}</span>
        <div class="entityMain">
          <div class="entityTitleRow">
            <strong>${escapeHtml(task.title)}</strong>
            <div class="entityBadges">
              <span class="tablePill ${task.status === "done" ? "tablePillOk" : ""}">${escapeHtml(task.status)}</span>
              <span class="tablePill tablePillMuted">${escapeHtml(taskRepeatLabel(task))}</span>
            </div>
          </div>
          <div class="metaText">${escapeHtml(task.area || "household")}${task.due_date ? ` • ${dueBadgeText(task.due_date)}` : " • no due date"}</div>
          ${task.notes ? `<p class="entityNote">${escapeHtml(task.notes)}</p>` : ""}
        </div>
        <div class="entityActions">
          <button type="button" class="miniAction iconOnlyBtn" data-home-task-toggle="${task.id}" title="${task.status === "done" ? "Reopen" : "Done"}">${iconMarkup(task.status === "done" ? "repeat" : "check")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-home-task-snooze="${task.id}" title="Snooze">${iconMarkup("clock")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-home-task-edit="${task.id}" title="Edit">${iconMarkup("edit")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-home-task-delete="${task.id}" title="Delete">${iconMarkup("trash")}</button>
        </div>
      </article>
    `,
    )
    .join("");
}

function renderHomeItems(items) {
  if (!items.length) {
    homeItemsList.innerHTML = "";
    homeItemsEmpty.classList.remove("hidden");
    return;
  }

  homeItemsEmpty.classList.add("hidden");
  homeItemsList.innerHTML = items
    .map(
      (item) => `
      <article class="entityRow ${item.status !== "active" ? "entityRowMuted" : ""}">
        <span class="rowIcon accentBrassIcon">${iconMarkup(item.type === "battery" || item.type === "supply" ? "package" : "repeat")}</span>
        <div class="entityMain">
          <div class="entityTitleRow">
            <strong>${escapeHtml(item.name)}</strong>
            <div class="entityBadges">
              <span class="tablePill">${escapeHtml(item.type)}</span>
              <span class="tablePill ${item.status === "active" ? "" : "tablePillMuted"}">${escapeHtml(item.status)}</span>
            </div>
          </div>
          <div class="metaText">${escapeHtml(item.location || "household")}${item.replace_by_date || item.restock_by_date ? ` • ${itemDateLabel(item)}` : " • no target date"}</div>
          ${item.notes ? `<p class="entityNote">${escapeHtml(item.notes)}</p>` : ""}
        </div>
        <div class="entityActions">
          <button type="button" class="miniAction iconOnlyBtn" data-home-item-restocked="${item.id}" title="Restocked">${iconMarkup("package")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-home-item-replaced="${item.id}" title="Replaced">${iconMarkup("repeat")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-home-item-archive="${item.id}" title="Archive">${iconMarkup("archive")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-home-item-edit="${item.id}" title="Edit">${iconMarkup("edit")}</button>
        </div>
      </article>
    `,
    )
    .join("");
}

async function loadHome() {
  const [tasksData, itemsData] = await Promise.all([requestJSON("/api/tasks"), requestJSON("/api/items")]);
  cachedTasks = tasksData.tasks || [];
  cachedItems = itemsData.items || [];
  renderHomeTasks(cachedTasks);
  renderHomeItems(cachedItems);
}

function renderDocsSummary(documents) {
  const latest = documents[0];
  const latestUpload = document.getElementById("docsLatestUpload");
  const latestUploadText = document.getElementById("docsLatestUploadText");
  if (latestUpload) latestUpload.textContent = latest ? formatShortDate((latest.created_at || "").slice(0, 10)) : "—";
  if (latestUploadText) latestUploadText.textContent = latest ? `${latest.title} is the latest upload.` : "Waiting on upload history.";
}

function renderDocuments(documents) {
  if (!documents.length) {
    docsList.innerHTML = "";
    docsEmpty.classList.remove("hidden");
    return;
  }

  docsEmpty.classList.add("hidden");
  docsList.innerHTML = documents
    .map(
      (doc) => `
      <article class="entityRow ${doc.is_pinned ? "entityRowPinned" : ""}">
        <span class="rowIcon accentBrassIcon">${iconMarkup("file")}</span>
        <div class="entityMain">
          <div class="entityTitleRow">
            <strong>${escapeHtml(doc.title)}</strong>
            <div class="entityBadges">
              <span class="tablePill">${escapeHtml(doc.type)}</span>
              ${doc.category ? `<span class="tablePill tablePillMuted">${escapeHtml(doc.category)}</span>` : ""}
              ${doc.is_pinned ? `<span class="tablePill tablePillOk">pinned</span>` : ""}
            </div>
          </div>
          <div class="metaText">
            ${escapeHtml(doc.file_name)}
            ${doc.expiry_date ? ` • expires ${formatDate(doc.expiry_date)}` : ""}
            ${doc.tags ? ` • ${escapeHtml(doc.tags)}` : ""}
          </div>
          ${doc.notes ? `<p class="entityNote">${escapeHtml(doc.notes)}</p>` : ""}
        </div>
        <div class="entityActions">
          <a class="miniAction actionLink iconOnlyBtn" href="/api/documents/${doc.id}/download" title="Download">${iconMarkup("folder")}</a>
          <button type="button" class="miniAction iconOnlyBtn" data-doc-pin="${doc.id}" title="${doc.is_pinned ? "Unpin" : "Pin"}">${iconMarkup("archive")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-doc-edit="${doc.id}" title="Edit">${iconMarkup("edit")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-doc-delete="${doc.id}" title="Delete">${iconMarkup("trash")}</button>
        </div>
      </article>
    `,
    )
    .join("");
}

async function loadDocs() {
  const data = await requestJSON("/api/documents");
  cachedDocuments = data.documents || [];
  renderDocsSummary(cachedDocuments);
  renderDocuments(cachedDocuments);
}

function renderNotesLibrary(notes) {
  if (!notes.length) {
    notesList.innerHTML = "";
    notesEmpty.classList.remove("hidden");
    return;
  }

  notesEmpty.classList.add("hidden");
  notesList.innerHTML = notes
    .map(
      (note) => `
      <article class="entityRow ${note.is_archived ? "entityRowMuted" : note.is_pinned ? "entityRowPinned" : ""}">
        <span class="rowIcon accentCoralIcon">${iconMarkup(note.note_type === "idea" ? "edit" : "note")}</span>
        <div class="entityMain">
          <div class="entityTitleRow">
            <strong>${escapeHtml(note.title)}</strong>
            <div class="entityBadges">
              <span class="tablePill">${escapeHtml(note.note_type.replace("_", " "))}</span>
              ${note.is_pinned ? `<span class="tablePill tablePillOk">pinned</span>` : ""}
              ${note.is_archived ? `<span class="tablePill tablePillMuted">archived</span>` : ""}
            </div>
          </div>
          <div class="metaText">${note.tags ? escapeHtml(note.tags) : "No tags"}</div>
          <p class="entityNote entityNoteBody">${escapeHtml(note.body)}</p>
        </div>
        <div class="entityActions">
          <button type="button" class="miniAction iconOnlyBtn" data-note-pin="${note.id}" title="${note.is_pinned ? "Unpin" : "Pin"}">${iconMarkup("archive")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-note-archive="${note.id}" title="${note.is_archived ? "Restore" : "Archive"}">${iconMarkup(note.is_archived ? "repeat" : "folder")}</button>
          <button type="button" class="miniAction iconOnlyBtn" data-note-edit="${note.id}" title="Edit">${iconMarkup("edit")}</button>
        </div>
      </article>
    `,
    )
    .join("");
}

async function loadNotes() {
  const data = await requestJSON("/api/notes?include_archived=1");
  cachedNotes = data.notes || [];
  renderNotesLibrary(cachedNotes);
}

async function promptCreateTask() {
  const title = window.prompt("Task title");
  if (!title) return;
  const dueDate = window.prompt("Due date (YYYY-MM-DD, optional)", todayISO()) || "";
  await requestJSON("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title,
      due_date: dueDate.trim() || null,
      status: "open",
      repeat_unit: "none",
    }),
  });
  await Promise.all([loadDashboard(), loadHome()]);
}

async function promptCreateNote() {
  const title = window.prompt("Note title");
  if (!title) return;
  const body = window.prompt("Note body");
  if (!body) return;
  await requestJSON("/api/notes", {
    method: "POST",
    body: JSON.stringify({ title, body, note_type: "quick_note" }),
  });
  await Promise.all([loadDashboard(), loadNotes()]);
}

async function createHomeTask(event) {
  event.preventDefault();
  await requestJSON("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: homeTaskTitle.value.trim(),
      area: homeTaskArea.value.trim(),
      due_date: homeTaskDueDate.value || null,
      repeat_unit: homeTaskRepeatUnit.value,
      repeat_interval: 1,
      notes: homeTaskNotes.value.trim(),
      status: "open",
    }),
  });
  homeTaskForm.reset();
  homeTaskRepeatUnit.value = "none";
  await Promise.all([loadHome(), loadDashboard()]);
}

async function createHomeItem(event) {
  event.preventDefault();
  await requestJSON("/api/items", {
    method: "POST",
    body: JSON.stringify({
      name: homeItemName.value.trim(),
      type: homeItemType.value,
      location: homeItemLocation.value.trim(),
      replace_by_date: homeItemReplaceBy.value || null,
      restock_by_date: homeItemRestockBy.value || null,
      notes: homeItemNotes.value.trim(),
      status: "active",
    }),
  });
  homeItemForm.reset();
  homeItemType.value = "filter";
  await Promise.all([loadHome(), loadDashboard()]);
}

async function uploadDocument(event) {
  event.preventDefault();
  if (!docFile.files.length) return;
  const formData = new FormData();
  formData.set("title", docTitle.value.trim());
  formData.set("doc_type", docType.value.trim());
  formData.set("category", docCategory.value.trim());
  formData.set("expiry_date", docExpiryDate.value || "");
  formData.set("tags", docTags.value.trim());
  formData.set("notes", docNotes.value.trim());
  if (docPinned.checked) formData.set("is_pinned", "true");
  formData.set("file", docFile.files[0]);
  await requestJSON("/api/documents", {
    method: "POST",
    body: formData,
  });
  docUploadForm.reset();
  await Promise.all([loadDocs(), loadDashboard()]);
}

async function createNote(event) {
  event.preventDefault();
  await requestJSON("/api/notes", {
    method: "POST",
    body: JSON.stringify({
      title: noteTitle.value.trim(),
      body: noteBody.value.trim(),
      note_type: noteType.value,
      tags: noteTags.value.trim(),
      is_pinned: notePinned.checked,
    }),
  });
  noteForm.reset();
  noteType.value = "quick_note";
  await Promise.all([loadNotes(), loadDashboard()]);
}

async function reloadViews(viewNames, { includeDashboard = false } = {}) {
  const loads = viewNames.map((viewName) => getViewConfig(viewName).load());
  if (includeDashboard) {
    loads.push(loadDashboard());
  }
  await Promise.all(loads);
}

async function dispatchEntityActions(event, actions) {
  for (const action of actions) {
    const id = event.target.getAttribute(action.attribute);
    if (!id) continue;
    await action.handler(id);
    return true;
  }
  return false;
}

async function handleTaskChange(event) {
  const markDoneId = event.target.getAttribute("data-task-done");
  if (!markDoneId) return;
  await requestJSON(`/api/tasks/${markDoneId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: event.target.checked ? "done" : "open" }),
  });
  await Promise.all([loadDashboard(), loadHome()]);
}

async function handleTaskClick(event) {
  const snoozeId = event.target.getAttribute("data-task-snooze");
  if (!snoozeId) return;
  await requestJSON(`/api/tasks/${snoozeId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "snoozed", due_date: addDaysISO(todayISO(), 1) }),
  });
  await Promise.all([loadDashboard(), loadHome()]);
}

async function handleBillTableAction(event) {
  const editId = event.target.getAttribute("data-bill-edit");
  const paidId = event.target.getAttribute("data-bill-paid");
  const deleteId = event.target.getAttribute("data-bill-delete");

  if (editId) {
    const bill = cachedBills.find((item) => item.id === editId);
    if (bill) openBillModal(bill);
    return;
  }
  if (paidId) {
    await requestJSON(`/api/bills/${paidId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "paid" }),
    });
    await Promise.all([loadMoney(), loadDashboard()]);
    return;
  }
  if (deleteId) {
    const confirmed = window.confirm("Delete this bill?");
    if (!confirmed) return;
    await requestJSON(`/api/bills/${deleteId}`, { method: "DELETE" });
    await Promise.all([loadMoney(), loadDashboard()]);
  }
}

async function deleteCurrentBill() {
  if (!billId.value) return;
  const confirmed = window.confirm("Delete this bill?");
  if (!confirmed) return;
  await requestJSON(`/api/bills/${billId.value}`, { method: "DELETE" });
  closeBillModal();
  await Promise.all([loadMoney(), loadDashboard()]);
}

async function handleHomeTaskActions(event) {
  await dispatchEntityActions(event, [
    {
      attribute: "data-home-task-toggle",
      handler: async (id) => {
        const task = cachedTasks.find((item) => item.id === id);
        if (!task) return;
        await requestJSON(`/api/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: task.status === "done" ? "open" : "done" }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-home-task-snooze",
      handler: async (id) => {
        await requestJSON(`/api/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "snoozed", due_date: addDaysISO(todayISO(), 1) }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-home-task-edit",
      handler: async (id) => {
        const task = cachedTasks.find((item) => item.id === id);
        if (!task) return;
        const title = window.prompt("Task title", task.title);
        if (!title) return;
        const area = window.prompt("Area", task.area || "") ?? task.area;
        const dueDate = window.prompt("Due date (YYYY-MM-DD)", task.due_date || "") ?? task.due_date;
        const notes = window.prompt("Notes", task.notes || "") ?? task.notes;
        await requestJSON(`/api/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, area, due_date: dueDate || null, notes }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-home-task-delete",
      handler: async (id) => {
        if (!window.confirm("Delete this task?")) return;
        await requestJSON(`/api/tasks/${id}`, { method: "DELETE" });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
  ]);
}

async function handleHomeItemActions(event) {
  await dispatchEntityActions(event, [
    {
      attribute: "data-home-item-restocked",
      handler: async (id) => {
        await requestJSON(`/api/items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "restocked" }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-home-item-replaced",
      handler: async (id) => {
        await requestJSON(`/api/items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "replaced" }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-home-item-archive",
      handler: async (id) => {
        await requestJSON(`/api/items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "archived" }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-home-item-edit",
      handler: async (id) => {
        const item = cachedItems.find((entry) => entry.id === id);
        if (!item) return;
        const name = window.prompt("Item name", item.name);
        if (!name) return;
        const location = window.prompt("Location", item.location || "") ?? item.location;
        const replaceBy = window.prompt("Replace by (YYYY-MM-DD)", item.replace_by_date || "") ?? item.replace_by_date;
        const restockBy = window.prompt("Restock by (YYYY-MM-DD)", item.restock_by_date || "") ?? item.restock_by_date;
        const notes = window.prompt("Notes", item.notes || "") ?? item.notes;
        await requestJSON(`/api/items/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, location, replace_by_date: replaceBy || null, restock_by_date: restockBy || null, notes }),
        });
        await reloadViews(["home"], { includeDashboard: true });
      },
    },
  ]);
}

async function handleDocumentActions(event) {
  await dispatchEntityActions(event, [
    {
      attribute: "data-doc-pin",
      handler: async (id) => {
        const doc = cachedDocuments.find((entry) => entry.id === id);
        if (!doc) return;
        await requestJSON(`/api/documents/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_pinned: !doc.is_pinned }),
        });
        await reloadViews(["docs"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-doc-edit",
      handler: async (id) => {
        const doc = cachedDocuments.find((entry) => entry.id === id);
        if (!doc) return;
        const title = window.prompt("Document title", doc.title);
        if (!title) return;
        const category = window.prompt("Category", doc.category || "") ?? doc.category;
        const expiryDate = window.prompt("Expiry date (YYYY-MM-DD)", doc.expiry_date || "") ?? doc.expiry_date;
        const tags = window.prompt("Tags", doc.tags || "") ?? doc.tags;
        const notes = window.prompt("Notes", doc.notes || "") ?? doc.notes;
        await requestJSON(`/api/documents/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, category, expiry_date: expiryDate || null, tags, notes }),
        });
        await reloadViews(["docs"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-doc-delete",
      handler: async (id) => {
        if (!window.confirm("Delete this document?")) return;
        await requestJSON(`/api/documents/${id}`, { method: "DELETE" });
        await reloadViews(["docs"], { includeDashboard: true });
      },
    },
  ]);
}

async function handleNoteActions(event) {
  await dispatchEntityActions(event, [
    {
      attribute: "data-note-pin",
      handler: async (id) => {
        const note = cachedNotes.find((entry) => entry.id === id);
        if (!note) return;
        await requestJSON(`/api/notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_pinned: !note.is_pinned }),
        });
        await reloadViews(["notes"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-note-archive",
      handler: async (id) => {
        const note = cachedNotes.find((entry) => entry.id === id);
        if (!note) return;
        await requestJSON(`/api/notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ is_archived: !note.is_archived }),
        });
        await reloadViews(["notes"], { includeDashboard: true });
      },
    },
    {
      attribute: "data-note-edit",
      handler: async (id) => {
        const note = cachedNotes.find((entry) => entry.id === id);
        if (!note) return;
        const title = window.prompt("Note title", note.title);
        if (!title) return;
        const body = window.prompt("Body", note.body) ?? note.body;
        const tags = window.prompt("Tags", note.tags || "") ?? note.tags;
        await requestJSON(`/api/notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, body, tags }),
        });
        await reloadViews(["notes"], { includeDashboard: true });
      },
    },
  ]);
}

const viewRegistry = {
  today: { load: loadDashboard, refreshesDashboard: false },
  money: { load: loadMoney, refreshesDashboard: true },
  home: { load: loadHome, refreshesDashboard: true },
  docs: { load: loadDocs, refreshesDashboard: true },
  notes: { load: loadNotes, refreshesDashboard: true },
};

async function loadViewData(viewName) {
  return getViewConfig(viewName).load();
}

async function refreshCurrentViewData() {
  const viewConfig = getViewConfig(currentView);
  const loads = [viewConfig.load()];
  if (viewConfig.refreshesDashboard) {
    loads.push(loadDashboard());
  }
  await Promise.all(loads);
}

function bindNavigationEvents() {
  navItems.forEach((item) => {
    item.addEventListener("click", async () => {
      await navigateToView(item.dataset.view);
    });
  });
}

openMoneyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    await navigateToView("money");
  });
});

document.querySelectorAll("[data-nav-view]").forEach((button) => {
  button.addEventListener("click", async () => {
    await navigateToView(button.dataset.navView);
  });
});

document.querySelectorAll("[data-open-bill-modal]").forEach((button) => {
  button.addEventListener("click", () => openBillModal());
});

document.querySelectorAll("[data-open-task-prompt]").forEach((button) => {
  button.addEventListener("click", promptCreateTask);
});

document.querySelectorAll("[data-open-note-prompt]").forEach((button) => {
  button.addEventListener("click", promptCreateNote);
});

[moneyStatusFilter, moneyCategoryFilter].forEach((input) => input.addEventListener("change", loadMoney));
[moneySourceFilter, moneyResponsibilityFilter].forEach((input) =>
  input.addEventListener("input", () => {
    window.clearTimeout(input._debounceTimer);
    input._debounceTimer = window.setTimeout(loadMoney, 220);
  }),
);

logoutBtn.addEventListener("click", async () => {
  try {
    await fetch("/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
});

addTaskBtn.addEventListener("click", promptCreateTask);
addNoteBtn.addEventListener("click", promptCreateNote);
openBillModalBtn.addEventListener("click", () => openBillModal());
billModalCloseBtn.addEventListener("click", closeBillModal);
billResetBtn.addEventListener("click", resetBillForm);
billDeleteBtn.addEventListener("click", deleteCurrentBill);
billForm.addEventListener("submit", saveBill);
moneyBillsRows.addEventListener("click", handleBillTableAction);
document.getElementById("todayTasksList").addEventListener("click", handleTaskClick);
document.getElementById("todayTasksList").addEventListener("change", handleTaskChange);
homeTaskForm.addEventListener("submit", createHomeTask);
homeItemForm.addEventListener("submit", createHomeItem);
homeTasksList.addEventListener("click", handleHomeTaskActions);
homeItemsList.addEventListener("click", handleHomeItemActions);
docUploadForm.addEventListener("submit", uploadDocument);
docsList.addEventListener("click", handleDocumentActions);
noteForm.addEventListener("submit", createNote);
notesList.addEventListener("click", handleNoteActions);
window.addEventListener("hashchange", async () => {
  const nextView = initialViewFromLocation();
  if (nextView === currentView) return;
  await navigateToView(nextView);
});

renderNavigation();
hydrateIcons();
bindNavigationEvents();
currentDate.textContent = formatToday();
const utilityDateParts = formatUtilityDateParts();
utilityDateLabel.textContent = utilityDateParts.dateLabel;
utilityDayLabel.textContent = utilityDateParts.dayLabel;
const startingView = initialViewFromLocation();
setActiveView(startingView);
resetBillForm();
homeTaskRepeatUnit.value = "none";
homeItemType.value = "filter";
noteType.value = "quick_note";

loadSession()
  .then(() => Promise.all([loadEnvironment(), refreshCurrentViewData()]))
  .catch((error) => {
    console.error(error);
  });
