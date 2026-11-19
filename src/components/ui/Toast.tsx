import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ToastItem {
  id: number;
  message: string;
  tone: "ok" | "error" | "info";
  action?: { label: string; onAction: () => void };
}

interface ToastApi {
  show: (message: string, options?: { tone?: ToastItem["tone"]; action?: ToastItem["action"]; duration?: number }) => void;
  success: (message: string, action?: ToastItem["action"]) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}

const supportsPopover = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/**
 * Avisos curtos após cada ação. Ficam numa camada "popover" para aparecer também por
 * cima de painéis abertos; ações com "Desfazer" ficam visíveis por mais tempo.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const viewport = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, options = {}) => {
      const id = nextId.current++;
      const item: ToastItem = { id, message, tone: options.tone ?? "info", action: options.action };
      setToasts((list) => [...list.slice(-2), item]);
      const duration = options.duration ?? (options.action ? 6500 : 3200);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, action) => show(message, { tone: "ok", action }),
      error: (message) => show(message, { tone: "error", duration: 6000 }),
    }),
    [show],
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Recoloca a região de avisos no topo da camada superior (acima de <dialog> abertos).
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || !supportsPopover) return;
    try {
      if (el.matches(":popover-open")) el.hidePopover();
      if (toasts.length > 0) el.showPopover();
    } catch {
      /* navegadores sem suporte completo: segue com z-index */
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        ref={viewport}
        popover={supportsPopover ? "manual" : undefined}
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] top-auto z-[60] m-0 flex w-full flex-col items-center gap-2 border-0 bg-transparent p-0 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:w-auto lg:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-2xl px-4 py-3 text-[0.95rem] shadow-[var(--shadow-float)] ${t.tone === "error" ? "bg-danger text-white" : "bg-ink text-white"}`}
          >
            <Icon name={t.tone === "error" ? "info" : t.tone === "ok" ? "check" : "info"} size={18} className={t.tone === "ok" ? "text-lime" : ""} />
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="-my-1 shrink-0 rounded-lg px-2 py-1.5 font-bold text-lime underline-offset-4 hover:underline"
                onClick={() => {
                  t.action?.onAction();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" aria-label="Fechar aviso" className="-my-1 -mr-1 shrink-0 rounded-lg p-1.5 text-on-ink-muted hover:text-white" onClick={() => dismiss(t.id)}>
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
