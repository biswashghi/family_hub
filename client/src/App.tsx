import {
  Archive,
  CalendarDays,
  Check,
  ClipboardList,
  Edit3,
  FileText,
  Folder,
  Home,
  LogOut,
  LucideIcon,
  NotebookPen,
  Plus,
  Radar,
  ReceiptText,
  Repeat2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import {
  Agenda,
  ApiError,
  Bill,
  BillsResponse,
  Dashboard,
  DocsOverview,
  DocumentRecord,
  DocumentsResponse,
  Environment,
  HomeOverview,
  Item,
  ItemsResponse,
  MoneyOverview,
  Note,
  NotesResponse,
  NotesOverview,
  Session,
  Task,
  TasksResponse,
  api,
  formatBillAmount,
  formatShortDate,
  todayISO,
} from "./api";

type ViewName = "today" | "money" | "home" | "docs" | "notes";
type LoadState = "loading" | "ready" | "error";

type AppData = {
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

type ModalState =
  | { kind: "bill"; mode: "create" | "edit"; item?: Bill }
  | { kind: "task"; mode: "create" | "edit"; item?: Task }
  | { kind: "item"; mode: "create" | "edit"; item?: Item }
  | { kind: "document"; mode: "create" | "edit"; item?: DocumentRecord }
  | { kind: "note"; mode: "create" | "edit"; item?: Note };

type QueueItem = {
  id: string;
  kind: "bill" | "task" | "doc" | "item" | "note";
  date: string;
  title: string;
  detail: string;
  value: string;
};

const NAV: Array<{ view: ViewName; label: string; icon: LucideIcon }> = [
  { view: "today", label: "Today", icon: Sun },
  { view: "money", label: "Money", icon: WalletCards },
  { view: "home", label: "Home", icon: Home },
  { view: "docs", label: "Docs", icon: Folder },
  { view: "notes", label: "Notes", icon: NotebookPen },
];

const VIEW_TITLES: Record<ViewName, string> = {
  today: "Today",
  money: "Money",
  home: "Home",
  docs: "Docs",
  notes: "Notes",
};

const emptyData: AppData = {
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

export function App() {
  if (window.location.pathname === "/login") {
    return <AuthPage />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [view, setView] = useState<ViewName>("today");
  const [session, setSession] = useState<Session | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [captureValue, setCaptureValue] = useState("");
  const [captureKind, setCaptureKind] = useState<"task" | "note">("task");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [mutationError, setMutationError] = useState("");

  async function loadAppData() {
    setLoadState("loading");
    setError("");
    try {
      const [sessionData, environmentData, dashboard, agenda, money, home, docs, notes, billsData, tasksData, itemsData, documentsData, notesData] = await Promise.all([
        api<Session>("/api/session"),
        api<Environment>("/api/environment"),
        api<Dashboard>("/api/dashboard"),
        api<Agenda>("/api/agenda"),
        api<MoneyOverview>("/api/money/overview"),
        api<HomeOverview>("/api/home/overview"),
        api<DocsOverview>("/api/docs/overview"),
        api<NotesOverview>("/api/notes/overview"),
        api<BillsResponse>("/api/bills"),
        api<TasksResponse>("/api/tasks"),
        api<ItemsResponse>("/api/items"),
        api<DocumentsResponse>("/api/documents"),
        api<NotesResponse>("/api/notes?include_archived=1"),
      ]);
      setSession(sessionData);
      setEnvironment(environmentData);
      setData({
        dashboard,
        agenda,
        money,
        home,
        docs,
        notes,
        bills: billsData.bills || [],
        tasks: tasksData.tasks || [],
        items: itemsData.items || [],
        documents: documentsData.documents || [],
        allNotes: notesData.notes || [],
      });
      setLoadState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load Family Hub.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    void loadAppData();
  }, []);

  const queue = useMemo(() => buildQueue(data), [data]);
  const activeMetrics = data.dashboard?.metrics;
  const now = new Date();
  const fullDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now);
  const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(now);

  async function logout() {
    await fetch("/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function submitCapture(event: FormEvent) {
    event.preventDefault();
    const title = captureValue.trim();
    if (!title || session?.demo) return;

    if (captureKind === "task") {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title, due_date: todayISO(), status: "open", repeat_unit: "none" }),
      });
    } else {
      await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title, body: title, note_type: "quick_note" }),
      });
    }
    setCaptureValue("");
    await loadAppData();
  }

  async function mutate(action: () => Promise<unknown>) {
    setMutationError("");
    try {
      await action();
      setModal(null);
      await loadAppData();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  async function deleteEntity(kind: ModalState["kind"], id: string) {
    if (session?.demo) return;
    const path =
      kind === "bill"
        ? `/api/bills/${id}`
        : kind === "task"
          ? `/api/tasks/${id}`
          : kind === "item"
            ? `/api/items/${id}`
            : kind === "document"
              ? `/api/documents/${id}`
              : null;
    if (!path) return;
    await mutate(() => api(path, { method: "DELETE" }));
  }

  async function patchEntity(path: string, body: unknown) {
    if (session?.demo) return;
    await mutate(() => api(path, { method: "PATCH", body: JSON.stringify(body) }));
  }

  return (
    <LayoutGroup>
      <div className="appFrame">
        <aside className="commandRail" aria-label="Primary navigation">
          <motion.div className="railMark" initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }}>
            <Home />
          </motion.div>
          <nav className="railNav">
            {NAV.map((item) => (
              <NavButton key={item.view} {...item} active={view === item.view} onClick={() => setView(item.view)} />
            ))}
          </nav>
          <button className="railLogout" type="button" onClick={() => void logout()} aria-label="Log out">
            <LogOut />
          </button>
        </aside>

        <main className="surface">
          <motion.header className="heroDeck" layout>
            <div className="heroCopy">
              <motion.span className="eyebrow" layout>
                Private Household Command Center
              </motion.span>
              <AnimatePresence mode="wait">
                <motion.h1
                  key={view}
                  initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -14, filter: "blur(10px)" }}
                  transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {VIEW_TITLES[view]}
                </motion.h1>
              </AnimatePresence>
            </div>
            <div className="signalCluster">
              <Signal icon={Sun} label={environment?.location.label || "Detroit, MI"} value="Live" />
              <Signal icon={CalendarDays} label={fullDate} value={shortDate} />
              <Signal icon={ShieldCheck} label={session?.demo ? "Read-only demo" : session?.username || "Loading"} value={session?.demo ? "Demo" : "Private"} />
            </div>
          </motion.header>

          <form className="captureDeck" onSubmit={(event) => void submitCapture(event)}>
            <div className="captureIcon">
              <Plus />
            </div>
            <input
              value={captureValue}
              disabled={session?.demo}
              onChange={(event) => setCaptureValue(event.target.value)}
              placeholder={session?.demo ? "Demo mode is read-only" : "Capture a task or note without choosing a page"}
            />
            <div className="captureToggle" aria-label="Capture type">
              <button className={captureKind === "task" ? "active" : ""} type="button" onClick={() => setCaptureKind("task")}>
                Task
              </button>
              <button className={captureKind === "note" ? "active" : ""} type="button" onClick={() => setCaptureKind("note")}>
                Note
              </button>
            </div>
            <button className="captureSubmit" type="submit" disabled={session?.demo || !captureValue.trim()}>
              Add
            </button>
          </form>

          {loadState === "loading" ? (
            <LoadingState />
          ) : loadState === "error" ? (
            <ErrorState message={error} onRetry={() => void loadAppData()} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.section
                key={view}
                className="viewStage"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {view === "today" && <TodayView data={data} queue={queue} metrics={activeMetrics} setView={setView} onOpenModal={setModal} />}
                {view === "money" && <MoneyView money={data.money} bills={data.bills} onOpenModal={setModal} onPatch={patchEntity} onDelete={deleteEntity} demo={!!session?.demo} />}
                {view === "home" && <HomeView home={data.home} tasks={data.tasks} items={data.items} onOpenModal={setModal} onPatch={patchEntity} onDelete={deleteEntity} demo={!!session?.demo} />}
                {view === "docs" && <DocsView docs={data.docs} documents={data.documents} onOpenModal={setModal} onPatch={patchEntity} onDelete={deleteEntity} demo={!!session?.demo} />}
                {view === "notes" && <NotesView notes={data.notes} allNotes={data.allNotes} onOpenModal={setModal} onPatch={patchEntity} demo={!!session?.demo} />}
              </motion.section>
            </AnimatePresence>
          )}
        </main>

        <nav className="mobileDock" aria-label="Mobile navigation">
          {NAV.map((item) => (
            <NavButton key={item.view} {...item} active={view === item.view} onClick={() => setView(item.view)} compact />
          ))}
        </nav>

        <AnimatePresence>
          {modal && (
            <EntityModal
              modal={modal}
              error={mutationError}
              demo={!!session?.demo}
              onClose={() => {
                setModal(null);
                setMutationError("");
              }}
              onSubmit={(action) => void mutate(action)}
            />
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

function NavButton({ view, label, icon: Icon, active, compact, onClick }: { view: ViewName; label: string; icon: LucideIcon; active: boolean; compact?: boolean; onClick: () => void }) {
  return (
    <button className={`navButton ${active ? "active" : ""} ${compact ? "compact" : ""}`} type="button" onClick={onClick} aria-label={label} data-view={view}>
      {active && <motion.span className="activeGlow" layoutId={compact ? "mobileActiveGlow" : "railActiveGlow"} />}
      <Icon />
      {!compact && <span>{label}</span>}
    </button>
  );
}

function Signal({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <motion.div className="signal" whileHover={{ y: -2 }}>
      <Icon />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </motion.div>
  );
}

function TodayView({
  data,
  queue,
  metrics,
  setView,
  onOpenModal,
}: {
  data: AppData;
  queue: QueueItem[];
  metrics?: Dashboard["metrics"];
  setView: (view: ViewName) => void;
  onOpenModal: (modal: ModalState) => void;
}) {
  return (
    <div className="todayGrid">
      <Panel className="queuePanel" icon={Radar} title="Attention Queue" meta={`${queue.length} live signals`}>
        <div className="timeline">
          {queue.length ? queue.map((item, index) => <QueueCard key={item.id} item={item} index={index} />) : <Empty label="Nothing needs attention right now." />}
        </div>
      </Panel>

      <Panel className="pulsePanel" icon={Sparkles} title="Household Pulse" meta="cross-page state">
        <div className="pulseGrid">
          <MetricButton label="Open bills" value={metrics?.openBillsCount ?? 0} onClick={() => setView("money")} />
          <MetricButton label="Open tasks" value={metrics?.openTasksCount ?? 0} onClick={() => setView("home")} />
          <MetricButton label="Stored docs" value={metrics?.storedDocsCount ?? 0} onClick={() => setView("docs")} />
          <MetricButton label="Active notes" value={metrics?.activeNotesCount ?? 0} onClick={() => setView("notes")} />
        </div>
      </Panel>

      <Panel icon={ReceiptText} title="Upcoming Money" meta="next seven days">
        <PanelActions>
          <ActionButton icon={Plus} label="Add bill" onClick={() => onOpenModal({ kind: "bill", mode: "create" })} />
        </PanelActions>
        <CardStack items={(data.dashboard?.upcomingBills || []).slice(0, 4)} render={(bill) => <BillRow bill={bill} />} />
      </Panel>

      <Panel icon={ClipboardList} title="House Work" meta="due and repeating">
        <PanelActions>
          <ActionButton icon={Plus} label="Add task" onClick={() => onOpenModal({ kind: "task", mode: "create" })} />
        </PanelActions>
        <CardStack items={(data.dashboard?.tasksToday || []).slice(0, 4)} render={(task) => <TaskRow task={task} />} />
      </Panel>

      <Panel icon={FileText} title="Pinned + Expiring" meta="documents">
        <PanelActions>
          <ActionButton icon={Upload} label="Upload" onClick={() => onOpenModal({ kind: "document", mode: "create" })} />
        </PanelActions>
        <CardStack items={(data.dashboard?.importantDocs || []).slice(0, 4)} render={(doc) => <DocumentRow document={doc} />} />
      </Panel>
    </div>
  );
}

function MoneyView({
  money,
  bills,
  onOpenModal,
  onPatch,
  onDelete,
  demo,
}: {
  money: MoneyOverview | null;
  bills: Bill[];
  onOpenModal: (modal: ModalState) => void;
  onPatch: (path: string, body: unknown) => Promise<void>;
  onDelete: (kind: ModalState["kind"], id: string) => Promise<void>;
  demo: boolean;
}) {
  return (
    <div className="sectionGrid">
      <Panel className="widePanel" icon={WalletCards} title="Money Flow" meta="recurring bills and payment responsibility">
        <PanelActions>
          <ActionButton icon={Plus} label="Add bill" onClick={() => onOpenModal({ kind: "bill", mode: "create" })} disabled={demo} />
        </PanelActions>
        <div className="moneyRibbon">
          <Metric label="Due week" value={money?.summary.due_this_week ?? 0} />
          <Metric label="Due month" value={money?.summary.due_this_month ?? 0} />
          <Metric label="Autopay" value={money?.summary.autopay_enabled ?? 0} />
          <Metric label="Overdue" value={money?.summary.overdue ?? 0} danger />
        </div>
        <div className="ledger">
          {bills.length ? (
            bills.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                actions={
                  <RowActions>
                    <IconAction icon={Edit3} label="Edit bill" onClick={() => onOpenModal({ kind: "bill", mode: "edit", item: bill })} disabled={demo} />
                    {bill.status === "open" && <IconAction icon={Check} label="Mark paid" onClick={() => onPatch(`/api/bills/${bill.id}`, { status: "paid" })} disabled={demo} />}
                    <IconAction icon={Trash2} label="Delete bill" onClick={() => onDelete("bill", bill.id)} disabled={demo} />
                  </RowActions>
                }
              />
            ))
          ) : (
            <Empty label="No active bills yet." />
          )}
        </div>
      </Panel>
      <Panel icon={Repeat2} title="Subscriptions" meta="quiet recurring charges">
        <CardStack items={money?.subscriptions || []} render={(bill) => <BillRow bill={bill} compact />} />
      </Panel>
    </div>
  );
}

