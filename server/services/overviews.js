import { buildDashboardOverview, buildDocsOverview, buildHomeOverview, buildMoneyOverview, buildNotesOverview } from "./overview-builders.js";

export function createOverviewService({ bills, tasks, items, documents, notes, todayISO }) {
  return {
    dashboard: () => buildDashboardOverview({
      today: todayISO(),
      bills: bills.list({}).bills,
      tasks: tasks.list(),
      items: items.list(),
      documents: documents.list(),
      notes: notes.list({ includeArchived: true }),
    }),
    money: () => buildMoneyOverview({ today: todayISO(), bills: bills.list({}).bills }),
    home: () => buildHomeOverview({ today: todayISO(), tasks: tasks.list(), items: items.list() }),
    docs: () => buildDocsOverview({ today: todayISO(), documents: documents.list() }),
    notes: () => buildNotesOverview({ notes: notes.list({ includeArchived: true }) }),
  };
}
