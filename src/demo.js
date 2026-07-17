import { addDaysISO } from "./dates.js";

function makeDemoData(todayISO) {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const nextWeek = addDaysISO(today, 7);
  const nextMonth = addDaysISO(today, 30);
  const later = addDaysISO(today, 45);

  const bills = [
    {
      id: "demo-bill-internet",
      title: "Home Internet",
      category: "internet",
      amount: 79,
      amount_type: "fixed",
      currency: "USD",
      due_date: tomorrow,
      source: "Shared Visa",
      responsibility_label: "Household",
      status: "open",
      autopay_enabled: true,
      notes: "Primary internet plan.",
      recurrence_unit: "month",
      recurrence_interval: 1,
      recurrence_day_of_month: Number(tomorrow.slice(8, 10)),
      recurrence_end_date: null,
      last_paid_due_date: null,
      is_subscription: false,
      created_at: today,
      updated_at: today,
    },
    {
      id: "demo-bill-electric",
      title: "Electric Bill",
      category: "utility",
      amount: null,
      amount_type: "variable",
      currency: "USD",
      due_date: nextWeek,
      source: "Checking",
      responsibility_label: "Biswash",
      status: "open",
      autopay_enabled: false,
      notes: "Variable monthly utility.",
      recurrence_unit: "month",
      recurrence_interval: 1,
      recurrence_day_of_month: Number(nextWeek.slice(8, 10)),
      recurrence_end_date: null,
      last_paid_due_date: null,
      is_subscription: false,
      created_at: today,
      updated_at: today,
    },
    {
      id: "demo-bill-music",
      title: "Music Subscription",
      category: "other",
      amount: 16,
      amount_type: "fixed",
      currency: "USD",
      due_date: addDaysISO(today, 14),
      source: "Shared Card",
      responsibility_label: "Household",
      status: "open",
      autopay_enabled: true,
      notes: "Streaming plan.",
      recurrence_unit: "month",
      recurrence_interval: 1,
      recurrence_day_of_month: Number(addDaysISO(today, 14).slice(8, 10)),
      recurrence_end_date: null,
      last_paid_due_date: null,
      is_subscription: true,
      created_at: today,
      updated_at: today,
    },
  ];

  const tasks = [
    {
      id: "demo-task-filter",
      title: "Change HVAC filter",
      area: "hall closet",
      status: "open",
      due_date: today,
      repeat_unit: "month",
      repeat_interval: 3,
      notes: "Check 16x25x1 filter size.",
      created_at: today,
      updated_at: today,
    },
    {
      id: "demo-task-recycling",
      title: "Take out recycling",
      area: "kitchen",
      status: "open",
      due_date: tomorrow,
      repeat_unit: "week",
      repeat_interval: 1,
      notes: "Tuesday evening pickup.",
      created_at: today,
      updated_at: today,
    },
  ];

  const items = [
    {
      id: "demo-item-detergent",
      name: "Laundry detergent",
      type: "supply",
      status: "active",
      replace_by_date: null,
      restock_by_date: addDaysISO(today, 10),
      location: "Laundry shelf",
      notes: "Buy before the next warehouse run.",
      created_at: today,
      updated_at: today,
    },
    {
      id: "demo-item-smoke",
      name: "Smoke detector batteries",
      type: "battery",
      status: "active",
      replace_by_date: nextMonth,
      restock_by_date: null,
      location: "Utility drawer",
      notes: "AA batteries in the top drawer.",
      created_at: today,
      updated_at: today,
    },
  ];

  const documents = [
    {
      id: "demo-doc-insurance",
      title: "Home Insurance Policy",
      type: "policy",
      category: "insurance",
      tags: "home,insurance",
      notes: "Demo metadata only; downloads are disabled.",
      file_name: "home-insurance-policy.pdf",
      mime_type: "application/pdf",
      size_bytes: 184000,
      is_pinned: true,
      expiry_date: later,
      uploaded_at: today,
      updated_at: today,
    },
    {
      id: "demo-doc-passport",
      title: "Passport Reminder",
      type: "id",
      category: "travel",
      tags: "travel,id",
      notes: "Track renewal dates without storing the real file in demo.",
      file_name: "passport-reminder.pdf",
      mime_type: "application/pdf",
      size_bytes: 92000,
      is_pinned: false,
      expiry_date: addDaysISO(today, 180),
      uploaded_at: today,
      updated_at: today,
    },
  ];

  const notes = [
    {
      id: "demo-note-supplies",
      title: "Weekend supply run",
      body: "Paper towels, dish soap, oat milk, and batteries.",
      note_type: "quick_note",
      tags: "shopping,home",
      is_pinned: true,
      is_archived: false,
      created_at: today,
      updated_at: today,
    },
    {
      id: "demo-note-paint",
      title: "Paint code",
      body: "Guest room wall sample and trim notes live here.",
      note_type: "reference",
      tags: "home,paint",
      is_pinned: false,
      is_archived: false,
      created_at: today,
      updated_at: today,
    },
  ];

  return { today, nextWeek, nextMonth, bills, tasks, items, documents, notes };
}

function filterDemoBills(bills, query) {
  return bills.filter((bill) => {
    if (query.status && bill.status !== String(query.status)) return false;
    if (query.category && bill.category !== String(query.category)) return false;
    if (query.source && !String(bill.source || "").toLowerCase().includes(String(query.source).toLowerCase())) return false;
    if (query.responsibility && !String(bill.responsibility_label || "").toLowerCase().includes(String(query.responsibility).toLowerCase())) return false;
    return true;
  });
}