function HomeView({
  home,
  tasks,
  items,
  onOpenModal,
  onPatch,
  onDelete,
  demo,
}: {
  home: HomeOverview | null;
  tasks: Task[];
  items: Item[];
  onOpenModal: (modal: ModalState) => void;
  onPatch: (path: string, body: unknown) => Promise<void>;
  onDelete: (kind: ModalState["kind"], id: string) => Promise<void>;
  demo: boolean;
}) {
  return (
    <div className="sectionGrid">
      <Panel className="widePanel" icon={Home} title="Home Operations" meta="tasks, replacements, and supplies">
        <PanelActions>
          <ActionButton icon={Plus} label="Add task" onClick={() => onOpenModal({ kind: "task", mode: "create" })} disabled={demo} />
          <ActionButton icon={Plus} label="Add item" onClick={() => onOpenModal({ kind: "item", mode: "create" })} disabled={demo} />
        </PanelActions>
        <div className="moneyRibbon">
          <Metric label="Open tasks" value={home?.metrics.openTasksCount ?? 0} />
          <Metric label="Due today" value={home?.metrics.dueTodayCount ?? 0} />
          <Metric label="Replace" value={home?.metrics.replaceSoonCount ?? 0} />
          <Metric label="Restock" value={home?.metrics.restockSoonCount ?? 0} />
        </div>
        <div className="ledger twoColumn">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              actions={
                <RowActions>
                  <IconAction icon={Check} label={task.status === "done" ? "Reopen" : "Done"} onClick={() => onPatch(`/api/tasks/${task.id}`, { status: task.status === "done" ? "open" : "done" })} disabled={demo} />
                  <IconAction icon={Edit3} label="Edit task" onClick={() => onOpenModal({ kind: "task", mode: "edit", item: task })} disabled={demo} />
                  <IconAction icon={Trash2} label="Delete task" onClick={() => onDelete("task", task.id)} disabled={demo} />
                </RowActions>
              }
            />
          ))}
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              actions={
                <RowActions>
                  <IconAction icon={Repeat2} label="Restocked" onClick={() => onPatch(`/api/items/${item.id}`, { status: "restocked" })} disabled={demo} />
                  <IconAction icon={Edit3} label="Edit item" onClick={() => onOpenModal({ kind: "item", mode: "edit", item })} disabled={demo} />
                  <IconAction icon={Trash2} label="Archive item" onClick={() => onPatch(`/api/items/${item.id}`, { status: "archived" })} disabled={demo} />
                </RowActions>
              }
            />
          ))}
        </div>
      </Panel>
      <Panel icon={Check} title="Due Now" meta="needs hands">
        <CardStack items={home?.dueTasks || []} render={(task) => <TaskRow task={task} compact />} />
      </Panel>
    </div>
  );
}

