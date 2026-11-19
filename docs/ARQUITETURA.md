# Arquitetura do FitFlow

## Camadas

```
pages / components / layouts      Interface: só exibe e coleta dados
        │  hooks (useAppData, useRouter, useToday, usePageDate)
        ▼
store/actions.ts                  Casos de uso: valida o vínculo com o perfil, grava, relê e atualiza o estado
store/appStore.ts                 Estado em memória (useSyncExternalStore), sempre derivado do banco
        │
        ├── services/*            Regras de negócio puras e testáveis (sem React, sem IndexedDB)
        └── storage/repository.ts Contrato FitFlowRepository + implementação IndexedDB
                storage/db.ts     Abertura, migrações versionadas e tratamento de erros
```

Princípios:

- **Componentes não calculam.** Toda conta (energia, nutrientes, metas, economia) está em `services/` e tem testes.
- **O banco é a fonte de verdade.** Cada ação grava no IndexedDB e depois relê os registros do perfil: o que aparece na tela é exatamente o que está salvo.
- **Escopo por perfil.** Todo registro tem `profileId`. O repositório confere o perfil antes de gravar e recusa remover registros de outro perfil.
- **Abas sincronizadas.** Mudanças em uma aba avisam as outras (`BroadcastChannel`), que releem o banco.

## Banco local (IndexedDB)

Banco `fitflow`, versão 1 (`storage/db.ts`).

| Store | Chave | Índices | Conteúdo |
|---|---|---|---|
| `profiles` | `id` | — | Perfis (demonstração e pessoais) |
| `settings` | `key` | — | Perfil ativo |
| `customFoods` | `id` | `byProfile` | Alimentos cadastrados pelo usuário |
| `foodEntries` | `id` | `byProfile`, `byProfileDate` | Alimentos registrados |
| `waterEntries` | `id` | `byProfile`, `byProfileDate` | Água |
| `activityEntries` | `id` | `byProfile`, `byProfileDate` | Atividades |
| `goals` | `id` | `byProfile` | Metas |
| `goalCheckins` | `id` | `byProfile`, `byProfileDate` | Marcações de metas personalizadas |
| `habitTrackers` | `id` | `byProfile` | Acompanhamentos de cigarro/álcool |
| `habitLogs` | `id` | `byProfile`, `byProfileDate` | Consumo por dia |
| `cravings` | `id` | `byProfile`, `byProfileDate` | Vontades registradas |

Operações atômicas (uma transação):

- `createProfileWithData` — cria perfil já com registros (onboarding e demonstração).
- `replaceDemoProfile` — restauração da demonstração. Recusa o perfil se ele não for de demonstração, tanto no objeto recebido quanto no que está gravado.
- `deleteProfile` — exclusão em cascata do perfil e de todos os registros (e do perfil ativo, se for o caso).
- `clearAll` — apaga o banco inteiro.

**Migrações**: aumente `DB_VERSION` e adicione um bloco `if (oldVersion < N)` em `migrate()`. Os blocos rodam em sequência e não apagam dados.

**Datas**: registros guardam `date` (AAAA-MM-DD no fuso do aparelho) e `time` (HH:mm). Nunca usamos `toISOString()` para obter o dia — em UTC−3, depois das 21h ele já devolve o dia seguinte.

## Do modelo SQL para o app

| `FitFlow.sql` | No app | O que mudou e por quê |
|---|---|---|
| `USUARIO` + `PERFIL` | `Profile` | Sem `email` e `senha`: o app é local e não tem login (LGPD, minimização). Idade **ou** data de nascimento; sexo opcional, usado só nas fórmulas; metas manuais opcionais |
| `ALIMENTO` | `FoodItem` (TACO) e `CustomFood` | Base explícita de 100 g; fibra, sódio, categoria e origem; alimentos cadastrados vinculados ao perfil |
| `REGISTRO_ALIMENTAR` | `FoodEntry` | Quantidade sempre em gramas (porções convertidas); horário local; cópia dos nutrientes no momento do registro |
| `HIDRATACAO` | `WaterEntry` | Data e horário locais |
| `ATIVIDADE_FISICA` | `ActivityModality` / `ActivityVariant` (`data/activities.ts`) | `calorias_por_minuto` fixo trocado por MET do Compêndio 2024, que considera o peso e a intensidade |
| `REGISTRO_ATIVIDADE` | `ActivityEntry` | Variante (ritmo), MET e código usados, gasto estimado e peso usado no cálculo |
| `META` | `Goal` | Métrica, período (diário/semanal), unidade, tipo de meta personalizada, vínculo com a meta de água, status ativo/pausado |
| `PROGRESSO_META` | `GoalCheckin` | Um valor por meta e por dia, só para metas personalizadas; as automáticas leem os registros |
| — | `HabitTracker`, `HabitLog`, `CravingLog` | Redução de cigarro e álcool (não existiam no modelo) |
| `DISPOSITIVO`, `MEDICAO_DISPOSITIVO` | — | Fora do escopo desta versão: sem integração e sem simular sincronização |

Problemas do SQL original corrigidos no modelo: senha e e-mail obrigatórios; `quantidade` sem unidade; `ALIMENTO` sem base de referência; ausência de `ON DELETE CASCADE` (exclusão deixaria órfãos); `USUARIO` declarado depois das tabelas que o referenciam; datas em `CURRENT_TIMESTAMP` (UTC).

## Como adicionar um backend no futuro

1. Implemente `FitFlowRepository` (`storage/repository.ts`) com chamadas HTTP. Os métodos já são assíncronos e recebem/retornam os mesmos tipos.
2. Troque `createIndexedDbRepository()` em `store/actions.ts` pela nova implementação (ou combine as duas para modo offline com sincronização).
3. Os registros já têm `id` UUID e `createdAt`/`updatedAt` em ISO, prontos para sincronizar e resolver conflitos.
4. Serviços, estado e telas não mudam.

## Roteamento e publicação

- Roteador próprio com a History API (`hooks/useRouter.ts`), sem dependências. Rotas: `/`, `/refeicoes`, `/agua`, `/atividades`, `/metas`, `/habitos`, `/historico`, `/perfil`, `/sobre`.
- `vercel.json` reescreve qualquer rota para `index.html` (arquivos estáticos têm prioridade) e define cabeçalhos de segurança, incluindo uma CSP que só permite recursos do próprio domínio.
- O plugin `fitflowServiceWorker` (em `vite.config.ts`) gera `sw.js` no build com a lista exata de arquivos e uma versão baseada no conteúdo. Navegação usa rede primeiro (com reserva em cache após 4 s); arquivos com hash usam cache primeiro.

## Testes

`npm test` roda o Vitest com fuso fixo `America/Sao_Paulo`:

- `services/*.test.ts` — energia, nutrição, água, atividades, metas, hábitos, validação, demonstração.
- `data/data.test.ts` — valores da TACO, critério de frutas/legumes/verduras, busca e catálogo de atividades.
- `storage/repository.test.ts` — escopo por perfil, persistência entre conexões, restauração da demonstração sem tocar perfis pessoais, exclusão em cascata (com `fake-indexeddb`).
- `utils/date.test.ts` — datas locais à noite em UTC−3 e formatação pt-BR.
