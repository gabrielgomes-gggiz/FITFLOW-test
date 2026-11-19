import { useEffect, useRef, type ComponentType } from "react";
import { LogoMark } from "@/components/Brand";
import { DemoResetController } from "@/components/DemoResetController";
import { Button } from "@/components/ui/Button";
import { ROUTES, useLocation } from "@/hooks/useRouter";
import { AppLayout } from "@/layouts/AppLayout";
import { AboutPage } from "@/pages/AboutPage";
import { ActivityPage } from "@/pages/ActivityPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FoodPage } from "@/pages/FoodPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { WaterPage } from "@/pages/WaterPage";
import { WelcomePage } from "@/pages/WelcomePage";
import { bootstrap } from "@/store/actions";
import { useAppState } from "@/store/appStore";

const PAGES: Record<string, ComponentType> = {
  [ROUTES.home]: DashboardPage,
  [ROUTES.food]: FoodPage,
  [ROUTES.water]: WaterPage,
  [ROUTES.activity]: ActivityPage,
  [ROUTES.goals]: GoalsPage,
  [ROUTES.habits]: HabitsPage,
  [ROUTES.history]: HistoryPage,
  [ROUTES.profile]: ProfilePage,
  [ROUTES.about]: AboutPage,
};

const TITLES: Record<string, string> = {
  [ROUTES.home]: "Início",
  [ROUTES.food]: "Refeições",
  [ROUTES.water]: "Água",
  [ROUTES.activity]: "Atividades",
  [ROUTES.goals]: "Metas",
  [ROUTES.habits]: "Cigarro e álcool",
  [ROUTES.history]: "Histórico",
  [ROUTES.profile]: "Perfil e dados",
  [ROUTES.about]: "Como calculamos",
};

function Routes() {
  const { path } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    document.title = TITLES[path] ? `${TITLES[path]} | FitFlow` : "FitFlow";
    if (first.current) {
      first.current = false;
      return;
    }
    // Leitores de tela começam a nova página do início.
    document.getElementById("conteudo")?.focus({ preventScroll: true });
  }, [path]);
  const Page = PAGES[path] ?? NotFoundPage;
  return <Page key={path} />;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-3 text-ink-2">
        <LogoMark size={48} />
        <span>Carregando seus dados…</span>
      </div>
    </div>
  );
}

function StorageErrorScreen({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-md rounded-[var(--radius-card)] border border-line bg-white p-6 text-center">
        <LogoMark size={44} className="mx-auto" />
        <h1 className="mt-4 text-xl font-extrabold">Não foi possível abrir seus dados</h1>
        <p className="mt-2 text-ink-2">{message}</p>
        <Button className="mt-5" icon="refresh" onClick={() => void bootstrap()}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  const status = useAppState((s) => s.status);
  const error = useAppState((s) => s.error);
  const profile = useAppState((s) => s.profile);

  useEffect(() => {
    void bootstrap();
  }, []);

  if (status === "loading") return <Splash />;
  if (status === "error") return <StorageErrorScreen message={error ?? "Erro desconhecido."} />;

  return (
    <>
      {profile ? (
        <AppLayout>
          <Routes />
        </AppLayout>
      ) : (
        <WelcomePage />
      )}
      <DemoResetController />
    </>
  );
}