function DocsView({
  docs,
  documents,
  onOpenModal,
  onPatch,
  onDelete,
  demo,
}: {
  docs: DocsOverview | null;
  documents: DocumentRecord[];
  onOpenModal: (modal: ModalState) => void;
  onPatch: (path: string, body: unknown) => Promise<void>;
  onDelete: (kind: ModalState["kind"], id: string) => Promise<void>;
  demo: boolean;
}) {
  return (
    <div className="sectionGrid">
      <Panel className="widePanel" icon={Folder} title="Document Vault" meta="retrieval-first storage">
        <PanelActions>
          <ActionButton icon={Upload} label="Upload doc" onClick={() => onOpenModal({ kind: "document", mode: "create" })} disabled={demo} />
        </PanelActions>
        <div className="moneyRibbon">
          <Metric label="Pinned" value={docs?.metrics.pinnedCount ?? 0} />
          <Metric label="Expiring" value={docs?.metrics.expiringSoonCount ?? 0} danger />
          <Metric label="Stored" value={docs?.metrics.storedCount ?? 0} />
        </div>
        <div className="vaultGrid">
          {documents.length ? (
            documents.map((document) => (
              <DocumentTile
                key={document.id}
                document={document}
                actions={
                  <RowActions>
                    <IconAction icon={Archive} label={document.is_pinned ? "Unpin" : "Pin"} onClick={() => onPatch(`/api/documents/${document.id}`, { is_pinned: !document.is_pinned })} disabled={demo} />
                    <IconAction icon={Edit3} label="Edit document" onClick={() => onOpenModal({ kind: "document", mode: "edit", item: document })} disabled={demo} />
                    <IconAction icon={Trash2} label="Delete document" onClick={() => onDelete("document", document.id)} disabled={demo} />
                  </RowActions>
                }
              />
            ))
          ) : (
            <Empty label="No documents stored yet." />
          )}
        </div>
      </Panel>
      <Panel icon={Archive} title="Recent" meta="latest uploads">
        <CardStack items={docs?.recent || []} render={(doc) => <DocumentRow document={doc} />} />
      </Panel>
    </div>
  );
}

