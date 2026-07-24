import { Archive, Edit3, NotebookPen, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Note, NotesOverview } from "../api";
import type { ModalState } from "../types";
import { CardStack, NoteRow } from "../components/records";
import { ActionButton, IconAction, MetricChip, Panel, RowActions } from "../components/ui";

export function NotesView({
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
      <Panel className="widePanel" icon={NotebookPen} title="Notes" actions={<ActionButton icon={Plus} label="Add note" onClick={() => onOpenModal({ kind: "note", mode: "create" })} disabled={demo} />}>
        <div className="chipGrid compact">
          <MetricChip label="Active" value={notes?.metrics.activeCount ?? 0} />
          <MetricChip label="Pinned" value={notes?.metrics.pinnedCount ?? 0} />
          <MetricChip label="Ideas" value={notes?.metrics.ideaCount ?? 0} />
          <MetricChip label="Archived" value={notes?.metrics.archivedCount ?? 0} />
        </div>
        <div className="ledger">
          {mergedNotes.length ? (
            mergedNotes.map((note) => (
              <NoteRow
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
            <div className="emptyState">No notes.</div>
          )}
        </div>
      </Panel>

      <Panel icon={Sparkles} title="Ideas">
        <CardStack items={notes?.ideas || []} empty="No ideas saved." render={(note) => <NoteRow note={note} />} />
      </Panel>
    </div>
  );
}
