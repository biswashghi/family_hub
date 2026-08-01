export type Session = {
  authenticated: boolean;
  username: string;
  demo: boolean;
};

export type Environment = {
  today: string;
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
  recurrence_unit?: "one_time" | "day" | "week" | "month" | "year";
  recurrence_interval?: number;
  recurrence_day_of_month?: number | null;
  recurrence_end_date?: string | null;
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

export type Agenda = {
  today: string;
  from: string;
  through: string;
  events: CalendarEvent[];
};

export type CalendarEventKind = "bill" | "task" | "item" | "document";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  source_id: string;
  action: "due" | "replace" | "restock" | "expires";
  title: string;
  scheduled_date: string;
  display_date: string;
  original_due_date: string | null;
  is_forecast: boolean;
  is_overdue: boolean;
  is_actionable: boolean;
  source: Bill | Task | Item | DocumentRecord;
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

export { api, ApiError } from "./api/client";
export { formatBillAmount, formatMoney, formatShortDate, todayISO } from "./api/formatting";