function NotesView({
  notes,
  allNotes,
  onOpenModal,
  onPatch,
  demo,
}: {
  notes: NotesOverview | null;
  allNotes: Note[];
  onOpenModal: (modal: ModalState) => void;
  onPatch: (path: string, body: unknown) => Promise<void>;
  demo: boolean;
}) {
  const mergedNotes = allNotes.length ? allNotes : [...(notes?.pinned || []), ...(notes?.recent || []), ...(notes?.ideas || [])].filter((note, index, arr) => arr.findIndex((item) => item.id === note.id) === index);
  return (
    <div className="sectionGrid">
      <Panel className="widePanel" icon={NotebookPen} title="Memory Layer" meta="notes, lists, and quick references">
        <PanelActions>
          <ActionButton icon={Plus} label="Add note" onClick={() => onOpenModal({ kind: "note", mode: "create" })} disabled={demo} />
        </PanelActions>
        <div className="moneyRibbon">
          <Metric label="Active" value={notes?.metrics.activeCount ?? 0} />
          <Metric label="Pinned" value={notes?.metrics.pinnedCount ?? 0} />
          <Metric label="Ideas" value={notes?.metrics.ideaCount ?? 0} />
          <Metric label="Archived" value={notes?.metrics.archivedCount ?? 0} />
        </div>
        <div className="notesGrid">
          {mergedNotes.length ? (
            mergedNotes.map((note) => (
              <NoteTile
                key={note.id}
                note={note}
                actions={
                  <RowActions>
                    <IconAction icon={Archive} label={note.is_pinned ? "Unpin" : "Pin"} onClick={() => onPatch(`/api/notes/${note.id}`, { is_pinned: !note.is_pinned })} disabled={demo} />
                    <IconAction icon={Edit3} label="Edit note" onClick={() => onOpenModal({ kind: "note", mode: "edit", item: note })} disabled={demo} />
                    <IconAction icon={Trash2} label={note.is_archived ? "Restore" : "Archive"} onClick={() => onPatch(`/api/notes/${note.id}`, { is_archived: !note.is_archived })} disabled={demo} />
                  </RowActions>
                }
              />
            ))
          ) : (
            <Empty label="No notes yet." />
          )}
        </div>
      </Panel>
      <Panel icon={Sparkles} title="Ideas" meta="later pile">
        <CardStack items={notes?.ideas || []} render={(note) => <NoteRow note={note} />} />
      </Panel>
    </div>
  );
}

