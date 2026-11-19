import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button, IconButton } from "./Button";

/**
 * Painel modal: desliza de baixo no celular e aparece centralizado no computador.
 * Usa <dialog> nativo (foco preso, tecla Esc e camada superior do navegador).
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
      }
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCloseRef.current();
      }}
      className={`fixed inset-x-0 bottom-0 top-auto m-0 flex max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[1.75rem] bg-white p-0 text-ink shadow-[var(--shadow-float)] open:animate-sheet-up sm:inset-0 sm:m-auto sm:max-h-[min(88dvh,760px)] sm:rounded-[1.75rem] ${size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"} [&:not([open])]:hidden`}
    >
      {open && (
        <>
          <div className="flex items-start gap-3 border-b border-line px-5 pb-3 pt-4">
            <div aria-hidden="true" className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden" />
            <div className="min-w-0 flex-1 pt-1.5">
              <h2 id={titleId} className="text-lg font-bold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <IconButton icon="close" label="Fechar" onClick={() => onCloseRef.current()} className="-mr-2" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && <div className="border-t border-line bg-white px-5 py-3 pb-safe">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  tone = "danger",
  busy,
  confirmDisabled,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} busy={busy} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-ink-2">{description}</div>
      {children}
    </Sheet>
  );
}
