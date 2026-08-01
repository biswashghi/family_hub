import { CalendarDays } from "lucide-react";
import { DeadlineCalendar } from "../components/DeadlineCalendar";
import { Panel } from "../components/ui";
import type { AppData, ModalState } from "../types";

export function TodayView({ data, onOpenModal }: { data: AppData; onOpenModal: (modal: ModalState) => void }) {
  return (
    <div className="todayGrid calendarFirst">
      <Panel className="calendarPanel" icon={CalendarDays} title="Calendar">
        <DeadlineCalendar agenda={data.agenda} onOpenModal={onOpenModal} />
      </Panel>
    </div>
  );
}