function Panel({ icon: Icon, title, meta, className = "", children }: { icon: LucideIcon; title: string; meta: string; className?: string; children: ReactNode }) {
  return (
    <motion.article className={`panel ${className}`} layout whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <div className="panelHeader">
        <div className="panelIcon">
          <Icon />
        </div>
        <div>
          <h2>{title}</h2>
          <span>{meta}</span>
        </div>
      </div>
      {children}
    </motion.article>
  );
}

function PanelActions({ children }: { children: ReactNode }) {
  return <div className="panelActions">{children}</div>;
}

function ActionButton({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button className="actionButton" type="button" onClick={onClick} disabled={disabled} whileTap={{ scale: 0.96 }}>
      <Icon />
      <span>{label}</span>
    </motion.button>
  );
}

function RowActions({ children }: { children: ReactNode }) {
  return <div className="rowActions">{children}</div>;
}

function IconAction({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="iconAction" type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      <Icon />
    </button>
  );
}

function QueueCard({ item, index }: { item: QueueItem; index: number }) {
  return (
    <motion.article className={`queueCard ${item.kind}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.045 }}>
      <span className="queueDate">{item.date}</span>
      <div>
        <strong>{item.title}</strong>
        <span>{item.detail}</span>
      </div>
      <b>{item.value}</b>
    </motion.article>
  );
}

function MetricButton({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <motion.button className="metricButton" type="button" onClick={onClick} whileTap={{ scale: 0.96 }}>
      <strong>{value}</strong>
      <span>{label}</span>
    </motion.button>
  );
}

function Metric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`metric ${danger ? "danger" : ""}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function CardStack<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  if (!items.length) return <Empty label="Nothing here yet." />;
  return <div className="cardStack">{items.map((item, index) => <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>{render(item)}</motion.div>)}</div>;
}

function BillRow({ bill, compact, actions }: { bill: Bill; compact?: boolean; actions?: ReactNode }) {
  return (
    <article className={`dataRow ${compact ? "compact" : ""}`}>
      <span className="rowGlyph coral">
        <ReceiptText />
      </span>
      <div>
        <strong>{bill.title}</strong>
        <span>{bill.source || "No source"} · {bill.responsibility_label || "Household"} · {formatShortDate(bill.due_date)}</span>
      </div>
      <b>{formatBillAmount(bill)}</b>
      {actions}
    </article>
  );
}

function TaskRow({ task, compact, actions }: { task: Task; compact?: boolean; actions?: ReactNode }) {
  return (
    <article className={`dataRow ${compact ? "compact" : ""}`}>
      <span className="rowGlyph mint">
        <Check />
      </span>
      <div>
        <strong>{task.title}</strong>
        <span>{task.area || "household"} · {task.due_date ? formatShortDate(task.due_date) : "No due date"}</span>
      </div>
      <b>{task.status}</b>
      {actions}
    </article>
  );
}

function ItemRow({ item, actions }: { item: Item; actions?: ReactNode }) {
  return (
    <article className="dataRow">
      <span className="rowGlyph gold">
        <Repeat2 />
      </span>
      <div>
        <strong>{item.name}</strong>
        <span>{item.location || item.type} · {item.replace_by_date ? `Replace ${formatShortDate(item.replace_by_date)}` : item.restock_by_date ? `Restock ${formatShortDate(item.restock_by_date)}` : "No target"}</span>
      </div>
      <b>{item.status}</b>
      {actions}
    </article>
  );
}

function DocumentRow({ document }: { document: DocumentRecord }) {
  return (
    <article className="dataRow">
      <span className="rowGlyph blue">
        <FileText />
      </span>
      <div>
        <strong>{document.title}</strong>
        <span>{document.category || document.type} · {document.expiry_date ? `Expires ${formatShortDate(document.expiry_date)}` : "stored"}</span>
      </div>
      <b>{document.is_pinned ? "Pinned" : "Doc"}</b>
    </article>
  );
}

function DocumentTile({ document, actions }: { document: DocumentRecord; actions?: ReactNode }) {
  return (
    <motion.article className="documentTile" whileHover={{ rotate: -1, y: -4 }}>
      <FileText />
      <strong>{document.title}</strong>
      <span>{document.file_name || document.type}</span>
      {actions}
    </motion.article>
  );
}

function NoteTile({ note, actions }: { note: Note; actions?: ReactNode }) {
  return (
    <motion.article className="noteTile" whileHover={{ rotate: 1.2, y: -4 }}>
      <span>{note.note_type.replace("_", " ")}</span>
      <strong>{note.title}</strong>
      <p>{note.body}</p>
      {actions}
    </motion.article>
  );
}

function NoteRow({ note }: { note: Note }) {
  return (
    <article className="dataRow">
      <span className="rowGlyph coral">
        <NotebookPen />
      </span>
      <div>
        <strong>{note.title}</strong>
        <span>{note.tags || note.note_type}</span>
      </div>
      <b>{note.is_pinned ? "Pinned" : "Note"}</b>
    </article>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="emptyState">{label}</div>;
}

function LoadingState() {
  return (
    <div className="loadingState">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }} />
      <span>Loading household signal...</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="errorState">
      <strong>Could not load the app.</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function AuthPage() {
  const [setupRequired, setSetupRequired] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      void enterDemo();
      return;
    }

    void api<{ setup_required: boolean }>("/auth/status")
      .then((status) => setSetupRequired(status.setup_required))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to check login status."));
  }, []);

  async function enterDemo() {
    setBusy(true);
    setError("");
    try {
      await api("/auth/demo", { method: "POST" });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(setupRequired ? "/auth/setup" : "/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="authShell">
      <motion.section className="authPanel" initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}>
        <div className="authMark">
          <Home />
        </div>
        <div className="authCopy">
          <span className="eyebrow">Private Household Command Center</span>
          <h1>Family Hub</h1>
          <p>{setupRequired ? "Create the first household login to finish setup." : "Sign in to bills, upkeep, documents, and notes."}</p>
        </div>
        <form className="authForm" onSubmit={(event) => void submit(event)}>
          <Field name="username" label="Username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
          <Field name="password" label="Password" type="password" autoComplete={setupRequired ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="formError">{error}</p>}
          <button className="authSubmit" type="submit" disabled={busy}>
            {setupRequired ? "Create account" : "Enter Family Hub"}
          </button>
          <button className="authDemo" type="button" onClick={() => void enterDemo()} disabled={busy}>
            View read-only demo
          </button>
        </form>
      </motion.section>
    </main>
  );
}

function EntityModal({
  modal,
  error,
  demo,
  onClose,
  onSubmit,
}: {
  modal: ModalState;
  error: string;
  demo: boolean;
  onClose: () => void;
  onSubmit: (action: () => Promise<unknown>) => void;
}) {
  const title = `${modal.mode === "create" ? "Add" : "Edit"} ${modal.kind === "item" ? "household item" : modal.kind}`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo) return;
    const form = new FormData(event.currentTarget);
    onSubmit(() => submitEntityForm(modal, form));
  }

  return (
    <motion.div className="modalBackdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="entityModal" initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.96 }}>
        <div className="modalHeader">
          <div>
            <span className="eyebrow">React workflow</span>
            <h2>{title}</h2>
          </div>
          <button className="iconAction" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="entityForm" onSubmit={submit}>
          {modal.kind === "bill" && <BillFields bill={modal.item} />}
          {modal.kind === "task" && <TaskFields task={modal.item} />}
          {modal.kind === "item" && <ItemFields item={modal.item} />}
          {modal.kind === "document" && <DocumentFields document={modal.item} mode={modal.mode} />}
          {modal.kind === "note" && <NoteFields note={modal.item} />}
          {error && <p className="formError">{error}</p>}
          {demo && <p className="formError">Demo mode is read-only.</p>}
          <div className="modalActions">
            <button className="actionButton ghost" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="actionButton" type="submit" disabled={demo}>
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function BillFields({ bill }: { bill?: Bill }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={bill?.title} required />
      <Field name="category" label="Category" defaultValue={bill?.category || "other"} required />
      <Field name="amount" label="Amount" type="number" step="0.01" defaultValue={bill?.amount ?? ""} />
      <SelectField name="amount_type" label="Amount type" defaultValue={bill?.amount_type || "fixed"} options={["fixed", "estimated", "variable", "unknown"]} />
      <Field name="due_date" label="Due date" type="date" defaultValue={bill?.due_date || todayISO()} required />
      <Field name="source" label="Source" defaultValue={bill?.source || ""} />
      <Field name="responsibility_label" label="Responsibility" defaultValue={bill?.responsibility_label || ""} />
      <SelectField name="status" label="Status" defaultValue={bill?.status || "open"} options={["open", "paid", "skipped"]} />
      <SelectField name="recurrence_unit" label="Recurrence" defaultValue="month" options={["one_time", "day", "week", "month", "year"]} />
      <Field name="recurrence_interval" label="Interval" type="number" defaultValue="1" />
      <Field name="currency" label="Currency" defaultValue={bill?.currency || "USD"} />
      <CheckField name="autopay_enabled" label="Autopay" defaultChecked={!!bill?.autopay_enabled} />
      <TextArea name="notes" label="Notes" defaultValue={bill?.notes || ""} />
    </>
  );
}

