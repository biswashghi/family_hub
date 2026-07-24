import { CalendarDays, ClipboardList, FileText, Plus, ReceiptText, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import type { Dashboard } from "../api";
import type { AppData, ModalState, QueueItem, ViewName } from "../types";
import { BillRow, CardStack, DocumentRow, QueueRow, TaskRow } from "../components/records";
import { DeadlineCalendar } from "../components/DeadlineCalendar";
import { ActionButton, Panel } from "../components/ui";

export function TodayView({
  data,
  queue,
  metrics,
  setView,
  onOpenModal,
  demo,
}: {
  data: AppData;
  queue: QueueItem[];
  metrics?: Dashboard["metrics"];
  setView: (view: ViewName) => void;
  onOpenModal: (modal: ModalState) => void;
  demo: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleQueue = showAll ? queue : queue.slice(0, 5);

  return (
    <div className="todayGrid">
      <Panel
        className="nowPanel"
        icon={Sparkles}
        title="Now"
        actions={queue.length > 5 && <ActionButton tone="quiet" icon={Plus} label={showAll ? "Show less" : `Show all ${queue.length}`} onClick={() => setShowAll((value) => !value)} />}
      >
        <div className="nowList">
          {visibleQueue.length ? visibleQueue.map((item, index) => <QueueRow key={item.id} item={item} index={index} />) : <div className="emptyState">Nothing needs attention right now.</div>}
        </div>
      </Panel>

      <Panel className="calendarPanel" icon={CalendarDays} title="Calendar">
        <DeadlineCalendar agenda={data.agenda} metrics={metrics} setView={setView} onOpenModal={onOpenModal} />
      </Panel>

      <Panel icon={ReceiptText} title="Money" actions={<ActionButton icon={Plus} label="Add bill" onClick={() => onOpenModal({ kind: "bill", mode: "create" })} disabled={demo} />}>
        <CardStack items={(data.dashboard?.upcomingBills || []).slice(0, 3)} empty="No bills due soon." render={(bill) => <BillRow bill={bill} compact />} />
      </Panel>

      <Panel icon={ClipboardList} title="House" actions={<ActionButton icon={Plus} label="Add task" onClick={() => onOpenModal({ kind: "task", mode: "create" })} disabled={demo} />}>
        <CardStack items={(data.dashboard?.tasksToday || []).slice(0, 3)} empty="Nothing urgent today." render={(task) => <TaskRow task={task} compact />} />
      </Panel>

      <Panel icon={FileText} title="Docs" actions={<ActionButton icon={Upload} label="Upload" onClick={() => onOpenModal({ kind: "document", mode: "create" })} disabled={demo} />}>
        <CardStack items={(data.dashboard?.importantDocs || []).slice(0, 3)} empty="No pinned or expiring documents." render={(doc) => <DocumentRow document={doc} />} />
      </Panel>
    </div>
  );
}
