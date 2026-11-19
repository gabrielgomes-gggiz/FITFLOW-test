import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { navigate } from "@/hooks/useRouter";
import { toStorageError } from "@/storage/db";
import { resetDemo } from "@/store/actions";
import { getState } from "@/store/appStore";

/** Evento disparado pelo gesto escondido no Perfil (5 toques na versão), para celulares. */
export const DEMO_RESET_EVENT = "fitflow:demo-reset";

export function requestDemoReset(): void {
  window.dispatchEvent(new Event(DEMO_RESET_EVENT));
}

/**
 * Restauração reservada da demonstração: Ctrl + Shift + Alt + R.
 * 1) confere se o perfil ativo é o de demonstração; 2) pede confirmação;
 * 3) recria os dados de exemplo; 4) atualiza a interface. Perfis pessoais nunca são tocados.
 * O atalho não aparece na interface.
 */
export function DemoResetController() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const request = () => {
      const profile = getState().profile;
      if (!profile?.isDemo) {
        toast.show("A restauração rápida vale só para o perfil de demonstração. Seus dados pessoais não foram alterados.");
        return;
      }
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.code === "KeyR") {
        e.preventDefault();
        request();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(DEMO_RESET_EVENT, request);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(DEMO_RESET_EVENT, request);
    };
  }, [toast]);

  const confirm = async () => {
    setBusy(true);
    try {
      await resetDemo();
      setOpen(false);
      navigate("/", { replace: true });
      toast.success("Demonstração restaurada.");
    } catch (error) {
      toast.error(toStorageError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Restaurar a demonstração?"
      description={
        <>
          <p>Os registros do perfil de demonstração voltam ao estado inicial, com datas atualizadas para hoje.</p>
          <p className="mt-2">Perfis pessoais criados neste aparelho não são alterados.</p>
        </>
      }
      confirmLabel="Restaurar demonstração"
      tone="primary"
      busy={busy}
      onConfirm={() => void confirm()}
      onCancel={() => setOpen(false)}
    />
  );
}