function TaskFields({ task }: { task?: Task }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={task?.title} required />
      <Field name="area" label="Area" defaultValue={task?.area || ""} />
      <Field name="due_date" label="Due date" type="date" defaultValue={task?.due_date || todayISO()} />
      <SelectField name="status" label="Status" defaultValue={task?.status || "open"} options={["open", "done", "snoozed"]} />
      <SelectField name="repeat_unit" label="Repeat" defaultValue={task?.repeat_unit || "none"} options={["none", "day", "week", "month"]} />
      <Field name="repeat_interval" label="Repeat interval" type="number" defaultValue={String(task?.repeat_interval || 1)} />
      <TextArea name="notes" label="Notes" defaultValue={task?.notes || ""} />
    </>
  );
}

function ItemFields({ item }: { item?: Item }) {
  return (
    <>
      <Field name="name" label="Name" defaultValue={item?.name} required />
      <SelectField name="type" label="Type" defaultValue={item?.type || "other"} options={["filter", "battery", "supply", "appliance_part", "pantry", "cleaning", "other"]} />
      <SelectField name="status" label="Status" defaultValue={item?.status || "active"} options={["active", "replaced", "restocked", "archived"]} />
      <Field name="replace_by_date" label="Replace by" type="date" defaultValue={item?.replace_by_date || ""} />
      <Field name="restock_by_date" label="Restock by" type="date" defaultValue={item?.restock_by_date || ""} />
      <Field name="location" label="Location" defaultValue={item?.location || ""} />
      <TextArea name="notes" label="Notes" defaultValue={item?.notes || ""} />
    </>
  );
}

