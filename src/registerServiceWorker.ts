/**
 * Registra o service worker só no build de produção: depois da primeira visita o
 * FitFlow abre mesmo sem internet. Em desenvolvimento ele ficaria no caminho do HMR.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn("FitFlow: não foi possível ativar o modo offline.", error);
    });
  });
}
