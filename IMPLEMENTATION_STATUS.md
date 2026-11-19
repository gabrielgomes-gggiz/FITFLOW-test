# Status da implementação — FitFlow

Registro para continuar o desenvolvimento sem perder contexto.

## Concluído

### Fase 1 — Diagnóstico
- [x] Projeto original (Figma Make): todo o app em `App.tsx`, dados fixos, botões sem função, cálculos na interface, valores de alimentos misturados (USDA e inventados), sem persistência, rotas nem testes
- [x] `FitFlow.sql`: entidades aproveitadas e problemas mapeados (ver `docs/ARQUITETURA.md`)

### Fase 2 — Arquitetura
- [x] Pastas por responsabilidade: `types`, `data`, `services`, `storage`, `store`, `hooks`, `components`, `layouts`, `pages`, `utils`
- [x] IndexedDB com migrações versionadas, escopo por perfil, exclusão em cascata e restauração atômica da demonstração
- [x] Contrato `FitFlowRepository`, pronto para um backend futuro
- [x] TACO 4ª ed. extraída da planilha oficial (593 alimentos), conferida com conversão independente
- [x] 28 atividades e 92 variantes com METs do Compêndio 2024
- [x] Dados de demonstração coerentes, relativos à data atual, sem registros no futuro

### Fase 3 — Interface
- [x] Mobile-first: barra inferior (5 seções) e ação principal ao alcance do polegar; lateral no computador
- [x] Identidade: tinta + verde-limão, cores de domínio validadas para daltonismo, fonte Atkinson Hyperlegible Next servida localmente
- [x] Componentes padronizados: botões, campos, painéis (`<dialog>`), avisos com “Desfazer”, gráficos com tabela equivalente

### Fase 4 — Funcionalidades
- [x] Perfil e configuração inicial (3 etapas, tudo opcional), edição e múltiplos perfis
- [x] Refeições: busca TACO tolerante a acentos e plural, gramas ou porções, nutrientes, edição, exclusão, alimentos cadastrados pelo rótulo
- [x] Água: adição rápida, meta estimada e ajustável, histórico e gráfico
- [x] Atividades: modalidade, ritmo, duração, gasto estimado e minutos da semana pela conta da OMS
- [x] Metas: modelos e personalizadas, diárias e semanais, check-ins, histórico sem sequência punitiva, pausa e exclusão
- [x] Cigarro e álcool: parar ou reduzir, dias sem consumo, economia estimada, vontades, alternativas e apoio do SUS
- [x] Início com linha do dia, indicadores, metas, sugestões e resumo semanal
- [x] Histórico de 7 e 30 dias com detalhe por dia
- [x] Página “Como calculamos”

### Fase 5 — Integração
- [x] Ações gravam no banco e releem; abas sincronizadas por `BroadcastChannel`
- [x] Restauração da demonstração: `Ctrl + Shift + Alt + R` ou 5 toques em “Versão” no Perfil; só funciona no perfil de demonstração
- [x] Exportação (JSON) e exclusão de dados; service worker e manifest (uso offline e instalação)

### Fase 6 — Testes e publicação
- [x] `npm test`: 72 testes (cálculos, validação, busca, TACO, armazenamento, demonstração)
- [x] `npm run build`: checagem de tipos + build sem erros
- [x] Fluxos de ponta a ponta no Chrome (19 verificações): os 13 critérios de aceitação, restauração da demonstração, proteção de perfis pessoais, exclusão, recarga sem perda e uso offline
- [x] Responsividade: sem rolagem horizontal em 360, 390, 1366 e 1440 px
- [x] Acessibilidade: auditoria axe-core (WCAG 2.1 AA + boas práticas) sem violações em todas as páginas
- [x] `vercel.json` com reescrita de rotas, CSP e cache; ícones e fonte fora do Git LFS

## Limitações conhecidas

- Testado no Chrome (desktop e emulação Android). Safari e Firefox não foram testados nesta etapa.
- Sem medidas caseiras (ex.: “1 colher”) para alimentos da TACO: a quantidade é em gramas; alimentos cadastrados aceitam porções.
- METs para adultos de 19 a 59 anos; o Compêndio para 60+ não foi incorporado.
- Os dados ficam só no navegador: limpar os dados do site ou trocar de aparelho não leva os registros (exportação em JSON disponível). O navegador pode apagar dados sob falta extrema de espaço.
- Sem modo escuro.

## Próximos passos sugeridos

1. Importar o JSON exportado (restauração de backup).
2. Medidas caseiras a partir da tabela do IBGE (POF 2008–2009).
3. Compêndio para pessoas com 60 anos ou mais.
4. Backend opcional implementando `FitFlowRepository`, com login e sincronização.
5. Testes em Safari/iOS e Firefox.
