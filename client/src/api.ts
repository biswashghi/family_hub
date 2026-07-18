export type Session = {
  authenticated: boolean;
  username: string;
  demo: boolean;
};

export type Environment = {
  location: {
    label: string;
    latitude: number;
    longitude: number;
  };
  timeZone: string;
};

export type Bill = {
  id: string;
  title: string;
  category: string;
  amount: number | null;
  amount_type?: "fixed" | "estimated" | "variable" | "unknown";
  currency: string;
  due_date: string;
  source?: string;
  responsibility_label?: string;
  status: string;
  autopay_enabled?: boolean;
  is_subscription?: boolean;
  notes?: string;
};

export type Task = {
  id: string;
  title: string;
  area?: string;
  status: string;
  due_date?: string | null;
  repeat_unit?: string;
  repeat_interval?: number;
  notes?: string;
};

export type Item = {
  id: string;
  name: string;
  type: string;
  status: string;
  replace_by_date?: string | null;
  restock_by_date?: string | null;
  location?: string;
  notes?: string;
};

export type DocumentRecord = {
  id: string;
  title: string;
  type: string;
  category?: string;
  tags?: string;
  file_name?: string;
  is_pinned?: boolean;
  expiry_date?: string | null;
  uploaded_at?: string;
  notes?: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  note_type: string;
  tags?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
};

export type Dashboard = {
  metrics: {
    dueSoonCount: number;
    tasksTodayCount: number;
    docsExpiringCount: number;
    replaceSoonCount: number;
    openBillsCount: number;
    openTasksCount: number;
    storedDocsCount: number;
    activeNotesCount: number;
  };
  upcomingBills: Bill[];
  tasksToday: Task[];
  importantDocs: DocumentRecord[];
  replaceSoon: Item[];
  recentNotes: Note[];
};

export type Agenda = {
  today: string;
  through: string;
  bills: Bill[];
  tasks: Task[];
  items: Item[];
  documents: DocumentRecord[];
};

export type MoneyOverview = {
  today: string;
  summary: {
    due_this_week: number;
    due_this_month: number;
    autopay_enabled: number;
    overdue: number;
  };
  dueSoon: Bill[];
  overdue: Bill[];
  subscriptions: Bill[];
};

export type HomeOverview = {
  today: string;
  metrics: {
    openTasksCount: number;
    dueTodayCount: number;
    replaceSoonCount: number;
    restockSoonCount: number;
  };
  dueTasks: Task[];
  replaceSoon: Item[];
  restockSoon: Item[];
};

export type DocsOverview = {
  metrics: {
    pinnedCount: number;
    expiringSoonCount: number;
    storedCount: number;
  };
  pinned: DocumentRecord[];
  expiringSoon: DocumentRecord[];
  recent: DocumentRecord[];
};

export type NotesOverview = {
  metrics: {
    activeCount: number;
    pinnedCount: number;
    ideaCount: number;
    archivedCount: number;
  };
  pinned: Note[];
  recent: Note[];
  ideas: Note[];
};

export type BillsResponse = {
  bills: Bill[];
};

export type TasksResponse = {
  tasks: Task[];
};

export type ItemsResponse = {
  items: Item[];
};

export type DocumentsResponse = {
  documents: DocumentRecord[];
};

export type NotesResponse = {
  notes: Note[];
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: isFormData
      ? options.headers
      : {
          "content-type": "application/json",
          ...(options.headers || {}),
        },
    ...options,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error || message;
    } catch {
      // Keep the HTTP status text when the response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${iso}T00:00:00`));
}

export function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
