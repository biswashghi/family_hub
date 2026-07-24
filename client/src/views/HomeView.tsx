import { Check, Edit3, Home, Plus, Repeat2, Trash2 } from "lucide-react";
import type { HomeOverview, Item, Task } from "../api";
import type { ModalState } from "../types";
import { CardStack, ItemRow, TaskRow } from "../components/records";
import { ActionButton, IconAction, MetricChip, Panel, RowActions } from "../components/ui";

export function HomeView({
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
      <Panel
        className="widePanel"
        icon={Home}
        title="Tasks"
        actions={
          <>
            <ActionButton icon={Plus} label="Add task" onClick={() => onOpenModal({ kind: "task", mode: "create" })} disabled={demo} />
            <ActionButton tone="quiet" icon={Plus} label="Add item" onClick={() => onOpenModal({ kind: "item", mode: "create" })} disabled={demo} />
          </>
        }
      >
        <div className="chipGrid compact">
          <MetricChip label="Open" value={home?.metrics.openTasksCount ?? 0} />
          <MetricChip label="Today" value={home?.metrics.dueTodayCount ?? 0} />
          <MetricChip label="Replace" value={home?.metrics.replaceSoonCount ?? 0} />
          <MetricChip label="Restock" value={home?.metrics.restockSoonCount ?? 0} />
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
          {!tasks.length && !items.length && <div className="emptyState">No household tasks or items.</div>}
        </div>
      </Panel>

      <Panel icon={Check} title="Due now">
        <CardStack items={home?.dueTasks || []} empty="Nothing due now." render={(task) => <TaskRow task={task} compact />} />
      </Panel>
    </div>
  );
}
