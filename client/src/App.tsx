import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Agenda,
  ApiError,
  BillsResponse,
  Dashboard,
  DocsOverview,
  DocumentsResponse,
  Environment,
  HomeOverview,
  ItemsResponse,
  MoneyOverview,
  NotesOverview,
  NotesResponse,
  Session,
  TasksResponse,
  api,
  todayISO,
} from "./api";
import { AuthPage } from "./components/AuthPage";
import { EntityModal } from "./components/EntityModal";
import { AppShell, ErrorState, LoadingState, QuickCapture } from "./components/ui";
import { DocsView } from "./views/DocsView";
import { HomeView } from "./views/HomeView";
import { MoneyView } from "./views/MoneyView";
import { NotesView } from "./views/NotesView";
import { TodayView } from "./views/TodayView";
import { buildQueue } from "./utils";
import { emptyData, type AppData, type LoadState, type ModalState, type ViewName } from "./types";

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
      <AppShell
        view={view}
        session={session}
        environment={environment}
        onViewChange={setView}
        onLogout={() => void logout()}
        capture={
          <QuickCapture
            value={captureValue}
            kind={captureKind}
            demo={!!session?.demo}
            onKindChange={setCaptureKind}
            onValueChange={setCaptureValue}
            onSubmit={(event) => void submitCapture(event)}
          />
        }
      >
        {loadState === "loading" ? (
          <LoadingState />
        ) : loadState === "error" ? (
          <ErrorState message={error} onRetry={() => void loadAppData()} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.section
              key={view}
              className="viewStage"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {view === "today" && <TodayView data={data} queue={queue} metrics={data.dashboard?.metrics} setView={setView} onOpenModal={setModal} demo={!!session?.demo} />}
              {view === "money" && <MoneyView money={data.money} bills={data.bills} onOpenModal={setModal} onPatch={patchEntity} onDelete={deleteEntity} demo={!!session?.demo} />}
              {view === "home" && <HomeView home={data.home} tasks={data.tasks} items={data.items} onOpenModal={setModal} onPatch={patchEntity} onDelete={deleteEntity} demo={!!session?.demo} />}
              {view === "docs" && <DocsView docs={data.docs} documents={data.documents} onOpenModal={setModal} onPatch={patchEntity} onDelete={deleteEntity} demo={!!session?.demo} />}
              {view === "notes" && <NotesView notes={data.notes} allNotes={data.allNotes} onOpenModal={setModal} onPatch={patchEntity} demo={!!session?.demo} />}
            </motion.section>
          </AnimatePresence>
        )}
      </AppShell>

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
    </LayoutGroup>
  );
}
