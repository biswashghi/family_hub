import { CalendarDays, ChevronLeft, ChevronRight, FileText, ReceiptText, Repeat2, Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatBillAmount, formatShortDate, type Agenda, type CalendarEvent, type CalendarEventKind, type Bill, type DocumentRecord, type Item, type Task } from "../api";
import "../features/calendar/calendar.css";
import type { ModalState } from "../types";

const PREVIEW_LIMIT = 3;

const EVENT_LABEL: Record<CalendarEventKind, string> = {
  bill: "Bill",
  task: "Task",
  item: "Home",
  document: "Document",
};

const EVENT_ICON = { bill: ReceiptText, task: Check, item: Repeat2, document: FileText };

export function DeadlineCalendar({ agenda, onOpenModal }: { agenda: Agenda | null; onOpenModal: (modal: ModalState) => void }) {
  const today = agenda?.today || toISODate(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeAgenda, setActiveAgenda] = useState<Agenda | null>(agenda);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cache = useRef(new Map<string, Agenda>());
  const initializedAgenda = useRef(false);
  const currentWeekStart = useRef(weekStart);
  currentWeekStart.current = weekStart;

  useEffect(() => {
    if (!agenda) return;
    // Application refreshes are authoritative: replace cached ranges so edits and
    // status changes show up immediately without making week navigation stale.
    cache.current.clear();
    cache.current.set(`${agenda.from}:${agenda.through}`, agenda);
    if (!initializedAgenda.current) {
      initializedAgenda.current = true;
      const initialWeek = startOfWeek(agenda.today);
      setWeekStart(initialWeek);
      setSelectedDate(agenda.today);
    }
    setActiveAgenda((existing) => (rangeContains(agenda, currentWeekStart.current, weekEnd(currentWeekStart.current)) ? agenda : existing));
  }, [agenda]);

  useEffect(() => {
    const through = weekEnd(weekStart);
    const cached = findCoveringAgenda(cache.current, weekStart, through);
    if (cached) {
      setActiveAgenda(cached);
      setError("");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<Agenda>(`/api/agenda?from=${weekStart}&through=${through}`, { signal: controller.signal })
      .then((nextAgenda) => {
        cache.current.set(`${nextAgenda.from}:${nextAgenda.through}`, nextAgenda);
        setActiveAgenda(nextAgenda);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load this week.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [weekStart]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of activeAgenda?.events || []) {
      if (!grouped.has(event.display_date)) grouped.set(event.display_date, []);
      grouped.get(event.display_date)?.push(event);
    }
    return grouped;
  }, [activeAgenda]);
  const selectedEvents = eventsByDate.get(selectedDate) || [];

  function changeWeek(offset: number) {
    const nextStart = addDays(weekStart, offset * 7);
    setWeekStart(nextStart);
    setSelectedDate(nextStart <= today && today <= weekEnd(nextStart) ? today : nextStart);
  }

  function goToToday() {
    const nextStart = startOfWeek(today);
    setWeekStart(nextStart);
    setSelectedDate(today);
  }

  return (
    <div className="weeklyCalendar">
      <div className="weeklyCalendarHeader">
        <div>
          <h3>{weekTitle(weekStart)}</h3>
        </div>
        <div className="weekControls">
          <button type="button" onClick={() => changeWeek(-1)} aria-label="Previous week"><ChevronLeft /></button>
          <button type="button" className="todayControl" onClick={goToToday}>Today</button>
          <button type="button" onClick={() => changeWeek(1)} aria-label="Next week"><ChevronRight /></button>
        </div>
      </div>

      {error ? <div className="calendarError" role="alert">{error}</div> : null}
      <div className="weekBoard" aria-label={`Week of ${formatLongDate(weekStart)}`} aria-busy={loading}>
        {days.map((date) => {
          const events = eventsByDate.get(date) || [];
          const isToday = date === today;
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              className={`weekDay ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              type="button"
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${weekday(date)}, ${formatShortDate(date)}. ${events.length} ${events.length === 1 ? "item" : "items"}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="weekDayHeading"><b>{weekday(date)}</b><span>{formatShortDate(date)}</span></span>
              {events.length ? (
                <span className="weekPreviews">
                  {events.slice(0, PREVIEW_LIMIT).map((event) => <EventPreview key={event.id} event={event} />)}
                  {events.length > PREVIEW_LIMIT ? <span className="moreEvents">+{events.length - PREVIEW_LIMIT} more</span> : null}
                </span>
              ) : <span className="clearDay">Clear</span>}
            </button>
          );
        })}
      </div>

      <section className="selectedAgenda" aria-live="polite" aria-labelledby="selected-agenda-title">
        <div className="selectedAgendaHeader">
          <div className="selectedDate"><CalendarDays /><h4 id="selected-agenda-title">{formatLongDate(selectedDate)}</h4></div>
          <span>{selectedEvents.length} {selectedEvents.length === 1 ? "item" : "items"}</span>
        </div>
        <div className="selectedAgendaList">
          {selectedEvents.length ? selectedEvents.map((event) => <AgendaRow key={event.id} event={event} onOpenModal={onOpenModal} />) : <div className="emptyState">Nothing scheduled for this day.</div>}
        </div>
      </section>
    </div>
  );
}

function EventPreview({ event }: { event: CalendarEvent }) {
  return (
    <span className={`calendarEventPreview ${event.kind} ${event.is_overdue ? "overdue" : ""} ${event.is_forecast ? "forecast" : ""}`}>
      <small>{event.is_overdue ? "Overdue" : event.is_forecast ? "Forecast" : EVENT_LABEL[event.kind]}</small>
      <b>{event.title}</b>
    </span>
  );
}

function AgendaRow({ event, onOpenModal }: { event: CalendarEvent; onOpenModal: (modal: ModalState) => void }) {
  const Icon = EVENT_ICON[event.kind];
  const content = (
    <>
      <span className={`agendaGlyph ${event.kind}`}><Icon /></span>
      <span className="agendaCopy"><b>{event.title}</b><small>{eventDetail(event)}</small></span>
      <span className={`agendaValue ${event.kind}`}>{eventValue(event)}</span>
      {event.is_actionable ? <ChevronRight /> : null}
    </>
  );

  if (!event.is_actionable) return <div className={`agendaRow forecast ${event.kind}`}>{content}</div>;
  return <button className={`agendaRow ${event.kind}`} type="button" onClick={() => onOpenModal(eventModal(event))}>{content}</button>;
}

function eventModal(event: CalendarEvent): ModalState {
  if (event.kind === "bill") return { kind: "bill", mode: "edit", item: event.source as Bill };
  if (event.kind === "task") return { kind: "task", mode: "edit", item: event.source as Task };
  if (event.kind === "item") return { kind: "item", mode: "edit", item: event.source as Item };
  return { kind: "document", mode: "edit", item: event.source as DocumentRecord };
}

function eventDetail(event: CalendarEvent) {
  if (event.is_overdue) return `Overdue · originally due ${formatShortDate(event.original_due_date)}`;
  if (event.is_forecast) return `Forecast · scheduled ${formatShortDate(event.scheduled_date)}`;
  if (event.kind === "bill") {
    const bill = event.source as Bill;
    return [bill.source, bill.responsibility_label].filter(Boolean).join(" / ") || "Household bill";
  }
  if (event.kind === "task") return (event.source as Task).area || "Household task";
  if (event.kind === "item") return (event.source as Item).location || (event.source as Item).type || "Household item";
  return (event.source as DocumentRecord).category || (event.source as DocumentRecord).type || "Document";
}

function eventValue(event: CalendarEvent) {
  if (event.is_forecast) return "Forecast";
  if (event.kind === "bill") return formatBillAmount(event.source as Bill);
  if (event.kind === "task") return (event.source as Task).status;
  if (event.kind === "item") return event.action === "replace" ? "Replace" : "Restock";
  return "Expires";
}

function findCoveringAgenda(cache: Map<string, Agenda>, from: string, through: string) {
  return [...cache.values()].find((agenda) => rangeContains(agenda, from, through)) || null;
}

function rangeContains(agenda: Agenda | null, from: string, through: string) {
  return !!agenda && agenda.from <= from && agenda.through >= through;
}

function parseDate(iso: string) { return new Date(`${iso}T00:00:00Z`); }
function toISODate(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(iso: string, days: number) { const date = parseDate(iso); date.setUTCDate(date.getUTCDate() + days); return toISODate(date); }
function startOfWeek(iso: string) { const date = parseDate(iso); date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7)); return toISODate(date); }
function weekEnd(iso: string) { return addDays(iso, 6); }
function weekday(iso: string) { return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(parseDate(iso)); }
function formatLongDate(iso: string) { return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(parseDate(iso)); }
function weekTitle(weekStart: string) { return `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd(weekStart))}`; }
