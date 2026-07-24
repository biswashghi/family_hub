import { Check, Edit3, Plus, ReceiptText, Repeat2, Trash2, WalletCards } from "lucide-react";
import type { Bill, MoneyOverview } from "../api";
import type { ModalState } from "../types";
import { BillRow, CardStack } from "../components/records";
import { ActionButton, IconAction, MetricChip, Panel, RowActions } from "../components/ui";

export function MoneyView({
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
      <Panel className="widePanel" icon={WalletCards} title="Bills" actions={<ActionButton icon={Plus} label="Add bill" onClick={() => onOpenModal({ kind: "bill", mode: "create" })} disabled={demo} />}>
        <div className="chipGrid compact">
          <MetricChip label="Week" value={money?.summary.due_this_week ?? 0} />
          <MetricChip label="Month" value={money?.summary.due_this_month ?? 0} />
          <MetricChip label="Autopay" value={money?.summary.autopay_enabled ?? 0} />
          <MetricChip label="Overdue" value={money?.summary.overdue ?? 0} danger />
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
            <div className="emptyState">No active bills.</div>
          )}
        </div>
      </Panel>

      <Panel icon={Repeat2} title="Subscriptions">
        <CardStack items={money?.subscriptions || []} empty="No subscriptions tracked." render={(bill) => <BillRow bill={bill} compact />} />
      </Panel>

      <Panel icon={ReceiptText} title="Due soon">
        <CardStack items={money?.dueSoon || []} empty="No bills due soon." render={(bill) => <BillRow bill={bill} compact />} />
      </Panel>
    </div>
  );
}
