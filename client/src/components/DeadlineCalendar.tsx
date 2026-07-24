import { CalendarDays, Check, ChevronRight, FileText, ReceiptText, Repeat2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Agenda, Bill, Dashboard, DocumentRecord, Item, Task } from "../api";
import { formatBillAmount, formatShortDate } from "../api";
import type { ModalState, ViewName } from "../types";
import { MetricChip } from "./ui";

type DeadlineKind = "bill" | "task" | "item" | "document";

type DeadlineEvent =
  | {
      id: string;
      kind: "bill";
      date: string;
      title: string;
      meta: string;
      value: string;
      item: Bill;
    }
  | {
      id: string;
      kind: "task";
      date: string;
      title: string;
      meta: string;
      value: string;
      item: Task;
    }
  | {
      id: string;
      kind: "item";
      date: string;
      title: string;
      meta: string;
      value: string;
      item: Item;
    }
  | {
      id: string;
      kind: "document";
      date: string;
      title: string;
      meta: string;
      value: string;
      item: DocumentRecord;
    };

const EVENT_ORDER: Record<DeadlineKind, number> = {
  bill: 0,
  task: 1,
  item: 2,
  document: 3,
};

const EVENT_LABEL: Record<DeadlineKind, string> = {
  bill: "Bill",
  task: "Task",
  item: "Home",
  document: "Doc",
};

const EVENT_ICON = {
  bill: ReceiptText,
  task: Check,
  item: Repeat2,
  document: FileText,
};

export function DeadlineCalendar({
  agenda,
  metrics,
  setView,
  onOpenModal,
}: {
  agenda: Agenda | null;
  metrics?: Dashboard["metrics"];
  setView: (view: ViewName) => void;
  onOpenModal: (modal: ModalState) => void;
}) {
  const today = agenda?.today || toISODate(new Date());
  const days = useMemo(() => makeDays(today, 14), [today]);
  const events = useMemo(() => buildDeadlineEvents(agenda, days[0]?.iso, days[days.length - 1]?.iso), [agenda, days]);
  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);
  const defaultDate = eventDates.has(today) ? today : events[0]?.date || today;
  const [selectedDate, setSelectedDate] = useState(defaultDate);

  useEffect(() => {
    setSelectedDate(defaultDate);
  }, [defaultDate]);

  const selectedEvents = events.filter((event) => event.date === selectedDate);

  return (
    <div className="deadlineCalendar">
      <div className="deadlineMetrics">
        <MetricChip label="Open bills" value={metrics?.openBillsCount ?? 0} onClick={() => setView("money")} />
        <MetricChip label="Open tasks" value={metrics?.openTasksCount ?? 0} onClick={() => setView("home")} />
        <MetricChip label="Docs" value={metrics?.storedDocsCount ?? 0} onClick={() => setView("docs")} />
        <MetricChip label="Notes" value={metrics?.activeNotesCount ?? 0} onClick={() => setView("notes")} />
      </div>

      <div className="dayStrip" aria-label="Next 14 days">
        {days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.iso);
          return (
            <button key={day.iso} className={`deadlineDay ${selectedDate === day.iso ? "active" : ""}`} type="button" onClick={() => setSelectedDate(day.iso)}>
              <span>{day.weekday}</span>
              <strong>{day.day}</strong>
              <EventMarks events={dayEvents} />
            </button>
          );
        })}
      </div>

      <div className="selectedDay">
        <div className="selectedDate">
          <CalendarDays />
          <strong>{formatShortDate(selectedDate)}</strong>
        </div>
        <div className="deadlineList">
          {selectedEvents.length ? (
            selectedEvents.map((event) => <DeadlineRow key={event.id} event={event} onOpenModal={onOpenModal} />)
          ) : (
            <div className="emptyState">No deadlines in this range.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeadlineRow({ event, onOpenModal }: { event: DeadlineEvent; onOpenModal: (modal: ModalState) => void }) {
  const Icon = EVENT_ICON[event.kind];

  return (
    <button className={`deadlineRow ${event.kind}`} type="button" onClick={() => onOpenModal(toModal(event))}>
      <span className={`rowGlyph ${event.kind}`}>
        <Icon />
      </span>
      <div>
        <strong>{event.title}</strong>
        <span>{event.meta}</span>
      </div>
      <b>{event.value}</b>
      <ChevronRight />
    </button>
  );
}

function EventMarks({ events }: { events: DeadlineEvent[] }) {
  if (!events.length) return <span className="eventMarks empty" />;
  const counts = events.reduce<Record<DeadlineKind, number>>(
    (acc, event) => {
      acc[event.kind] += 1;
      return acc;
    },
    { bill: 0, task: 0, item: 0, document: 0 },
  );

  return (
    <span className="eventMarks" aria-label={`${events.length} deadlines`}>
      {(Object.keys(counts) as DeadlineKind[]).map((kind) => counts[kind] > 0 && <i key={kind} className={kind} title={`${counts[kind]} ${EVENT_LABEL[kind]}`} />)}
    </span>
  );
}

function buildDeadlineEvents(agenda: Agenda | null, start?: string, end?: string) {
  if (!agenda || !start || !end) return [];

  const events: DeadlineEvent[] = [
    ...agenda.bills.map((bill): DeadlineEvent => ({
      id: `bill-${bill.id}`,
      kind: "bill",
      date: bill.due_date,
      title: bill.title,
      meta: [bill.source, bill.responsibility_label].filter(Boolean).join(" / ") || "Household bill",
      value: formatBillAmount(bill),
      item: bill,
    })),
    ...agenda.tasks.flatMap((task): DeadlineEvent[] =>
      task.due_date
        ? [
            {
              id: `task-${task.id}`,
              kind: "task",
              date: task.due_date,
              title: task.title,
              meta: task.area || "Household task",
              value: task.status,
              item: task,
            },
          ]
        : [],
    ),
    ...agenda.items.flatMap((item): DeadlineEvent[] => {
      const itemEvents: DeadlineEvent[] = [];
      if (item.replace_by_date) {
        itemEvents.push({
          id: `item-replace-${item.id}`,
          kind: "item",
          date: item.replace_by_date,
          title: item.name,
          meta: item.location || item.type || "Household item",
          value: "Replace",
          item,
        });
      }
      if (item.restock_by_date) {
        itemEvents.push({
          id: `item-restock-${item.id}`,
          kind: "item",
          date: item.restock_by_date,
          title: item.name,
          meta: item.location || item.type || "Household item",
          value: "Restock",
          item,
        });
      }
      return itemEvents;
    }),
    ...agenda.documents.flatMap((document): DeadlineEvent[] =>
      document.expiry_date
        ? [
            {
              id: `document-${document.id}`,
              kind: "document",
              date: document.expiry_date,
              title: document.title,
              meta: document.category || document.type || "Document",
              value: "Expires",
              item: document,
            },
          ]
        : [],
    ),
  ];

  return events
    .filter((event) => event.date >= start && event.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || EVENT_ORDER[a.kind] - EVENT_ORDER[b.kind] || a.title.localeCompare(b.title));
}

function toModal(event: DeadlineEvent): ModalState {
  if (event.kind === "document") return { kind: "document", mode: "edit", item: event.item };
  if (event.kind === "item") return { kind: "item", mode: "edit", item: event.item };
  if (event.kind === "task") return { kind: "task", mode: "edit", item: event.item };
  return { kind: "bill", mode: "edit", item: event.item };
}

function makeDays(startISO: string, count: number) {
  const startDate = new Date(`${startISO}T00:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      iso: toISODate(date),
      weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      day: new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date),
    };
  });
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
