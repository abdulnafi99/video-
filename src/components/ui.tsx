import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { JobStatus, ProjectStatus } from "../../shared/types";

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
};

export const Page: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
  <motion.div className={`page ${wide ? "page-wide" : ""}`} {...fadeUp}>
    {children}
  </motion.div>
);

export const PageHead: React.FC<{ eyebrow?: string; title: string; subtitle?: string; actions?: React.ReactNode }> = ({ eyebrow, title, subtitle, actions }) => (
  <div className="page-head">
    <div>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 className="title">{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="row">{actions}</div>}
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div className="field">
    <label>{label}</label>
    {children}
    {hint && <span className="dim small">{hint}</span>}
  </div>
);

export const Progress: React.FC<{ value: number }> = ({ value }) => (
  <div className="progress">
    <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

const STATUS: Record<string, [string, string]> = {
  queued: ["wait", "Queued"],
  running: ["run", "Rendering"],
  completed: ["ok", "Completed"],
  failed: ["bad", "Failed"],
  cancelled: ["", "Cancelled"],
  draft: ["", "Draft"],
  storyboard: ["wait", "Storyboard"],
  rendering: ["run", "Rendering"],
};
export const StatusBadge: React.FC<{ status: JobStatus | ProjectStatus }> = ({ status }) => {
  const [cls, label] = STATUS[status] ?? ["", status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

export const Empty: React.FC<{ icon?: React.ReactNode; title: string; children?: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="empty">
    {icon}
    <h3>{title}</h3>
    <div>{children}</div>
  </div>
);

// ---- toasts -----------------------------------------------------------------
type Toast = { id: number; text: string; err?: boolean };
const ToastCtx = createContext<(text: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, err }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), err ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className={`toast ${t.err ? "err" : ""}`} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};

/** Small data hook with reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    return fn()
      .then((d) => {
        setData(d);
        setError(undefined);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  React.useEffect(() => {
    void load();
  }, [load]);
  return { data, setData, error, loading, reload: load };
}
