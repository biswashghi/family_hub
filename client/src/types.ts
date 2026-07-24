import type { LucideIcon } from "lucide-react";
import { Folder, Home, NotebookPen, Sun, WalletCards } from "lucide-react";
import type { Agenda, Bill, Dashboard, DocsOverview, DocumentRecord, Environment, HomeOverview, Item, MoneyOverview, Note, NotesOverview, Session, Task } from "./api";

export type ViewName = "today" | "money" | "home" | "docs" | "notes";
export type LoadState = "loading" | "ready" | "error";

export type AppData = {
  dashboard: Dashboard | null;
  agenda: Agenda | null;
  money: MoneyOverview | null;
  home: HomeOverview | null;
  docs: DocsOverview | null;
  notes: NotesOverview | null;
  bills: Bill[];
  tasks: Task[];
  items: Item[];
  documents: DocumentRecord[];
  allNotes: Note[];
};

export type ModalState =
  | { kind: "bill"; mode: "create" | "edit"; item?: Bill }
  | { kind: "task"; mode: "create" | "edit"; item?: Task }
  | { kind: "item"; mode: "create" | "edit"; item?: Item }
  | { kind: "document"; mode: "create" | "edit"; item?: DocumentRecord }
  | { kind: "note"; mode: "create" | "edit"; item?: Note };

export type QueueItem = {
  id: string;
  kind: "bill" | "task" | "doc" | "item" | "note";
  date: string;
  title: string;
  detail: string;
  value: string;
};

export type NavItem = {
  view: ViewName;
  label: string;
  icon: LucideIcon;
};

export type ShellState = {
  view: ViewName;
  session: Session | null;
  environment: Environment | null;
};

export const NAV: NavItem[] = [
  { view: "today", label: "Today", icon: Sun },
  { view: "money", label: "Money", icon: WalletCards },
  { view: "home", label: "Home", icon: Home },
  { view: "docs", label: "Docs", icon: Folder },
  { view: "notes", label: "Notes", icon: NotebookPen },
];

export const VIEW_TITLES: Record<ViewName, string> = {
  today: "Today",
  money: "Money",
  home: "Home",
  docs: "Docs",
  notes: "Notes",
};

export const emptyData: AppData = {
  dashboard: null,
  agenda: null,
  money: null,
  home: null,
  docs: null,
  notes: null,
  bills: [],
  tasks: [],
  items: [],
  documents: [],
  allNotes: [],
};
