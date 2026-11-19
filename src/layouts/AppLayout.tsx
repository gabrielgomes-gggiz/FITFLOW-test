import type { ReactNode } from "react";
import { LogoMark, Wordmark } from "@/components/Brand";
import { Badge } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { href, linkHandler, ROUTES, useLocation } from "@/hooks/useRouter";
import { useAppState } from "@/store/appStore";
import { initials } from "@/utils/text";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

/** Mesmas cinco seções principais no celular (barra inferior) e no computador (lateral). */
const PRIMARY_NAV: NavItem[] = [
  { to: ROUTES.home, label: "Início", icon: "home" },
  { to: ROUTES.food, label: "Refeições", icon: "food" },
  { to: ROUTES.water, label: "Água", icon: "water" },
  { to: ROUTES.activity, label: "Atividades", icon: "activity" },
  { to: ROUTES.goals, label: "Metas", icon: "target" },
];

const SECONDARY_NAV: NavItem[] = [
  { to: ROUTES.habits, label: "Cigarro e álcool", icon: "sprout" },
  { to: ROUTES.history, label: "Histórico", icon: "chart" },
  { to: ROUTES.profile, label: "Perfil e dados", icon: "user" },
];

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);
}

function SideLink({ item, path }: { item: NavItem; path: string }) {
  const active = isActive(path, item.to);
  return (
    <a
      href={href(item.to)}
      onClick={linkHandler(item.to)}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 font-bold transition-colors ${active ? "bg-ink text-white" : "text-ink-2 hover:bg-mist hover:text-ink"}`}
    >
      <Icon name={item.icon} size={20} className={active ? "text-lime" : ""} />
      {item.label}
    </a>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { path } = useLocation();
  const profile = useAppState((s) => s.profile);
  const name = profile?.name || "Você";

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white">
        Pular para o conteúdo
      </a>

      {/* Computador: navegação lateral */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
        <a href={href("/")} onClick={linkHandler("/")} className="mb-7 flex items-center gap-2.5 px-2">
          <LogoMark size={34} />
          <Wordmark />
        </a>
        <nav aria-label="Navegação principal" className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SideLink key={item.to} item={item} path={path} />
          ))}
          <div className="my-3 h-px bg-line" />
          {SECONDARY_NAV.map((item) => (
            <SideLink key={item.to} item={item} path={path} />
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <a
            href={href(ROUTES.profile)}
            onClick={linkHandler(ROUTES.profile)}
            className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-field"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lime font-extrabold text-ink">{initials(name)}</span>
            <span className="min-w-0">
              <span className="block truncate font-bold text-ink">{name}</span>
              {profile?.isDemo ? <Badge tone="lime">Demonstração</Badge> : <span className="text-sm text-muted">Perfil pessoal</span>}
            </span>
          </a>
          <p className="flex items-start gap-2 px-1 text-xs text-muted">
            <Icon name="shield" size={16} className="mt-px" />
            Seus dados ficam salvos só neste navegador.
          </p>
        </div>
      </aside>

      {/* Celular: barra superior compacta */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line/70 bg-mist/90 px-4 backdrop-blur-md lg:hidden">
        <a href={href("/")} onClick={linkHandler("/")} className="flex items-center gap-2" aria-label="FitFlow, início">
          <LogoMark size={28} />
          <Wordmark className="text-lg" />
        </a>
        {profile?.isDemo && (
          <span className="ml-1">
            <Badge tone="lime">Demonstração</Badge>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <a
            href={href(ROUTES.history)}
            onClick={linkHandler(ROUTES.history)}
            aria-label="Histórico"
            aria-current={isActive(path, ROUTES.history) ? "page" : undefined}
            className={`grid size-11 place-items-center rounded-full ${isActive(path, ROUTES.history) ? "bg-ink text-white" : "text-ink hover:bg-ink/5"}`}
          >
            <Icon name="chart" size={21} />
          </a>
          <a
            href={href(ROUTES.profile)}
            onClick={linkHandler(ROUTES.profile)}
            aria-label="Perfil e dados"
            aria-current={isActive(path, ROUTES.profile) ? "page" : undefined}
            className="grid size-11 place-items-center rounded-full"
          >
            <span className={`grid size-9 place-items-center rounded-full text-sm font-extrabold ${isActive(path, ROUTES.profile) ? "bg-ink text-lime" : "bg-lime text-ink"}`}>
              {initials(name)}
            </span>
          </a>
        </div>
      </header>

      <div className="lg:pl-64">
        <main id="conteudo" tabIndex={-1} className="mx-auto outline-none w-full max-w-6xl px-4 pb-40 pt-5 sm:px-6 lg:px-10 lg:pb-14 lg:pt-9">
          {children}
        </main>
      </div>

      {/* Celular: barra inferior, alcançável com o polegar */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-md pb-safe lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(path, item.to);
            return (
              <li key={item.to}>
                <a
                  href={href(item.to)}
                  onClick={linkHandler(item.to)}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[0.75rem] font-bold leading-none"
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${active ? "bg-lime text-ink" : "text-ink-2"}`}>
                    <Icon name={item.icon} size={21} strokeWidth={active ? 2.1 : 1.8} />
                  </span>
                  <span className={active ? "text-ink" : "text-ink-2"}>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Cabeçalho de página. A ação principal vira botão flutuante no celular (zona do polegar). */
export function PageHeader({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 lg:mb-7">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink lg:text-[2.1rem]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-ink-2">{description}</p>}
        </div>
        {action && (
          <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-20 [&>button]:shadow-[var(--shadow-float)] lg:static lg:[&>button]:shadow-none">
            {action}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
