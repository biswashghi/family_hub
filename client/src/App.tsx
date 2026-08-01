import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { AuthPage } from "./components/AuthPage";
import { EntityModal } from "./components/EntityModal";
import { AppShell, ErrorState, LoadingState, QuickCapture } from "./components/ui";
import { useAppController } from "./features/app/useAppController";
import { DocsView } from "./views/DocsView";
import { HomeView } from "./views/HomeView";
import { MoneyView } from "./views/MoneyView";
import { NotesView } from "./views/NotesView";
import { TodayView } from "./views/TodayView";

export function App() {
  return <MotionConfig reducedMotion="user">{window.location.pathname === "/login" ? <AuthPage /> : <AuthenticatedApp />}</MotionConfig>;
}

function AuthenticatedApp() {
  const controller = useAppController();
  const { view, session, environment, data, loadState, error, modal } = controller;

  return (
    <LayoutGroup>
      <AppShell
        view={view}
        session={session}
        environment={environment}
        onViewChange={controller.setView}
        onLogout={() => void controller.logout()}
        capture={
          <QuickCapture
            value={controller.captureValue}
            kind={controller.captureKind}
            demo={!!session?.demo}
            onKindChange={controller.setCaptureKind}
            onValueChange={controller.setCaptureValue}
            onSubmit={(event) => void controller.submitCapture(event)}
          />
        }
      >
        {loadState === "loading" ? (
          <LoadingState />
        ) : loadState === "error" ? (
          <ErrorState message={error} onRetry={() => void controller.loadAppData()} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.section key={view} className="viewStage" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {view === "today" && <TodayView data={data} onOpenModal={controller.setModal} />}
              {view === "money" && <MoneyView money={data.money} bills={data.bills} onOpenModal={controller.setModal} onPatch={controller.patchEntity} onDelete={controller.deleteEntity} demo={!!session?.demo} />}
              {view === "home" && <HomeView home={data.home} tasks={data.tasks} items={data.items} onOpenModal={controller.setModal} onPatch={controller.patchEntity} onDelete={controller.deleteEntity} demo={!!session?.demo} />}
              {view === "docs" && <DocsView docs={data.docs} documents={data.documents} onOpenModal={controller.setModal} onPatch={controller.patchEntity} onDelete={controller.deleteEntity} demo={!!session?.demo} />}
              {view === "notes" && <NotesView notes={data.notes} allNotes={data.allNotes} onOpenModal={controller.setModal} onPatch={controller.patchEntity} demo={!!session?.demo} />}
            </motion.section>
          </AnimatePresence>
        )}
      </AppShell>

      <AnimatePresence>
        {modal && (
          <EntityModal
            modal={modal}
            error={controller.mutationError}
            demo={!!session?.demo}
            today={environment?.today}
            onClose={controller.closeModal}
            onSubmit={(action) => void controller.mutate(action, modal.kind)}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
