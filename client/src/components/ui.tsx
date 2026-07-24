import { CalendarDays, Home, LogOut, LucideIcon, Plus, ShieldCheck, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { FormEvent, ReactNode } from "react";
import { NAV, VIEW_TITLES, type ViewName } from "../types";
import type { Environment, Session } from "../api";

export function AppShell({
  view,
  session,
  environment,
  capture,
  children,
  onViewChange,
  onLogout,
}: {
  view: ViewName;
  session: Session | null;
  environment: Environment | null;
  capture: ReactNode;
  children: ReactNode;
  onViewChange: (view: ViewName) => void;
  onLogout: () => void;
}) {
  return (
    <div className="appFrame">
      <aside className="commandRail" aria-label="Primary navigation">
        <motion.div className="railMark" initial={{ scale: 0.96 }} animate={{ scale: 1 }}>
          <Home />
        </motion.div>
        <nav className="railNav">
          {NAV.map((item) => (
            <NavButton key={item.view} {...item} active={view === item.view} onClick={() => onViewChange(item.view)} />
          ))}
        </nav>
        <button className="railLogout" type="button" onClick={onLogout} aria-label="Log out" title="Log out">
          <LogOut />
        </button>
      </aside>

      <main className="surface">
        <CommandHeader view={view} session={session} environment={environment} />
        {capture}
        {children}
      </main>

      <nav className="mobileDock" aria-label="Mobile navigation">
        {NAV.map((item) => (
          <NavButton key={item.view} {...item} active={view === item.view} onClick={() => onViewChange(item.view)} compact />
        ))}
      </nav>
    </div>
  );
}

function CommandHeader({ view, session, environment }: { view: ViewName; session: Session | null; environment: Environment | null }) {
  const now = new Date();
  const fullDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now);

  return (
    <motion.header className="commandHeader" layout>
      <div className="headerTitle">
        <span className="eyebrow">Private Household OS</span>
        <AnimatePresence mode="wait">
          <motion.h1
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {VIEW_TITLES[view]}
          </motion.h1>
        </AnimatePresence>
      </div>
      <div className="signalCluster">
        <Signal icon={Sun} value="Live" label={environment?.location.label || "Detroit, MI"} />
        <Signal icon={CalendarDays} value={fullDate} label={weekday} />
        <Signal icon={ShieldCheck} value={session?.demo ? "Demo" : "Private"} label={session?.demo ? "Read-only" : session?.username || "Loading"} />
      </div>
    </motion.header>
  );
}

function NavButton({ view, label, icon: Icon, active, compact, onClick }: { view: ViewName; label: string; icon: LucideIcon; active: boolean; compact?: boolean; onClick: () => void }) {
  return (
    <button className={`navButton ${active ? "active" : ""} ${compact ? "compact" : ""}`} type="button" onClick={onClick} aria-label={label} title={label} data-view={view}>
      {active && <motion.span className="activeGlow" layoutId={compact ? "mobileActiveGlow" : "railActiveGlow"} />}
      <Icon />
      <span>{label}</span>
    </button>
  );
}

function Signal({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="signal">
      <Icon />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function QuickCapture({
  value,
  kind,
  demo,
  onKindChange,
  onValueChange,
  onSubmit,
}: {
  value: string;
  kind: "task" | "note";
  demo: boolean;
  onKindChange: (kind: "task" | "note") => void;
  onValueChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="captureDeck" onSubmit={onSubmit}>
      <div className="captureIcon">
        <Plus />
      </div>
      <input value={value} disabled={demo} onChange={(event) => onValueChange(event.target.value)} placeholder={demo ? "Demo is read-only" : "Capture task or note"} />
      <div className="captureToggle" aria-label="Capture type">
        <button className={kind === "task" ? "active" : ""} type="button" onClick={() => onKindChange("task")}>
          Task
        </button>
        <button className={kind === "note" ? "active" : ""} type="button" onClick={() => onKindChange("note")}>
          Note
        </button>
      </div>
      <button className="captureSubmit" type="submit" disabled={demo || !value.trim()}>
        Add
      </button>
    </form>
  );
}

export function Panel({ icon: Icon, title, actions, className = "", children }: { icon: LucideIcon; title: string; actions?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <motion.article className={`panel ${className}`} layout transition={{ duration: 0.18 }}>
      <div className="panelHeader">
        <div className="panelTitle">
          <span className="panelIcon">
            <Icon />
          </span>
          <h2>{title}</h2>
        </div>
        {actions && <div className="panelActions">{actions}</div>}
      </div>
      {children}
    </motion.article>
  );
}

export function ActionButton({ icon: Icon, label, onClick, disabled, tone = "primary" }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; tone?: "primary" | "quiet" }) {
  return (
    <motion.button className={`actionButton ${tone}`} type="button" onClick={onClick} disabled={disabled} whileTap={{ scale: 0.97 }}>
      <Icon />
      <span>{label}</span>
    </motion.button>
  );
}

export function IconAction({ icon: Icon, label, onClick, disabled }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="iconAction" type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      <Icon />
    </button>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="rowActions">{children}</div>;
}

export function MetricChip({ label, value, onClick, danger }: { label: string; value: number; onClick?: () => void; danger?: boolean }) {
  const content = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );

  if (onClick) {
    return (
      <motion.button className={`metricChip ${danger ? "danger" : ""}`} type="button" onClick={onClick} whileTap={{ scale: 0.97 }}>
        {content}
      </motion.button>
    );
  }

  return <div className={`metricChip ${danger ? "danger" : ""}`}>{content}</div>;
}

export function Empty({ label }: { label: string }) {
  return <div className="emptyState">{label}</div>;
}

export function LoadingState() {
  return (
    <div className="loadingState">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />
      <span>Loading...</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="errorState">
      <strong>Could not load the app.</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
