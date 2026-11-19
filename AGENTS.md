# FitFlow

React 19 + TypeScript + Vite 8 + Tailwind CSS 4. Aplicativo local-first de acompanhamento de alimentação, água, atividades, metas e hábitos, com dados no IndexedDB. Interface e textos em português do Brasil.

## Comandos

- `npm run dev` — servidor de desenvolvimento (porta `$PORT`, padrão 8443)
- `npm test` — testes (Vitest, fuso America/Sao_Paulo)
- `npm run typecheck` — checagem de tipos
- `npm run build` — checagem de tipos + build de produção (gera também `dist/sw.js`)

## Estrutura

- `src/types/` — tipos de domínio
- `src/data/` — TACO (`taco.json`, gerado da planilha oficial; não edite à mão), atividades (METs do Compêndio 2024), modelos de metas e textos de apoio
- `src/services/` — regras de negócio puras com testes. Todo cálculo novo vai aqui, nunca em componentes
- `src/storage/` — IndexedDB (`db.ts`, migrações) e `FitFlowRepository` (`repository.ts`)
- `src/store/` — estado (`appStore.ts`) e casos de uso (`actions.ts`). A interface só altera dados por estas ações
- `src/hooks/` — roteador, data de hoje, dados derivados, data da página
- `src/components/` — `ui/` (botões, campos, painéis, avisos), `charts/`, e componentes por área
- `src/layouts/AppLayout.tsx` — barra inferior no celular, lateral no computador; `PageHeader`
- `src/pages/` — uma página por rota
- `docs/CALCULOS.md` e `docs/ARQUITETURA.md` — métodos e arquitetura

## Regras do projeto

- Mobile-first. O computador ganha espaço, não complexidade. Sem rolagem horizontal: filhos de grid levam `min-w-0`.
- Cores de domínio são identidade (água azul, comida laranja, movimento verde, hábitos violeta), não enfeite; texto usa as cores de tinta.
- Estimativas aparecem como estimativas. Não some gasto de atividades à meta de energia.
- Sem mensagens de culpa nem “sequência perdida”.
- Nada é enviado para fora do navegador. Não adicione serviços externos, fontes remotas ou analytics.
- A restauração da demonstração (`Ctrl+Shift+Alt+R`) só pode tocar o perfil `isDemo`.
- Datas sempre locais (`utils/date.ts`); nunca `toISOString().slice(0, 10)`.
- Estilos globais em `src/index.css` (tokens em `@theme`, base em `@layer base`).

## Figma Make

As pastas `.figma/` e os plugins `figma*` em `vite.config.ts` vieram do Figma Make e continuam funcionando. O título, o idioma e a descrição do HTML vêm de `.figma/make/site.json`.
