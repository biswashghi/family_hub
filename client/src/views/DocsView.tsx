import { Archive, Edit3, Folder, Plus, Trash2, Upload } from "lucide-react";
import type { DocsOverview, DocumentRecord } from "../api";
import type { ModalState } from "../types";
import { CardStack, DocumentRow } from "../components/records";
import { ActionButton, IconAction, MetricChip, Panel, RowActions } from "../components/ui";

export function DocsView({
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
      <Panel className="widePanel" icon={Folder} title="Documents" actions={<ActionButton icon={Upload} label="Upload" onClick={() => onOpenModal({ kind: "document", mode: "create" })} disabled={demo} />}>
        <div className="chipGrid compact">
          <MetricChip label="Pinned" value={docs?.metrics.pinnedCount ?? 0} />
          <MetricChip label="Expiring" value={docs?.metrics.expiringSoonCount ?? 0} danger />
          <MetricChip label="Stored" value={docs?.metrics.storedCount ?? 0} />
        </div>
        <div className="ledger">
          {documents.length ? (
            documents.map((document) => (
              <DocumentRow
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
            <div className="emptyState">No documents stored.</div>
          )}
        </div>
      </Panel>

      <Panel icon={Plus} title="Recent">
        <CardStack items={docs?.recent || []} empty="No recent uploads." render={(doc) => <DocumentRow document={doc} />} />
      </Panel>
    </div>
  );
}
