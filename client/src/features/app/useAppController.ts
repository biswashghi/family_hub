import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Agenda,
  ApiError,
  BillsResponse,
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
} from "../../api";
import { emptyData, type AppData, type LoadState, type ModalState, type ViewName } from "../../types";

export function useAppController() {
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
  const loadedViews = useRef(new Set<ViewName>());
  const shellReady = useRef(false);

  function handleLoadError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      window.location.href = "/login";
      return;
    }
    setError(err instanceof Error ? err.message : "Unable to load Family Hub.");
    setLoadState("error");
  }

  async function loadViewData(target: ViewName, { force = false, showLoading = true } = {}) {
    if (!force && loadedViews.current.has(target)) {
      setLoadState("ready");
      return;
    }
    if (showLoading) setLoadState("loading");
    setError("");
    try {
      if (target === "today") {
        const agenda = await api<Agenda>("/api/agenda");
        setData((current) => ({ ...current, agenda }));
      } else if (target === "money") {
        const [money, billsData] = await Promise.all([api<MoneyOverview>("/api/money/overview"), api<BillsResponse>("/api/bills")]);
        setData((current) => ({ ...current, money, bills: billsData.bills || [] }));
      } else if (target === "home") {
        const [home, tasksData, itemsData] = await Promise.all([api<HomeOverview>("/api/home/overview"), api<TasksResponse>("/api/tasks"), api<ItemsResponse>("/api/items")]);
        setData((current) => ({ ...current, home, tasks: tasksData.tasks || [], items: itemsData.items || [] }));
      } else if (target === "docs") {
        const [docs, documentsData] = await Promise.all([api<DocsOverview>("/api/docs/overview"), api<DocumentsResponse>("/api/documents")]);
        setData((current) => ({ ...current, docs, documents: documentsData.documents || [] }));
      } else {
        const [notes, notesData] = await Promise.all([api<NotesOverview>("/api/notes/overview"), api<NotesResponse>("/api/notes?include_archived=1")]);
        setData((current) => ({ ...current, notes, allNotes: notesData.notes || [] }));
      }
      loadedViews.current.add(target);
      setLoadState("ready");
    } catch (err) {
      handleLoadError(err);
    }
  }

  async function loadAppData() {
    setLoadState("loading");
    setError("");
    try {
      const [sessionData, environmentData] = await Promise.all([api<Session>("/api/session"), api<Environment>("/api/environment")]);
      setSession(sessionData);
      setEnvironment(environmentData);
      shellReady.current = true;
      await loadViewData(view, { force: true, showLoading: false });
    } catch (err) {
      handleLoadError(err);
    }
  }

  useEffect(() => { void loadAppData(); }, []);
  useEffect(() => {
    if (shellReady.current) void loadViewData(view);
  }, [view]);

  async function logout() {
    await fetch("/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function affectedViews(kind: ModalState["kind"]) {
    if (kind === "bill") return new Set<ViewName>(["today", "money"]);
    if (kind === "task" || kind === "item") return new Set<ViewName>(["today", "home"]);
    if (kind === "document") return new Set<ViewName>(["today", "docs"]);
    return new Set<ViewName>(["notes"]);
  }

  async function invalidateAndRefresh(kind: ModalState["kind"]) {
    const affected = affectedViews(kind);
    affected.forEach((target) => loadedViews.current.delete(target));
    if (affected.has(view)) await loadViewData(view, { force: true });
  }

  async function submitCapture(event: FormEvent) {
    event.preventDefault();
    const title = captureValue.trim();
    if (!title || session?.demo) return;
    if (captureKind === "task") {
      await api("/api/tasks", { method: "POST", body: JSON.stringify({ title, due_date: environment?.today, status: "open", repeat_unit: "none" }) });
    } else {
      await api("/api/notes", { method: "POST", body: JSON.stringify({ title, body: title, note_type: "quick_note" }) });
    }
    setCaptureValue("");
    await invalidateAndRefresh(captureKind === "task" ? "task" : "note");
  }

  async function mutate(action: () => Promise<unknown>, kind: ModalState["kind"]) {
    setMutationError("");
    try {
      await action();
      setModal(null);
      await invalidateAndRefresh(kind);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  async function deleteEntity(kind: ModalState["kind"], id: string) {
    if (session?.demo) return;
    const path = kind === "bill" ? `/api/bills/${id}` : kind === "task" ? `/api/tasks/${id}` : kind === "item" ? `/api/items/${id}` : kind === "document" ? `/api/documents/${id}` : null;
    if (path) await mutate(() => api(path, { method: "DELETE" }), kind);
  }

  async function patchEntity(path: string, body: unknown) {
    if (session?.demo) return;
    const kind = path.startsWith("/api/bills/") ? "bill" : path.startsWith("/api/tasks/") ? "task" : path.startsWith("/api/items/") ? "item" : path.startsWith("/api/documents/") ? "document" : "note";
    await mutate(() => api(path, { method: "PATCH", body: JSON.stringify(body) }), kind);
  }

  function closeModal() {
    setModal(null);
    setMutationError("");
  }

  return {
    view, setView, session, environment, data, loadState, error,
    captureValue, setCaptureValue, captureKind, setCaptureKind,
    modal, setModal, mutationError, loadAppData, logout, submitCapture,
    mutate, deleteEntity, patchEntity, closeModal,
  };
}