function DocumentFields({ document, mode }: { document?: DocumentRecord; mode: "create" | "edit" }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={document?.title} required />
      {mode === "create" && <Field name="file" label="File" type="file" required />}
      <Field name="doc_type" label="Type" defaultValue={document?.type || "document"} required />
      <Field name="category" label="Category" defaultValue={document?.category || ""} />
      <Field name="expiry_date" label="Expiry date" type="date" defaultValue={document?.expiry_date || ""} />
      <Field name="tags" label="Tags" defaultValue={document?.tags || ""} />
      <CheckField name="is_pinned" label="Pinned" defaultChecked={!!document?.is_pinned} />
      <TextArea name="notes" label="Notes" defaultValue={document?.notes || ""} />
    </>
  );
}

function NoteFields({ note }: { note?: Note }) {
  return (
    <>
      <Field name="title" label="Title" defaultValue={note?.title} required />
      <SelectField name="note_type" label="Type" defaultValue={note?.note_type || "quick_note"} options={["quick_note", "checklist", "reference", "idea"]} />
      <Field name="tags" label="Tags" defaultValue={note?.tags || ""} />
      <CheckField name="is_pinned" label="Pinned" defaultChecked={!!note?.is_pinned} />
      <CheckField name="is_archived" label="Archived" defaultChecked={!!note?.is_archived} />
      <TextArea name="body" label="Body" defaultValue={note?.body || ""} required />
    </>
  );
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label>
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

function TextArea({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="fullField">
      <span>{label}</span>
      <textarea rows={4} {...props} />
    </label>
  );
}

function SelectField({ label, options, ...props }: { label: string; options: string[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label>
      <span>{label}</span>
      <select {...props}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="checkField">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

async function submitEntityForm(modal: ModalState, form: FormData) {
  if (modal.kind === "document") {
    if (modal.mode === "create") {
      return api("/api/documents", { method: "POST", body: form });
    }
    return api(`/api/documents/${modal.item?.id}`, { method: "PATCH", body: JSON.stringify(formObject(form, ["is_pinned"])) });
  }

  const body = formObject(form, ["autopay_enabled", "is_pinned", "is_archived"]);
  if (modal.kind === "bill") {
    body.amount = body.amount === "" ? null : Number(body.amount);
    body.recurrence_interval = Number(body.recurrence_interval || 1);
  }
  if (modal.kind === "task") {
    body.repeat_interval = Number(body.repeat_interval || 1);
  }

  const path =
    modal.kind === "bill"
      ? modal.mode === "create"
        ? "/api/bills"
        : `/api/bills/${modal.item?.id}`
      : modal.kind === "task"
        ? modal.mode === "create"
          ? "/api/tasks"
          : `/api/tasks/${modal.item?.id}`
        : modal.kind === "item"
          ? modal.mode === "create"
            ? "/api/items"
            : `/api/items/${modal.item?.id}`
          : modal.kind === "note"
            ? modal.mode === "create"
              ? "/api/notes"
              : `/api/notes/${modal.item?.id}`
            : "";

  return api(path, {
    method: modal.mode === "create" ? "POST" : "PATCH",
    body: JSON.stringify(body),
  });
}

function formObject(form: FormData, booleans: string[] = []) {
  const result: Record<string, string | boolean | number | null> = {};
  for (const [key, value] of form.entries()) {
    if (value instanceof File) continue;
    result[key] = value;
  }
  for (const booleanKey of booleans) {
    result[booleanKey] = form.get(booleanKey) === "on";
  }
  return result;
}

function buildQueue(data: AppData): QueueItem[] {
  const bills = data.agenda?.bills || data.dashboard?.upcomingBills || [];
  const tasks = data.agenda?.tasks || data.dashboard?.tasksToday || [];
  const docs = data.agenda?.documents || data.dashboard?.importantDocs || [];
  const items = data.agenda?.items || data.dashboard?.replaceSoon || [];
  const notes = data.dashboard?.recentNotes || [];

  return [
    ...bills.map((bill) => ({
      id: `bill-${bill.id}`,
      kind: "bill" as const,
      date: formatShortDate(bill.due_date),
      title: bill.title,
      detail: `${bill.source || "No source"} · ${bill.responsibility_label || "Household"}`,
      value: formatBillAmount(bill),
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: "task" as const,
      date: formatShortDate(task.due_date),
      title: task.title,
      detail: task.area || "household",
      value: task.status,
    })),
    ...items.map((item) => ({
      id: `item-${item.id}`,
      kind: "item" as const,
      date: formatShortDate(item.replace_by_date || item.restock_by_date),
      title: item.name,
      detail: item.location || item.type,
      value: item.replace_by_date ? "Replace" : "Restock",
    })),
    ...docs.map((doc) => ({
      id: `doc-${doc.id}`,
      kind: "doc" as const,
      date: formatShortDate(doc.expiry_date),
      title: doc.title,
      detail: doc.category || doc.type,
      value: doc.is_pinned ? "Pinned" : "Review",
    })),
    ...notes.slice(0, 2).map((note) => ({
      id: `note-${note.id}`,
      kind: "note" as const,
      date: "Saved",
      title: note.title,
      detail: note.tags || note.note_type,
      value: note.is_pinned ? "Pinned" : "Note",
    })),
  ].slice(0, 10);
}