export function createDemoApiHandler({ todayISO }) {
  return function handleDemoApi(req, res, next) {
    if (req.method !== "GET") {
      return res.status(403).json({ error: "Demo mode is read-only." });
    }

    const demo = makeDemoData(todayISO);
    const openBills = demo.bills.filter((bill) => bill.status === "open");
    const openTasks = demo.tasks.filter((task) => ["open", "snoozed"].includes(task.status));
    const importantDocs = demo.documents.filter((doc) => doc.is_pinned || (doc.expiry_date && doc.expiry_date <= demo.nextMonth));
    const dueTasks = demo.tasks.filter((task) => ["open", "snoozed"].includes(task.status) && task.due_date && task.due_date <= demo.today);
    const dueSoonBills = demo.bills.filter((bill) => bill.status === "open" && bill.due_date <= demo.nextWeek);
    const monthBills = demo.bills.filter((bill) => bill.status === "open" && bill.due_date <= demo.nextMonth);
    const dueItems = demo.items.filter(
      (item) =>
        item.status === "active" &&
        ((item.replace_by_date && item.replace_by_date <= demo.nextMonth) || (item.restock_by_date && item.restock_by_date <= demo.nextMonth)),
    );

    if (req.path === "/dashboard") {
      return res.json({
        metrics: {
          dueSoonCount: dueSoonBills.length,
          tasksTodayCount: dueTasks.length,
          docsExpiringCount: demo.documents.filter((doc) => doc.expiry_date && doc.expiry_date <= demo.nextMonth).length,
          replaceSoonCount: dueItems.length,
          openBillsCount: openBills.length,
          openTasksCount: openTasks.length,
          storedDocsCount: demo.documents.length,
          activeNotesCount: demo.notes.filter((note) => !note.is_archived).length,
        },
        upcomingBills: dueSoonBills,
        tasksToday: dueTasks,
        importantDocs,
        replaceSoon: dueItems,
        recentNotes: demo.notes.filter((note) => !note.is_archived),
      });
    }

    if (req.path === "/agenda") {
      return res.json({ today: demo.today, through: demo.nextMonth, bills: monthBills, tasks: openTasks, items: dueItems, documents: importantDocs });
    }

    if (req.path === "/money/overview") {
      return res.json({
        today: demo.today,
        summary: {
          due_this_week: dueSoonBills.length,
          due_this_month: monthBills.length,
          autopay_enabled: demo.bills.filter((bill) => bill.autopay_enabled).length,
          overdue: demo.bills.filter((bill) => bill.status === "open" && bill.due_date < demo.today).length,
        },
        dueSoon: dueSoonBills,
        overdue: demo.bills.filter((bill) => bill.status === "open" && bill.due_date < demo.today),
        subscriptions: demo.bills.filter((bill) => bill.is_subscription),
      });
    }

    if (req.path === "/home/overview") {
      return res.json({
        today: demo.today,
        metrics: {
          openTasksCount: openTasks.length,
          dueTodayCount: dueTasks.length,
          replaceSoonCount: demo.items.filter((item) => item.replace_by_date && item.replace_by_date <= demo.nextMonth).length,
          restockSoonCount: demo.items.filter((item) => item.restock_by_date && item.restock_by_date <= demo.nextMonth).length,
        },
        dueTasks,
        replaceSoon: demo.items.filter((item) => item.replace_by_date && item.replace_by_date <= demo.nextMonth),
        restockSoon: demo.items.filter((item) => item.restock_by_date && item.restock_by_date <= demo.nextMonth),
      });
    }

    if (req.path === "/docs/overview") {
      return res.json({
        metrics: {
          pinnedCount: demo.documents.filter((doc) => doc.is_pinned).length,
          expiringSoonCount: demo.documents.filter((doc) => doc.expiry_date && doc.expiry_date <= demo.nextMonth).length,
          storedCount: demo.documents.length,
        },
        pinned: demo.documents.filter((doc) => doc.is_pinned),
        expiringSoon: demo.documents.filter((doc) => doc.expiry_date && doc.expiry_date <= demo.nextMonth),
        recent: demo.documents,
      });
    }

    if (req.path === "/notes/overview") {
      return res.json({
        metrics: {
          activeCount: demo.notes.filter((note) => !note.is_archived).length,
          pinnedCount: demo.notes.filter((note) => !note.is_archived && note.is_pinned).length,
          ideaCount: demo.notes.filter((note) => !note.is_archived && note.note_type === "idea").length,
          archivedCount: demo.notes.filter((note) => note.is_archived).length,
        },
        pinned: demo.notes.filter((note) => !note.is_archived && note.is_pinned),
        recent: demo.notes.filter((note) => !note.is_archived),
        ideas: demo.notes.filter((note) => !note.is_archived && note.note_type === "idea"),
      });
    }

    if (req.path === "/bills") {
      const rows = filterDemoBills(demo.bills, req.query);
      return res.json({
        bills: rows,
        summary: {
          due_this_week: rows.filter((bill) => bill.status === "open" && bill.due_date <= demo.nextWeek).length,
          due_this_month: rows.filter((bill) => bill.status === "open" && bill.due_date <= demo.nextMonth).length,
          autopay_enabled: rows.filter((bill) => bill.autopay_enabled).length,
          overdue: rows.filter((bill) => bill.status === "open" && bill.due_date < demo.today).length,
        },
      });
    }

    if (req.path === "/tasks") return res.json({ tasks: demo.tasks });
    if (req.path === "/items") return res.json({ items: demo.items });
    if (req.path === "/documents") return res.json({ documents: demo.documents });
    if (req.path.startsWith("/documents/") && req.path.endsWith("/download")) return res.status(403).json({ error: "Demo documents are metadata only." });
    if (req.path === "/notes") return res.json({ notes: demo.notes.filter((note) => String(req.query.include_archived || "") === "1" || !note.is_archived) });

    return next();
  };
}
