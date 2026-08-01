import { buildCalendarEvents, resolveAgendaRange } from "../../src/calendar.js";

export function createAgendaService({ repository, todayISO }) {
  return {
    getAgenda(query = {}) {
      const today = todayISO();
      const range = resolveAgendaRange(query, today);
      if (range.error) return { error: range.error, status: 400 };
      const { from, through } = range;
      const sources = repository.listSourcesThrough(through);
      return {
        today,
        from,
        through,
        events: buildCalendarEvents({ today, from, through, ...sources }),
      };
    },
  };
}
